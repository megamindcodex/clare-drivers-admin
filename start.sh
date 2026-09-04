#!/usr/bin/env bash

# Exit immediately if any command fails.
set -e

# --- Read NODE_ENV straight from .env --------------------------------------
# We can't rely on the app itself to tell us the mode yet — this script has
# to decide which apps get booted at all — so it reads NODE_ENV directly out
# of .env, the same file src/configs/env.js will parse once the app starts.
# Defaults to "development" if .env is missing the line entirely, matching
# the fallback in src/configs/env.js.
NODE_ENV=$(grep -m1 '^NODE_ENV=' .env 2>/dev/null | cut -d '=' -f2- | tr -d '\r')
NODE_ENV=${NODE_ENV:-development}

if [ "$NODE_ENV" = "production" ]; then
  echo "NODE_ENV=production — booting the full stack via boot.sh..."
  exec bash boot.sh
fi

# --- Development mode: don't start anything automatically -------------------
# In development you want nodemon's instant reload on every save, not PM2's
# manual-restart-required stack (see ecosystem.config.cjs — watch is
# deliberately off there). So this script stops here and tells you the
# manual steps instead of starting anything itself.
cat <<'EOF'
Project is in development mode (NODE_ENV != production).
Nothing was started automatically — start each piece yourself:

  1. docker compose up -d
  2. npm run dev
  3. npm run worker:dev

Run steps 2 and 3 in separate terminals so both keep watching for changes.

To boot the full PM2-managed stack instead, set NODE_ENV=production in .env
and re-run this command.
EOF
