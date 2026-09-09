import {
  register as registerHandler,
  login as loginHandler,
  refreshAccessToken as refreshAccessTokenHandler,
  logout as logoutHandler,
  getProfile as getProfileHandler,
  requestResetCode as requestResetCodeHandler,
  resetPassword as resetPasswordHandler,
} from "#handlers/auth.handler.js";
import { sessionConfig } from "#configs/redis.config.js";
import { env } from "#configs/env.js";

const REFRESH_TOKEN_COOKIE_NAME = "refreshToken";

/**
 * Sets the refresh token as an httpOnly cookie, valid for the configured session TTL.
 * @param {import("express").Response} res
 * @param {string} refreshToken - The refresh token to set on the response.
 * @returns {void}
 */
const setRefreshTokenCookie = (res, refreshToken) => {
  res.cookie(REFRESH_TOKEN_COOKIE_NAME, refreshToken, {
    httpOnly: true,
    // Frontend and API are deployed on different origins — a cross-site
    // cookie requires SameSite=None, which browsers only honor alongside
    // Secure. Locally (same-origin, http://localhost) Lax + non-Secure
    // is what allows the cookie to work without HTTPS in dev.
    secure: env.nodeEnv === "production",
    sameSite: env.nodeEnv === "production" ? "none" : "lax",
    maxAge: sessionConfig.ttlSeconds * 1000,
  });
};

/**
 * Registers a new account from the validated request body.
 * @type {import("express").RequestHandler}
 */
export const register = async (req, res, next) => {
  try {
    const user = await registerHandler(req.validated.body);
    return res.status(201).json({ data: { user } });
  } catch (error) {
    return next(error);
  }
};

/**
 * Authenticates a user from the validated request body.
 * @type {import("express").RequestHandler}
 */
export const login = async (req, res, next) => {
  try {
    const { user, accessToken, refreshToken } = await loginHandler({
      ...req.validated.body,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
      deviceId: req.headers["x-device-id"],
    });
    setRefreshTokenCookie(res, refreshToken);
    return res.status(200).json({ data: { user, accessToken } });
  } catch (error) {
    return next(error);
  }
};

/**
 * Issues a new access token using the refresh token stored in the session cookie.
 * @type {import("express").RequestHandler}
 */
export const refreshAccessToken = async (req, res, next) => {
  try {
    const { accessToken } = await refreshAccessTokenHandler(req.cookies?.[REFRESH_TOKEN_COOKIE_NAME]);
    return res.status(200).json({ data: { accessToken } });
  } catch (error) {
    return next(error);
  }
};

/**
 * Logs out a user by deleting their session and clearing the refresh token cookie.
 * @type {import("express").RequestHandler}
 */
export const logout = async (req, res, next) => {
  try {
    await logoutHandler(req.cookies?.[REFRESH_TOKEN_COOKIE_NAME]);
    res.clearCookie(REFRESH_TOKEN_COOKIE_NAME);
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
};

/**
 * Fetches the currently authenticated user's own profile, using the ID from
 * the verified access token (set by the `authenticate` middleware).
 * @type {import("express").RequestHandler}
 */
export const getProfile = async (req, res, next) => {
  try {
    const user = await getProfileHandler(req.user.userId);
    return res.status(200).json({ data: { user } });
  } catch (error) {
    return next(error);
  }
};

/**
 * Issues a password reset code for the email in the validated request body.
 * @type {import("express").RequestHandler}
 */
export const requestResetCode = async (req, res, next) => {
  try {
    await requestResetCodeHandler(req.validated.body);
    return res.status(200).json({
      data: { message: "If that email is registered, a reset code has been sent." },
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * Resets a user's password using the reset code in the validated request body.
 * @type {import("express").RequestHandler}
 */
export const resetPassword = async (req, res, next) => {
  try {
    await resetPasswordHandler(req.validated.body);
    return res.status(200).json({ data: { message: "Password reset successfully." } });
  } catch (error) {
    return next(error);
  }
};
