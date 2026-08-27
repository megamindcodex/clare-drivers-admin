import jwt from "jsonwebtoken";

import { verifyAccessToken } from "#utils/jwt.util.js";
import { AppError } from "#errors/app-error.js";
import { ErrorCodes } from "#errors/error-codes.js";

const BEARER_PREFIX = "Bearer ";

/**
 * Express middleware that verifies the access token in the Authorization
 * header and attaches the decoded `{ userId, email, role }` payload to `req.user`.
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @param {import("express").NextFunction} next
 * @returns {void}
 */
export const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith(BEARER_PREFIX)) {
    return next(
      new AppError("Missing access token.", {
        code: ErrorCodes.ACCESS_TOKEN_MISSING,
      })
    );
  }

  const accessToken = authHeader.slice(BEARER_PREFIX.length);

  try {
    const { userId, email, role } = verifyAccessToken(accessToken);
    req.user = { userId, email, role };
    return next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return next(
        new AppError("Access token has expired.", {
          code: ErrorCodes.ACCESS_TOKEN_EXPIRED,
        })
      );
    }

    return next(
      new AppError("Invalid access token.", {
        code: ErrorCodes.ACCESS_TOKEN_INVALID,
      })
    );
  }
};
