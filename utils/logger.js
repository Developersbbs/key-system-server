const fs = require('fs');
const path = require('path');

const logFile = path.join(__dirname, '../upload-debug.log');

function log(message) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}\n`;
    fs.appendFileSync(logFile, logMessage);
    console.log(message);
}

module.exports = { log };
