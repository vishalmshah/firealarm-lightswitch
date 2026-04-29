const { Gpio } = require('pigpio');
const { Client } = require('tplink-smarthome-api');

// --- CONFIGURATION ---
const GPIO_PIN = 16;
const BULB_IP = '10.0.0.39';
const DEBOUNCE_TIME = 1000; // ms — ignore repeated triggers within this window
const VERBOSE = process.env.VERBOSE === '1'; // set VERBOSE=1 to enable detailed timing logs
// ---------------------

const kasaClient = new Client();
let cachedDevice = null;
let cachedLightState = null; // null = unknown, true = on, false = off

let alarmSwitch;
let lastTriggerTime = 0;

function log(msg) {
    if (VERBOSE) console.log(msg);
}

function elapsed(start) {
    return `${Date.now() - start}ms`;
}

async function getDevice() {
    if (cachedDevice) {
        log('[getDevice] using cached device');
        return cachedDevice;
    }
    const t = Date.now();
    log('[getDevice] connecting to bulb...');
    cachedDevice = await kasaClient.getDevice({ host: BULB_IP });
    log(`[getDevice] connected in ${elapsed(t)}`);
    return cachedDevice;
}

function invalidateDevice() {
    log('[invalidateDevice] clearing cached device and state');
    cachedDevice = null;
    cachedLightState = null;
}

async function toggleBulb(retries = 3) {
    const tTotal = Date.now();

    for (let attempt = 1; attempt <= retries; attempt++) {
        log(`[toggleBulb] attempt ${attempt}/${retries}`);
        try {
            const device = await getDevice();

            if (cachedLightState === null) {
                const t = Date.now();
                log('[toggleBulb] state unknown, querying bulb...');
                const sysInfo = await device.getSysInfo();
                cachedLightState = sysInfo.light_state.on_off === 1;
                log(`[toggleBulb] getSysInfo took ${elapsed(t)}, state=${cachedLightState ? 'ON' : 'OFF'}`);
            } else {
                log(`[toggleBulb] using cached state=${cachedLightState ? 'ON' : 'OFF'}`);
            }

            if (cachedLightState) {
                const t = Date.now();
                log('[toggleBulb] turning OFF...');
                await device.setPowerState(false);
                cachedLightState = false;
                console.log(`Bulb turned OFF (took ${elapsed(tTotal)} total)`);
                log(`[toggleBulb] setPowerState(false) took ${elapsed(t)}`);
            } else {
                const t = Date.now();
                log('[toggleBulb] turning ON at 100%...');
                await device.lighting.setLightState({ on_off: true, brightness: 100 });
                cachedLightState = true;
                console.log(`Bulb turned ON at 100% (took ${elapsed(tTotal)} total)`);
                log(`[toggleBulb] setLightState took ${elapsed(t)}`);
            }

            return;
        } catch (error) {
            console.error(`Attempt ${attempt}/${retries} failed after ${elapsed(tTotal)}: ${error.message}`);
            invalidateDevice();
            if (attempt < retries) {
                log('[toggleBulb] waiting 500ms before retry...');
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

        log(`[alert] level=${level} timeSinceLastTrigger=${now - lastTriggerTime}ms`);

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
    if (VERBOSE) console.log('[debug] verbose mode enabled');

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

    // Keepalive: ping the bulb every 5 minutes to keep the connection warm
    // and ensure cachedLightState stays in sync
    setInterval(() => {
        getDevice()
            .then(device => device.getSysInfo())
            .then(sysInfo => {
                cachedLightState = sysInfo.light_state.on_off === 1;
                log(`[keepalive] bulb state: ${cachedLightState ? 'ON' : 'OFF'}`);
            })
            .catch(error => {
                console.error(`[keepalive] failed: ${error.message}`);
                invalidateDevice();
            });
    }, 5 * 60 * 1000);

    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
}

main();
