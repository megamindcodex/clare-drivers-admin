import { env } from "#configs/env.js";

export const mongodbConfig = {
  uri: env.mongodbUri,
  options: {},
};
