const http = require('http');

const WEBHOOK_URL = 'http://localhost:9002/api/whatsapp/webhook';
const VERIFY_TOKEN = 'roombox_whatsapp_dev_token';

async function testVerification() {
    console.log('--- Testing GET (Verification) ---');
    const challenge = '1158201444';
    const verifyUrl = `${WEBHOOK_URL}?hub.mode=subscribe&hub.verify_token=${VERIFY_TOKEN}&hub.challenge=${challenge}`;

    try {
        const res = await fetch(verifyUrl);
        const text = await res.text();
        console.log(`Status: ${res.status}`);
        console.log(`Response: ${text}`);
        if (res.status === 200 && text === challenge) {
            console.log('✅ GET Verification passed!');
        } else {
            console.log('❌ GET Verification failed.');
        }
    } catch (e) {
        console.error('Error connecting to local server. Is Next.js running on port 3000?');
    }
}

async function testIncomingMessage(fromNumber, textBody) {
    console.log(`\n--- Testing POST (Incoming Message from ${fromNumber}) ---`);

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
                        profile: { name: 'Test User' },
                        wa_id: fromNumber
                    }],
                    messages: [{
                        from: fromNumber,
                        id: 'wamid.HBgL...',
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

        const text = await res.text();
        console.log(`Status: ${res.status}`);
        console.log(`Response: ${text}`);
        if (res.status === 200) {
            console.log('✅ POST Webhook received successfully!');
        } else {
            console.log('❌ POST Webhook failed.');
        }
    } catch (e) {
        console.error('Error connecting to local server. Is Next.js running on port 3000?');
    }
}

async function runTests() {
    await testVerification();

    // Test as Owner (triggering menu)
    await testIncomingMessage('919999999999', 'Menu');

    // Test as Owner (triggering Add Tenant state)
    await testIncomingMessage('919999999999', 'Add Tenant');

    // Test as Tenant (triggering rent inquiry)
    await testIncomingMessage('919999991111', 'rent');
}

runTests();
