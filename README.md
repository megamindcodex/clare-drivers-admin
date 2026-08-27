# Clare Motors — Driver Administration API

Node.js / Express backend for the Clare Motors Driver Administration project. See `CLAUDE.md` for the full backend coding standards and conventions.

## Stack

* Express — HTTP layer
* MongoDB (Mongoose) — primary application data
* MySQL (Prisma) — see `src/db/prisma/schema.prisma`
* Redis + BullMQ — queues/workers

## Getting started

```bash
npm install
cp .env.example .env   # then fill in real values
npm run prisma:generate
npm run prisma:migrate
npm run dev             # API
npm run worker:dev      # email worker, separate process
```

## Local infrastructure

`docker-compose.yml` spins up MongoDB, Redis, and MySQL for local development:

```bash
docker compose up -d
```
