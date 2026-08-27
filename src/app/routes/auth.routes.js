import { Router } from "express";

import {
  register,
  login,
  refreshAccessToken,
  logout,
  getProfile,
  requestResetCode,
  resetPassword,
} from "#controllers/auth.controller.js";
import { validateRequest } from "#middlewares/validate-request.middleware.js";
import { authenticate } from "#middlewares/auth.middleware.js";
import {
  registerUserSchema,
  loginSchema,
  requestResetCodeSchema,
  resetPasswordSchema,
} from "#validators/auth.validator.js";

/**
 * Authentication routes: registration, login, access token refresh,
 * own-profile lookup, and password reset. GET /me is deliberately not
 * permission-gated — every role (including "User", which has no RBAC
 * permissions at all) can reach it, since a suspended/banned account is
 * already blocked inside getProfile itself.
 * @type {import("express").Router}
 */
const router = Router();

router.post("/register", validateRequest(registerUserSchema), register);
router.post("/login", validateRequest(loginSchema), login);
router.post("/refresh-token", refreshAccessToken);
router.post("/logout", logout);
router.get("/me", authenticate, getProfile);
router.post("/password/reset-code", validateRequest(requestResetCodeSchema), requestResetCode);
router.patch("/password", validateRequest(resetPasswordSchema), resetPassword);

export default router;
