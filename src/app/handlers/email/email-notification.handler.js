import { addEmailJob } from "#queues/index.js";

const REGISTER_EMAIL_SUBJECT = "Welcome to Clare Motors";
const LOGIN_EMAIL_SUBJECT = "New login to your Clare Motors account";
const RESET_CODE_EMAIL_SUBJECT = "Your Clare Motors password reset code";
const ADMIN_PROMOTION_EMAIL_SUBJECT = "You've been promoted to Admin";

const RESET_CODE_EMAIL_EXPIRY_MINUTES = 15;

/**
 * Builds the welcome-email body for a newly registered account.
 * @returns {string} The email body.
 */
const buildRegisterEmailBody = () =>
  "Welcome to Clare Motors! Your account has been created successfully.";

/**
 * Builds the new-login notification email body.
 * @returns {string} The email body.
 */
const buildLoginEmailBody = () =>
  "We noticed a new login to your Clare Motors account. If this wasn't you, please reset your password immediately.";

/**
 * Builds the password reset code email body.
 * @param {string} resetCode - The reset code to include in the message.
 * @returns {string} The email body.
 */
const buildResetCodeEmailBody = (resetCode) =>
  `Your password reset code is ${resetCode}. This code expires in ${RESET_CODE_EMAIL_EXPIRY_MINUTES} minutes.`;

/**
 * Builds the admin-promotion notification email body.
 * @returns {string} The email body.
 */
const buildAdminPromotionEmailBody = () =>
  "Congratulations! Your Clare Motors account has been promoted to Admin.";

/**
 * Sends the welcome email for a newly registered account.
 * @param {string} to - Recipient email address.
 * @returns {Promise<import("bullmq").Job>} The enqueued email job.
 */
export const sendRegisterEmail = async (to) => {
  return addEmailJob({ to, subject: REGISTER_EMAIL_SUBJECT, body: buildRegisterEmailBody() });
};

/**
 * Sends a new-login notification email.
 * @param {string} to - Recipient email address.
 * @returns {Promise<import("bullmq").Job>} The enqueued email job.
 */
export const sendLoginEmail = async (to) => {
  return addEmailJob({ to, subject: LOGIN_EMAIL_SUBJECT, body: buildLoginEmailBody() });
};

/**
 * Sends a password reset code email.
 * @param {Object} params
 * @param {string} params.to - Recipient email address.
 * @param {string} params.resetCode - The reset code to include in the email body.
 * @returns {Promise<import("bullmq").Job>} The enqueued email job.
 */
export const sendResetCodeEmail = async ({ to, resetCode }) => {
  return addEmailJob({ to, subject: RESET_CODE_EMAIL_SUBJECT, body: buildResetCodeEmailBody(resetCode) });
};

/**
 * Sends an admin-promotion notification email.
 * @param {string} to - Recipient email address.
 * @returns {Promise<import("bullmq").Job>} The enqueued email job.
 */
export const sendAdminPromotionEmail = async (to) => {
  return addEmailJob({ to, subject: ADMIN_PROMOTION_EMAIL_SUBJECT, body: buildAdminPromotionEmailBody() });
};
