import { Router } from "express";

import { getOverview } from "#controllers/overview.controller.js";
import { authenticate } from "#middlewares/auth.middleware.js";
import { requirePermission } from "#middlewares/permission.middleware.js";
import { Permissions } from "#constants/permission.constant.js";

/**
 * Overview/dashboard metrics route. Requires authentication and `overview:read`.
 * @type {import("express").Router}
 */
const router = Router();

router.get("/", authenticate, requirePermission(Permissions.OVERVIEW_READ), getOverview);

export default router;
