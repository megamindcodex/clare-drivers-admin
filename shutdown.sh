#!/usr/bin/env bash

# Exit immediately if any command fails — we never want to leave the stack
# in an unknown, half-stopped state.
set -e

# --- Parse flags --------------------------------------------------------
# --clean additionally deletes each app's pm2 registration instead of just
# stopping it, so the next production-mode `npm run start:all` registers
# every app from scratch off ecosystem.config.cjs rather than resuming a
# stopped entry. Default (no flag) behavior is unchanged: stop only, so apps
# stay registered and `start:all` can bring them straight back up.
CLEAN=false
case "${1:-}" in
  --clean)
    CLEAN=true
    ;;
  "")
    ;;
  *)
    echo "Unknown flag: $1" >&2
    echo "Usage: npm run shutdown:all -- [--clean]" >&2
    exit 1
    ;;
esac

echo "Shutting down the clare-drivers-admin stack..."

# --- Step 1: stop the process-group watchdog --------------------------------
# boot.sh starts pm2-watchdog.js detached (not pm2-managed itself) and records
# its PID in pm2-watchdog.pid — that's the only way to find and stop it here.
if [ -f pm2-watchdog.pid ]; then
  WATCHDOG_PID=$(cat pm2-watchdog.pid)

  if kill -0 "$WATCHDOG_PID" 2>/dev/null; then
    echo "Stopping pm2-watchdog.js (PID $WATCHDOG_PID)..."
    kill "$WATCHDOG_PID"
  else
    echo "pm2-watchdog.js (PID $WATCHDOG_PID) isn't running — skipping."
  fi

  rm -f pm2-watchdog.pid
else
  echo "No pm2-watchdog.pid found — skipping (was the stack started via npm run start:all?)."
fi

# --- Step 2: stop (or delete) the app processes ------------------------------
# `npx pm2` (not bare `pm2`) so this works from pm2's local dependency in
# node_modules — no global `npm install -g pm2` required on the machine.
# `pm2 stop` (not `delete`) leaves the apps registered with pm2 so
# `npm run start:all` can bring them straight back up next time — unless
# --clean was passed, in which case we deliberately want the opposite: no
# trace left in pm2's process list, so the next start registers fresh.
if [ "$CLEAN" = true ]; then
  echo "Deleting worker and express pm2 registrations (--clean)..."
  npx pm2 delete ecosystem.config.cjs
else
  echo "Stopping worker and express via PM2..."
  npx pm2 stop ecosystem.config.cjs
fi

# --- Step 3: stop the database containers ------------------------------------
# `docker compose stop` (not `down`) leaves the containers and their data
# volumes in place for the next `npm run start:all`.
echo "Stopping database containers (redis, mongodb, mysql)..."
docker compose stop

echo "Done."
