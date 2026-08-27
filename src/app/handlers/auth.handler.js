import crypto from "node:crypto";

import argon2 from "argon2";

import { prisma } from "#db/prisma/prisma.connection.js";
import { UserRole, UserStatus } from "#db/generated/prisma/client.js";
import { generateRefreshToken, createSession, getSession, deleteSession } from "#handlers/session.handler.js";
import { SAFE_USER_SELECT, assertActiveUser } from "#handlers/user.handler.js";
import {
  sendRegisterEmail,
  sendLoginEmail,
  sendResetCodeEmail,
} from "#handlers/email/email-notification.handler.js";
import { generateAccessToken } from "#utils/jwt.util.js";
import { AppError } from "#errors/app-error.js";
import { ErrorCodes } from "#errors/error-codes.js";

const RESET_CODE_LENGTH = 6;
const RESET_CODE_EXPIRY_MINUTES = 15;

/**
 * Generates a random zero-padded numeric reset code.
 * @returns {string} A RESET_CODE_LENGTH-digit numeric code.
 */
const generateResetCode = () => {
  const max = 10 ** RESET_CODE_LENGTH;
  return crypto.randomInt(0, max).toString().padStart(RESET_CODE_LENGTH, "0");
};

/**
 * Registers a new account with role "User" — no permissions until a
 * SuperAdmin promotes it to "Admin" (see promoteToAdmin in user.handler.js).
 * @param {Object} params
 * @param {string} params.username - Desired username.
 * @param {string} params.email - Account email address.
 * @param {string} params.password - Plaintext password to hash and store.
 * @returns {Promise<Object>} The created user record, excluding its password hash.
 * @throws {AppError} CONFLICT - if the username or email is already in use.
 */
export const register = async ({ username, email, password }) => {
  const existingUser = await prisma.user.findFirst({
    where: { OR: [{ username }, { email }] },
  });

  if (existingUser) {
    throw new AppError("Username or email is already in use.", {
      code: ErrorCodes.CONFLICT,
    });
  }

  const hashedPassword = await argon2.hash(password);

  const user = await prisma.user.create({
    data: {
      username,
      email,
      password: hashedPassword,
      role: UserRole.User,
    },
    select: SAFE_USER_SELECT,
  });

  await sendRegisterEmail(user.email);

  return user;
};

/**
 * Authenticates a user by email and password, records the login time, and
 * issues a new session (refresh token) and access token. Suspended accounts
 * may still log in (see assertActiveUser for where that's enforced); only a
 * ban blocks login itself.
 * @param {Object} params
 * @param {string} params.email - Account email address.
 * @param {string} params.password - Plaintext password to verify.
 * @param {string} params.ip - The client's IP address, stored on the session.
 * @param {string} params.userAgent - The client's user agent string, stored on the session.
 * @param {string} [params.deviceId] - The client's device identifier, if provided.
 * @returns {Promise<{ user: Object, accessToken: string, refreshToken: string }>}
 *   The authenticated user (excluding sensitive fields), a signed access token, and a refresh token.
 * @throws {AppError} INVALID_CREDENTIALS - if the email/password combination is wrong.
 * @throws {AppError} ACCOUNT_BANNED - if the account has been banned.
 */
export const login = async ({ email, password, ip, userAgent, deviceId }) => {
  const user = await prisma.user.findUnique({ where: { email } });
  const isPasswordValid = user ? await argon2.verify(user.password, password) : false;

  if (!isPasswordValid) {
    throw new AppError("Invalid email or password.", {
      code: ErrorCodes.INVALID_CREDENTIALS,
    });
  }

  if (user.status === UserStatus.Banned) {
    throw new AppError("This account has been banned.", {
      code: ErrorCodes.ACCOUNT_BANNED,
    });
  }

  const updatedUser = await prisma.user.update({
    where: { userId: user.userId },
    data: { lastLogin: new Date() },
    select: SAFE_USER_SELECT,
  });

  const refreshToken = generateRefreshToken();
  await createSession({ refreshToken, email: updatedUser.email, ip, userAgent, deviceId });
  const accessToken = generateAccessToken({
    userId: updatedUser.userId,
    email: updatedUser.email,
    role: updatedUser.role,
  });

  await sendLoginEmail(updatedUser.email);

  return { user: updatedUser, accessToken, refreshToken };
};

/**
 * Issues a new access token for a valid session, identified by its refresh token.
 * @param {string} refreshToken - The refresh token from the client's session cookie.
 * @returns {Promise<{ accessToken: string }>} A newly signed access token.
 * @throws {AppError} SESSION_NOT_FOUND - if the refresh token is missing, or no matching session
 *   exists (Redis has no way to distinguish "expired" from "never existed" once the key's TTL
 *   elapses, so both cases surface the same code).
 * @throws {AppError} ACCOUNT_BANNED - if the account has since been banned.
 */
export const refreshAccessToken = async (refreshToken) => {
  if (!refreshToken) {
    throw new AppError("Missing refresh token.", {
      code: ErrorCodes.SESSION_NOT_FOUND,
    });
  }

  const session = await getSession(refreshToken);

  if (!session) {
    throw new AppError("Session not found or expired.", {
      code: ErrorCodes.SESSION_NOT_FOUND,
    });
  }

  const user = await prisma.user.findUnique({ where: { email: session.email } });

  if (!user) {
    throw new AppError("Session not found or expired.", {
      code: ErrorCodes.SESSION_NOT_FOUND,
    });
  }

  if (user.status === UserStatus.Banned) {
    throw new AppError("This account has been banned.", {
      code: ErrorCodes.ACCOUNT_BANNED,
    });
  }

  const accessToken = generateAccessToken({ userId: user.userId, email: user.email, role: user.role });

  return { accessToken };
};

/**
 * Logs out a user by deleting their session. A missing or already-expired
 * refresh token is treated as already logged out, not an error.
 * @param {string} [refreshToken] - The refresh token from the client's session cookie.
 * @returns {Promise<void>}
 */
export const logout = async (refreshToken) => {
  if (!refreshToken) {
    return;
  }

  await deleteSession(refreshToken);
};

/**
 * Fetches the currently authenticated user's own profile. Every role can
 * reach this (it isn't permission-gated), but a suspended/banned account is
 * still blocked, same as every other authenticated operation.
 * @param {string} userId - The user's ID, from the verified access token.
 * @returns {Promise<Object>} The matching user record, excluding sensitive fields.
 * @throws {AppError} UNAUTHORIZED - if the account has been suspended, banned, or no longer exists.
 */
export const getProfile = async (userId) => {
  await assertActiveUser(userId);

  return prisma.user.findUnique({
    where: { userId },
    select: SAFE_USER_SELECT,
  });
};

/**
 * Issues a password reset code for the account with the given email, if one
 * exists. Always resolves silently either way, so callers can't use this
 * endpoint to discover which emails are registered.
 * @param {Object} params
 * @param {string} params.email - Account email address.
 * @returns {Promise<void>}
 */
export const requestResetCode = async ({ email }) => {
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    return;
  }

  const resetCode = generateResetCode();
  // TODO: hash the reset code before storing once email delivery is wired up in prod.
  // const hashedResetCode = await argon2.hash(resetCode);
  const resetCodeExpires = new Date(Date.now() + RESET_CODE_EXPIRY_MINUTES * 60 * 1000);

  await prisma.user.update({
    where: { userId: user.userId },
    data: { resetCode, resetCodeExpires },
  });

  await sendResetCodeEmail({ to: user.email, resetCode });
};

/**
 * Resets a user's password using a previously issued reset code.
 * @param {Object} params
 * @param {string} params.email - Account email address.
 * @param {string} params.resetCode - The plaintext code issued by requestResetCode.
 * @param {string} params.newPassword - New plaintext password to hash and store.
 * @returns {Promise<void>}
 * @throws {AppError} INVALID_RESET_CODE - if the code is missing, wrong, or expired.
 */
export const resetPassword = async ({ email, resetCode, newPassword }) => {
  const user = await prisma.user.findUnique({ where: { email } });

  const hasUnexpiredResetCode = Boolean(user?.resetCode) && user.resetCodeExpires > new Date();
  // TODO: switch to argon2.verify(user.resetCode, resetCode) once reset codes are hashed in prod.
  // const isResetCodeValid = hasUnexpiredResetCode && (await argon2.verify(user.resetCode, resetCode));
  const isResetCodeValid = hasUnexpiredResetCode && user.resetCode === resetCode;

  if (!isResetCodeValid) {
    throw new AppError("Invalid or expired reset code.", {
      code: ErrorCodes.INVALID_RESET_CODE,
    });
  }

  const hashedPassword = await argon2.hash(newPassword);

  await prisma.user.update({
    where: { userId: user.userId },
    data: { password: hashedPassword, resetCode: null, resetCodeExpires: null },
  });
};
