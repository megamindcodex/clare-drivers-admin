import { Router } from "express";

import {
  getDrivers,
  getDriverById,
  getDriverDocument,
  updateApproveField,
  getActiveDrivers,
  getActiveDriverById,
} from "#controllers/driver.controller.js";
import { validateRequest } from "#middlewares/validate-request.middleware.js";
import { authenticate } from "#middlewares/auth.middleware.js";
import { requirePermission } from "#middlewares/permission.middleware.js";
import { Permissions } from "#constants/permission.constant.js";
import {
  getDriversSchema,
  getDriverByIdSchema,
  getDriverDocumentSchema,
  updateApproveFieldSchema,
  getActiveDriversSchema,
  getActiveDriverByIdSchema,
} from "#validators/driver.validator.js";

/**
 * Driver resource routes: listing, detail lookup, document lookup,
 * approval-status updates, and active (live-tracked) driver lookups. Every
 * route requires authentication and the matching permission. The "/active"
 * routes are registered before "/:driverId" so their literal segment isn't
 * shadowed by the dynamic param route.
 * @type {import("express").Router}
 */
const router = Router();

router.get(
  "/",
  authenticate,
  requirePermission(Permissions.DRIVER_READ),
  validateRequest(getDriversSchema),
  getDrivers
);
router.get(
  "/active",
  authenticate,
  requirePermission(Permissions.DRIVER_READ),
  validateRequest(getActiveDriversSchema),
  getActiveDrivers
);
router.get(
  "/active/:driverId",
  authenticate,
  requirePermission(Permissions.DRIVER_READ),
  validateRequest(getActiveDriverByIdSchema),
  getActiveDriverById
);
router.get(
  "/:driverId",
  authenticate,
  requirePermission(Permissions.DRIVER_READ),
  validateRequest(getDriverByIdSchema),
  getDriverById
);
router.get(
  "/:driverId/documents",
  authenticate,
  requirePermission(Permissions.DRIVER_READ_DOCUMENTS),
  validateRequest(getDriverDocumentSchema),
  getDriverDocument
);
router.patch(
  "/:driverId/approve",
  authenticate,
  requirePermission(Permissions.DRIVER_APPROVE),
  validateRequest(updateApproveFieldSchema),
  updateApproveField
);

export default router;
