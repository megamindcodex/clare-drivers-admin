import {
  getUsers as getUsersHandler,
  getUserDetails as getUserDetailsHandler,
  promoteToAdmin as promoteToAdminHandler,
  suspendUser as suspendUserHandler,
  banUser as banUserHandler,
} from "#handlers/user.handler.js";

/**
 * Fetches every non-SuperAdmin user.
 * @type {import("express").RequestHandler}
 */
export const getUsers = async (req, res, next) => {
  try {
    const users = await getUsersHandler(req.user.userId);
    return res.status(200).json({ data: { users } });
  } catch (error) {
    return next(error);
  }
};

/**
 * Fetches a single non-SuperAdmin user's details by the user ID in the
 * validated route params.
 * @type {import("express").RequestHandler}
 */
export const getUserDetails = async (req, res, next) => {
  try {
    const user = await getUserDetailsHandler(req.validated.params.userId, req.user.userId);
    return res.status(200).json({ data: { user } });
  } catch (error) {
    return next(error);
  }
};

/**
 * Promotes a "User"-role account to "Admin", identified by the user ID in
 * the validated route params.
 * @type {import("express").RequestHandler}
 */
export const promoteToAdmin = async (req, res, next) => {
  try {
    const user = await promoteToAdminHandler(req.validated.params.userId, req.user.userId);
    return res.status(200).json({ data: { user } });
  } catch (error) {
    return next(error);
  }
};

/**
 * Suspends the user identified by the validated route params.
 * @type {import("express").RequestHandler}
 */
export const suspendUser = async (req, res, next) => {
  try {
    const user = await suspendUserHandler(req.validated.params.userId, req.user.userId);
    return res.status(200).json({ data: { user } });
  } catch (error) {
    return next(error);
  }
};

/**
 * Bans the user identified by the validated route params.
 * @type {import("express").RequestHandler}
 */
export const banUser = async (req, res, next) => {
  try {
    const user = await banUserHandler(req.validated.params.userId, req.user.userId);
    return res.status(200).json({ data: { user } });
  } catch (error) {
    return next(error);
  }
};
