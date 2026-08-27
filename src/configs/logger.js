import winston from "winston";

import { env } from "#configs/env.js";

/**
 * Application-wide Winston logger. Logs at "debug" level outside production
 * and "info" in production, formatted as timestamped JSON to the console.
 * @type {import("winston").Logger}
 */
export const logger = winston.createLogger({
  level: env.nodeEnv === "production" ? "info" : "debug",
  format: winston.format.combine(
    winston.format.errors({ stack: true }),
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [new winston.transports.Console()],
});
