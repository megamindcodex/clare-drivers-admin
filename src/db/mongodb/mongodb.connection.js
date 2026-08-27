import mongoose from "mongoose";

import { mongodbConfig } from "#configs/mongodb.config.js";
import { logger } from "#configs/logger.js";

/**
 * Gracefully disconnects Mongoose from MongoDB and exits the process.
 * @param {string} signal - The OS signal that triggered the shutdown (e.g. "SIGINT").
 * @returns {Promise<void>}
 */
const disconnectMongoDb = async (signal) => {
  logger.info(`${signal} received. Disconnecting MongoDB...`);
  await mongoose.disconnect();
  process.exit(0);
};

process.on("SIGINT", () => disconnectMongoDb("SIGINT"));
process.on("SIGTERM", () => disconnectMongoDb("SIGTERM"));

/**
 * Connects Mongoose to MongoDB at startup.
 * @returns {Promise<void>}
 * @throws {Error} if the connection attempt fails — the caller is responsible
 *   for handling this (see {@link crashAndExit}).
 */
const connectMongoDb = async () => {
  await mongoose.connect(mongodbConfig.uri, mongodbConfig.options);
  logger.info("MongoDB connected.");
};

export default connectMongoDb;
