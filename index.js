import { startApp } from "./src/start-app.js";

startApp().catch((error) => {
  console.error(error);
  process.exit(1);
});
