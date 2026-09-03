# Clare Motors — Driver Administration API

Node.js / Express backend for the Clare Motors Driver Administration project. See `CLAUDE.md` for the full backend coding standards and conventions.

## Stack

* Express — HTTP layer
* MongoDB (Mongoose) — primary application data
* MySQL (Prisma) — see `src/db/prisma/schema.prisma`
* Redis + BullMQ — queues/workers

## Getting started

Full step-by-step instructions (env setup, starting the databases, running migrations, seeding the first SuperAdmin) are in [`SETUP.md`](SETUP.md) — follow that guide for a fresh clone, since the required order (databases must be up *before* running migrations) matters.

`docker-compose.yml` spins up MongoDB, Redis, and MySQL for local development:

```bash
docker compose up -d
```
