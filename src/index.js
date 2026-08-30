import { startApp } from "#bootstrap/start-app.js";

startApp().catch((error) => {
  console.error(error);
  process.exit(1);
});
