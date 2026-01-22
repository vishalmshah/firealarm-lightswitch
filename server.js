// This document implements a webserver to control a Kasa smart bulb
// via RESTful API endpoints. It uses the 'tplink-smarthome-api' library to
// communicate with the bulb and 'express' to create the webserver.

const express = require('express');
const { Client } = require('tplink-smarthome-api');

const app = express();
const client = new Client();

// --- CONFIGURATION ---
const BULB_IP = '10.0.0.39';
const SERVER_PORT = 3000;
// ---------------------

app.use(express.json());

// Gets state of the light
app.get('/state', async (req, res) => {
    console.log('GET light status');

    try {
        // Connect to the device via its IP
        const device = await client.getDevice({ host: BULB_IP });
        
        const sysInfo = await device.getSysInfo();
        const isOn = sysInfo.light_state.on_off === 1;
        
        console.log(`Successfully acquired bulb state ${BULB_IP}`);
        res.status(200).json({
            status: 'success',
            device: sysInfo.alias,
            is_on: isOn,
            brightness: sysInfo.light_state.brightness,
            raw_data: sysInfo.light_state // Includes hue, saturation, etc.
        });
    } catch (error) {
        console.error('Failed to communicate with the Kasa bulb:', error.message);
        res.status(500).send({ status: 'error', message: error.message });
    }
});

// Turns lights ON
app.post('/on', async (req, res) => {
    console.log('POST Lights turning ON');

    try {
        // Connect to the device via its IP
        const device = await client.getDevice({ host: BULB_IP });
        
        // Turn the light ON
        await device.setPowerState(true);
        
        console.log(`Successfully turned ON bulb at ${BULB_IP}`);
        res.status(200).send({ status: 'success', message: 'Bulb deactivated.' });
    } catch (error) {
        console.error('Failed to communicate with the Kasa bulb:', error.message);
        res.status(500).send({ status: 'error', message: error.message });
    }
});

// Turns lights OFF
app.post('/off', async (req, res) => {
    console.log('POST Lights turning OFF');

    try {
        // Connect to the device via its IP
        const device = await client.getDevice({ host: BULB_IP });
        
        // Turn the light OFF
        await device.setPowerState(false);
        
        console.log(`Successfully turned OFF bulb at ${BULB_IP}`);
        res.status(200).send({ status: 'success', message: 'Bulb deactivated.' });
    } catch (error) {
        console.error('Failed to communicate with the Kasa bulb:', error.message);
        res.status(500).send({ status: 'error', message: error.message });
    }
});

// Turns lights ON and sets to given brightness
// Expected Body: { "brightness": 75 }
app.post('/set-brightness', async (req, res) => {

    // Load brightness and validate
    const { brightness } = req.body;
    // Brightness must be between 1 and 100
    if (brightness === undefined || brightness < 1 || brightness > 100) {
        return res.status(400).json({ 
            status: 'error', 
            message: 'Please provide a brightness value between 1 and 100.' 
        });
    }
    
    console.log(`POST Lights turning ON and set to ${brightness}%`);
    
    try {
        // Connect to the device via its IP
        const device = await client.getDevice({ host: BULB_IP });
        
        // Set the new light state
        await device.lighting.setLightState({
            on_off: true,
            brightness: brightness
        });

        console.log(`Successfully turned ON bulb and set to ${brightness}% at ${BULB_IP}`);
        res.status(200).send({ status: 'success', message: 'Bulb deactivated.' });
    } catch (error) {
        console.error('Failed to communicate with the Kasa bulb:', error.message);
        res.status(500).send({ status: 'error', message: error.message });
    }
});

app.listen(SERVER_PORT, () => {
    console.log(`Webserver listening on port ${SERVER_PORT}`);
    console.log(`To trigger the bulb, send a POST request to: TODO`);
});