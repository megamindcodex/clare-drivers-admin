import {
  getDrivers as getDriversHandler,
  getDriverById as getDriverByIdHandler,
  getDriverDocument as getDriverDocumentHandler,
  updateApproveField as updateApproveFieldHandler,
  getActiveDrivers as getActiveDriversHandler,
  getActiveDriverById as getActiveDriverByIdHandler,
} from "#handlers/driver.handler.js";

/**
 * Fetches drivers, optionally narrowed by the validated query filters.
 * @type {import("express").RequestHandler}
 */
export const getDrivers = async (req, res, next) => {
  try {
    const drivers = await getDriversHandler(req.validated.query, req.user.userId);
    return res.status(200).json({ data: { drivers } });
  } catch (error) {
    return next(error);
  }
};

/**
 * Fetches a single driver by the driver ID in the validated route params.
 * @type {import("express").RequestHandler}
 */
export const getDriverById = async (req, res, next) => {
  try {
    const driver = await getDriverByIdHandler(req.validated.params.driverId, req.user.userId);
    return res.status(200).json({ data: { driver } });
  } catch (error) {
    return next(error);
  }
};

/**
 * Fetches a driver's documents by the driver ID in the validated route params.
 * @type {import("express").RequestHandler}
 */
export const getDriverDocument = async (req, res, next) => {
  try {
    const document = await getDriverDocumentHandler(req.validated.params.driverId, req.user.userId);
    return res.status(200).json({ data: { document } });
  } catch (error) {
    return next(error);
  }
};

/**
 * Updates a driver's approval status from the validated route params and body.
 * @type {import("express").RequestHandler}
 */
export const updateApproveField = async (req, res, next) => {
  try {
    const { driverId } = req.validated.params;
    const { isApproved } = req.validated.body;
    const driver = await updateApproveFieldHandler({ driverId, isApproved, callerUserId: req.user.userId });
    return res.status(200).json({ data: { driver } });
  } catch (error) {
    return next(error);
  }
};

/**
 * Fetches active drivers, optionally narrowed by the validated query filters.
 * @type {import("express").RequestHandler}
 */
export const getActiveDrivers = async (req, res, next) => {
  try {
    const activeDrivers = await getActiveDriversHandler(req.validated.query, req.user.userId);
    return res.status(200).json({ data: { activeDrivers } });
  } catch (error) {
    return next(error);
  }
};

/**
 * Fetches a single active driver by the driver ID in the validated route params.
 * @type {import("express").RequestHandler}
 */
export const getActiveDriverById = async (req, res, next) => {
  try {
    const activeDriver = await getActiveDriverByIdHandler(req.validated.params.driverId, req.user.userId);
    return res.status(200).json({ data: { activeDriver } });
  } catch (error) {
    return next(error);
  }
};
