import { handleIncomingMessage } from './src/lib/whatsapp/bot-logic';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Force load .env
const envPath = path.resolve(process.cwd(), '.env');
const envConfig = dotenv.parse(fs.readFileSync(envPath));
for (const k in envConfig) {
    process.env[k] = envConfig[k];
}

const LOG_FILE = 'bot-test-results.log';
function logToFile(msg: string) {
    console.log(msg);
    fs.appendFileSync(LOG_FILE, msg + '\n');
}

// Clear log file
fs.writeFileSync(LOG_FILE, '--- START TEST ---\n');

async function runTest() {
    logToFile("Starting Standalone Logic Test...");

    // Inject a special sender that exists in their DB
    // Based on test-webhook-e2e.js, the number is 917498526035
    const mockData = {
        from: '917498526035',
        msgBody: 'Hi',
        messageType: 'text'
    };

    logToFile("Testing 'Hi' command...");
    await handleIncomingMessage(mockData);

    // Give it a moment to process async calls if any (though handleIncomingMessage should wait)
    await new Promise(r => setTimeout(r, 2000));

    logToFile("\nTesting Option '1' (Buildings)...");
    await handleIncomingMessage({ ...mockData, msgBody: '1' });

    await new Promise(r => setTimeout(r, 2000));
    logToFile("\n--- END TEST ---");
}

runTest().catch(err => {
    logToFile("ERROR: " + err.message);
    process.exit(1);
});
