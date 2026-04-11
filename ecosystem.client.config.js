// Run on the Raspberry Pi:
//   pm2 start ecosystem.client.config.js
module.exports = {
  apps: [
    {
      name: "firealarm",
      script: "./client.js",
      watch: true, // Change when turned off
      exp_backoff_restart_delay: 100,
      env: {
        NODE_ENV: "production"
      }
    }
  ]
};
