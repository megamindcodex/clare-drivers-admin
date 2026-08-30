import { bullmqConnection } from "#db/redis/bullmq.connection.js";
import { sessionConnection } from "#db/redis/session.connection.js";

/**
 * Resolves once the given lazy-connect ioredis client reaches the "ready"
 * state, connecting it only if nothing has connected it yet. BullMQ's Queue
 * and Worker classes connect a lazyConnect client themselves as soon as
 * they're constructed — which happens as an import side effect and can
 * finish (or still be in flight) before this ever runs — so calling
 * ioredis's own `.connect()` unconditionally would throw "already
 * connecting/connected" on that same client.
 * @param {import("ioredis").Redis} client - The ioredis client to connect/await.
 * @returns {Promise<void>}
 */
const ensureIoredisReady = (client) => {
  if (client.status === "ready") {
    return Promise.resolve();
  }

  if (client.status === "wait" || client.status === "end") {
    return client.connect();
  }

  return new Promise((resolve, reject) => {
    const onReady = () => {
      client.off("error", onError);
      resolve();
    };
    const onError = (error) => {
      client.off("ready", onReady);
      reject(error);
    };

    client.once("ready", onReady);
    client.once("error", onError);
  });
};

/**
 * Connects both shared Redis clients (BullMQ and session) at startup.
 * @returns {Promise<void>}
 * @throws {Error} if either client fails to connect — the caller is
 *   responsible for handling this (see {@link crashAndExit}).
 */
export const connectRedis = async () => {
  await Promise.all([ensureIoredisReady(bullmqConnection), sessionConnection.connect()]);
};
