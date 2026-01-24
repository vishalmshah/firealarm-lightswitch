// Ecosystem file that contains info for starting a pm2 process
module.exports = {
  apps: [
    {
      name: "kasa-server",
      script: "./server.js",
      // If server.js writes to a log file, PM2 won't restart in a loop
      watch: true,
      ignore_watch: ["node_modules", "logs", "*.log"],
      // Wait 1 second before restarting if it crashes
      restart_delay: 1000,
      env: {
        NODE_ENV: "development",
        PORT: 3000
      }
    },
    {
      name: "gpio-client",
      script: "./client.js",
      watch: true,
      ignore_watch: ["node_modules"],
      // Use exponential backoff (waits longer between each crash)
      exp_backoff_restart_delay: 100,
      env: {
        NODE_ENV: "development",
        SERVER_URL: "http://localhost:3000"
      }
    }
  ]
};
