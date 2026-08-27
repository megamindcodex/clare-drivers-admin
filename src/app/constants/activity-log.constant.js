/**
 * Who performed a logged action.
 */
export const ActivityActorType = {
  ADMIN: "Admin",
  DRIVER: "Driver",
  SYSTEM: "System",
};

/**
 * The type of resource a logged action was performed against.
 */
export const ActivityTargetType = {
  DRIVER: "Driver",
  DRIVER_DOCUMENTS: "DriverDocuments",
  ADMIN: "Admin",
  ACTIVE_DRIVERS: "ActiveDrivers",
};

/**
 * Outcome of a logged action.
 */
export const ActivityStatus = {
  SUCCESS: "Success",
  FAILURE: "Failure",
};

/**
 * Registered activity action codes. Add new codes here as new loggable
 * actions are introduced — do not invent inline string literals at the call site.
 */
export const ActivityAction = {
  DRIVER_CREATED: "DRIVER_CREATED",
  DRIVER_UPDATED: "DRIVER_UPDATED",
  DRIVER_APPROVED: "DRIVER_APPROVED",
  DRIVER_REJECTED: "DRIVER_REJECTED",
  DRIVER_SUSPENDED: "DRIVER_SUSPENDED",
  DRIVER_REACTIVATED: "DRIVER_REACTIVATED",
  DRIVER_DELETED: "DRIVER_DELETED",

  DRIVER_DOCUMENT_UPLOADED: "DRIVER_DOCUMENT_UPLOADED",
  DRIVER_DOCUMENT_APPROVED: "DRIVER_DOCUMENT_APPROVED",
  DRIVER_DOCUMENT_REJECTED: "DRIVER_DOCUMENT_REJECTED",

  ADMIN_CREATED: "ADMIN_CREATED",
  ADMIN_UPDATED: "ADMIN_UPDATED",
  ADMIN_LOGIN_SUCCESS: "ADMIN_LOGIN_SUCCESS",
  ADMIN_LOGIN_FAILED: "ADMIN_LOGIN_FAILED",
  ADMIN_LOGOUT: "ADMIN_LOGOUT",
  ADMIN_PASSWORD_RESET: "ADMIN_PASSWORD_RESET",
};
