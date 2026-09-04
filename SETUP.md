# Setup Guide

Step-by-step instructions for getting the Clare Motors Driver Administration backend running from a fresh clone.

> **This repo is backend/API only — there's nothing to view in a browser from it alone.** To actually see and use the admin panel, you also need to clone and run the separate Vue.js frontend, as a **sibling directory** of this repo (both under the same parent folder — not nested inside `clare-drivers-admin`):
>
> ```bash
> cd ..   # up to the parent folder containing clare-drivers-admin
> git clone https://github.com/megamindcodex/clare-drivers-admin-frontend.git
> ```
>
> ```text
> parent-folder/
> ├── clare-drivers-admin/            (this repo)
> └── clare-drivers-admin-frontend/
> ```
>
> Follow that repo's own setup instructions to install and run it, pointing its API base URL at `http://localhost:4000` (or whatever `PORT` you set in this repo's `.env`). Once both are running, the frontend is what you open in the browser.

## Prerequisites

| Tool | Notes |
|---|---|
| **Git** | To clone the repo. |
| **Node.js 18+** | Must be installed on your machine. No `engines` field is pinned in `package.json`, but the code relies on native ESM and Node's `imports` subpath aliases (`#configs/*`, `#handlers/*`, etc.). Developed and tested on Node 22.20.0. |
| **npm** | Ships with Node. |
| **Docker + Docker Compose** | Must be installed **and the Docker daemon must be running** (open Docker Desktop, or start the `docker` service) before Step 3, and before Step 6 if `NODE_ENV=production` — all run `docker compose` commands under the hood, and those fail immediately if Docker itself isn't running. Runs MongoDB, Redis, and MySQL locally via `docker-compose.yml`. In **production mode**, `npm run start:all` (see Step 6) brings these containers up for you automatically once Docker is running. In **development mode**, you run `docker compose up -d` yourself as one of the manual steps `start:all` prints out. Without Docker at all, you'd need to stand up all three yourself and point `.env` at them. |
| **pm2** | Only used in **production mode** (Step 6) — **you don't install it yourself** even then, it's a regular entry in `dependencies` in `package.json`, so `npm install` in Step 1 already pulls it in locally. `boot.sh` runs it via `npx pm2` (not a bare `pm2` command), which deliberately targets that local copy in `node_modules/.bin` — **the project uses the local install, never a global one**, so there's nothing to install globally. In development mode `start:all` never touches pm2 at all — see Step 6. |

## Steps

### 1. Clone and install dependencies

```bash
git clone <repo-url>
cd clare-drivers-admin
npm install
```

### 2. Create your `.env`

Create a file named `.env` in the **project root** (the same folder as `package.json`, alongside `.env.example`). The quickest way is to copy the example file, which already has every key laid out:

```bash
cp .env.example .env
```

**Why there are two files:** `.env.example` is a *template*, committed to git, that documents every variable the app reads and shows a safe placeholder/default for each one — it's how anyone cloning the repo knows what configuration exists without having to read the source. `.env` is your own real, local copy of those variables — it's listed in `.gitignore` and is never committed, because it's where actual secrets and machine-specific values (like `JWT_SECRET` or `SUPER_ADMIN_PASSWORD`) end up. The workflow is always: copy the example once, then edit the copy — never edit `.env.example` with real values, and never commit `.env`.

**Required variables** — `src/configs/env.js` validates these at startup and **throws an error immediately (the app refuses to boot) if any are missing**:

| Variable | Used for |
|---|---|
| `PORT` | The port the Express API listens on. |
| `MONGODB_URI` | Connection string for MongoDB. The app crashes on boot if it can't connect — even though nothing in the codebase currently persists data there yet (the one Mongoose model, `ActivityLog`, is unused, unwired scaffolding). |
| `REDIS_URL` | Connection string for Redis, used for session storage and the BullMQ email-worker queue. |
| `SQL_URI` | Connection string Prisma uses for MySQL (`users`, `drivers`, `driver_documents`, `active_drivers`). |
| `JWT_SECRET` | Signs and verifies access tokens. Must be set to a real value — access tokens can't be signed with the placeholder value from `.env.example`. |

**Conditionally required** — checked separately, at a different point in startup (`seedSuperAdmin`, after the databases connect), and **also throws an error and refuses to boot** if unset, but *only* when no `SuperAdmin` account exists yet in the database. Once a SuperAdmin has been created, these are no longer read:

| Variable | Used for |
|---|---|
| `SUPER_ADMIN_USERNAME` | Username for the first SuperAdmin account, created automatically on first boot. |
| `SUPER_ADMIN_EMAIL` | Email for that first SuperAdmin — this is how you log in the first time. |
| `SUPER_ADMIN_PASSWORD` | Password for that first SuperAdmin. |

**Optional** — the app falls back to a sane default if these are left unset, no error is thrown:

| Variable | Default | Used for |
|---|---|---|
| `NODE_ENV` | `development` | Standard Node environment flag. Also what `npm run start:all` reads to decide **how** to run the app — see Step 6. |
| `CLIENT_ORIGIN` | `http://localhost:5173` | The exact origin(s) the frontend is served from — comma-separated for multiple origins (e.g. `http://localhost:5173,https://staging.example.com`). Only matters once a frontend is calling the API cross-origin — `cors()` needs an exact origin (no wildcard) to send `Access-Control-Allow-Credentials: true`. |
| `SESSION_TTL_SECONDS` | `43200` | How long a login session stays valid, in seconds. |
| `ACCESS_TOKEN_EXPIRES_IN` | `5m` | Access token lifetime, as a `jsonwebtoken` duration string. |

For a fresh Docker-based setup, the `MONGODB_URI`, `REDIS_URL`, and `SQL_URI` example values already match `docker-compose.yml` exactly (including `root`/`root` for MySQL), so you can leave those three as-is and only need to fill in `JWT_SECRET` and the `SUPER_ADMIN_*` values.

### 3. One-time: bring the databases up for schema setup

The next step (Prisma migrations) needs MySQL reachable, and at this point in a fresh setup nothing is running yet, so start the containers manually just this once:

```bash
docker compose up -d
```

Brings up MongoDB (`27017`), Redis (`6379`), and MySQL (`3306`).

> This is the only point in the normal setup flow where you need to run `docker compose up` yourself. Once you get to Step 6, `npm run start:all` brings these same containers up for you automatically — day to day, you won't need to touch Docker Compose directly.

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

**`npm run start:all` is the entry point for both modes — always run this first.** It reads `NODE_ENV` from `.env` (`start.sh`) and decides how to run the app from there. It does **not** run the same thing in both modes — which one you get depends entirely on the `NODE_ENV` value you set in Step 2:

```bash
npm run start:all
```

#### Development mode (`NODE_ENV=development` — the default)

This is what you want while actively writing code. `start:all` doesn't start anything itself in this mode — pm2's watch mode is deliberately off (see `ecosystem.config.cjs`), so a pm2-managed process would just sit there stale every time you save a file, which defeats the point of a dev loop. Instead it prints the manual steps and stops:

```
Project is in development mode (NODE_ENV != production).
Nothing was started automatically — start each piece yourself:

  1. docker compose up -d
  2. npm run dev
  3. npm run worker:dev

Run steps 2 and 3 in separate terminals so both keep watching for changes.
```

Follow it exactly: `docker compose up -d` once (safely no-ops if the containers from Step 3 are already running), then `npm run dev` and `npm run worker:dev` each in their own terminal. Both use `nodemon`, so edits to either the API or the worker reload instantly — no pm2, no manual restarts. Both processes must be running — the worker is required to see password-reset codes anywhere, since email delivery isn't wired to a real transport; `sendEmail` just logs the subject and body from inside the worker process.

#### Production mode (`NODE_ENV=production`)

Set `NODE_ENV=production` in `.env`, then run `npm run start:all` again. This time it hands off to `boot.sh`, which does everything for you: brings up the `mongodb`/`redis`/`mysql` containers via Docker Compose (no need to have run `docker compose up` yourself), waits for them to report healthy, then starts both the API and the email worker under pm2, plus the crash-group watchdog (`pm2-watchdog.js`) that stops the whole group if either process exhausts its restarts. One command, nothing else to start manually.

Since this mode runs everything under pm2 rather than printing to your terminal directly, use `npx pm2` (the same local copy `boot.sh` uses — no global install needed) to see what's happening with either process:

```bash
npx pm2 logs                    # stream logs for every app in the group
npx pm2 logs clare-express-app  # just the API
npx pm2 logs email-worker       # just the email worker (this is where password-reset codes get logged)
npx pm2 list                    # status/uptime/restart count for both processes
```

Note that `ecosystem.config.cjs` has `watch: false` for both apps — a code change in production mode requires an explicit `npx pm2 restart clare-express-app` (or `email-worker`), since pm2 won't pick it up on its own. That's expected: production mode is meant to mirror how the stack stays running unattended, not to double as a dev loop.

#### Stopping it

`npm run shutdown:all` is the counterpart to production mode's `start:all` — it undoes everything that mode brought up:

```bash
npm run shutdown:all
```

It stops the API and worker via pm2, stops `pm2-watchdog.js` (using the PID `boot.sh` records to `pm2-watchdog.pid` when it starts it — watchdog isn't itself a pm2-managed process, so `pm2 stop` alone can't reach it), and stops the `redis`/`mongodb`/`mysql` containers (`docker compose stop`, not `down` — their data volumes are left in place, so the next production-mode `npm run start:all` picks up right where you left off).

If you just want to pause the API/worker for a bit and don't care about freeing up the databases, `npx pm2 stop ecosystem.config.cjs` (or `npx pm2 stop all`) on its own is fine too — just be aware it leaves `pm2-watchdog.js` running as an orphaned background process, since a clean `pm2 stop` never puts an app into the `"errored"` state the watchdog is watching for. Use `npm run shutdown:all` instead if you want a clean, full stop with nothing left running.

By default, `shutdown:all` leaves both apps *registered* with pm2 — just stopped, not deleted — so the next `npm run start:all` (production mode) can bring them straight back up. Pass `--clean` to delete the pm2 registrations entirely instead, so the next production-mode start registers both apps from scratch off `ecosystem.config.cjs`:

```bash
npm run shutdown:all -- --clean
```

If you were in development mode instead, there's no pm2 stack to stop — just `Ctrl+C` the `npm run dev`/`npm run worker:dev` terminals, and run `docker compose stop` yourself if you want to free up the databases too.

### 7. Verify it's up

```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"<SUPER_ADMIN_EMAIL from .env>","password":"<SUPER_ADMIN_PASSWORD from .env>"}'
```

A `200` response with an `accessToken` means the whole stack — MongoDB, Redis, MySQL, and the seeded SuperAdmin — is wired up correctly.

The full endpoint reference (every route, request/response shape, and error code) is in [`docs/api-reference.md`](docs/api-reference.md).
