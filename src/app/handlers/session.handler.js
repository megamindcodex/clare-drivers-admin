import crypto from "node:crypto";

import { sessionConnection } from "#db/redis/session.connection.js";
import { sessionConfig } from "#configs/redis.config.js";

const REFRESH_TOKEN_BYTES = 32;

/**
 * Generates a cryptographically random refresh token.
 * @returns {string} A random hex-encoded token.
 */
export const generateRefreshToken = () => {
  return crypto.randomBytes(REFRESH_TOKEN_BYTES).toString("hex");
};

/**
 * Creates a new session in Redis as a hash, keyed by the refresh token, and
 * sets it to expire after the configured session TTL.
 * @param {Object} params
 * @param {string} params.refreshToken - The refresh token to use as the session key.
 * @param {string} params.email - The authenticated user's email.
 * @param {string} params.ip - The client's IP address.
 * @param {string} params.userAgent - The client's user agent string.
 * @param {string} [params.deviceId] - The client's device identifier, if provided.
 * @returns {Promise<void>}
 */
export const createSession = async ({ refreshToken, email, ip, userAgent, deviceId }) => {
  const session = { email, ip, userAgent, ...(deviceId && { deviceId }) };

  await sessionConnection
    .multi()
    .hSet(refreshToken, session)
    .expire(refreshToken, sessionConfig.ttlSeconds)
    .exec();
};

/**
 * Looks up a session by its refresh token.
 * @param {string} refreshToken - The refresh token used as the session key.
 * @returns {Promise<{ email: string, ip: string, userAgent: string, deviceId?: string }|null>}
 *   The session data, or null if the session doesn't exist or has expired.
 */
export const getSession = async (refreshToken) => {
  const session = await sessionConnection.hGetAll(refreshToken);
  return Object.keys(session).length > 0 ? session : null;
};

/**
 * Deletes a session by its refresh token.
 * @param {string} refreshToken - The refresh token used as the session key.
 * @returns {Promise<void>}
 */
export const deleteSession = async (refreshToken) => {
  await sessionConnection.del(refreshToken);
};
