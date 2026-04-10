// This document implements a webserver to control a Kasa smart bulb
// via RESTful API endpoints. It uses the 'tplink-smarthome-api' library to
// communicate with the bulb and 'express' to create the webserver.

// Debug this with "curl -X POST http://localhost:SERVER_PORT/ENDPOINT"

const express = require('express');
const { Client } = require('tplink-smarthome-api');

const app = express();
const client = new Client();

// --- CONFIGURATION ---
const BULB_IP = '10.0.0.39';
const SERVER_PORT = 3000;
// ---------------------

app.use(express.json());

// Cached device connection and last known state to avoid redundant network calls.
// cachedLightState: null = unknown (will query bulb), true = on, false = off
let cachedDevice = null;
let cachedLightState = null;

async function getDevice() {
    if (!cachedDevice) {
        cachedDevice = await client.getDevice({ host: BULB_IP });
    }
    return cachedDevice;
}

function invalidateDevice() {
    cachedDevice = null;
    cachedLightState = null;
}

// Gets state of the light
app.get('/state', async (req, res) => {
    console.log('GET light status');

    try {
        const device = await getDevice();
        const sysInfo = await device.getSysInfo();
        const isOn = sysInfo.light_state.on_off === 1;

        cachedLightState = isOn;

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
        invalidateDevice();
        res.status(500).send({ status: 'error', message: error.message });
    }
});

// Turns lights ON
app.post('/on', async (req, res) => {
    console.log('POST Lights turning ON');

    try {
        const device = await getDevice();
        await device.setPowerState(true);
        cachedLightState = true;

        console.log(`Successfully turned ON bulb at ${BULB_IP}`);
        res.status(200).send({ status: 'success', message: 'Bulb activated.' });
    } catch (error) {
        console.error('Failed to communicate with the Kasa bulb:', error.message);
        invalidateDevice();
        res.status(500).send({ status: 'error', message: error.message });
    }
});

// Turns lights OFF
app.post('/off', async (req, res) => {
    console.log('POST Lights turning OFF');

    try {
        const device = await getDevice();
        await device.setPowerState(false);
        cachedLightState = false;

        console.log(`Successfully turned OFF bulb at ${BULB_IP}`);
        res.status(200).send({ status: 'success', message: 'Bulb deactivated.' });
    } catch (error) {
        console.error('Failed to communicate with the Kasa bulb:', error.message);
        invalidateDevice();
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
        const device = await getDevice();
        await device.lighting.setLightState({
            on_off: true,
            brightness: brightness
        });
        cachedLightState = true;

        console.log(`Successfully turned ON bulb and set to ${brightness}% at ${BULB_IP}`);
        res.status(200).send({ status: 'success', message: `Bulb set to ${brightness}%.` });
    } catch (error) {
        console.error('Failed to communicate with the Kasa bulb:', error.message);
        invalidateDevice();
        res.status(500).send({ status: 'error', message: error.message });
    }
});

// Toggles light between OFF and ON
app.post('/toggle-light', async (req, res) => {
    try {
        const device = await getDevice();

        // Use cached state to avoid a getSysInfo() round trip; fall back to querying if unknown
        if (cachedLightState === null) {
            const sysInfo = await device.getSysInfo();
            cachedLightState = sysInfo.light_state.on_off === 1;
        }

        const newState = !cachedLightState;
        await device.setPowerState(newState);
        cachedLightState = newState;

        console.log(`Toggle: Turning bulb ${newState ? 'ON' : 'OFF'}`);
        res.json({ status: 'success', power_state: newState });
    } catch (error) {
        console.error('Toggle failed:', error.message);
        invalidateDevice();
        res.status(500).json({ status: 'error', message: 'Communication error' });
    }
});

// Toggles light between OFF and 100% brightness
app.post('/toggle-light-bright', async (req, res) => {
    try {
        const device = await getDevice();

        // Use cached state to avoid a getSysInfo() round trip; fall back to querying if unknown
        if (cachedLightState === null) {
            const sysInfo = await device.getSysInfo();
            cachedLightState = sysInfo.light_state.on_off === 1;
        }

        if (cachedLightState) {
            // If it's ON, turn it OFF
            await device.setPowerState(false);
            cachedLightState = false;
            console.log('Toggle (bright): Turning bulb OFF');
            res.json({ status: 'success', power_state: false });
        } else {
            // If it's OFF, turn it ON at 100% brightness
            await device.lighting.setLightState({
                on_off: true,
                brightness: 100
            });
            cachedLightState = true;
            console.log('Toggle (bright): Turning bulb ON to 100%');
            res.json({ status: 'success', power_state: true, brightness: 100 });
        }
    } catch (error) {
        console.error('Toggle failed:', error.message);
        invalidateDevice();
        res.status(500).json({ status: 'error', message: 'Communication error' });
    }
});

app.listen(SERVER_PORT, () => {
    console.log(`Webserver listening on port ${SERVER_PORT}`);
});
