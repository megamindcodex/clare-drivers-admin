import { prisma } from "#db/prisma/prisma.connection.js";
import { UserRole, UserStatus } from "#db/generated/prisma/client.js";
import { sendAdminPromotionEmail } from "#handlers/email/email-notification.handler.js";
import { AppError } from "#errors/app-error.js";
import { ErrorCodes } from "#errors/error-codes.js";

/** Fields safe to return from a user record — never the password or reset-code hashes. */
export const SAFE_USER_SELECT = {
  id: true,
  userId: true,
  username: true,
  email: true,
  role: true,
  status: true,
  lastLogin: true,
  createdAt: true,
  updatedAt: true,
};

/**
 * Throws if the given status is Suspended or Banned. Use this when the
 * caller's own user record has already been fetched for another reason
 * (e.g. login), to avoid a redundant lookup — otherwise use assertActiveUser.
 * @param {string} status - A UserStatus value.
 * @returns {void}
 * @throws {AppError} ACCOUNT_BANNED - if status is Banned.
 * @throws {AppError} ACCOUNT_SUSPENDED - if status is Suspended.
 */
export const assertActiveStatus = (status) => {
  if (status === UserStatus.Banned) {
    throw new AppError("This account has been banned.", {
      code: ErrorCodes.ACCOUNT_BANNED,
    });
  }

  if (status === UserStatus.Suspended) {
    throw new AppError("This account has been suspended.", {
      code: ErrorCodes.ACCOUNT_SUSPENDED,
    });
  }
};

/**
 * Fetches a caller's current status and throws if it's Suspended or Banned.
 * Call this at the top of every handler reached via an authenticated route,
 * so a suspension/ban takes effect immediately rather than waiting for the
 * caller's short-lived access token to expire.
 * @param {string} userId - The caller's ID, from the verified access token.
 * @returns {Promise<void>}
 * @throws {AppError} UNAUTHORIZED - if no user matches userId (e.g. deleted since the token was issued).
 * @throws {AppError} ACCOUNT_BANNED - if the caller has been banned.
 * @throws {AppError} ACCOUNT_SUSPENDED - if the caller has been suspended.
 */
export const assertActiveUser = async (userId) => {
  const user = await prisma.user.findUnique({ where: { userId }, select: { status: true } });

  if (!user) {
    throw new AppError("Account not found.", {
      code: ErrorCodes.UNAUTHORIZED,
    });
  }

  assertActiveStatus(user.status);
};

/**
 * Fetches every user that is not the SuperAdmin.
 * @param {string} callerUserId - The caller's ID, from the verified access token.
 * @returns {Promise<Array<Object>>} The matching user records.
 */
export const getUsers = async (callerUserId) => {
  await assertActiveUser(callerUserId);

  return prisma.user.findMany({
    where: { role: { not: UserRole.SuperAdmin } },
    select: SAFE_USER_SELECT,
  });
};

/**
 * Fetches a single non-SuperAdmin user's details by user ID.
 * @param {string} userId - The target user's UUID.
 * @param {string} callerUserId - The caller's ID, from the verified access token.
 * @returns {Promise<Object>} The matching user record.
 * @throws {AppError} NOT_FOUND - if no non-SuperAdmin user matches userId.
 */
export const getUserDetails = async (userId, callerUserId) => {
  await assertActiveUser(callerUserId);

  const user = await prisma.user.findFirst({
    where: { userId, role: { not: UserRole.SuperAdmin } },
    select: SAFE_USER_SELECT,
  });

  if (!user) {
    throw new AppError("User not found.", {
      code: ErrorCodes.NOT_FOUND,
    });
  }

  return user;
};

/**
 * Promotes a "User"-role account to "Admin", granting it RBAC-limited access.
 * @param {string} userId - The target user's UUID.
 * @param {string} callerUserId - The caller's ID, from the verified access token.
 * @returns {Promise<Object>} The updated user record.
 * @throws {AppError} NOT_FOUND - if no non-SuperAdmin user matches userId.
 */
export const promoteToAdmin = async (userId, callerUserId) => {
  await assertActiveUser(callerUserId);

  const user = await prisma.user.findFirst({
    where: { userId, role: { not: UserRole.SuperAdmin } },
  });

  if (!user) {
    throw new AppError("User not found.", {
      code: ErrorCodes.NOT_FOUND,
    });
  }

  const promotedUser = await prisma.user.update({
    where: { userId },
    data: { role: UserRole.Admin },
    select: SAFE_USER_SELECT,
  });

  await sendAdminPromotionEmail(promotedUser.email);

  return promotedUser;
};

/**
 * Suspends a non-SuperAdmin user, restricting most operations while still
 * allowing them to log in.
 * @param {string} userId - The target user's UUID.
 * @param {string} callerUserId - The caller's ID, from the verified access token.
 * @returns {Promise<Object>} The updated user record.
 * @throws {AppError} NOT_FOUND - if no non-SuperAdmin user matches userId.
 */
export const suspendUser = async (userId, callerUserId) => {
  await assertActiveUser(callerUserId);

  const user = await prisma.user.findFirst({
    where: { userId, role: { not: UserRole.SuperAdmin } },
  });

  if (!user) {
    throw new AppError("User not found.", {
      code: ErrorCodes.NOT_FOUND,
    });
  }

  return prisma.user.update({
    where: { userId },
    data: { status: UserStatus.Suspended },
    select: SAFE_USER_SELECT,
  });
};

/**
 * Bans a non-SuperAdmin user, preventing them from logging in at all.
 * @param {string} userId - The target user's UUID.
 * @param {string} callerUserId - The caller's ID, from the verified access token.
 * @returns {Promise<Object>} The updated user record.
 * @throws {AppError} NOT_FOUND - if no non-SuperAdmin user matches userId.
 */
export const banUser = async (userId, callerUserId) => {
  await assertActiveUser(callerUserId);

  const user = await prisma.user.findFirst({
    where: { userId, role: { not: UserRole.SuperAdmin } },
  });

  if (!user) {
    throw new AppError("User not found.", {
      code: ErrorCodes.NOT_FOUND,
    });
  }

  return prisma.user.update({
    where: { userId },
    data: { status: UserStatus.Banned },
    select: SAFE_USER_SELECT,
  });
};
