import { UserRole } from "#db/generated/prisma/client.js";

/**
 * Registered permissions, named "resource:action". A "resource" isn't
 * necessarily a database table — it can also be an operation (e.g. reading a
 * driver's uploaded documents is a distinct permission from reading the
 * driver record itself). Add new permissions here as new gated actions are
 * introduced — do not invent inline permission strings at the call site.
 */
export const Permissions = {
  DRIVER_READ: "driver:read",
  DRIVER_READ_DOCUMENTS: "driver:read-documents",
  DRIVER_APPROVE: "driver:approve",
  USER_READ: "user:read",
  USER_PROMOTE: "user:promote",
  USER_SUSPEND: "user:suspend",
  USER_BAN: "user:ban",
};

/**
 * Permission wildcard: a role whose permission list includes this is allowed
 * everything, without needing every individual permission listed out. Only
 * SuperAdmin should carry it — this is what keeps SuperAdmin from silently
 * losing access whenever a new permission is added elsewhere in the app.
 */
export const PERMISSION_WILDCARD = "*";

/**
 * Maps each user role to the permissions it's granted. Add an entry to the
 * relevant role's list whenever a new permission is added to Permissions
 * above — SuperAdmin is exempt via the wildcard. Role "User" is deliberately
 * empty: a freshly-registered account has no permissions at all until
 * SuperAdmin promotes it to "Admin" — the only thing it can reach is its own
 * profile (GET /me), which isn't permission-gated at all (see auth.routes.js).
 * @type {Record<string, string[]>}
 */
export const RolePermissions = {
  [UserRole.SuperAdmin]: [PERMISSION_WILDCARD],
  [UserRole.Admin]: [
    Permissions.DRIVER_READ,
    Permissions.DRIVER_READ_DOCUMENTS,
    Permissions.DRIVER_APPROVE,
    Permissions.USER_READ,
  ],
  [UserRole.User]: [],
};
