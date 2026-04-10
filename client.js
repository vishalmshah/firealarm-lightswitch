const { Gpio } = require('pigpio');
const { Client } = require('tplink-smarthome-api');

// --- CONFIGURATION ---
const GPIO_PIN = 16;
const BULB_IP = '10.0.0.39';
const DEBOUNCE_TIME = 1000; // ms — ignore repeated triggers within this window
// ---------------------

const kasaClient = new Client();
let cachedDevice = null;
let cachedLightState = null; // null = unknown, true = on, false = off

let alarmSwitch;
let lastTriggerTime = 0;

async function getDevice() {
    if (!cachedDevice) {
        cachedDevice = await kasaClient.getDevice({ host: BULB_IP });
    }
    return cachedDevice;
}

function invalidateDevice() {
    cachedDevice = null;
    cachedLightState = null;
}

async function toggleBulb(retries = 3) {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const device = await getDevice();

            if (cachedLightState === null) {
                const sysInfo = await device.getSysInfo();
                cachedLightState = sysInfo.light_state.on_off === 1;
            }

            if (cachedLightState) {
                await device.setPowerState(false);
                cachedLightState = false;
                console.log('Bulb turned OFF');
            } else {
                await device.lighting.setLightState({ on_off: true, brightness: 100 });
                cachedLightState = true;
                console.log('Bulb turned ON at 100%');
            }
            return;
        } catch (error) {
            console.error(`Attempt ${attempt}/${retries} failed: ${error.message}`);
            invalidateDevice();
            if (attempt < retries) {
                await new Promise(r => setTimeout(r, 500));
            }
        }
    }

    console.error(`All ${retries} attempts failed. Is the bulb reachable at ${BULB_IP}?`);
}

function startListening() {
    console.log(`Listening for fire alarm on GPIO pin ${GPIO_PIN}...`);

    alarmSwitch.on('alert', (level) => {
        const now = Date.now();

        // Only trigger on rising edge (LOW → HIGH) with debounce
        if (level === 1 && now - lastTriggerTime > DEBOUNCE_TIME) {
            console.log('Rising edge detected!');
            lastTriggerTime = now;
            toggleBulb();
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
    console.log('Fire Alarm Starting...');
    console.log(`Bulb IP: ${BULB_IP}`);

    try {
        alarmSwitch = new Gpio(GPIO_PIN, {
            mode: Gpio.INPUT,
            pullUpDown: Gpio.PUD_DOWN,
            alert: true,
        });
        // Clear any glitch filter left in the pigpio daemon from a previous run
        alarmSwitch.glitchFilter(0);

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
