import { Router } from "express";

import {
  getUsers,
  getUserDetails,
  promoteToAdmin,
  suspendUser,
  banUser,
} from "#controllers/user.controller.js";
import { validateRequest } from "#middlewares/validate-request.middleware.js";
import { authenticate } from "#middlewares/auth.middleware.js";
import { requirePermission } from "#middlewares/permission.middleware.js";
import { Permissions } from "#constants/permission.constant.js";
import {
  getUsersSchema,
  getUserDetailsSchema,
  promoteUserSchema,
  suspendUserSchema,
  banUserSchema,
} from "#validators/user.validator.js";

/**
 * User resource routes: listing, detail lookup, promotion to Admin,
 * suspension, and banning of non-SuperAdmin users. Every route requires
 * authentication and the matching permission.
 * @type {import("express").Router}
 */
const router = Router();

router.get("/", authenticate, requirePermission(Permissions.USER_READ), validateRequest(getUsersSchema), getUsers);
router.get(
  "/:userId",
  authenticate,
  requirePermission(Permissions.USER_READ),
  validateRequest(getUserDetailsSchema),
  getUserDetails
);
router.patch(
  "/:userId/promote",
  authenticate,
  requirePermission(Permissions.USER_PROMOTE),
  validateRequest(promoteUserSchema),
  promoteToAdmin
);
router.patch(
  "/:userId/suspend",
  authenticate,
  requirePermission(Permissions.USER_SUSPEND),
  validateRequest(suspendUserSchema),
  suspendUser
);
router.patch(
  "/:userId/ban",
  authenticate,
  requirePermission(Permissions.USER_BAN),
  validateRequest(banUserSchema),
  banUser
);

export default router;
