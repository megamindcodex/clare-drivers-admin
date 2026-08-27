import { Worker } from "bullmq";

import { bullmqConnection } from "#db/redis/bullmq.connection.js";
import { sendEmail } from "#handlers/email/email.handler.js";
import { logger } from "#configs/logger.js";

/**
 * BullMQ worker that consumes jobs from the "email" queue.
 * @type {import("bullmq").Worker}
 */
export const emailWorker = new Worker(
  "email",
  /**
   * Processes a single email job.
   * @param {import("bullmq").Job} job - The dequeued email job.
   * @returns {Promise<void>}
   */
  async (job) => {
    logger.info(`Processing email job ${job.id}`);
    await sendEmail(job.data);
  },
  { connection: bullmqConnection }
);
