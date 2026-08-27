import jwt from "jsonwebtoken";

import { jwtConfig } from "#configs/jwt.config.js";

/**
 * Signs a short-lived access token containing the user's ID, email, and role.
 * @param {Object} params
 * @param {string} params.userId - The authenticated user's ID.
 * @param {string} params.email - The authenticated user's email.
 * @param {string} params.role - The authenticated user's role.
 * @returns {string} The signed JWT access token.
 */
export const generateAccessToken = ({ userId, email, role }) => {
  return jwt.sign({ userId, email, role }, jwtConfig.secret, {
    expiresIn: jwtConfig.accessTokenExpiresIn,
  });
};

/**
 * Verifies an access token and returns its decoded payload.
 * @param {string} accessToken - The JWT access token to verify.
 * @returns {{ userId: string, email: string, role: string, iat: number, exp: number }} The decoded token payload.
 * @throws {jwt.JsonWebTokenError} if the token is malformed or has an invalid signature.
 * @throws {jwt.TokenExpiredError} if the token has expired.
 */
export const verifyAccessToken = (accessToken) => {
  return jwt.verify(accessToken, jwtConfig.secret);
};
