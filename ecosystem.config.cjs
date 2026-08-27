module.exports = {
  apps: [
    {
      name: "email-worker",
      script: "src/workers/email.worker.js",
      cwd: __dirname,
      autorestart: true,
      max_restarts: 10,
      min_uptime: "10s",
      watch: false,
    },
    {
      name: "clare-express-app",
      script: "index.js",
      cwd: __dirname,
      autorestart: true,
      max_restarts: 10,
      min_uptime: "10s",
      watch: false,
    },
  ],
};
