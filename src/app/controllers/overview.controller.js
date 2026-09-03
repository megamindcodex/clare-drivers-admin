import { getOverview as getOverviewHandler } from "#handlers/overview.handler.js";

/**
 * Fetches aggregated dashboard/overview metrics for the caller.
 * @type {import("express").RequestHandler}
 */
export const getOverview = async (req, res, next) => {
  try {
    const overview = await getOverviewHandler(req.user.userId);
    return res.status(200).json({ data: { overview } });
  } catch (error) {
    return next(error);
  }
};
