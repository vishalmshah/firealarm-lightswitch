# Using pm2 to set up server and client
sudo pm2 start ecosystem.config.js
# sudo because client needs it for gpio

sudo pm2 save
sudo pm2 startup # Do the instructions printed here
