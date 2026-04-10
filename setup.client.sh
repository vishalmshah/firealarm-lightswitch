#!/bin/bash
set -e

# Run on the Raspberry Pi (the computer with the GPIO fire alarm switch).
# Must be run with sudo because pigpio requires root access.
#
# Usage: sudo bash setup.client.sh <server-ip>
# Example: sudo bash setup.client.sh 192.168.1.42

# ---- Must run as root ----
if [ "$EUID" -ne 0 ]; then
    echo "Error: run this script with sudo."
    echo "  sudo bash setup.client.sh <server-ip>"
    exit 1
fi

# ---- Get server IP ----
SERVER_IP="$1"
if [ -z "$SERVER_IP" ]; then
    read -p "Enter the server's local IP address (e.g. 192.168.1.42): " SERVER_IP
fi

if [ -z "$SERVER_IP" ]; then
    echo "Error: no server IP provided."
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

# ---- Write the server URL into the ecosystem config ----
echo "Configuring server URL to http://${SERVER_IP}:3000 ..."
sed -i "s|http://CHANGE_ME:3000|http://${SERVER_IP}:3000|g" ecosystem.client.config.js

# ---- Install PM2 globally if not already installed ----
if ! command -v pm2 &> /dev/null; then
    echo "Installing PM2..."
    npm install -g pm2
fi

# ---- Start the client process ----
echo "Starting gpio-client with PM2..."
pm2 start ecosystem.client.config.js

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
echo "  pm2 status            — check process status"
echo "  pm2 logs gpio-client  — view live logs"
echo "  pm2 restart gpio-client"
echo "  pm2 stop gpio-client"
