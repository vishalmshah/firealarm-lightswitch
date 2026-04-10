// Run on the server machine (the computer controlling the Kasa bulb):
//   pm2 start ecosystem.server.config.js
module.exports = {
  apps: [
    {
      name: "kasa-server",
      script: "./server.js",
      watch: true,
      restart_delay: 1000,
      env: {
        NODE_ENV: "production",
        PORT: 3000
      }
    }
  ]
};
