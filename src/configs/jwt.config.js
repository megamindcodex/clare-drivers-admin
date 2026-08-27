import { env } from "#configs/env.js";

/**
 * JWT configuration for signing and verifying access tokens.
 * @type {{ secret: string, accessTokenExpiresIn: string }}
 */
export const jwtConfig = {
  secret: env.jwtSecret,
  accessTokenExpiresIn: env.accessTokenExpiresIn,
};
