# Clare Motors — Driver Administration API Reference

> Scope: this document covers the **API / route layer only** — every HTTP endpoint the client can call, what it expects, and what it returns. It does not describe internal handler/repository logic. A handler-layer reference may be written separately later.
>
> Base URL: all routes below are relative to the API's root, e.g. `http://localhost:{PORT}`. Route prefixes (`/api/auth`, `/api/drivers`, `/api/users`, `/api/overview`) are fixed and mounted in `src/bootstrap/express-app.factory.js`.
>
> CORS: the API only accepts cross-origin requests from the single origin configured via the `CLIENT_ORIGIN` env var (default `http://localhost:5173` for local dev — see `src/configs/env.js`). Because `POST /api/auth/login`, `POST /api/auth/refresh-token`, and `POST /api/auth/logout` rely on an `httpOnly` cookie, a browser client **must** send requests with credentials included (e.g. axios `withCredentials: true`, or `fetch(..., { credentials: "include" })`) — the server responds with a matching `Access-Control-Allow-Origin: <CLIENT_ORIGIN>` and `Access-Control-Allow-Credentials: true`, which is required for the browser to accept a credentialed cross-origin response at all.

---

## 1. Application Overview

Clare Motors' Driver Administration backend powers an internal admin panel used to manage driver onboarding and the admin accounts that run that process. Through this API, a client application can:

* **Manage its own admin account** — register, log in, stay signed in via refresh/access tokens, view its own profile, log out, and recover a forgotten password.
* **Review and process driver applications** — list and search drivers with filters (status, verification, vehicle type, country), inspect a single driver's full record, review a driver's uploaded verification documents, and change a driver's approval status (`Pending` → `Approved`/`Rejected`).
* **Administer internal admin users** — list and inspect non-SuperAdmin accounts, promote a plain `User` account to `Admin`, and suspend or ban an account.
* **View dashboard/overview metrics** — a single call returning aggregated counts across drivers, active (live-tracked) drivers, and admins.

### Roles and access

Every route except `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/refresh-token`, `POST /api/auth/logout`, and the password-reset routes requires a valid access token (`Authorization: Bearer <token>`). Beyond authentication, most routes also require a specific **permission**, granted by role:

| Role | Permissions |
|---|---|
| `User` | None. Exists in the schema, but no current flow creates a `User`-role account — registering grants `Admin` directly. |
| `Admin` | `driver:read`, `driver:read-documents`, `driver:approve`, `driver:verify`, `overview:read` |
| `SuperAdmin` | Everything (wildcard — every permission, including ones added in the future) |

A suspended or banned account is blocked from every authenticated route (including `GET /api/auth/me`) the moment the check runs, even if its access token hasn't expired yet — see the `ACCOUNT_SUSPENDED` / `ACCOUNT_BANNED` error codes below. A **suspended** account can still log in; a **banned** account cannot.

---

## 2. Feature / Route Index

> `GET /health` also exists outside the table below — an unauthenticated infra endpoint (not part of the business API surface) that returns `200 ok`, used by an external cron pinger to keep the Render free-tier instance from spinning down after 15 minutes of inactivity.

| Feature | Method | Route | Auth | Permission |
|---|---|---|---|---|
| Register account | `POST` | `/api/auth/register` | — | — |
| Log in | `POST` | `/api/auth/login` | — | — |
| Refresh access token | `POST` | `/api/auth/refresh-token` | — (cookie) | — |
| Log out | `POST` | `/api/auth/logout` | — (cookie) | — |
| View own profile | `GET` | `/api/auth/me` | ✅ | — |
| Request password reset code | `POST` | `/api/auth/password/reset-code` | — | — |
| Reset password | `PATCH` | `/api/auth/password` | — | — |
| List drivers | `GET` | `/api/drivers` | ✅ | `driver:read` |
| List active (live-tracked) drivers | `GET` | `/api/drivers/active` | ✅ | `driver:read` |
| Get active driver by ID | `GET` | `/api/drivers/active/:driverId` | ✅ | `driver:read` |
| Get driver by ID | `GET` | `/api/drivers/:driverId` | ✅ | `driver:read` |
| Get driver's documents | `GET` | `/api/drivers/:driverId/documents` | ✅ | `driver:read-documents` |
| Get driver's full data (driver + documents, flattened) | `GET` | `/api/drivers/:driverId/full-data` | ✅ | `driver:read` **and** `driver:read-documents` |
| Update driver approval status | `PATCH` | `/api/drivers/:driverId/approve` | ✅ | `driver:approve` |
| Toggle driver isVerified flag | `PATCH` | `/api/drivers/:driverId/isVerified` | ✅ | `driver:verify` |
| List users | `GET` | `/api/users` | ✅ | `user:read` |
| Get user by ID | `GET` | `/api/users/:userId` | ✅ | `user:read` |
| Promote user to Admin | `PATCH` | `/api/users/:userId/promote` | ✅ | `user:promote` |
| Suspend user | `PATCH` | `/api/users/:userId/suspend` | ✅ | `user:suspend` |
| Ban user | `PATCH` | `/api/users/:userId/ban` | ✅ | `user:ban` |
| Get dashboard overview metrics | `GET` | `/api/overview` | ✅ | `overview:read` |

---

## 3. Response Envelope & Shared Error Reference

Every response body is exactly one of two shapes — never both, never flattened.

**Success:**

```json
{ "data": { "...": "..." } }
```

**Error:**

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable description.",
    "details": { "...": "only present for VALIDATION_ERROR" }
  }
}
```

`details` (when present) is the [Zod](https://zod.dev) `.format()` error tree for the request's `body`/`params`/`query`, keyed by field.

### Error codes used across every route below

| Code | HTTP Status | Meaning |
|---|---|---|
| `VALIDATION_ERROR` | 422 | Request `body`/`params`/`query` failed schema validation. |
| `UNAUTHORIZED` | 401 | Access token is otherwise valid, but the account it names no longer exists (e.g. deleted after the token was issued). |
| `FORBIDDEN` | 403 | Caller is authenticated but their role lacks the required permission. |
| `NOT_FOUND` | 404 | The requested resource (driver, driver documents, or user) does not exist. |
| `CONFLICT` | 409 | The requested write would violate a uniqueness rule (e.g. registering an email already in use). |
| `INTERNAL_ERROR` | 500 | Unexpected server-side failure. |
| `INVALID_CREDENTIALS` | 401 | Login email/password combination is wrong. |
| `ACCOUNT_BANNED` | 403 | The account (caller or, at login, the account being signed into) has been banned. |
| `ACCOUNT_SUSPENDED` | 403 | The caller's account has been suspended. |
| `INVALID_RESET_CODE` | 401 | Password reset code is missing, wrong, or expired. |
| `ACCESS_TOKEN_MISSING` | 401 | `Authorization` header is missing, or doesn't start with `Bearer `. |
| `ACCESS_TOKEN_EXPIRED` | 401 | `Authorization` header carries a syntactically valid access token whose expiry (`exp`) has passed. |
| `ACCESS_TOKEN_INVALID` | 401 | Access token fails signature verification or is otherwise malformed (any non-expiry JWT failure). |
| `SESSION_NOT_FOUND` | 401 | Refresh-token cookie is missing, or no session matches it. Redis deletes a session key the instant its TTL elapses, so "expired" and "never existed" are indistinguishable server-side — both surface this code. |

Every authenticated route (i.e. every route requiring `Authorization: Bearer <accessToken>`) can additionally return, in this order:

1. `ACCESS_TOKEN_MISSING`, `ACCESS_TOKEN_EXPIRED`, or `ACCESS_TOKEN_INVALID` — from token verification, before the request reaches any handler.
2. `UNAUTHORIZED` — if the token is valid but the account it names no longer exists (e.g. deleted after the token was issued).
3. `ACCOUNT_SUSPENDED` or `ACCOUNT_BANNED` — if the account exists but its status blocks the action.

To avoid repeating all six on every single route entry below, they're documented here once and only called out per-route when a route's behavior around them is non-obvious. `SESSION_NOT_FOUND` is specific to the session-cookie-based `refresh-token` route and is called out there directly.

### Shared data shapes

**`User` object** (used by every `/api/auth` and `/api/users` response):

```json
{
  "id": 12,
  "userId": "b3b3c3a0-3f9a-4b8e-9c1a-1f2e3d4c5b6a",
  "username": "jane_admin",
  "email": "jane@example.com",
  "role": "Admin",
  "status": "Active",
  "lastLogin": "2026-08-20T14:32:10.000Z",
  "createdAt": "2026-01-05T09:00:00.000Z",
  "updatedAt": "2026-08-20T14:32:10.000Z"
}
```

`role` is one of `"User" | "Admin" | "SuperAdmin"`. `status` is one of `"Active" | "Suspended" | "Banned"`. `lastLogin` is `null` until the account's first successful login. The password hash and password-reset fields are never included.

**`Driver` object** (used by `GET /api/drivers/:driverId`, `GET /api/drivers/:driverId/full-data` (merged with `DriverDocument` fields), and `PATCH /api/drivers/:driverId/approve`):

```json
{
  "id": 41,
  "driverId": "0f1e2d3c-4b5a-6978-8990-a1b2c3d4e5f6",
  "profilePicUrl": "https://.../profile.jpg",
  "firstName": "John",
  "lastName": "Doe",
  "country": "Nigeria",
  "phoneNumber": "+2348012345678",
  "email": "john.doe@example.com",
  "vehicleType": "Car",
  "category": "Standard",
  "brand": "Toyota",
  "model": "Corolla",
  "modelYear": "2019",
  "vehicleColor": "Blue",
  "registrationDate": "2024-03-01",
  "plateNumber": "ABC-123-XY",
  "drivingLicense": "DL-00012345",
  "ninIdentification": "12345678901",
  "rate": "500",
  "rating": 4.7,
  "status": "active",
  "isVerified": true,
  "isApproved": "Approved",
  "createdAt": "2026-01-10T08:00:00.000Z",
  "updatedAt": "2026-02-01T12:00:00.000Z"
}
```

`vehicleType` is one of `"Car" | "Bike" | "Keke"`. `isApproved` is one of `"False" | "Pending" | "Rejected" | "Approved"`. Like the `User` object, this is an explicitly field-limited projection (`SAFE_DRIVER_SELECT` in `driver.handler.js`) — the password hash and password-reset/verification token fields are never included. `GET /api/drivers` (the list route) returns a leaner, separate projection — see its own response shape below, not this object.

**`ActiveDriver` object** (used by `GET /api/drivers/active` and `GET /api/drivers/active/:driverId`):

```json
{
  "driverId": "0f1e2d3c-4b5a-6978-8990-a1b2c3d4e5f6",
  "name": "John Doe",
  "image": "https://.../profile.jpg",
  "vehicleType": "Car",
  "category": "Standard",
  "phone": "+2348012345678",
  "driverStats": 128,
  "ratings": 4.7,
  "rate": "500",
  "plateNumber": "ABC-123-XY",
  "latitude": 6.5244,
  "longitude": 3.3792,
  "updatedAt": "2026-08-22T10:15:00.000Z"
}
```

This is a separate, live-tracking table (`active_drivers`) distinct from the `Driver` record above — there is no foreign-key link between them, so an `ActiveDriver` row is not guaranteed to correspond to an existing `Driver` row. `image`, `category`, `latitude`, and `longitude` may be `null`.

**`DriverDocument` object** (used by `GET /api/drivers/:driverId/documents`):

```json
{
  "id": 7,
  "driverId": "0f1e2d3c-4b5a-6978-8990-a1b2c3d4e5f6",
  "ninUrl": "https://.../nin.jpg",
  "frontViewUrl": "https://.../front.jpg",
  "backViewUrl": "https://.../back.jpg",
  "insideViewUrl": "https://.../inside.jpg",
  "sideViewUrl": "https://.../side.jpg",
  "plateNumberUrl": "https://.../plate.jpg",
  "insuranceUrl": "https://.../insurance.jpg",
  "rejectComment": null,
  "createdAt": "2026-01-10T08:05:00.000Z",
  "updatedAt": "2026-01-10T08:05:00.000Z"
}
```

Any of the URL fields, and `rejectComment`, may be `null` if not yet uploaded / not applicable.

---

## 4. Authentication Routes (`/api/auth`)

### `POST /api/auth/register`

Creates a new account. New accounts are always created with role `"Admin"` directly — there is no separate promotion step. `"SuperAdmin"` can never be created this way; it only ever exists via the one seeded at application startup.

**Input — body:**

| Field | Type | Rules |
|---|---|---|
| `username` | string | 3–50 characters (trimmed) |
| `email` | string | valid email address (trimmed) |
| `password` | string | minimum 8 characters |

**Response — `201 Created`:**

```json
{
  "data": {
    "user": {
      "id": 12,
      "userId": "b3b3c3a0-3f9a-4b8e-9c1a-1f2e3d4c5b6a",
      "username": "jane_admin",
      "email": "jane@example.com",
      "role": "Admin",
      "status": "Active",
      "lastLogin": null,
      "createdAt": "2026-01-05T09:00:00.000Z",
      "updatedAt": "2026-01-05T09:00:00.000Z"
    }
  }
}
```

**Errors:**

| Code | Status | When |
|---|---|---|
| `VALIDATION_ERROR` | 422 | Missing/invalid `username`, `email`, or `password`. |
| `CONFLICT` | 409 | `username` or `email` is already in use. |

**Example:**

```bash
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"jane_admin","email":"jane@example.com","password":"correcthorse123"}'
```

---

### `POST /api/auth/login`

Authenticates by email and password, records the login time, and starts a new session. Suspended accounts **can** log in (they're blocked on later requests, not here); banned accounts cannot.

**Input — body:**

| Field | Type | Rules |
|---|---|---|
| `email` | string | valid email address |
| `password` | string | non-empty |

**Input — headers (optional, used for session tracking):** `User-Agent`, `X-Device-Id`.

On success, sets an `httpOnly` cookie named `refreshToken` (`Secure` in production, `SameSite=Lax`), used by `refresh-token` and `logout`.

**Response — `200 OK`:**

```json
{
  "data": {
    "user": {
      "id": 12,
      "userId": "b3b3c3a0-3f9a-4b8e-9c1a-1f2e3d4c5b6a",
      "username": "jane_admin",
      "email": "jane@example.com",
      "role": "Admin",
      "status": "Active",
      "lastLogin": "2026-08-22T14:32:10.000Z",
      "createdAt": "2026-01-05T09:00:00.000Z",
      "updatedAt": "2026-08-22T14:32:10.000Z"
    },
    "accessToken": "eyJhbGciOi..."
  }
}
```

**Errors:**

| Code | Status | When |
|---|---|---|
| `VALIDATION_ERROR` | 422 | Missing/invalid `email` or `password`. |
| `INVALID_CREDENTIALS` | 401 | Email/password combination is wrong. |
| `ACCOUNT_BANNED` | 403 | The account has been banned. |

**Example:**

```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"jane@example.com","password":"correcthorse123"}'
```

---

### `POST /api/auth/refresh-token`

Issues a new access token from the `refreshToken` session cookie. No request body.

**Input:** `refreshToken` cookie (sent automatically by the browser).

**Response — `200 OK`:**

```json
{ "data": { "accessToken": "eyJhbGciOi..." } }
```

**Errors:**

| Code | Status | When |
|---|---|---|
| `SESSION_NOT_FOUND` | 401 | Cookie is missing, the session is invalid/expired, or the account it names no longer exists. |
| `ACCOUNT_BANNED` | 403 | The account has been banned since the session was issued. |

**Example:**

```bash
curl -X POST http://localhost:4000/api/auth/refresh-token \
  --cookie "refreshToken=<refresh-token-value>"
```

---

### `POST /api/auth/logout`

Deletes the current session and clears the `refreshToken` cookie. A missing/already-expired cookie is treated as "already logged out", not an error.

**Input:** `refreshToken` cookie (optional).

**Response — `204 No Content`** (empty body).

**Errors:** none expected under normal use (an unexpected failure would surface as `INTERNAL_ERROR`, 500).

**Example:**

```bash
curl -X POST http://localhost:4000/api/auth/logout \
  --cookie "refreshToken=<refresh-token-value>"
```

---

### `GET /api/auth/me`

Fetches the caller's own profile. Deliberately **not** permission-gated — every role, including plain `User`, can reach it; a suspended/banned account is still blocked by the standard active-account check.

**Input — headers:** `Authorization: Bearer <accessToken>`.

**Response — `200 OK`:**

```json
{
  "data": {
    "user": {
      "id": 12,
      "userId": "b3b3c3a0-3f9a-4b8e-9c1a-1f2e3d4c5b6a",
      "username": "jane_admin",
      "email": "jane@example.com",
      "role": "Admin",
      "status": "Active",
      "lastLogin": "2026-08-22T14:32:10.000Z",
      "createdAt": "2026-01-05T09:00:00.000Z",
      "updatedAt": "2026-08-22T14:32:10.000Z"
    }
  }
}
```

**Errors:**

| Code | Status | When |
|---|---|---|
| `ACCESS_TOKEN_MISSING` | 401 | `Authorization` header is missing or malformed. |
| `ACCESS_TOKEN_EXPIRED` | 401 | Access token has expired. |
| `ACCESS_TOKEN_INVALID` | 401 | Access token fails verification (bad signature/malformed). |
| `UNAUTHORIZED` | 401 | Token is valid but the account no longer exists. |
| `ACCOUNT_SUSPENDED` | 403 | The account has been suspended. |
| `ACCOUNT_BANNED` | 403 | The account has been banned. |

**Example:**

```bash
curl http://localhost:4000/api/auth/me \
  -H "Authorization: Bearer eyJhbGciOi..."
```

---

### `POST /api/auth/password/reset-code`

Issues a password reset code by email, if that email is registered. **Always** responds the same way whether or not the email exists, so the endpoint can't be used to enumerate registered accounts.

**Input — body:**

| Field | Type | Rules |
|---|---|---|
| `email` | string | valid email address |

**Response — `200 OK`:**

```json
{ "data": { "message": "If that email is registered, a reset code has been sent." } }
```

**Errors:**

| Code | Status | When |
|---|---|---|
| `VALIDATION_ERROR` | 422 | Missing/invalid `email`. |

**Example:**

```bash
curl -X POST http://localhost:4000/api/auth/password/reset-code \
  -H "Content-Type: application/json" \
  -d '{"email":"jane@example.com"}'
```

---

### `PATCH /api/auth/password`

Resets a password using a previously issued reset code.

**Input — body:**

| Field | Type | Rules |
|---|---|---|
| `email` | string | valid email address |
| `resetCode` | string | exactly 6 characters |
| `newPassword` | string | minimum 8 characters |

**Response — `200 OK`:**

```json
{ "data": { "message": "Password reset successfully." } }
```

**Errors:**

| Code | Status | When |
|---|---|---|
| `VALIDATION_ERROR` | 422 | Missing/invalid `email`, `resetCode`, or `newPassword`. |
| `INVALID_RESET_CODE` | 401 | Code is missing/wrong, or has expired (15-minute lifetime). |

**Example:**

```bash
curl -X PATCH http://localhost:4000/api/auth/password \
  -H "Content-Type: application/json" \
  -d '{"email":"jane@example.com","resetCode":"482913","newPassword":"newpassword456"}'
```

---

## 5. Driver Routes (`/api/drivers`)

Every route below requires `Authorization: Bearer <accessToken>` plus the listed permission.

### `GET /api/drivers`

Lists drivers, optionally narrowed by filters. All filters are optional and combine as an `AND` (except `search`, which is `OR`-matched across several fields). An empty query returns every driver.

**Permission:** `driver:read`

**Input — query (all optional):**

| Field | Type | Notes |
|---|---|---|
| `status` | string | Exact match, e.g. `"active"`, `"inactive"`. |
| `isApproved` | enum | One of `"False" \| "Pending" \| "Rejected" \| "Approved"`. |
| `isVerified` | string | Must be exactly `"true"` or `"false"` (any other value is a `VALIDATION_ERROR`) — coerced to a real boolean server-side. |
| `vehicleType` | enum | One of `"Car" \| "Bike" \| "Keke"`. |
| `country` | string | Exact match. |
| `search` | string | Partial match across first name, last name, email, phone number, and plate number. |

**Response — `200 OK`:**

```json
{
  "data": {
    "drivers": [
      {
        "id": 41,
        "driverId": "0f1e2d3c-4b5a-6978-8990-a1b2c3d4e5f6",
        "profilePicUrl": "https://.../profile.jpg",
        "firstName": "John",
        "lastName": "Doe",
        "country": "Nigeria",
        "isVerified": true,
        "isApproved": "Approved"
      }
    ]
  }
}
```

This is a deliberately trimmed, list-view field set — not the full driver record (no `email`, `phoneNumber`, vehicle details, `status`, timestamps, etc.). Fetch a single driver by `driverId` (`GET /api/drivers/:driverId`) for the full record. An empty result (no matches) returns `{ "data": { "drivers": [] } }` — an empty array, not an error. Every entry has the exact same fields shown above (`isApproved` restricted to `"False" | "Pending" | "Rejected" | "Approved"`), one entry per matching driver.

**Errors:**

| Code | Status | When |
|---|---|---|
| `VALIDATION_ERROR` | 422 | An invalid filter value (e.g. `vehicleType` not in the enum). |
| `FORBIDDEN` | 403 | Caller's role lacks `driver:read`. |

**Example:**

```bash
curl "http://localhost:4000/api/drivers?vehicleType=Car&isApproved=Pending" \
  -H "Authorization: Bearer eyJhbGciOi..."
```

---

### `GET /api/drivers/active`

Lists active (live-tracked) drivers from the separate `active_drivers` table, optionally narrowed by filters. All filters are optional and combine as an `AND` (except `search`, which is `OR`-matched across several fields). An empty query returns every active driver.

**Permission:** `driver:read`

**Input — query (all optional):**

| Field | Type | Notes |
|---|---|---|
| `vehicleType` | string | Exact match. Not enum-restricted (this table stores it as a free-text string, unlike the `Driver` record). |
| `category` | string | Exact match. |
| `search` | string | Partial match across name, phone, and plate number. |

**Response — `200 OK`:**

```json
{
  "data": {
    "activeDrivers": [
      {
        "driverId": "0f1e2d3c-4b5a-6978-8990-a1b2c3d4e5f6",
        "name": "John Doe",
        "image": "https://.../profile.jpg",
        "vehicleType": "Car",
        "category": "Standard",
        "phone": "+2348012345678",
        "driverStats": 128,
        "ratings": 4.7,
        "rate": "500",
        "plateNumber": "ABC-123-XY",
        "latitude": 6.5244,
        "longitude": 3.3792,
        "updatedAt": "2026-08-22T10:15:00.000Z"
      }
    ]
  }
}
```

An empty result (no matches) returns `{ "data": { "activeDrivers": [] } }`. Every entry has the exact same fields shown above, one entry per matching active-driver row; `image`, `category`, `latitude`, and `longitude` may be `null` on any entry.

**Errors:**

| Code | Status | When |
|---|---|---|
| `VALIDATION_ERROR` | 422 | An invalid filter value. |
| `FORBIDDEN` | 403 | Caller's role lacks `driver:read`. |

**Example:**

```bash
curl "http://localhost:4000/api/drivers/active?search=doe" \
  -H "Authorization: Bearer eyJhbGciOi..."
```

---

### `GET /api/drivers/active/:driverId`

Fetches a single active driver by ID.

**Permission:** `driver:read`

**Input — params:**

| Field | Type | Rules |
|---|---|---|
| `driverId` | string | valid UUID |

**Response — `200 OK`:**

```json
{
  "data": {
    "activeDriver": {
      "driverId": "0f1e2d3c-4b5a-6978-8990-a1b2c3d4e5f6",
      "name": "John Doe",
      "image": "https://.../profile.jpg",
      "vehicleType": "Car",
      "category": "Standard",
      "phone": "+2348012345678",
      "driverStats": 128,
      "ratings": 4.7,
      "rate": "500",
      "plateNumber": "ABC-123-XY",
      "latitude": 6.5244,
      "longitude": 3.3792,
      "updatedAt": "2026-08-22T10:15:00.000Z"
    }
  }
}
```

`image`, `category`, `latitude`, and `longitude` may be `null`.

**Errors:**

| Code | Status | When |
|---|---|---|
| `VALIDATION_ERROR` | 422 | `driverId` is not a valid UUID. |
| `FORBIDDEN` | 403 | Caller's role lacks `driver:read`. |
| `NOT_FOUND` | 404 | No active driver matches `driverId`. |

**Example:**

```bash
curl http://localhost:4000/api/drivers/active/0f1e2d3c-4b5a-6978-8990-a1b2c3d4e5f6 \
  -H "Authorization: Bearer eyJhbGciOi..."
```

---

### `GET /api/drivers/:driverId`

Fetches a single driver by ID.

**Permission:** `driver:read`

**Input — params:**

| Field | Type | Rules |
|---|---|---|
| `driverId` | string | valid UUID |

**Response — `200 OK`:**

```json
{
  "data": {
    "driver": {
      "id": 41,
      "driverId": "0f1e2d3c-4b5a-6978-8990-a1b2c3d4e5f6",
      "profilePicUrl": "https://.../profile.jpg",
      "firstName": "John",
      "lastName": "Doe",
      "country": "Nigeria",
      "phoneNumber": "+2348012345678",
      "email": "john.doe@example.com",
      "vehicleType": "Car",
      "category": "Standard",
      "brand": "Toyota",
      "model": "Corolla",
      "modelYear": "2019",
      "vehicleColor": "Blue",
      "registrationDate": "2024-03-01",
      "plateNumber": "ABC-123-XY",
      "drivingLicense": "DL-00012345",
      "ninIdentification": "12345678901",
      "rate": "500",
      "rating": 4.7,
      "status": "active",
      "isVerified": true,
      "isApproved": "Approved",
      "createdAt": "2026-01-10T08:00:00.000Z",
      "updatedAt": "2026-02-01T12:00:00.000Z"
    }
  }
}
```

**Errors:**

| Code | Status | When |
|---|---|---|
| `VALIDATION_ERROR` | 422 | `driverId` is not a valid UUID. |
| `FORBIDDEN` | 403 | Caller's role lacks `driver:read`. |
| `NOT_FOUND` | 404 | No driver matches `driverId`. |

**Example:**

```bash
curl http://localhost:4000/api/drivers/0f1e2d3c-4b5a-6978-8990-a1b2c3d4e5f6 \
  -H "Authorization: Bearer eyJhbGciOi..."
```

---

### `GET /api/drivers/:driverId/documents`

Fetches a driver's uploaded verification documents.

**Permission:** `driver:read-documents`

**Input — params:**

| Field | Type | Rules |
|---|---|---|
| `driverId` | string | valid UUID |

**Response — `200 OK`:**

```json
{
  "data": {
    "document": {
      "id": 7,
      "driverId": "0f1e2d3c-4b5a-6978-8990-a1b2c3d4e5f6",
      "ninUrl": "https://.../nin.jpg",
      "frontViewUrl": "https://.../front.jpg",
      "backViewUrl": "https://.../back.jpg",
      "insideViewUrl": "https://.../inside.jpg",
      "sideViewUrl": "https://.../side.jpg",
      "plateNumberUrl": "https://.../plate.jpg",
      "insuranceUrl": "https://.../insurance.jpg",
      "rejectComment": null,
      "createdAt": "2026-01-10T08:05:00.000Z",
      "updatedAt": "2026-01-10T08:05:00.000Z"
    }
  }
}
```

Any of the URL fields, and `rejectComment`, may be `null` if not yet uploaded / not applicable.

**Errors:**

| Code | Status | When |
|---|---|---|
| `VALIDATION_ERROR` | 422 | `driverId` is not a valid UUID. |
| `FORBIDDEN` | 403 | Caller's role lacks `driver:read-documents`. |
| `NOT_FOUND` | 404 | No documents record exists for `driverId`. |

**Example:**

```bash
curl http://localhost:4000/api/drivers/0f1e2d3c-4b5a-6978-8990-a1b2c3d4e5f6/documents \
  -H "Authorization: Bearer eyJhbGciOi..."
```

---

### `GET /api/drivers/:driverId/full-data`

Fetches a driver's record and their uploaded documents together, merged into a single flat object — one round-trip instead of separately calling `GET /api/drivers/:driverId` and `GET /api/drivers/:driverId/documents`.

The response is the full `Driver` object (see Section 3's shared shape) with the `DriverDocument` object's content fields (`ninUrl`, `frontViewUrl`, `backViewUrl`, `insideViewUrl`, `sideViewUrl`, `plateNumberUrl`, `insuranceUrl`, `rejectComment`) merged directly onto it at the top level — **not** nested under a `document` key. The documents row's own `id`, `driverId`, `createdAt`, and `updatedAt` are deliberately dropped from the merge (only the `Driver` record's versions of those fields are kept), so there's no field collision between the two source records. If the driver has no documents uploaded yet, the document fields are simply absent — this is not an error.

**Permission:** `driver:read` **and** `driver:read-documents` (both required — this route exposes everything either individual route does)

**Input — params:**

| Field | Type | Rules |
|---|---|---|
| `driverId` | string | valid UUID |

**Response — `200 OK`:**

```json
{
  "data": {
    "driver": {
      "id": 41,
      "driverId": "0f1e2d3c-4b5a-6978-8990-a1b2c3d4e5f6",
      "profilePicUrl": "https://.../profile.jpg",
      "firstName": "John",
      "lastName": "Doe",
      "country": "Nigeria",
      "phoneNumber": "+2348012345678",
      "email": "john.doe@example.com",
      "vehicleType": "Car",
      "category": "Standard",
      "brand": "Toyota",
      "model": "Corolla",
      "modelYear": "2019",
      "vehicleColor": "Blue",
      "registrationDate": "2024-03-01",
      "plateNumber": "ABC-123-XY",
      "drivingLicense": "DL-00012345",
      "ninIdentification": "12345678901",
      "rate": "500",
      "rating": 4.7,
      "status": "active",
      "isVerified": true,
      "isApproved": "Approved",
      "createdAt": "2026-01-10T08:00:00.000Z",
      "updatedAt": "2026-02-01T12:00:00.000Z",
      "ninUrl": "https://.../nin.jpg",
      "frontViewUrl": "https://.../front.jpg",
      "backViewUrl": "https://.../back.jpg",
      "insideViewUrl": "https://.../inside.jpg",
      "sideViewUrl": "https://.../side.jpg",
      "plateNumberUrl": "https://.../plate.jpg",
      "insuranceUrl": "https://.../insurance.jpg",
      "rejectComment": null
    }
  }
}
```

Any of the document URL fields, and `rejectComment`, may be `null`/absent if not yet uploaded or no documents record exists at all for this driver.

**Errors:**

| Code | Status | When |
|---|---|---|
| `VALIDATION_ERROR` | 422 | `driverId` is not a valid UUID. |
| `FORBIDDEN` | 403 | Caller's role lacks `driver:read` or lacks `driver:read-documents`. |
| `NOT_FOUND` | 404 | No driver matches `driverId`. |

**Example:**

```bash
curl http://localhost:4000/api/drivers/0f1e2d3c-4b5a-6978-8990-a1b2c3d4e5f6/full-data \
  -H "Authorization: Bearer eyJhbGciOi..."
```

---

### `PATCH /api/drivers/:driverId/approve`

Updates a driver's approval status.

**Permission:** `driver:approve`

**Input — params:**

| Field | Type | Rules |
|---|---|---|
| `driverId` | string | valid UUID |

**Input — body:**

| Field | Type | Rules |
|---|---|---|
| `isApproved` | enum | One of `"False" \| "Pending" \| "Rejected" \| "Approved"` |

**Response — `200 OK`:**

```json
{
  "data": {
    "driver": {
      "id": 41,
      "driverId": "0f1e2d3c-4b5a-6978-8990-a1b2c3d4e5f6",
      "profilePicUrl": "https://.../profile.jpg",
      "firstName": "John",
      "lastName": "Doe",
      "country": "Nigeria",
      "phoneNumber": "+2348012345678",
      "email": "john.doe@example.com",
      "vehicleType": "Car",
      "category": "Standard",
      "brand": "Toyota",
      "model": "Corolla",
      "modelYear": "2019",
      "vehicleColor": "Blue",
      "registrationDate": "2024-03-01",
      "plateNumber": "ABC-123-XY",
      "drivingLicense": "DL-00012345",
      "ninIdentification": "12345678901",
      "rate": "500",
      "rating": 4.7,
      "status": "active",
      "isVerified": true,
      "isApproved": "Approved",
      "createdAt": "2026-01-10T08:00:00.000Z",
      "updatedAt": "2026-08-22T15:00:00.000Z"
    }
  }
}
```

The full `Driver` object is returned, reflecting the newly written `isApproved` value from the request body.

`isApproved` only allows specific transitions from its current state — not every enum value is reachable from every other:

| Current state | Can update to |
|---|---|
| `False` | *(none — terminal, no outbound transition)* |
| `Pending` | `Rejected`, `Approved` |
| `Rejected` | `Approved` |
| `Approved` | `Rejected` |

A state can never be "updated" to itself, nothing can transition back to `Pending`, and **no state can be updated to `False`** — it is only ever a driver's initial default, never a value this route can set.

**Errors:**

| Code | Status | When |
|---|---|---|
| `VALIDATION_ERROR` | 422 | `driverId` is not a valid UUID, or `isApproved` is missing/not a valid enum value. |
| `FORBIDDEN` | 403 | Caller's role lacks `driver:approve`. |
| `NOT_FOUND` | 404 | No driver matches `driverId`. |
| `INVALID_APPROVAL_TRANSITION` | 409 | The requested `isApproved` value isn't a valid transition from the driver's current state (see table above). |

**Example:**

```bash
curl -X PATCH http://localhost:4000/api/drivers/0f1e2d3c-4b5a-6978-8990-a1b2c3d4e5f6/approve \
  -H "Authorization: Bearer eyJhbGciOi..." \
  -H "Content-Type: application/json" \
  -d '{"isApproved":"Approved"}'
```

---

### `PATCH /api/drivers/:driverId/isVerified`

Toggles a driver's `isVerified` flag to the opposite of its current value. This is a pure toggle, not a caller-supplied value — there is no request body.

**Permission:** `driver:verify`

**Input — params:**

| Field | Type | Rules |
|---|---|---|
| `driverId` | string | valid UUID |

**Input — body:** none.

**Response — `200 OK`:**

```json
{ "data": { "isVerified": false } }
```

Only the new `isVerified` value is returned — `true` → `false` or `false` → `true`, whichever the driver's previous value wasn't. The rest of the `Driver` record is not included; fetch `GET /api/drivers/:driverId` (or `/full-data`) separately if you need it.

**Errors:**

| Code | Status | When |
|---|---|---|
| `VALIDATION_ERROR` | 422 | `driverId` is not a valid UUID. |
| `FORBIDDEN` | 403 | Caller's role lacks `driver:verify`. |
| `NOT_FOUND` | 404 | No driver matches `driverId`. |

**Example:**

```bash
curl -X PATCH http://localhost:4000/api/drivers/0f1e2d3c-4b5a-6978-8990-a1b2c3d4e5f6/isVerified \
  -H "Authorization: Bearer eyJhbGciOi..."
```

---

## 6. User Routes (`/api/users`)

Every route below requires `Authorization: Bearer <accessToken>` plus the listed permission. All routes in this group exclude `SuperAdmin` accounts from both listings and lookups — a `SuperAdmin` is never returned and can never be promoted/suspended/banned through this API.

### `GET /api/users`

Lists every user except `SuperAdmin` accounts. No filters currently supported.

**Permission:** `user:read`

**Input:** none.

**Response — `200 OK`:**

```json
{
  "data": {
    "users": [
      {
        "id": 12,
        "userId": "b3b3c3a0-3f9a-4b8e-9c1a-1f2e3d4c5b6a",
        "username": "jane_admin",
        "email": "jane@example.com",
        "role": "Admin",
        "status": "Active",
        "lastLogin": "2026-08-20T14:32:10.000Z",
        "createdAt": "2026-01-05T09:00:00.000Z",
        "updatedAt": "2026-08-20T14:32:10.000Z"
      }
    ]
  }
}
```

An empty result returns `{ "data": { "users": [] } }`. Every entry has the exact same fields shown above, one entry per non-`SuperAdmin` user; `lastLogin` is `null` until that account's first successful login.

**Errors:**

| Code | Status | When |
|---|---|---|
| `FORBIDDEN` | 403 | Caller's role lacks `user:read`. |

**Example:**

```bash
curl http://localhost:4000/api/users \
  -H "Authorization: Bearer eyJhbGciOi..."
```

---

### `GET /api/users/:userId`

Fetches a single non-`SuperAdmin` user's details.

**Permission:** `user:read`

**Input — params:**

| Field | Type | Rules |
|---|---|---|
| `userId` | string | valid UUID |

**Response — `200 OK`:**

```json
{
  "data": {
    "user": {
      "id": 12,
      "userId": "b3b3c3a0-3f9a-4b8e-9c1a-1f2e3d4c5b6a",
      "username": "jane_admin",
      "email": "jane@example.com",
      "role": "Admin",
      "status": "Active",
      "lastLogin": "2026-08-20T14:32:10.000Z",
      "createdAt": "2026-01-05T09:00:00.000Z",
      "updatedAt": "2026-08-20T14:32:10.000Z"
    }
  }
}
```

**Errors:**

| Code | Status | When |
|---|---|---|
| `VALIDATION_ERROR` | 422 | `userId` is not a valid UUID. |
| `FORBIDDEN` | 403 | Caller's role lacks `user:read`. |
| `NOT_FOUND` | 404 | No non-`SuperAdmin` user matches `userId`. |

**Example:**

```bash
curl http://localhost:4000/api/users/b3b3c3a0-3f9a-4b8e-9c1a-1f2e3d4c5b6a \
  -H "Authorization: Bearer eyJhbGciOi..."
```

---

### `PATCH /api/users/:userId/promote`

Promotes a `User`-role account to `Admin`.

**Permission:** `user:promote`

**Input — params:**

| Field | Type | Rules |
|---|---|---|
| `userId` | string | valid UUID |

**Input — body:** none.

**Response — `200 OK`:**

```json
{
  "data": {
    "user": {
      "id": 12,
      "userId": "b3b3c3a0-3f9a-4b8e-9c1a-1f2e3d4c5b6a",
      "username": "jane_admin",
      "email": "jane@example.com",
      "role": "Admin",
      "status": "Active",
      "lastLogin": "2026-08-20T14:32:10.000Z",
      "createdAt": "2026-01-05T09:00:00.000Z",
      "updatedAt": "2026-08-22T15:10:00.000Z"
    }
  }
}
```

The full `User` object is returned, with `role` now `"Admin"`.

**Errors:**

| Code | Status | When |
|---|---|---|
| `VALIDATION_ERROR` | 422 | `userId` is not a valid UUID. |
| `FORBIDDEN` | 403 | Caller's role lacks `user:promote`. |
| `NOT_FOUND` | 404 | No non-`SuperAdmin` user matches `userId`. |

**Example:**

```bash
curl -X PATCH http://localhost:4000/api/users/b3b3c3a0-3f9a-4b8e-9c1a-1f2e3d4c5b6a/promote \
  -H "Authorization: Bearer eyJhbGciOi..."
```

---

### `PATCH /api/users/:userId/suspend`

Suspends a non-`SuperAdmin` user. A suspended user is blocked from every authenticated route except logging in.

**Permission:** `user:suspend`

**Input — params:**

| Field | Type | Rules |
|---|---|---|
| `userId` | string | valid UUID |

**Input — body:** none.

**Response — `200 OK`:**

```json
{
  "data": {
    "user": {
      "id": 12,
      "userId": "b3b3c3a0-3f9a-4b8e-9c1a-1f2e3d4c5b6a",
      "username": "jane_admin",
      "email": "jane@example.com",
      "role": "Admin",
      "status": "Suspended",
      "lastLogin": "2026-08-20T14:32:10.000Z",
      "createdAt": "2026-01-05T09:00:00.000Z",
      "updatedAt": "2026-08-22T15:12:00.000Z"
    }
  }
}
```

The full `User` object is returned, with `status` now `"Suspended"`.

**Errors:**

| Code | Status | When |
|---|---|---|
| `VALIDATION_ERROR` | 422 | `userId` is not a valid UUID. |
| `FORBIDDEN` | 403 | Caller's role lacks `user:suspend`. |
| `NOT_FOUND` | 404 | No non-`SuperAdmin` user matches `userId`. |

**Example:**

```bash
curl -X PATCH http://localhost:4000/api/users/b3b3c3a0-3f9a-4b8e-9c1a-1f2e3d4c5b6a/suspend \
  -H "Authorization: Bearer eyJhbGciOi..."
```

---

### `PATCH /api/users/:userId/ban`

Bans a non-`SuperAdmin` user, blocking them from logging in at all.

**Permission:** `user:ban`

**Input — params:**

| Field | Type | Rules |
|---|---|---|
| `userId` | string | valid UUID |

**Input — body:** none.

**Response — `200 OK`:**

```json
{
  "data": {
    "user": {
      "id": 12,
      "userId": "b3b3c3a0-3f9a-4b8e-9c1a-1f2e3d4c5b6a",
      "username": "jane_admin",
      "email": "jane@example.com",
      "role": "Admin",
      "status": "Banned",
      "lastLogin": "2026-08-20T14:32:10.000Z",
      "createdAt": "2026-01-05T09:00:00.000Z",
      "updatedAt": "2026-08-22T15:14:00.000Z"
    }
  }
}
```

The full `User` object is returned, with `status` now `"Banned"`.

**Errors:**

| Code | Status | When |
|---|---|---|
| `VALIDATION_ERROR` | 422 | `userId` is not a valid UUID. |
| `FORBIDDEN` | 403 | Caller's role lacks `user:ban`. |
| `NOT_FOUND` | 404 | No non-`SuperAdmin` user matches `userId`. |

**Example:**

```bash
curl -X PATCH http://localhost:4000/api/users/b3b3c3a0-3f9a-4b8e-9c1a-1f2e3d4c5b6a/ban \
  -H "Authorization: Bearer eyJhbGciOi..."
```

---

## 7. Overview Routes (`/api/overview`)

### `GET /api/overview`

Fetches aggregated dashboard metrics — driver, active-driver, and admin counts — in a single call. Every number is computed in the database via `COUNT`/`GROUP BY` aggregate queries; no rows are fetched and counted in application code.

**Permission:** `overview:read`

**Input:** none.

**Response — `200 OK`:**

```json
{
  "data": {
    "overview": {
      "drivers": {
        "total": 120,
        "approved": 80,
        "pending": 25,
        "rejected": 10,
        "notSubmitted": 5,
        "verified": 90,
        "unverified": 30,
        "active": 70,
        "inactive": 50
      },
      "activeDrivers": {
        "total": 70
      },
      "admins": {
        "total": 8,
        "active": 6,
        "suspended": 1,
        "banned": 1
      }
    }
  }
}
```

`drivers.approved`/`pending`/`rejected`/`notSubmitted` are a breakdown of `isApproved` (`notSubmitted` corresponds to the `"False"` enum value); `drivers.verified`/`unverified` are a breakdown of `isVerified`. `drivers.active` is **not** derived from the `Driver.status` field — it is the same live-tracked count as `activeDrivers.total`, sourced from the separate `active_drivers` table (see `GET /api/drivers/active`). `drivers.inactive` remains a breakdown of `Driver.status`. `admins` counts every non-`SuperAdmin` user (i.e. the same roster `GET /api/users` lists), broken down by `status`.

**Errors:**

| Code | Status | When |
|---|---|---|
| `FORBIDDEN` | 403 | Caller's role lacks `overview:read`. |

**Example:**

```bash
curl http://localhost:4000/api/overview \
  -H "Authorization: Bearer eyJhbGciOi..."
```
