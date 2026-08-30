import mongoose from "mongoose";

import { prisma } from "#db/prisma/prisma.connection.js";
import { bullmqConnection } from "#db/redis/bullmq.connection.js";
import { sessionConnection } from "#db/redis/session.connection.js";
import { logger } from "#configs/logger.js";

/**
 * Disconnects every external connection the app may have open — MongoDB,
 * MySQL (Prisma), and both Redis clients — ignoring any connection that was
 * never established or that fails to close cleanly, so a startup crash never
 * hangs waiting on a connection that isn't really there.
 * @returns {Promise<void>}
 */
const disconnectAllConnections = async () => {
  const connections = [
    { name: "MongoDB", disconnect: () => mongoose.disconnect() },
    { name: "MySQL (Prisma)", disconnect: () => prisma.$disconnect() },
    { name: "BullMQ Redis", disconnect: () => bullmqConnection.quit() },
    { name: "session Redis", disconnect: () => sessionConnection.quit() },
  ];

  await Promise.all(
    connections.map(async ({ name, disconnect }) => {
      try {
        await disconnect();
      } catch (disconnectError) {
        logger.error(`Failed to cleanly disconnect ${name} during shutdown — ignoring and continuing.`);
        logger.error(disconnectError);
      }
    })
  );
};

/**
 * Logs why the application failed to start, disconnects any connections
 * that were already established, then kills the process with a non-zero
 * exit code. Call this from the top-level startup sequence whenever a
 * required connection or startup step fails — a partially-connected app
 * must never be left running.
 * @param {string} reason - Human-readable description of what failed (e.g. "MongoDB connection failed").
 * @param {Error} error - The underlying error that caused the crash.
 * @returns {Promise<never>}
 */
export const crashAndExit = async (reason, error) => {
  logger.error(`Application startup failed: ${reason}. Disconnecting all connections and killing the process.`);
  logger.error(error);

  await disconnectAllConnections();

  logger.error("Process killed after startup failure.");
  process.exit(1);
};
