// Run on the Raspberry Pi (the computer with the GPIO switch):
//   SERVER_URL=http://<server-ip>:3000 pm2 start ecosystem.client.config.js
//
// Or set SERVER_URL permanently in the env block below.
module.exports = {
  apps: [
    {
      name: "gpio-client",
      script: "./client.js",
      watch: false,
      exp_backoff_restart_delay: 100,
      env: {
        NODE_ENV: "production",
        SERVER_URL: "http://CHANGE_ME:3000"  // replace CHANGE_ME with your server's local IP
      }
    }
  ]
};
