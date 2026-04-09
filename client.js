const { Gpio } = require('pigpio');
const axios = require('axios');

// --- CONFIGURATION ---
const GPIO_PIN = 16;
const SERVER_URL = process.env.SERVER_URL || 'http://localhost:3000';
const FIRE_ALARM_ENDPOINT = '/toggle-light-bright';
const DEBOUNCE_TIME = 1000; // ms — ignore repeated triggers within this window
// ---------------------

let alarmSwitch;
let lastTriggerTime = 0;

async function triggerAlarm() {
    try {
        console.log('Fire alarm triggered! Sending signal to server...');

        const response = await axios.post(`${SERVER_URL}${FIRE_ALARM_ENDPOINT}`, {}, { timeout: 5000 });

        console.log(`Server responded: ${response.data.message}`);
        console.log(`Power state: ${response.data.power_state ? 'ON' : 'OFF'}`);
    } catch (error) {
        console.error(`Failed to reach server: ${error.message}`);
        console.error(`Make sure the server is running at ${SERVER_URL}`);
    }
}

function startListening() {
    console.log(`Listening for fire alarm on GPIO pin ${GPIO_PIN}...`);

    alarmSwitch.on('alert', (level) => {
        const now = Date.now();

        // Only trigger on rising edge (LOW → HIGH) with debounce
        if (level === 1 && now - lastTriggerTime > DEBOUNCE_TIME) {
            console.log('Rising edge detected!');
            lastTriggerTime = now;
            triggerAlarm();
        }
    });
}

function cleanup() {
    try {
        if (alarmSwitch) {
            alarmSwitch.digitalWrite(0);
            alarmSwitch.disableAlert();
        }
        console.log('GPIO cleaned up. Exiting.');
    } catch (error) {
        console.error(`Error during cleanup: ${error.message}`);
    }
    process.exit();
}

function main() {
    console.log('Fire Alarm GPIO Listener Starting...');
    console.log(`Server URL: ${SERVER_URL}`);

    try {
        alarmSwitch = new Gpio(GPIO_PIN, {
            mode: Gpio.INPUT,
            pullUpDown: Gpio.PUD_DOWN,
            alert: true,
        });

        console.log(`GPIO pin ${GPIO_PIN} initialized (pull-down, HIGH = triggered)`);
        startListening();
    } catch (error) {
        console.error(`Failed to initialize GPIO: ${error.message}`);
        console.error('Make sure you are running with sudo: sudo node client.js');
        process.exit(1);
    }

    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
}

main();