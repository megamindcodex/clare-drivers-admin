import { PrismaClient } from "#db/generated/prisma/client.js";
import { logger } from "#configs/logger.js";

/**
 * Shared Prisma client for MySQL access.
 * @type {import("#db/generated/prisma/client.js").PrismaClient}
 */
export const prisma = new PrismaClient();

/**
 * Gracefully disconnects Prisma from MySQL and exits the process.
 * @param {string} signal - The OS signal that triggered the shutdown (e.g. "SIGINT").
 * @returns {Promise<void>}
 */
const disconnectPrisma = async (signal) => {
  logger.info(`${signal} received. Disconnecting MySQL (Prisma)...`);
  await prisma.$disconnect();
  process.exit(0);
};

process.on("SIGINT", () => disconnectPrisma("SIGINT"));
process.on("SIGTERM", () => disconnectPrisma("SIGTERM"));

/**
 * Connects Prisma to MySQL at startup.
 * @returns {Promise<void>}
 * @throws {Error} if the connection attempt fails — the caller is
 *   responsible for handling this (see {@link crashAndExit}).
 */
const connectPrisma = async () => {
  await prisma.$connect();
  logger.info("MySQL (Prisma) connected.");
};

export default connectPrisma;
