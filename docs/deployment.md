# Deployment Guide (Render)

> Scope: how this backend is deployed on Render's **free tier** — two services built from this same repo/`package.json`, sharing a single MySQL database (Aiven) with no separate dev/prod split. This is a set of deliberate workarounds for free-tier constraints, called out explicitly below rather than presented as best practice.

---

## 1. Services

Two Render **Web Services** are deployed from this repo — both use the Web Service type, not Background Worker (see Section 2 for why).

| Service | Purpose | Start Command | Root Directory |
|---|---|---|---|
| API | Express HTTP API | `npm start` (`node src/index.js`) | *(blank)* |
| Worker | BullMQ email worker | `npm run worker` (`node src/workers/email.worker.js`) | *(blank)* |

Root Directory is left blank for both — `package.json` lives at the repo root, this isn't a multi-package monorepo, so there's no subfolder to point Render at.

---

## 2. Why the worker is deployed as a Web Service, not a Background Worker

Render's Background Worker service type has no free-tier instance — only Web Services and Static Sites are free. A Web Service, however, must bind to `process.env.PORT` on `0.0.0.0`, or the deploy fails with "no open ports detected."

To get a background job process running on the free tier, `src/workers/email.worker.js` opens a trivial `node:http` server on `env.port` (`healthCheckServer`) that responds `200 ok` to any request (`handleHealthCheck`). That server does no real work — it exists purely so Render has a port to route/health-check against. The actual `BullMQ` `Worker` in the same file keeps consuming email jobs independently, in the same Node process, unaffected by those HTTP requests.

---

## 3. Environment variables

`src/configs/env.js` validates `PORT`, `MONGODB_URI`, `SQL_URI`, `JWT_SECRET` unconditionally at import time, and both entry points import it transitively — the worker via `redis.config.js` → `env.js` and via `logger.js` → `env.js`. So even though the worker never touches Mongo, SQL, or JWTs, **it will refuse to boot unless those are also set.**

Set the full variable set on **both** Render services (see `SETUP.md` for what each one does):

`PORT`, `MONGODB_URI`, `REDIS_URL`, `SQL_URI`, `JWT_SECRET`, `SUPER_ADMIN_USERNAME`, `SUPER_ADMIN_EMAIL`, `SUPER_ADMIN_PASSWORD`, `CLIENT_ORIGIN`.

Functionally, the worker only needs `REDIS_URL` (its BullMQ connection) and optionally `NODE_ENV` (log level) — the rest are set purely to satisfy `env.js`'s shared validation, not because the worker uses them.

---

## 4. Database — one shared instance, migrations applied manually

There is currently **one** MySQL database (Aiven), used by both local development and production — the local `.env`'s `SQL_URI` already points directly at it. There is no separate dev/prod database split.

Consequences of that:

* Render's **Pre-Deploy Command** — which would otherwise run `prisma migrate deploy` automatically before a new deploy goes live — is a paid-instance-only feature and is locked/uneditable on the Free instance type.
* Schema changes are applied **manually, from a local machine**: running `npm run prisma:migrate` (`prisma migrate dev`) against the local `.env` applies the migration to Aiven **immediately**, before the corresponding code is even committed or pushed. There is no separate "deploy to prod" step required in this setup — by the time you push, the database is already current.
* `npm run prisma:deploy` (`prisma migrate deploy`) exists for applying an already-created migration file (from git) without running `migrate dev` again — e.g. from a fresh machine, or a teammate who pulled a commit containing a migration but hasn't run `migrate dev` themselves. It's a safe no-op if nothing is pending.
* **Caution:** because `migrate dev` applies to Aiven instantly, a destructive change (renaming/dropping a column or table the currently-deployed code still reads) can land on the live schema before the new app code is deployed, causing the *old* running code to error in that window. Additive changes (new nullable column, new table) are safe to apply ahead of the code deploy; destructive ones aren't.

---

## 5. Keep-alive workaround (Render free-tier spin-down)

Render's free Web Services spin down after **15 minutes** with no inbound HTTP traffic, then pay a cold-start delay on the next request. Since the worker's only "traffic" is Render's own health check, and there's no Background Worker tier to avoid this on, both services are kept warm by an external cron pinger — **[cron-job.org](https://cron-job.org)** (free).

| Job | Target | Interval | Expected |
|---|---|---|---|
| API keep-alive | `GET https://<api-service>.onrender.com/health` | every 10 min | `200` |
| Worker keep-alive | `GET https://<worker-service>.onrender.com/` | every 10 min | `200` |

`GET /health` (added in `src/bootstrap/express-app.factory.js`, documented in `docs/api-reference.md` §2) and the worker's bare HTTP server both exist specifically for this — they carry no other purpose and aren't part of the client-facing API surface.

10 minutes (not 15) leaves margin against Render's cutoff, especially if a scheduled ping ever runs a little late.

**This is a workaround, not a guaranteed-forever mechanism.** It relies on Render's current idle-detection behavior, which could change without notice since it exists specifically so Render doesn't pay for idle free-tier compute. If a paid instance ever becomes affordable, the more correct setup is: a real Background Worker service for the worker (no port/health-check hack needed) and Render's built-in Pre-Deploy Command for migrations (no manual local step, no shared-database dependency on remembering to run `migrate dev` before pushing).
