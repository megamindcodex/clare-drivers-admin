import { AppError } from "#errors/app-error.js";
import { ErrorCodes } from "#errors/error-codes.js";

/**
 * Builds an Express middleware that validates `req.body`/`req.params`/`req.query`
 * against a Zod schema, attaching the parsed result to `req.validated`.
 * @param {import("zod").ZodType} schema - Schema expecting `{ body, params, query }`.
 * @returns {import("express").RequestHandler} Middleware that validates the request and
 *   calls `next` with a `VALIDATION_ERROR` AppError when validation fails.
 */
export const validateRequest = (schema) => (req, res, next) => {
  const result = schema.safeParse({
    body: req.body,
    params: req.params,
    query: req.query,
  });

  if (!result.success) {
    return next(
      new AppError("Invalid request payload.", {
        code: ErrorCodes.VALIDATION_ERROR,
        details: result.error.format(),
      })
    );
  }

  req.validated = result.data;
  return next();
};
