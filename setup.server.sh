#!/bin/bash
set -e

# Run on the server machine (the computer that controls the Kasa bulb).
# Does NOT need sudo.
#
# Usage: bash setup.server.sh

# ---- Check Node.js ----
if ! command -v node &> /dev/null; then
    echo "Error: Node.js is not installed. Install it from https://nodejs.org and re-run."
    exit 1
fi

# ---- Install dependencies ----
# --ignore-scripts skips the pigpio native build, which only works on a Raspberry Pi.
# server.js does not use pigpio, so this is safe.
echo "Installing dependencies..."
npm install --ignore-scripts

# ---- Install PM2 globally if not already installed ----
if ! command -v pm2 &> /dev/null; then
    echo "Installing PM2..."
    npm install -g pm2
fi

# ---- Start the server process ----
echo "Starting kasa-server with PM2..."
pm2 start ecosystem.server.config.js

# ---- Persist the process list across reboots ----
echo "Saving PM2 process list..."
pm2 save

echo ""
echo "Registering PM2 with the system init daemon..."
echo "Copy and run the 'sudo env PATH=...' command that appears below:"
echo ""
pm2 startup

echo ""
echo "Setup complete. server.js is now running and will restart on reboot."
echo ""
echo "Useful commands:"
echo "  pm2 status           — check process status"
echo "  pm2 logs kasa-server — view live logs"
echo "  pm2 restart kasa-server"
echo "  pm2 stop kasa-server"
