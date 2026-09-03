FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# `prisma generate` only needs SQL_URI to exist to validate the schema's
# env("SQL_URI") reference — it never connects to a database at build time.
# The real value is supplied at container start (docker run -e / Compose
# environment:) and is what the generated client actually resolves against
# when the app connects, so this placeholder never reaches a live database.
ENV SQL_URI="mysql://placeholder:placeholder@localhost:3306/placeholder"
RUN npx prisma generate

RUN npm prune --omit=dev

EXPOSE 4000

CMD ["node", "src/index.js"]
