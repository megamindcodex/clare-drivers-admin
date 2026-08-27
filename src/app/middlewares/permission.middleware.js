import { RolePermissions, PERMISSION_WILDCARD } from "#constants/permission.constant.js";
import { AppError } from "#errors/app-error.js";
import { ErrorCodes } from "#errors/error-codes.js";

/**
 * Builds an Express middleware that only allows the request through if the
 * authenticated user's role (set on `req.user` by `authenticate`) has the
 * given permission. Must be mounted after `authenticate` on a route.
 * @param {string} permission - The required permission, e.g. "driver:approve" (see Permissions).
 * @returns {import("express").RequestHandler} Middleware that calls `next` with a
 *   `FORBIDDEN` AppError when the user's role lacks the permission.
 */
export const requirePermission = (permission) => (req, res, next) => {
  const rolePermissions = RolePermissions[req.user?.role] ?? [];
  const isAllowed = rolePermissions.includes(PERMISSION_WILDCARD) || rolePermissions.includes(permission);

  if (!isAllowed) {
    return next(
      new AppError("You do not have permission to perform this action.", {
        code: ErrorCodes.FORBIDDEN,
      })
    );
  }

  return next();
};
