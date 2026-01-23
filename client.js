const Gpio = require('pigpio').Gpio;
const axios = require('axios');

// --- CONFIGURATION ---
const GPIO_PIN = 16;
const SERVER_URL = process.env.SERVER_URL || 'http://localhost:3000';
const FIRE_ALARM_ENDPOINT = '/toggle-light-bright';
const DEBOUNCE_TIME = 500; // ms - prevent multiple triggers from noise
// ---------------------

let lastTriggerTime = 0;
let alarmSwitch;

/**
 * Trigger the fire alarm endpoint on the server
 */
async function triggerAlarm() {
    const now = Date.now();
    
    // Debounce: ignore if triggered within DEBOUNCE_TIME ms
    if (now - lastTriggerTime < DEBOUNCE_TIME) {
        console.log('⏭️  Ignoring duplicate trigger (debounce)');
        return;
    }
    
    lastTriggerTime = now;
    
    try {
        console.log('🚨 FIRE ALARM TRIGGERED! Sending signal to server...');
        
        const response = await axios.post(`${SERVER_URL}${FIRE_ALARM_ENDPOINT}`, {}, {
            timeout: 5000
        });
        
        console.log(`✅ Server responded: ${response.data.message}`);
        console.log(`   Power state: ${response.data.power_state ? 'ON' : 'OFF'}\n`);
    } catch (error) {
        console.error(`❌ Failed to reach server: ${error.message}`);
        console.error(`   Make sure the server is running at ${SERVER_URL}\n`);
    }
}

/**
 * Start listening for GPIO events
 */
function startListening() {
    console.log(`\n👂 Listening for fire alarm on GPIO pin ${GPIO_PIN}...\n`);
    
    // Watch for rising edge (LOW to HIGH transition)
    alarmSwitch.on('alert', (level, tick) => {
        // level 1 = HIGH
        if (level === 1) {
            triggerAlarm();
        }
    });
}

/**
 * Clean up GPIO on exit
 */
function cleanup() {
    try {
        if (alarmSwitch) {
            alarmSwitch.digitalWrite(0);
            alarmSwitch.disableAlert();
        }
        console.log('\n🛑 GPIO cleaned up. Exiting.');
    } catch (error) {
        console.error('Error during cleanup:', error.message);
    }
    process.exit();
}

/**
 * Main entry point
 */
function main() {
    console.log('\n🚀 Fire Alarm GPIO Listener Starting...\n');
    console.log(`📡 Server URL: ${SERVER_URL}`);
    
    try {
        // Initialize GPIO pin 17 as input
        alarmSwitch = new Gpio(GPIO_PIN, {
            mode: Gpio.INPUT,
            pullUpDown: Gpio.PUD_DOWN,
            alert: true
        });
        
        console.log(`✅ GPIO pin ${GPIO_PIN} initialized (pulldown, HIGH = triggered)`);
        startListening();
    } catch (error) {
        console.error(`❌ Failed to initialize GPIO: ${error.message}`);
        console.error('   Make sure you are running with sudo: sudo node client.js');
        process.exit(1);
    }
    
    // Handle graceful shutdown
    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
}

main();