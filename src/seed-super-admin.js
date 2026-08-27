import argon2 from "argon2";

import { prisma } from "#db/prisma/prisma.connection.js";
import { UserRole } from "#db/generated/prisma/client.js";
import { env } from "#configs/env.js";
import { logger } from "#configs/logger.js";

/**
 * Creates the first SuperAdmin from the SUPER_ADMIN_* env vars, unless a
 * SuperAdmin already exists in the database (in which case this is a no-op).
 * Called once at application startup, after Prisma is connected.
 * @returns {Promise<void>}
 * @throws {Error} if no SuperAdmin exists yet and SUPER_ADMIN_USERNAME/SUPER_ADMIN_EMAIL/SUPER_ADMIN_PASSWORD
 *   aren't all set.
 */
export const seedSuperAdmin = async () => {
  const existingSuperAdmin = await prisma.user.findFirst({ where: { role: UserRole.SuperAdmin } });

  if (existingSuperAdmin) {
    logger.info("SuperAdmin already exists — skipping seed.");
    return;
  }

  const { superAdminUsername, superAdminEmail, superAdminPassword } = env;

  if (!superAdminUsername || !superAdminEmail || !superAdminPassword) {
    throw new Error(
      "No SuperAdmin exists yet, and SUPER_ADMIN_USERNAME/SUPER_ADMIN_EMAIL/SUPER_ADMIN_PASSWORD are not set."
    );
  }

  const hashedPassword = await argon2.hash(superAdminPassword);

  await prisma.user.create({
    data: {
      username: superAdminUsername,
      email: superAdminEmail,
      password: hashedPassword,
      role: UserRole.SuperAdmin,
    },
  });

  logger.info(`SuperAdmin account created for ${superAdminEmail}.`);
};
