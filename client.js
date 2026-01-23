const Gpio = require('onoff').Gpio;
const axios = require('axios');

// Initialize GPIO 17 as an input, watching for "both" rising and falling edges
// 'pullUp' ensures the pin is at 3.3V when the switch is open
const alarmSwitch = new Gpio(16, 'in', 'both', { debounceTimeout: 50 });

// This is the URL to the Kasa server endpoint
const SERVER_URL = 'http://localhost:3000';
const ENDPOINT = '/toggle-light-bright'; // this will toggle to full brightness every time

console.log('Monitoring fire alarm switch...');

alarmSwitch.watch(async (err, value) => {
    if (err) {
        console.error('GPIO Error:', err);
        return;
    }

    console.log(value)

    // In a Pull-Up configuration, 0 means the switch is pressed (connected to GND)
    if (value === 0) {
        console.log('Switch pressed! Sending signal to Kasa server...');
        
        // try {
        //     const response = await axios.post(SERVER_URL + ENDPOINT);
        //     console.log('Server response:', response.data.message);
        // } catch (error) {
        //     console.error('Could not reach Kasa server:', error.message);
        // }
    }
});

// Clean up GPIO on exit
process.on('SIGINT', () => {
    alarmSwitch.unexport();
    process.exit();
});