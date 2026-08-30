import pm2 from "pm2";

const POLL_INTERVAL_MS = Number(process.env.POLL_SECONDS ?? 5) * 1000;
const watchedNames = process.argv.slice(2);

if (watchedNames.length === 0) {
  console.error("Usage: node pm2-watchdog.js <pm2-process-name> [<pm2-process-name> ...]");
  console.error("Example: node pm2-watchdog.js clare-express-app email-worker");
  process.exit(1);
}

/**
 * Fetches the current process list from the local pm2 daemon.
 * @returns {Promise<import("pm2").ProcessDescription[]>} All processes pm2 currently manages.
 */
const listProcesses = () =>
  new Promise((resolve, reject) => {
    pm2.connect((connectError) => {
      if (connectError) return reject(connectError);

      pm2.list((listError, processList) => {
        if (listError) return reject(listError);
        resolve(processList);
      });
    });
  });

/**
 * Stops every named pm2 process, one at a time.
 * @param {string[]} names - pm2 process names to stop.
 * @returns {Promise<void>}
 */
const stopProcesses = async (names) => {
  for (const name of names) {
    await new Promise((resolve, reject) => {
      pm2.stop(name, (error) => (error ? reject(error) : resolve()));
    });
  }
};

/**
 * Checks every watched process once. If any of them has given up retrying
 * on its own (pm2 marks it "errored" after exhausting max_restarts), stops
 * the whole watched group together instead of leaving healthy siblings
 * running next to a dead process indefinitely.
 * @returns {Promise<boolean>} Whether the group was stopped (the watchdog should exit).
 */
const checkWatchedProcesses = async () => {
  const processList = await listProcesses();

  for (const name of watchedNames) {
    const watchedProcess = processList.find((entry) => entry.name === name);

    if (!watchedProcess) {
      console.error(`'${name}' is not a known pm2 process — check the name matches ecosystem.config.cjs.`);
      process.exit(1);
    }

    if (watchedProcess.pm2_env.status === "errored") {
      console.log(
        `'${name}' is errored (pm2 exhausted its restarts) — stopping the whole group: ${watchedNames.join(", ")}`
      );
      await stopProcesses(watchedNames);
      return true;
    }
  }

  return false;
};

/**
 * Runs one check, then schedules the next one, until the watched group is
 * stopped or an unexpected error occurs.
 * @returns {Promise<void>}
 */
const tick = async () => {
  try {
    const stopped = await checkWatchedProcesses();

    if (stopped) {
      pm2.disconnect();
      return;
    }
  } catch (error) {
    console.error(error);
    pm2.disconnect();
    process.exit(1);
  }

  setTimeout(tick, POLL_INTERVAL_MS);
};

console.log(`Watching pm2 processes: ${watchedNames.join(", ")} (checking every ${POLL_INTERVAL_MS / 1000}s)`);

tick();
