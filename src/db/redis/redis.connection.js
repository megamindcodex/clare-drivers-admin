import { bullmqConnection } from "#db/redis/bullmq.connection.js";
import { sessionConnection } from "#db/redis/session.connection.js";
import { logger } from "#configs/logger.js";

/**
 * Connects both shared Redis clients (BullMQ and session) at startup,
 * exiting the process on failure.
 * @returns {Promise<void>}
 */
export const connectRedis = async () => {
  try {
    await Promise.all([bullmqConnection.connect(), sessionConnection.connect()]);
  } catch (error) {
    logger.error(error);
    process.exit(1);
  }
};
