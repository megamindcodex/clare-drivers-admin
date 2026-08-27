import { createClient } from "redis";

import { sessionConfig } from "#configs/redis.config.js";
import { logger } from "#configs/logger.js";

/**
 * Shared node-redis client used by the express-session Redis store.
 * @type {import("redis").RedisClientType}
 */
export const sessionConnection = createClient({ url: sessionConfig.url });

sessionConnection.on("connect", () => logger.info("Session Redis connected."));
sessionConnection.on("error", (error) => logger.error(error));

/**
 * Gracefully disconnects the shared session Redis client and exits the process.
 * @param {string} signal - The OS signal that triggered the shutdown (e.g. "SIGINT").
 * @returns {Promise<void>}
 */
const disconnectSessionConnection = async (signal) => {
  logger.info(`${signal} received. Disconnecting session Redis...`);
  await sessionConnection.quit();
  process.exit(0);
};

process.on("SIGINT", () => disconnectSessionConnection("SIGINT"));
process.on("SIGTERM", () => disconnectSessionConnection("SIGTERM"));
