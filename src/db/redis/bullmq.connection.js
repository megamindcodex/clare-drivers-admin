import Redis from "ioredis";

import { bullmqConfig } from "#configs/redis.config.js";
import { logger } from "#configs/logger.js";

/**
 * Shared ioredis client used by BullMQ queues/workers, connected lazily
 * (see `bullmqConfig.options.lazyConnect`).
 * @type {import("ioredis").Redis}
 */
export const bullmqConnection = new Redis(bullmqConfig.url, bullmqConfig.options);

bullmqConnection.on("connect", () => logger.info("BullMQ Redis connected."));
bullmqConnection.on("error", (error) => logger.error(error));

/**
 * Gracefully disconnects the shared BullMQ Redis client and exits the process.
 * @param {string} signal - The OS signal that triggered the shutdown (e.g. "SIGINT").
 * @returns {Promise<void>}
 */
const disconnectBullmqConnection = async (signal) => {
  logger.info(`${signal} received. Disconnecting BullMQ Redis...`);
  await bullmqConnection.quit();
  process.exit(0);
};

process.on("SIGINT", () => disconnectBullmqConnection("SIGINT"));
process.on("SIGTERM", () => disconnectBullmqConnection("SIGTERM"));
