import { z } from "zod";

const usernameSchema = z
  .string({ required_error: "Username is required.", invalid_type_error: "Username must be a string." })
  .trim()
  .min(3, "Username must be at least 3 characters long.")
  .max(50, "Username must be at most 50 characters long.");

const emailSchema = z
  .string({ required_error: "Email is required.", invalid_type_error: "Email must be a string." })
  .trim()
  .email("Enter a valid email address.");

/**
 * Validates the payload for registering a new account.
 * @type {import("zod").ZodType}
 */
export const registerUserSchema = z.object({
  body: z.object({
    username: usernameSchema,
    email: emailSchema,
    password: z
      .string({ required_error: "Password is required.", invalid_type_error: "Password must be a string." })
      .min(8, "Password must be at least 8 characters long."),
  }),
  params: z.object({}).passthrough(),
  query: z.object({}).passthrough(),
});

/**
 * Validates the payload for logging in a user.
 * @type {import("zod").ZodType}
 */
export const loginSchema = z.object({
  body: z.object({
    email: emailSchema,
    password: z
      .string({ required_error: "Password is required.", invalid_type_error: "Password must be a string." })
      .min(1, "Password is required."),
  }),
  params: z.object({}).passthrough(),
  query: z.object({}).passthrough(),
});

/**
 * Validates the payload for requesting a password reset code.
 * @type {import("zod").ZodType}
 */
export const requestResetCodeSchema = z.object({
  body: z.object({
    email: emailSchema,
  }),
  params: z.object({}).passthrough(),
  query: z.object({}).passthrough(),
});

/**
 * Validates the payload for resetting a password with a reset code.
 * @type {import("zod").ZodType}
 */
export const resetPasswordSchema = z.object({
  body: z.object({
    email: emailSchema,
    resetCode: z
      .string({ required_error: "Reset code is required.", invalid_type_error: "Reset code must be a string." })
      .length(6, "Reset code must be exactly 6 characters long."),
    newPassword: z
      .string({ required_error: "New password is required.", invalid_type_error: "New password must be a string." })
      .min(8, "New password must be at least 8 characters long."),
  }),
  params: z.object({}).passthrough(),
  query: z.object({}).passthrough(),
});
