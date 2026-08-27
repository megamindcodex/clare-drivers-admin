import { env } from "#configs/env.js";

// ---- BullMQ (ioredis) ----

/**
 * ioredis configuration for the shared BullMQ Redis connection (queues + workers).
 * @type {{ url: string, options: import("ioredis").RedisOptions }}
 */
export const bullmqConfig = {
  url: env.redisUrl,
  options: {
    maxRetriesPerRequest: null,
    lazyConnect: true,
  },
};

// ---- Session store (node-redis) ----

/**
 * node-redis configuration for the shared session-store Redis connection,
 * plus how long a created session stays valid.
 * @type {{ url: string, ttlSeconds: number }}
 */
export const sessionConfig = {
  url: env.redisUrl,
  ttlSeconds: env.sessionTtlSeconds,
};
