import { logger } from "#configs/logger.js";

/**
 * Sends an email. Delivery isn't wired up to a real transport yet — the
 * message is logged so the email queue/worker pipeline is testable locally.
 * @param {Object} params
 * @param {string} params.to - Recipient email address.
 * @param {string} params.subject - Email subject line.
 * @param {string} params.body - Email body content.
 * @returns {Promise<void>}
 */
export const sendEmail = async ({ to, subject, body }) => {
  logger.info(`Sending email to ${to} — subject: "${subject}"`);
  logger.info(body);
};
