import { AppError } from "#errors/app-error.js";
import { logger } from "#configs/logger.js";

/**
 * Centralized Express error-handling middleware, mounted last in the
 * middleware chain. Logs non-operational/unexpected errors and responds
 * with the standard `{ error }` envelope, including `details` when the
 * thrown `AppError` carries any (e.g. per-field validation messages).
 * @param {Error|import("#errors/app-error.js").AppError} err - The error passed via `next(error)`.
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @param {import("express").NextFunction} next
 * @returns {import("express").Response} The JSON error response.
 */
export const errorHandler = (err, req, res, next) => {
  const isAppError = err instanceof AppError;
  const statusCode = isAppError ? err.statusCode : 500;
  const code = isAppError ? err.code : "INTERNAL_ERROR";

  if (!isAppError || !err.isOperational) {
    logger.error(err);
  }

  return res.status(statusCode).json({
    error: {
      code,
      message: isAppError ? err.message : "Something went wrong.",
      ...(isAppError && err.details && { details: err.details }),
    },
  });
};
