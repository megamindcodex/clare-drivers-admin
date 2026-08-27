import { z } from "zod";

import { VehicleType, DriverVerificationStatus } from "#db/generated/prisma/client.js";

const driverIdSchema = z
  .string({ required_error: "Driver ID is required.", invalid_type_error: "Driver ID must be a string." })
  .uuid("Driver ID must be a valid UUID.");

const isApprovedSchema = z.enum(Object.values(DriverVerificationStatus), {
  message: `isApproved must be one of: ${Object.values(DriverVerificationStatus).join(", ")}.`,
});

const vehicleTypeSchema = z.enum(Object.values(VehicleType), {
  message: `vehicleType must be one of: ${Object.values(VehicleType).join(", ")}.`,
});

/**
 * Validates a query-string boolean as the literal string "true" or "false"
 * and transforms it to an actual boolean. Deliberately not `z.coerce.boolean()` —
 * that runs JS's `Boolean(value)` on the raw string, and `Boolean("false")` is
 * `true` (only an empty string is falsy), so it silently inverts a caller's
 * `?isVerified=false` into `isVerified: true`.
 * @type {import("zod").ZodType<boolean>}
 */
const queryBooleanSchema = z
  .enum(["true", "false"], { message: 'Must be "true" or "false".' })
  .transform((value) => value === "true");

/**
 * Validates the query filters for listing drivers. Every filter is optional —
 * an empty query returns every driver.
 * @type {import("zod").ZodType}
 */
export const getDriversSchema = z.object({
  body: z.object({}).passthrough(),
  params: z.object({}).passthrough(),
  query: z.object({
    status: z
      .string({ invalid_type_error: "Status must be a string." })
      .trim()
      .min(1, "Status cannot be empty.")
      .optional(),
    isApproved: isApprovedSchema.optional(),
    isVerified: queryBooleanSchema.optional(),
    vehicleType: vehicleTypeSchema.optional(),
    country: z
      .string({ invalid_type_error: "Country must be a string." })
      .trim()
      .min(1, "Country cannot be empty.")
      .optional(),
    search: z
      .string({ invalid_type_error: "Search must be a string." })
      .trim()
      .min(1, "Search cannot be empty.")
      .optional(),
  }),
});

/**
 * Validates the route params for fetching a single driver by ID.
 * @type {import("zod").ZodType}
 */
export const getDriverByIdSchema = z.object({
  body: z.object({}).passthrough(),
  params: z.object({
    driverId: driverIdSchema,
  }),
  query: z.object({}).passthrough(),
});

/**
 * Validates the route params for fetching a driver's documents by driver ID.
 * @type {import("zod").ZodType}
 */
export const getDriverDocumentSchema = z.object({
  body: z.object({}).passthrough(),
  params: z.object({
    driverId: driverIdSchema,
  }),
  query: z.object({}).passthrough(),
});

/**
 * Validates the payload for updating a driver's approval status.
 * @type {import("zod").ZodType}
 */
export const updateApproveFieldSchema = z.object({
  body: z.object({
    isApproved: isApprovedSchema,
  }),
  params: z.object({
    driverId: driverIdSchema,
  }),
  query: z.object({}).passthrough(),
});

/**
 * Validates the query filters for listing active (live-tracked) drivers.
 * Every filter is optional — an empty query returns every active driver.
 * @type {import("zod").ZodType}
 */
export const getActiveDriversSchema = z.object({
  body: z.object({}).passthrough(),
  params: z.object({}).passthrough(),
  query: z.object({
    vehicleType: z
      .string({ invalid_type_error: "Vehicle type must be a string." })
      .trim()
      .min(1, "Vehicle type cannot be empty.")
      .optional(),
    category: z
      .string({ invalid_type_error: "Category must be a string." })
      .trim()
      .min(1, "Category cannot be empty.")
      .optional(),
    search: z
      .string({ invalid_type_error: "Search must be a string." })
      .trim()
      .min(1, "Search cannot be empty.")
      .optional(),
  }),
});

/**
 * Validates the route params for fetching a single active driver by ID.
 * @type {import("zod").ZodType}
 */
export const getActiveDriverByIdSchema = z.object({
  body: z.object({}).passthrough(),
  params: z.object({
    driverId: driverIdSchema,
  }),
  query: z.object({}).passthrough(),
});
