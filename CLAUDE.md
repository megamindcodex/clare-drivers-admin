# Clare Motors — Backend Coding Standards and Conventions

**Scope:** Node.js / Express / MongoDB backend for the Clare Motors Driver Administration project.
This document does not cover frontend (Vue.js) conventions — a separate document should be created if/when frontend standards are needed.

This is a living instruction document intended to be read as project instructions (e.g. by Claude or any contributor) before writing, modifying, or reviewing backend code. Follow these rules consistently.

---

## 1. General Principles

* Write clean, readable, maintainable, and scalable code.
* Prefer simplicity over unnecessary abstraction.
* Do not over-engineer small features.
* Keep responsibilities separated.
* Avoid duplicated logic. Extract reusable logic only when it has a clear, proven purpose.
* Prefer composition over inheritance.
* Do not introduce libraries or dependencies unless they provide clear value.
* Before creating new utilities, handlers, or helpers, check whether an existing implementation can be reused.
* Do not leave unused imports, variables, functions, files, or commented-out code.

---

## 2. JavaScript Standards

* Use modern JavaScript (ES2022+) syntax.
* Use **ES Modules only** — no CommonJS.

```js
// Correct
import express from "express";
import { createUser } from "#handlers/user.handler.js";

export const createUserHandler = async () => {};
```

```js
// Avoid
const express = require("express");
module.exports = app;
```

* Prefer `const` by default.
* Use `let` only when reassignment is necessary.
* Never use `var`.
* Use optional chaining and nullish coalescing when appropriate.

```js
const email = user?.profile?.email;
const limit = options.limit ?? 20;
```

* Prefer `async/await` over `.then()` chains.

---

## 3. Naming Conventions

### Variables

Use descriptive `camelCase`.

```js
const userProfile = {};
const transactionAmount = 500;
const isAuthenticated = true;
```

Boolean variables should clearly communicate a true/false state, using prefixes such as:

```js
isLoading;
isActive;
hasPermission;
canEdit;
shouldRetry;
```

Avoid vague names (`data`, `thing`, `result`, `temp`). Short names are fine only when context is obvious (e.g. `users.map((user) => user.id)`).

### Functions

Use `camelCase`. Function names should describe an action and be verb-based.

```js
const createUser = async () => {};
const calculateTotal = () => {};
const validatePayment = () => {};
const sendNotification = async () => {};
```

Boolean-returning functions should read as a question:

```js
const isValidToken = () => {};
const hasPermission = () => {};
const canAccessResource = () => {};
```

Avoid generic names such as `processData()`, `handleStuff()`, `doSomething()`.

> See **Section 6 — Function Definition Standard** for how functions must be structured (arrow functions, exports, file layout).

### Classes

Use `PascalCase`. Reserve classes for cases where they earn their place — see Section 6 for exactly when a class is appropriate in this project (custom errors, Mongoose models, stateful connections). Do not create a class when a plain function or module is sufficient.

```js
class AppError extends Error {}
```

### Constants

Use `camelCase` for ordinary constants.

```js
const maxRetryAttempts = 3;
const defaultPageSize = 20;
```

Use `UPPER_SNAKE_CASE` only for true global/static or environment-level constants, and for **error codes** (see Section 9).

```js
const MAX_LOGIN_ATTEMPTS = 5;
const DEFAULT_TIMEOUT = 5000;
```

Do not use uppercase simply because a variable is declared with `const`.

---

## 4. File and Folder Naming

Use lowercase `kebab-case` for files and folders.

```text
driver.handler.js
driver.controller.js
driver-document.repository.js
auth.middleware.js
approve-driver.dto.js
```

Recommended suffixes by responsibility:

```text
driver.controller.js
driver.handler.js
driver.repository.js
driver.model.js
driver.routes.js
auth.middleware.js
error-handler.middleware.js
app-error.js
error-codes.js
```

Avoid generic file names such as `utils.js`, `helpers.js`, `common.js`, `misc.js` unless the contents have a genuinely narrow, clearly defined purpose (e.g. `date.util.js` for date-only helpers is fine — `utils.js` holding unrelated logic is not).

---

## 5. Import Conventions

### 5.1 Import aliasing (Node.js subpath imports)

This project does not yet have an internal import alias set up. **The recommended standard is Node.js native subpath imports**, configured via the `imports` field in `package.json`. This is the modern, bundler-free way to get clean absolute-style imports in an ES module Node backend (no Babel/webpack config required, works natively in Node ≥ 14).

Add to `package.json`:

```json
{
  "imports": {
    "#controllers/*": "./src/controllers/*",
    "#handlers/*": "./src/handlers/*",
    "#repositories/*": "./src/repositories/*",
    "#models/*": "./src/models/*",
    "#middleware/*": "./src/middleware/*",
    "#errors/*": "./src/errors/*",
    "#utils/*": "./src/utils/*",
    "#config/*": "./src/config/*"
  }
}
```

Usage:

```js
import { approve as approveHandler } from "#handlers/driver.handler.js";
import { AppError } from "#errors/app-error.js";
```

Rules:

* Use a `#alias/*` import for anything **outside the current folder / feature**.
* Use a relative import (`./`, `../`) only for files that live directly beside each other (e.g. a controller importing its own route file's validator).
* Never write deep relative paths like `../../../handlers/driver.handler.js` — that always means the aliased import should be used instead.
* Never use a namespace import (`import * as x from "..."`). Every import — internal or third-party — must be a named/destructured import.
* When importing a handler function into a controller, alias it with a `Handler` suffix and call it via that alias: `import { approve as approveHandler } from "#handlers/driver.handler.js";` ... `await approveHandler(driverId);`. This is the standard import convention for handlers across all controllers — it keeps the call site unambiguous even when the handler's exported name (e.g. `approve`) would otherwise collide with a same-named controller export.

### 5.2 Import order

Group and order imports in three blocks, separated by a blank line:

```js
// 1. External packages
import express from "express";
import mongoose from "mongoose";

// 2. Internal aliased modules
import { approve as approveHandler } from "#handlers/driver.handler.js";
import { AppError } from "#errors/app-error.js";

// 3. Relative modules (same feature/folder only)
import { validateApproveDriver } from "./driver.validator.js";
```

* Remove unused imports.
* Avoid circular dependencies.
* Import only what you need — avoid importing an entire module when a single named export is needed.

---

## 6. Function Definition Standard

This is the enforced default for how functions are written in this project.

### 6.1 Arrow functions, `const`-assigned — everywhere

**All functions in this project — including exported/top-level functions — must be written as `const`-assigned arrow functions.** This applies to controllers, handlers, repositories, middleware, validators, and utilities alike.

```js
// Correct
export const createDriver = async (driverData) => {
  const validatedData = validateDriver(driverData);
  return driverRepository.create(validatedData);
};
```

```js
// Avoid
export async function createDriver(driverData) {
  const validatedData = validateDriver(driverData);
  return driverRepository.create(validatedData);
}
```

Rationale: consistency across the codebase, no hoisting ambiguity, and it matches this project's ES module / `const`-by-default standard end to end.

### 6.2 When a class is (and isn't) appropriate

Because functions default to arrow/`const` style, **prefer plain function modules over classes for handlers and repositories** — a handler file exports a set of arrow functions rather than a `UserHandler` class with methods. This keeps the pattern consistent and avoids `this`-binding pitfalls that come with arrow-function class methods.

```js
// driver.handler.js — preferred pattern
export const approve = async (driverId) => {
  /* ... */
};

export const reject = async (driverId, reason) => {
  /* ... */
};
```

Reserve `class` (PascalCase) for cases where it is genuinely the right tool:

* Custom error types (e.g. `AppError extends Error` — see Section 9).
* Mongoose schemas/models, which are inherently class-based.
* A stateful resource that must encapsulate internal state across calls (e.g. a queue connection wrapper), where a class provides real value over a closure.

Do not introduce a class purely out of habit for something that is really a stateless set of operations.

### 6.3 One function, one responsibility

Functions should do one logical thing. Avoid functions that mix validation, database access, business logic, notifications, logging, and response formatting.

```js
// driver.controller.js
import { approve as approveHandler } from "#handlers/driver.handler.js";

export const approveDriver = async (req, res, next) => {
  try {
    const driver = await approveHandler(req.params.driverId);
    return res.status(200).json({ data: { driver } });
  } catch (error) {
    return next(error);
  }
};
```

```js
// driver.handler.js
export const approve = async (driverId) => {
  const driver = await driverRepository.findById(driverId);

  if (!driver) {
    throw new AppError("Driver not found.", { statusCode: 404, code: "DRIVER_NOT_FOUND" });
  }

  return driverRepository.updateApprovalStatus(driverId, "approved");
};
```

### 6.4 JSDoc on Every Function

Every function must have a JSDoc block directly above its definition — controllers, handlers, repositories, middleware, validators, utils, config/connection modules, all of it. No exported or internal function is exempt.

This also applies to **usage sites of third-party functions** — the codebase has no TypeScript, so JSDoc is the only source of editor autocomplete and parameter/return typing it gets. You cannot and must not add JSDoc inside `node_modules` (untracked, wiped on every install), but any place *our* code defines, configures, or wraps a third-party call gets a JSDoc block above it, e.g.:

```js
/**
 * Express application instance configured with JSON body parsing,
 * driver routes, and the centralized error handler.
 * @type {import("express").Express}
 */
const app = express();
```

```js
/**
 * Establishes the MongoDB connection using the configured connection string.
 * @returns {Promise<import("mongoose").Mongoose>} The connected mongoose instance.
 */
export const connectMongo = async () => {
  return mongoose.connect(config.databaseUrl);
};
```

A JSDoc block documents the function's **contract**, not its implementation — this is why it does not conflict with Section 12's "don't comment obvious code" rule. Keep it to:

* One-line summary of what the function does.
* `@param {Type} name - description` for each parameter (use `@param {Object} options` plus nested `@param {Type} options.field` for the options-object pattern in Section 8).
* `@returns {Type}` describing what's returned (wrap in `Promise<...>` for async functions).
* `@throws {AppError} CODE - when...` for each `AppError` the function deliberately throws.

```js
/**
 * Approves a driver's pending application.
 * @param {string} driverId - The ID of the driver to approve.
 * @returns {Promise<Driver>} The updated, approved driver document.
 * @throws {AppError} DRIVER_NOT_FOUND - if no driver matches driverId.
 */
export const approve = async (driverId) => {
  const driver = await driverRepository.findById(driverId);

  if (!driver) {
    throw new AppError("Driver not found.", { statusCode: 404, code: "DRIVER_NOT_FOUND" });
  }

  return driverRepository.updateApprovalStatus(driverId, "approved");
};
```

---

## 7. Architecture & Layer Responsibilities

Maintain clear boundaries between layers:

```text
Routes
  ↓
Controller
  ↓
Handler
  ↓
Repository / Database
```

**Controllers** should:

* Handle HTTP concerns only (req/res).
* Extract and pass request data to handlers.
* Call `next(error)` on failure — never handle business errors themselves.
* Shape the final response using the envelope in Section 10.

**Handlers** should:

* Contain business logic and orchestration.
* Throw `AppError` for expected/business-rule failures (see Section 9).
* Remain independent of `req`/`res`.

**Repositories** should:

* Handle database access only.
* Contain no business logic, no `AppError` throwing for business rules (only for genuine data-access failures if needed).

Do not place database queries directly in controllers unless the operation is intentionally trivial and this is a deliberate, agreed exception.

---

## 8. Object and Function Parameters

Avoid passing many positional arguments. Prefer a single options object for anything beyond 2 parameters.

```js
// Avoid
createDriverDocumentReview(driverId, adminId, decision, comment);
```

```js
// Prefer
createDriverDocumentReview({
  driverId,
  adminId,
  decision,
  comment,
});
```

---

## 9. Error Handling

Errors are never silently swallowed, and every error the application throws deliberately is an instance of a single custom error class, distinguished by an **error code** rather than a growing tree of subclasses.

### 9.1 `AppError`

```js
// errors/app-error.js
import { ErrorStatusCodes } from "./error-codes.js";

export class AppError extends Error {
  constructor(message, { statusCode, code = "INTERNAL_ERROR", isOperational = true, details } = {}) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.statusCode = statusCode ?? ErrorStatusCodes[code] ?? 500;
    this.isOperational = isOperational;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}
```

* `AppError` extends the native `Error` class — it is the **only** custom error class in the application.
* Every deliberately-thrown error is distinguished by its `code`, not by `instanceof` checks against many subclasses.
* `statusCode` is not repeated at every throw site: it defaults from `ErrorStatusCodes[code]` (see 9.2), so a given code can never end up paired with the wrong status at two different call sites. Pass `statusCode` explicitly only for the rare case that genuinely needs to override the code's canonical status.
* `isOperational: true` marks an expected, handled failure (e.g. "driver not found"); an *unexpected* bug should be left as a raw, uncaught `Error` (or an `AppError` with `isOperational: false`) so it is logged loudly rather than disguised as a normal business error.

### 9.2 Error codes

Keep error codes centralized as `UPPER_SNAKE_CASE` string constants, grouped by domain, alongside their canonical HTTP status:

```js
// errors/error-codes.js
export const ErrorCodes = {
  DRIVER_NOT_FOUND: "DRIVER_NOT_FOUND",
  DRIVER_ALREADY_APPROVED: "DRIVER_ALREADY_APPROVED",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  INTERNAL_ERROR: "INTERNAL_ERROR",
};

// Add an entry here whenever a new error code is added to ErrorCodes above,
// so every throw site for that code stays on the same status by default.
export const ErrorStatusCodes = {
  [ErrorCodes.DRIVER_NOT_FOUND]: 404,
  [ErrorCodes.DRIVER_ALREADY_APPROVED]: 409,
  [ErrorCodes.VALIDATION_ERROR]: 422,
  [ErrorCodes.UNAUTHORIZED]: 401,
  [ErrorCodes.FORBIDDEN]: 403,
  [ErrorCodes.INTERNAL_ERROR]: 500,
};
```

```js
throw new AppError("Driver not found.", {
  code: ErrorCodes.DRIVER_NOT_FOUND,
});
```

Add new codes to both `ErrorCodes` and `ErrorStatusCodes` as new failure cases are introduced — do not invent inline string literals for codes at the call site, and do not pass a redundant `statusCode` when the code's entry in `ErrorStatusCodes` already covers it.

### 9.3 Centralized error handling

All errors are caught by a single Express error-handling middleware, mounted last. Controllers must call `next(error)` rather than formatting error responses themselves.

```js
// middleware/error-handler.middleware.js
import { AppError } from "#errors/app-error.js";

export const errorHandler = (err, req, res, next) => {
  const isAppError = err instanceof AppError;
  const statusCode = isAppError ? err.statusCode : 500;
  const code = isAppError ? err.code : "INTERNAL_ERROR";

  if (!isAppError || !err.isOperational) {
    // Unexpected / programmer error — log full detail for investigation.
    console.error(err);
  }

  return res.status(statusCode).json({
    error: {
      code,
      message: isAppError ? err.message : "Something went wrong.",
    },
  });
};
```

### 9.4 Rules

* Never use an empty `catch {}` block.
* Do not expose raw internal error messages/stack traces to API clients for non-operational errors.
* Do not use exceptions for normal control flow (e.g. don't throw to signal "not found" inside a loop where a plain `null` check would do).
* Validate before you act, so most errors are `AppError`s you threw on purpose, not runtime exceptions you're catching defensively.

---

## 10. API Response Conventions

All API responses use a consistent envelope: no `success` boolean — the HTTP status code is the canonical signal for success/failure. The body is always exactly one of two shapes, `data` or `error`, and the payload is always nested one level down under that key so a real resource field can never collide with the envelope key itself.

**Success:**

```json
{
  "data": {
    "driver": { "id": "...", "status": "approved" }
  }
}
```

**Error:**

```json
{
  "error": {
    "code": "DRIVER_NOT_FOUND",
    "message": "Driver not found."
  }
}
```

Guidelines:

* `data` always wraps the payload — even a list response: `{ "data": { "drivers": [...] } }`, not a bare array at the top level.
* Never flatten the payload directly onto the response body (no `{ "driver": {...} }` at the top level) — always nest it under `data`, so `data`/`error` stay the only two possible top-level keys and a payload field can never be mistaken for the envelope.
* Use standard HTTP status codes consistently with the situation (e.g. `200` for a successful read/update, `201` for a resource created, `204` for a successful action with no body, `400`/`422` for validation failures, `401` for missing/invalid auth, `403` for authenticated-but-not-allowed, `404` for missing resources, `409` for state conflicts like approving an already-approved driver, `500` for unexpected failures). Pick the code that matches the `AppError` thrown in Section 9 — don't default everything to `200` or `500`.
* A detailed status-code reference table, if needed, belongs in a separate reference doc for this project — not duplicated here.

### 10.1 API Reference Documentation — Mandatory

`docs/api-reference.md` is the canonical, human-readable reference for every route in this API. **Every new route, and every change to an existing route's contract, must be reflected in `docs/api-reference.md` in the same change — this is not optional and not a follow-up task.**

This applies whenever a route is added, removed, or its input/output contract changes — including but not limited to: a new path or HTTP method; a new/removed/renamed request field (body, params, or query); a new/removed response field; a changed permission requirement; or a new `AppError` code the route can now throw.

Concretely, before considering any route-level change complete:

* Add or update the route's entry in `docs/api-reference.md`'s feature/route index table.
* Add or update the route's full entry: description, input (headers/params/query/body), response shape, error codes with when each applies, and a short example.
* If a shared data shape (e.g. `User`, `Driver`) changed, update that shape's shared definition too, not just the individual route example.

Do not defer this to "later" or to a separate PR — an undocumented or stale route reference is treated the same as missing test coverage for the purposes of this project. See Section 17 for the pre-completion checklist entry.

---

## 11. Avoid Magic Values

Do not scatter unexplained numbers or strings throughout the code.

```js
// Avoid
if (attempts > 3) {}
```

```js
// Prefer
const MAX_RETRY_ATTEMPTS = 3;

if (attempts > MAX_RETRY_ATTEMPTS) {}
```

Use constants, enums, or configuration when a value represents an application rule (this includes error codes — see Section 9.2).

---

## 12. Comments

Do not comment obvious code.

```js
// Avoid
// Increment count
count++;
```

Comments should explain **why**, not **what**.

```js
// Redis is used here to prevent duplicate approval processing
// if the admin double-submits the request.
```

Never leave commented-out code — use version control instead.

---

## 13. Async and Concurrency

Always properly handle asynchronous operations.

```js
await approveHandler(driverId);
```

Avoid floating promises unless intentionally detached (and explain why in a comment when you do).

Run independent operations concurrently:

```js
const [driver, documents] = await Promise.all([
  driverRepository.findById(driverId),
  driverDocumentRepository.findByDriverId(driverId),
]);
```

Do not use `Promise.all()` when one operation depends on the result of another.

---

## 14. Validation

Validate external input at every application boundary: HTTP requests, webhooks, queue jobs, external APIs, and environment variables. Never assume external data is valid. Validation happens before business logic executes, and a failed validation throws an `AppError` with `code: ErrorCodes.VALIDATION_ERROR` and `statusCode: 422` (or `400`, per team convention — pick one and stay consistent).

---

## 15. Configuration and Environment Variables

Never hardcode secrets, credentials, URLs, or environment-specific configuration. Centralize configuration:

```js
export const config = {
  port: Number(process.env.PORT ?? 4000),
  databaseUrl: process.env.DATABASE_URL,
};
```

Validate required environment variables at application startup and fail fast if critical configuration is missing.

---

## 16. Code Quality Rules

Always prefer:

```text
Clear > Clever
Simple > Over-engineered
Explicit > Implicit
Readable > Short
Maintainable > Fast to write
```

Do not optimize prematurely. Do not build abstractions for hypothetical future requirements. Refactor when duplication or complexity becomes real, not merely because abstraction is possible.

---

## 17. Before Completing Any Implementation

Before considering a task complete, verify:

* Functions are `const`-assigned arrow functions, exported by name (Section 6).
* Every function has a JSDoc block above it, including usage sites of third-party functions (Section 6.4).
* Internal imports use the `#alias/*` subpath pattern, correctly ordered (Section 5).
* Naming is clear, consistent, and matches Section 3/4 conventions.
* No unused code, imports, or commented-out blocks remain.
* No duplicated logic was introduced where an existing utility could be reused.
* Errors are thrown as `AppError` with a registered `code`, never swallowed silently (Section 9).
* API responses follow the `{ data }` / `{ error }` envelope (Section 10).
* If a route was added or its contract changed, `docs/api-reference.md` was updated to match — strictly required, no exceptions (Section 10.1).
* External input is validated at the boundary before business logic runs.
* Async operations are properly awaited; no unexplained floating promises.
* No secrets or environment-specific values are hardcoded.
* The implementation stays consistent with the existing project architecture (Section 7) unless there's a clear, deliberate reason to change it.
