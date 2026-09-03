export const ErrorCodes = {
  VALIDATION_ERROR: "VALIDATION_ERROR",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  CONFLICT: "CONFLICT",
  INTERNAL_ERROR: "INTERNAL_ERROR",
  INVALID_CREDENTIALS: "INVALID_CREDENTIALS",
  ACCOUNT_BANNED: "ACCOUNT_BANNED",
  ACCOUNT_SUSPENDED: "ACCOUNT_SUSPENDED",
  INVALID_RESET_CODE: "INVALID_RESET_CODE",
  ACCESS_TOKEN_MISSING: "ACCESS_TOKEN_MISSING",
  ACCESS_TOKEN_EXPIRED: "ACCESS_TOKEN_EXPIRED",
  ACCESS_TOKEN_INVALID: "ACCESS_TOKEN_INVALID",
  SESSION_NOT_FOUND: "SESSION_NOT_FOUND",
  INVALID_APPROVAL_TRANSITION: "INVALID_APPROVAL_TRANSITION",
};

/**
 * Canonical HTTP status code for each error code. `AppError` uses this to
 * default `statusCode` when it isn't explicitly passed, so a given code can
 * never end up paired with the wrong status at two different throw sites.
 * @type {Record<string, number>}
 */
// Add an entry here whenever a new error code is added to ErrorCodes above,
// so every throw site for that code stays on the same status by default.
export const ErrorStatusCodes = {
  [ErrorCodes.VALIDATION_ERROR]: 422,
  [ErrorCodes.UNAUTHORIZED]: 401,
  [ErrorCodes.FORBIDDEN]: 403,
  [ErrorCodes.NOT_FOUND]: 404,
  [ErrorCodes.CONFLICT]: 409,
  [ErrorCodes.INTERNAL_ERROR]: 500,
  [ErrorCodes.INVALID_CREDENTIALS]: 401,
  [ErrorCodes.ACCOUNT_BANNED]: 403,
  [ErrorCodes.ACCOUNT_SUSPENDED]: 403,
  [ErrorCodes.INVALID_RESET_CODE]: 401,
  [ErrorCodes.ACCESS_TOKEN_MISSING]: 401,
  [ErrorCodes.ACCESS_TOKEN_EXPIRED]: 401,
  [ErrorCodes.ACCESS_TOKEN_INVALID]: 401,
  [ErrorCodes.SESSION_NOT_FOUND]: 401,
  [ErrorCodes.INVALID_APPROVAL_TRANSITION]: 409,
};
