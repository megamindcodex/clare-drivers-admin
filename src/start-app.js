import startExpressApp from "./start-express.js";
import { seedSuperAdmin } from "./seed-super-admin.js";
import connectMongoDb from "#db/mongodb/mongodb.connection.js";
import { connectRedis } from "#db/redis/redis.connection.js";
import connectPrisma from "#db/prisma/prisma.connection.js";
import { env } from "#configs/env.js";
import { logger } from "#configs/logger.js";

/**
 * Application entry point: connects MongoDB, Redis, and Prisma/MySQL, seeds
 * the first SuperAdmin if one doesn't exist yet, then starts the Express server.
 * @returns {Promise<void>}
 */
export const startApp = async () => {
  await connectMongoDb();
  await connectRedis();
  await connectPrisma();
  await seedSuperAdmin();

  const app = startExpressApp();

  app.listen(env.port, () => {
    logger.info(`Server listening on port ${env.port}`);
  });
};
