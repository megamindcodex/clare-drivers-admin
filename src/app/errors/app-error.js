import { ErrorStatusCodes } from "./error-codes.js";

/**
 * The application's single custom error type. Every deliberately-thrown
 * error is an instance of this class, distinguished by its `code` rather
 * than by subclassing.
 */
export class AppError extends Error {
  /**
   * @param {string} message - Human-readable error message.
   * @param {Object} [options]
   * @param {number} [options.statusCode] - HTTP status code to respond with. Defaults to
   *   `ErrorStatusCodes[code]`, falling back to 500 if `code` isn't registered there.
   * @param {string} [options.code="INTERNAL_ERROR"] - Registered error code (see ErrorCodes).
   * @param {boolean} [options.isOperational=true] - Whether this is an expected, handled failure.
   * @param {*} [options.details] - Additional error context (e.g. validation details).
   */
  constructor(message, { statusCode, code = "INTERNAL_ERROR", isOperational = true, details } = {}) {
    super(message);
    this.name = "AppError";
    this.code = code;
    // Only explicit statusCode overrides the code's canonical status — this keeps every
    // throw site for a given code on the same status without repeating it everywhere.
    this.statusCode = statusCode ?? ErrorStatusCodes[code] ?? 500;
    this.isOperational = isOperational;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}
