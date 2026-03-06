#!/usr/bin/env node

/**
 * WhatsApp Real Message Testing
 * 
 * Sends actual WhatsApp messages through Cloud API
 * and monitors the complete response flow
 * 
 * Usage:
 *   node test-whatsapp-real-messages.js
 *   node test-whatsapp-real-messages.js 919876543210 "hello"
 */

require('dotenv').config({ path: '.env.local' });
const https = require('https');
const { Redis } = require('@upstash/redis');

const config = {
    productionDomain: process.env.WHATSAPP_DOMAIN || 'https://rentsutra-1.netlify.app',
    webhookPath: '/api/whatsapp/webhook',
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN,
    businessAccountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID,
    graphApiUrl: 'https://graph.instagram.com/v18.0'
};

let redisClient = null;

function getRedisClient() {
    if (!redisClient) {
        redisClient = new Redis({
            url: process.env.UPSTASH_REDIS_REST_URL,
            token: process.env.UPSTASH_REDIS_REST_TOKEN
        });
    }
    return redisClient;
}

function makeHttpRequest(method, url, body = null, headers = {}) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        
        const options = {
            hostname: urlObj.hostname,
            port: urlObj.port || 443,
            path: urlObj.pathname + urlObj.search,
            method: method,
            headers: {
                'Content-Type': 'application/json',
                ...headers
            }
        };

        const req = https.request(options, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                resolve({
                    status: res.statusCode,
                    headers: res.headers,
                    body: data
                });
            });
        });

        req.on('error', reject);

        if (body) {
            req.write(JSON.stringify(body));
        }

        req.end();
    });
}

async function sendWhatsAppMessage(phoneNumber, messageText) {
    console.log('\n📨 Sending WhatsApp Message');
    console.log('─'.repeat(50));

    try {
        const url = `${config.graphApiUrl}/${config.phoneNumberId}/messages`;

        const payload = {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: phoneNumber,
            type: 'text',
            text: {
                body: messageText
            }
        };

        const result = await makeHttpRequest('POST', url, payload, {
            'Authorization': `Bearer ${config.accessToken}`
        });

        const responseBody = JSON.parse(result.body);

        if (result.status === 200 && responseBody.messages) {
            console.log(`✅ Message sent successfully`);
            console.log(`   Message ID: ${responseBody.messages[0].id}`);
            console.log(`   To: ${phoneNumber}`);
            console.log(`   Text: "${messageText}"`);
            return responseBody.messages[0].id;
        } else {
            console.error(`❌ Failed to send message`);
            console.error(`   Status: ${result.status}`);
            console.error(`   Error: ${responseBody.error?.message || 'Unknown error'}`);
            return null;
        }
    } catch (error) {
        console.error(`❌ Error sending message: ${error.message}`);
        return null;
    }
}

async function monitorWebhookActivity(phoneNumber, duration = 5000) {
    console.log('\n📊 Monitoring Webhook Activity');
    console.log('─'.repeat(50));

    const redis = getRedisClient();
    const startTime = Date.now();
    const sessionKey = `whatsapp:session:${phoneNumber}`;

    console.log(`Waiting for webhook callback (${duration / 1000} seconds)...`);

    return new Promise((resolve) => {
        const checkInterval = setInterval(async () => {
            try {
                const session = await redis.get(sessionKey);

                if (session) {
                    clearInterval(checkInterval);
                    const sessionData = JSON.parse(session);
                    
                    console.log(`\n✅ Webhook processed successfully`);
                    console.log(`   Session created at: ${sessionKey}`);
                    console.log(`   Current state: ${sessionData.state}`);
                    console.log(`   Context: ${JSON.stringify(sessionData.context || {})}`);
                    
                    resolve(sessionData);
                    return;
                }

                const elapsed = Date.now() - startTime;
                if (elapsed > duration) {
                    clearInterval(checkInterval);
                    console.log(`\n⏱️  Timeout: No webhook activity detected`);
                    resolve(null);
                }
            } catch (error) {
                console.error(`Error checking session: ${error.message}`);
            }
        }, 500);
    });
}

async function checkBotResponse(phoneNumber, maxWaitTime = 10000) {
    console.log('\n🤖 Checking for Bot Response');
    console.log('─'.repeat(50));

    const redis = getRedisClient();
    const startTime = Date.now();
    const responseKey = `whatsapp:response:${phoneNumber}`;

    console.log(`Waiting for bot response (${maxWaitTime / 1000} seconds)...`);

    return new Promise((resolve) => {
        const checkInterval = setInterval(async () => {
            try {
                const response = await redis.get(responseKey);

                if (response) {
                    clearInterval(checkInterval);
                    const responseData = JSON.parse(response);
                    
                    console.log(`\n✅ Bot response received`);
                    console.log(`   Response: "${responseData.message}"`);
                    console.log(`   Processed in: ${responseData.processingTime}ms`);
                    
                    resolve(responseData);
                    return;
                }

                const elapsed = Date.now() - startTime;
                if (elapsed > maxWaitTime) {
                    clearInterval(checkInterval);
                    console.log(`\n⏱️  Timeout: No response received`);
                    resolve(null);
                }
            } catch (error) {
                console.error(`Error checking response: ${error.message}`);
            }
        }, 500);
    });
}

async function testCompleteFlow() {
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║  📱 WhatsApp Real Message Testing                          ║');
    console.log('╚════════════════════════════════════════════════════════════╝');

    // Parse arguments or use defaults
    const phoneNumber = process.argv[2] || process.env.WHATSAPP_TEST_PHONE || '919876543210';
    const messageText = process.argv[3] || 'hello';

    // Validate config
    if (!config.accessToken) {
        console.error('\n❌ ERROR: WHATSAPP_ACCESS_TOKEN not configured');
        console.error('Add to .env.local: WHATSAPP_ACCESS_TOKEN=your_token');
        process.exit(1);
    }

    if (!config.phoneNumberId) {
        console.error('\n❌ ERROR: WHATSAPP_PHONE_NUMBER_ID not configured');
        console.error('Add to .env.local: WHATSAPP_PHONE_NUMBER_ID=your_phone_id');
        process.exit(1);
    }

    console.log('\n⚙️  Configuration:');
    console.log(`   Domain: ${config.productionDomain}`);
    console.log(`   Webhook Path: ${config.webhookPath}`);
    console.log(`   Phone ID: ${config.phoneNumberId}`);
    console.log(`   Test Phone: ${phoneNumber}`);
    console.log(`   Message: "${messageText}"`);

    // Step 1: Send message
    const messageId = await sendWhatsAppMessage(phoneNumber, messageText);
    if (!messageId) {
        console.error('\n❌ Failed to send test message');
        process.exit(1);
    }

    // Step 2: Monitor webhook
    console.log('\n⏳ Step 1: Webhook Processing');
    const webhookActivity = await monitorWebhookActivity(phoneNumber);

    if (!webhookActivity) {
        console.error('\n⚠️  Note: Webhook callback not detected');
        console.log('   This is expected if running in development');
        console.log('   Ensure webhook is configured in WhatsApp Business dashboard');
    }

    // Step 3: Check for response
    console.log('\n⏳ Step 2: Bot Processing');
    const botResponse = await checkBotResponse(phoneNumber);

    if (!botResponse) {
        console.log('\n⚠️  Note: Bot response not detected');
        console.log('   This is expected if bot is processing async');
    }

    // Summary
    console.log('\n' + '═'.repeat(60));
    console.log('\n✅ Real Message Test Complete\n');
    console.log('Summary:');
    console.log(`  📨 Message sent: ${messageId}`);
    console.log(`  📥 Webhook activity: ${webhookActivity ? '✅ Detected' : '⏱️  Timeout'}`);
    console.log(`  🤖 Bot response: ${botResponse ? '✅ Received' : '⏱️  Timeout'}`);
    console.log('\nNext steps:');
    console.log('  1. Check Upstash dashboard for session data');
    console.log('  2. Check Netlify logs for processing details');
    console.log('  3. Monitor production traffic patterns');
    console.log('  4. Scale to full message volume\n');
}

testCompleteFlow().catch(error => {
    console.error('\n❌ ERROR:', error.message);
    process.exit(1);
});
