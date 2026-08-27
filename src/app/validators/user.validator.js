import { z } from "zod";

const userIdSchema = z
  .string({ required_error: "User ID is required.", invalid_type_error: "User ID must be a string." })
  .uuid("User ID must be a valid UUID.");

/**
 * Validates the request for listing non-SuperAdmin users. No filters yet —
 * present for consistency with the rest of the routes.
 * @type {import("zod").ZodType}
 */
export const getUsersSchema = z.object({
  body: z.object({}).passthrough(),
  params: z.object({}).passthrough(),
  query: z.object({}).passthrough(),
});

/**
 * Validates the route params for fetching a single non-SuperAdmin user's details.
 * @type {import("zod").ZodType}
 */
export const getUserDetailsSchema = z.object({
  body: z.object({}).passthrough(),
  params: z.object({
    userId: userIdSchema,
  }),
  query: z.object({}).passthrough(),
});

/**
 * Validates the route params for promoting a "User"-role account to "Admin".
 * @type {import("zod").ZodType}
 */
export const promoteUserSchema = z.object({
  body: z.object({}).passthrough(),
  params: z.object({
    userId: userIdSchema,
  }),
  query: z.object({}).passthrough(),
});

/**
 * Validates the route params for suspending a user.
 * @type {import("zod").ZodType}
 */
export const suspendUserSchema = z.object({
  body: z.object({}).passthrough(),
  params: z.object({
    userId: userIdSchema,
  }),
  query: z.object({}).passthrough(),
});

/**
 * Validates the route params for banning a user.
 * @type {import("zod").ZodType}
 */
export const banUserSchema = z.object({
  body: z.object({}).passthrough(),
  params: z.object({
    userId: userIdSchema,
  }),
  query: z.object({}).passthrough(),
});
