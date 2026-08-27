import dotenv from "dotenv";

/**
 * Loads variables from a `.env` file into `process.env`, if present.
 */
dotenv.config();

const requiredEnvVars = ["PORT", "MONGODB_URI", "REDIS_URL", "DATABASE_URL", "JWT_SECRET"];

/**
 * Fails fast at startup if any critical environment variable is missing.
 * @returns {void}
 * @throws {Error} if one or more variables in `requiredEnvVars` are unset.
 */
const validateEnv = () => {
  const missingVars = requiredEnvVars.filter((key) => !process.env[key]);

  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(", ")}`);
  }
};

validateEnv();

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 4000),
  clientOrigin: process.env.CLIENT_ORIGIN ?? "http://localhost:5173",
  mongodbUri: process.env.MONGODB_URI,
  redisUrl: process.env.REDIS_URL,
  sessionTtlSeconds: Number(process.env.SESSION_TTL_SECONDS ?? 43200),
  jwtSecret: process.env.JWT_SECRET,
  accessTokenExpiresIn: process.env.ACCESS_TOKEN_EXPIRES_IN ?? "5m",
  databaseUrl: process.env.DATABASE_URL,
  superAdminUsername: process.env.SUPER_ADMIN_USERNAME,
  superAdminEmail: process.env.SUPER_ADMIN_EMAIL,
  superAdminPassword: process.env.SUPER_ADMIN_PASSWORD,
};
