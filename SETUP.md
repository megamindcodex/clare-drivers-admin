# Setup Guide

Step-by-step instructions for getting the Clare Motors Driver Administration backend running from a fresh clone.

> **This repo is backend/API only — there's nothing to view in a browser from it alone.** To actually see and use the admin panel, you also need to clone and run the separate Vue.js frontend:
>
> ```bash
> git clone https://github.com/megamindcodex/clare-drivers-admin-frontend.git
> ```
>
> Follow that repo's own setup instructions to install and run it, pointing its API base URL at `http://localhost:4000` (or whatever `PORT` you set in this repo's `.env`). Once both are running, the frontend is what you open in the browser.

## Prerequisites

| Tool | Notes |
|---|---|
| **Git** | To clone the repo. |
| **Node.js 18+** | No `engines` field is pinned in `package.json`, but the code relies on native ESM and Node's `imports` subpath aliases (`#configs/*`, `#handlers/*`, etc.). Developed and tested on Node 22.20.0. |
| **npm** | Ships with Node. |
| **Docker + Docker Compose** | Runs MongoDB, Redis, and MySQL locally via `docker-compose.yml`. This is the easiest path — without Docker, you'd need to stand up all three yourself and point `.env` at them. |

`pm2` does **not** need a global install — `boot.sh` runs it via `npx pm2`, using the local dependency already in `package.json`.

## Steps

### 1. Clone and install dependencies

```bash
git clone <repo-url>
cd clare-drivers-admin
npm install
```

### 2. Create your `.env`

```bash
cp .env.example .env
```

Then edit the values that matter for a fresh setup:

* **`JWT_SECRET`** — must be set to something real; access tokens can't be signed with the placeholder value.
* **`SUPER_ADMIN_USERNAME`, `SUPER_ADMIN_EMAIL`, `SUPER_ADMIN_PASSWORD`** — this is how you log in the first time. **The app refuses to start** if these are unset and no `SuperAdmin` account exists yet in the database.
* **`MONGODB_URI`, `REDIS_URL`, `DATABASE_URL`** — the example values already match `docker-compose.yml` exactly (including `root`/`root` for MySQL), so if you're using Docker you can leave these as-is.
* **`CLIENT_ORIGIN`** — only matters once a frontend is calling the API cross-origin. Defaults to `http://localhost:5173`.

### 3. Start the databases

```bash
docker compose up -d
```

Brings up MongoDB (`27017`), Redis (`6379`), and MySQL (`3306`).

MongoDB is a hard startup requirement — the app crashes on boot if it can't connect — even though nothing in the codebase currently persists data there. The one Mongoose model that exists (`ActivityLog`) is unused, unwired scaffolding.

### 4. Set up the MySQL schema

```bash
npm run prisma:migrate
```

Creates the tables (`users`, `drivers`, `driver_documents`, `active_drivers`) from `schema.prisma` and generates the Prisma Client as a side effect. You don't need to run `npm run prisma:generate` separately for a fresh setup — that's only needed on its own in a production `prisma migrate deploy` flow, which doesn't auto-generate the client.

### 5. (Optional) Seed fake driver data

```bash
npm run prisma:seed
```

Populates `drivers`/`driver_documents` with fake data via `driver.seeder.js`. Useful for testing the driver routes; not required to boot the app.

### 6. Run it

Two options:

**All-in-one** (recommended) — waits for the containers, starts both the API and the email worker under pm2, and starts the crash-group watchdog (`pm2-watchdog.js`) that stops the whole group if either process exhausts its restarts:

```bash
npm run start:all
```

**Manual, two terminals** — if you'd rather see raw logs without pm2:

```bash
npm run dev          # Express API, with reload
npm run worker:dev   # email worker
```

The worker is required to see password-reset codes anywhere — email delivery isn't wired to a real transport, `sendEmail` just logs the subject and body from inside the worker process.

### 7. Verify it's up

```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"<SUPER_ADMIN_EMAIL from .env>","password":"<SUPER_ADMIN_PASSWORD from .env>"}'
```

A `200` response with an `accessToken` means the whole stack — MongoDB, Redis, MySQL, and the seeded SuperAdmin — is wired up correctly.

The full endpoint reference (every route, request/response shape, and error code) is in [`docs/api-reference.md`](docs/api-reference.md).
