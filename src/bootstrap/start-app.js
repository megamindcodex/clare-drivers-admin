import connectMongoDb from "#db/mongodb/mongodb.connection.js";
import { connectRedis } from "#db/redis/redis.connection.js";
import connectPrisma from "#db/prisma/prisma.connection.js";
import { env } from "#configs/env.js";
import { logger } from "#configs/logger.js";

import createExpressApp from "./express-app.factory.js";
import { seedSuperAdmin } from "./seed-super-admin.js";
import { crashAndExit } from "./crash-and-exit.js";

/**
 * Application entry point: connects MongoDB, Redis, and Prisma/MySQL, seeds
 * the first SuperAdmin if one doesn't exist yet, then starts the Express server.
 * @returns {Promise<void>}
 */
export const startApp = async () => {
  try {
    await connectMongoDb();
    await connectRedis();
    await connectPrisma();
  } catch (error) {
    await crashAndExit("A required service failed to connect", error);
  }

  await seedSuperAdmin();

  const app = createExpressApp();

  app.listen(env.port, () => {
    logger.info(`Server listening on port ${env.port}`);
  });
};
