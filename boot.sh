#!/usr/bin/env bash

# Exit immediately if any command fails — we never want to limp forward
# with a half-started stack.
set -e

# --- Configuration -----------------------------------------------------
MAX_RETRIES=15   # How many times to check a container before giving up.
WAIT_SECONDS=2   # How long to sleep between each check.

# --- Step 1: start the database containers ------------------------------
echo "Starting database containers (redis, mongodb, mysql) via Docker Compose..."
echo "(first run may take a while — Compose pulls any images you don't have locally yet)"
# Safe to re-run: Compose leaves already-running containers alone and only
# (re)creates what's missing/stopped.
docker compose up -d

# --- wait_for_container: poll a single container until it's running -----
# Usage: wait_for_container <container_name>
wait_for_container() {
  local name="$1"      # Container to wait for. `local` keeps it scoped to
                        # this function so it can't leak into/clash with
                        # anything else in the script.
  local attempt=1       # Which attempt we're on.

  while [ "$attempt" -le "$MAX_RETRIES" ]; do
    # `docker inspect -f '{{.State.Running}}' <name>` prints "true" or
    # "false" for that container. If the container doesn't exist at all,
    # docker inspect errors out instead — `2>/dev/null` hides that error
    # message, and `|| echo "false"` makes "container doesn't exist yet"
    # behave the same as "container exists but isn't running". Splitting
    # the `local` declaration from the assignment (rather than
    # `local is_running=$(...)` on one line) matters here: with `set -e`
    # active, a one-line `local var=$(cmd)` would hide a failing `cmd`
    # behind the exit status of `local` itself.
    local is_running
    is_running=$(docker inspect -f '{{.State.Running}}' "$name" 2>/dev/null || echo "false")

    if [ "$is_running" = "true" ]; then
      echo "✔ $name is running."
      return 0   # Success — exit the function early, don't keep polling.
    fi

    echo "  waiting for $name to start (attempt $attempt/$MAX_RETRIES)..."
    sleep "$WAIT_SECONDS"
    attempt=$((attempt + 1))
  done

  # Only reached if every attempt above failed.
  local total_seconds=$((MAX_RETRIES * WAIT_SECONDS))
  echo "✘ $name did not report as running after ${total_seconds}s. Aborting." >&2
  exit 1   # Aborts the whole script, not just this function.
}

# --- Step 2: wait for each database in turn ------------------------------
# One at a time, in order — we don't move on to the next container until
# the current one is confirmed running.
for container in redis mongodb mysql; do
  wait_for_container "$container"
done

# --- Step 3: start the app processes --------------------------------------
# Only reached once all three databases are confirmed running.
# `npx pm2` (not bare `pm2`) so this works from pm2's local dependency in
# node_modules — no global `npm install -g pm2` required on the machine.
echo "All databases are up. Starting worker and express via PM2..."
npx pm2 start ecosystem.config.cjs   # PM2 starts "worker" then "express", in the order listed in that file.

# --- Step 4: watch the pm2 process group -----------------------------------
# Per-app max_restarts in ecosystem.config.cjs only stops that one app once
# it exhausts its own restarts — pm2 has no built-in way to take the rest of
# the group down with it, so a dead clare-express-app can sit next to a
# perfectly healthy email-worker indefinitely. pm2-watchdog.js closes that
# gap: the moment any watched app lands in pm2's "errored" state, it stops
# every app in the group together.
# App names are read from ecosystem.config.cjs itself (not hardcoded here)
# so this never drifts out of sync with what's actually being started above.
echo "Starting pm2-watchdog.js to monitor the process group..."
APP_NAMES=$(node -e "console.log(require('./ecosystem.config.cjs').apps.map((app) => app.name).join(' '))")
nohup node pm2-watchdog.js $APP_NAMES > pm2-watchdog.log 2>&1 &
echo "pm2-watchdog running in background (PID $!), logging to pm2-watchdog.log."

echo "Done."
