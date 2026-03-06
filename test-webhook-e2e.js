const http = require('http');

const WEBHOOK_URL = 'http://localhost:9002/api/whatsapp/webhook';
const TEST_NUMBER = '917498526035';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function testIncomingMessage(textBody) {
    console.log(`\\n[User 👉 Bot] Sending: "${textBody}"`);

    const payload = {
        object: 'whatsapp_business_account',
        entry: [{
            id: 'WHATSAPP_BUSINESS_ACCOUNT_ID',
            changes: [{
                value: {
                    messaging_product: 'whatsapp',
                    metadata: {
                        display_phone_number: '16505551111',
                        phone_number_id: '1234567890'
                    },
                    contacts: [{
                        profile: { name: 'Verified Admin' },
                        wa_id: TEST_NUMBER
                    }],
                    messages: [{
                        from: TEST_NUMBER,
                        id: 'wamid.HBgL...' + Date.now(),
                        timestamp: Date.now().toString(),
                        text: { body: textBody },
                        type: 'text'
                    }]
                },
                field: 'messages'
            }]
        }]
    };

    try {
        const res = await fetch(WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (res.status === 200) {
            console.log('✅ Webhook processed successfully. Check Next.js console for Bot reply.');
        } else {
            console.log(`❌ Webhook failed with status ${res.status}`);
        }
    } catch (e) {
        console.error('Error connecting to local server.');
    }
}

async function runEndToEndTests() {
    console.log('--- STARTING RENTSUTRA AUTH E2E SIMULATION ---');

    // 1. Initial Contact (This will auto-login if the number is in the DB, otherwise shows role selection)
    await testIncomingMessage('Hi');
    await sleep(1500);

    // 2. Select Option 1 (If auto-logged in, this shows Buildings. If not logged in, this selects Owner role and shows the "Not Registered" message)
    await testIncomingMessage('1');
    await sleep(1500);

    // 3. Select Dashboard Menu Item 2 (Today's Payments) - Applicable only if logged in
    await testIncomingMessage('2');
    await sleep(1500);

    console.log('\\n--- END OF SIMULATION ---');
}

runEndToEndTests();
