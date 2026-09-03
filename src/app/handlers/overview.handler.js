import { prisma } from "#db/prisma/prisma.connection.js";
import { assertActiveUser } from "#handlers/user.handler.js";
import { DriverVerificationStatus, UserRole, UserStatus } from "#db/generated/prisma/client.js";

/**
 * Reads a `_count` value out of a `groupBy` result for a given group key,
 * defaulting to 0 when the group is absent (e.g. no driver currently has
 * that isApproved value).
 * @param {Array<Object>} groups - The result of a `prisma.<model>.groupBy` call.
 * @param {string} field - The field the groups are keyed by.
 * @param {*} value - The group value to look up.
 * @returns {number} The count for that group, or 0 if it doesn't appear.
 */
const countFor = (groups, field, value) => {
  return groups.find((group) => group[field] === value)?._count ?? 0;
};

/**
 * Computes aggregated dashboard/overview metrics across drivers, active
 * (live-tracked) drivers, and admins, using only COUNT/GROUP BY aggregate
 * queries — never by fetching full rows and counting in application code.
 * `drivers.active` is sourced from the `active_drivers` table (same count as
 * `activeDrivers.total`), not from `Driver.status`; `drivers.inactive` still
 * comes from `Driver.status`.
 * @param {string} callerUserId - The caller's ID, from the verified access token.
 * @returns {Promise<Object>} The aggregated overview metrics.
 */
export const getOverview = async (callerUserId) => {
  await assertActiveUser(callerUserId);

  const [driverTotal, isApprovedGroups, isVerifiedGroups, statusGroups, activeDriverTotal, adminTotal, adminStatusGroups] =
    await Promise.all([
      prisma.driver.count(),
      prisma.driver.groupBy({ by: ["isApproved"], _count: true }),
      prisma.driver.groupBy({ by: ["isVerified"], _count: true }),
      prisma.driver.groupBy({ by: ["status"], _count: true }),
      prisma.activeDrivers.count(),
      prisma.user.count({ where: { role: { not: UserRole.SuperAdmin } } }),
      prisma.user.groupBy({ by: ["status"], where: { role: { not: UserRole.SuperAdmin } }, _count: true }),
    ]);

  return {
    drivers: {
      total: driverTotal,
      approved: countFor(isApprovedGroups, "isApproved", DriverVerificationStatus.Approved),
      pending: countFor(isApprovedGroups, "isApproved", DriverVerificationStatus.Pending),
      rejected: countFor(isApprovedGroups, "isApproved", DriverVerificationStatus.Rejected),
      notSubmitted: countFor(isApprovedGroups, "isApproved", DriverVerificationStatus.False),
      verified: countFor(isVerifiedGroups, "isVerified", true),
      unverified: countFor(isVerifiedGroups, "isVerified", false),
      active: activeDriverTotal,
      inactive: countFor(statusGroups, "status", "inactive"),
    },
    activeDrivers: {
      total: activeDriverTotal,
    },
    admins: {
      total: adminTotal,
      active: countFor(adminStatusGroups, "status", UserStatus.Active),
      suspended: countFor(adminStatusGroups, "status", UserStatus.Suspended),
      banned: countFor(adminStatusGroups, "status", UserStatus.Banned),
    },
  };
};
