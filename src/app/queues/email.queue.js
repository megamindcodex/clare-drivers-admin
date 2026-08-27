import { Queue } from "bullmq";

import { bullmqConnection } from "#db/redis/bullmq.connection.js";

const EMAIL_JOB_NAME = "send-email";

/**
 * BullMQ queue for dispatching email jobs, backed by the shared BullMQ Redis connection.
 * @type {import("bullmq").Queue}
 */
const emailQueue = new Queue("email", {
  connection: bullmqConnection,
});

/**
 * Enqueues an email to be sent by the email worker.
 * @param {Object} params - The email job data.
 * @param {string} params.to - Recipient email address.
 * @param {string} params.subject - Email subject line.
 * @param {string} params.body - Email body content.
 * @returns {Promise<import("bullmq").Job>} The enqueued job.
 */
export const addEmailJob = async ({ to, subject, body }) => {
  return emailQueue.add(EMAIL_JOB_NAME, { to, subject, body });
};
