#!/bin/bash
set -e

# Run this script once on your Raspberry Pi to make the app start automatically,
# including after reboots or power cuts.
#
# Usage: sudo bash setup.sh

# ---- Install PM2 globally if not already installed ----
if ! command -v pm2 &> /dev/null; then
    echo "Installing PM2..."
    npm install -g pm2
fi

# ---- Start all processes via the ecosystem config ----
# sudo is required because the GPIO client needs root access
echo "Starting processes with PM2..."
sudo pm2 start ecosystem.config.js

# ---- Save the process list so PM2 restores it after a reboot ----
echo "Saving PM2 process list..."
sudo pm2 save

# ---- Register PM2 as a system startup service ----
echo ""
echo "Registering PM2 with the system init daemon..."
echo "Follow the instruction printed below (copy and run the sudo command it gives you):"
echo ""
sudo pm2 startup

echo ""
echo "Setup complete. Your app will now restart automatically on reboot."
echo ""
echo "Useful commands:"
echo "  sudo pm2 status        — check process status"
echo "  sudo pm2 logs          — view live logs"
echo "  sudo pm2 restart all   — restart all processes"
echo "  sudo pm2 stop all      — stop all processes"
