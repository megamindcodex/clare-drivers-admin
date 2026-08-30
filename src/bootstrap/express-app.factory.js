import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import morgan from "morgan";

import authRoutes from "#routes/auth.routes.js";
import driverRoutes from "#routes/driver.routes.js";
import userRoutes from "#routes/user.routes.js";
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
  app.use(cors({ origin: env.clientOrigin, credentials: true }));
  app.use(morgan("dev")); // Logs incoming requests.
  app.use(express.json()); // Parses JSON request bodies.
  app.use(cookieParser()); // Parses cookies into req.cookies (used for the refresh token).

  app.use("/api/auth", authRoutes);
  app.use("/api/drivers", driverRoutes);
  app.use("/api/users", userRoutes);

  app.use(errorHandler);

  return app;
};

export default createExpressApp;
