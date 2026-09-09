import { createServer } from "node:http";

import { Worker } from "bullmq";

import { bullmqConnection } from "#db/redis/bullmq.connection.js";
import { sendEmail } from "#handlers/email/email.handler.js";
import { logger } from "#configs/logger.js";
import { env } from "#configs/env.js";

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

/**
 * Responds 200 to any request. Render's free Web Service tier requires a
 * bound port to route/health-check against, but this process does no real
 * HTTP work — job processing above runs independently of these requests.
 * @param {import("node:http").IncomingMessage} req - The incoming request.
 * @param {import("node:http").ServerResponse} res - The response to write to.
 * @returns {void}
 */
const handleHealthCheck = (req, res) => {
  res.writeHead(200);
  res.end("ok");
};

/**
 * Minimal HTTP server bound to Render's assigned port so this worker can
 * run as a free Web Service instead of a paid Background Worker.
 * @type {import("node:http").Server}
 */
const healthCheckServer = createServer(handleHealthCheck);

healthCheckServer.listen(env.port, () => {
  logger.info(`Email worker health check listening on port ${env.port}`);
});
