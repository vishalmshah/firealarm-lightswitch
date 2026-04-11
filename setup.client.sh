#!/bin/bash
set -e

# Run on the Raspberry Pi to install dependencies and register the fire alarm
# as a service that starts automatically on boot.
# Must be run with sudo because pigpio requires root access.
#
# Usage:
#   sudo bash setup.client.sh           — normal mode
#   sudo bash setup.client.sh --verbose — enable detailed timing logs

# ---- Parse arguments ----
VERBOSE=0
for arg in "$@"; do
    case $arg in
        --verbose) VERBOSE=1 ;;
        *) echo "Unknown argument: $arg"; exit 1 ;;
    esac
done

# ---- Must run as root ----
if [ "$EUID" -ne 0 ]; then
    echo "Error: run this script with sudo."
    echo "  sudo bash setup.client.sh"
    exit 1
fi

# ---- Check Node.js ----
if ! command -v node &> /dev/null; then
    echo "Error: Node.js is not installed. Install it and re-run."
    exit 1
fi

# ---- Install dependencies ----
echo "Installing dependencies..."
npm install

# ---- Install PM2 globally if not already installed ----
if ! command -v pm2 &> /dev/null; then
    echo "Installing PM2..."
    npm install -g pm2
fi

# ---- Start the process ----
echo "Starting firealarm with PM2..."
VERBOSE=$VERBOSE pm2 start ecosystem.client.config.js

# ---- Persist the process list across reboots ----
echo "Saving PM2 process list..."
pm2 save

echo ""
echo "Registering PM2 with the system init daemon..."
pm2 startup

echo ""
echo "Setup complete. client.js is now running and will restart on reboot."
echo ""
echo "Useful commands:"
echo "  pm2 status          — check process status"
echo "  pm2 logs firealarm  — view live logs"
echo "  pm2 restart firealarm"
echo "  pm2 stop firealarm"
