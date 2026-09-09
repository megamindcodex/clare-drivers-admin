import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import morgan from "morgan";

import authRoutes from "#routes/auth.routes.js";
import driverRoutes from "#routes/driver.routes.js";
import userRoutes from "#routes/user.routes.js";
import overviewRoutes from "#routes/overview.routes.js";
import { errorHandler } from "#errors/error-handler.middleware.js";
import { env } from "#configs/env.js";

/**
 * Builds and configures the Express application: security headers (helmet),
 * CORS, request logging (morgan), JSON body parsing, cookie parsing, mounted
 * routes, and the centralized error handler.
 * @returns {import("express").Express} The configured Express app, ready to `listen`.
 */
const createExpressApp = () => {
  /** @type {import("express").Express} */
  const app = express();

  app.use(helmet()); // Sets security-related HTTP headers.
  // credentials: true + an explicit (non-wildcard) origin is required so the
  // browser will accept the response to a `withCredentials: true` request —
  // that's what lets the frontend send/receive the httpOnly refreshToken cookie.
  // cors() accepts an array directly and reflects back whichever entry
  // matches the request's Origin header.
  app.use(cors({ origin: env.clientOrigins, credentials: true }));
  app.use(morgan("dev")); // Logs incoming requests.
  app.use(express.json()); // Parses JSON request bodies.
  app.use(cookieParser()); // Parses cookies into req.cookies (used for the refresh token).

  // Unauthenticated, unversioned — pinged by an external uptime cron
  // (cron-job.org) to keep Render's free-tier instance from spinning down.
  app.get("/health", (req, res) => res.status(200).send("ok"));

  app.use("/api/auth", authRoutes);
  app.use("/api/drivers", driverRoutes);
  app.use("/api/users", userRoutes);
  app.use("/api/overview", overviewRoutes);

  app.use(errorHandler);

  return app;
};

export default createExpressApp;
