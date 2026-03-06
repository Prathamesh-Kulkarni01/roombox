#!/usr/bin/env node

/**
 * WhatsApp Webhook Configuration Tester
 * 
 * This script helps you verify your webhook configuration
 * Run: node webhook-config-tester.js
 */

const https = require('https');

// Configuration
const config = {
    // Update these with your actual values
    productionDomain: process.argv[2] || 'https://rentsutra-1.netlify.app',
    webhookPath: '/api/whatsapp/webhook',
    verifyToken: 'roombox_whatsapp_dev_token',
    phoneNumberId: '101059999442035'
};

console.log('\n🧪 WhatsApp Webhook Configuration Tester\n');
console.log('═'.repeat(50));

// Parse domain
const url = new URL(config.productionDomain);
const webhookUrl = `${url.origin}${config.webhookPath}`;

console.log(`\n📍 Configuration:`);
console.log(`   Webhook URL: ${webhookUrl}`);
console.log(`   Verify Token: ${config.verifyToken}`);
console.log(`   Phone Number ID: ${config.phoneNumberId}`);
console.log('\n' + '═'.repeat(50) + '\n');

// Test functions
async function testWebhook() {
    console.log('🧪 Test 1: Webhook Verification Endpoint');
    console.log('───────────────────────────────────────────\n');

    try {
        const testChallenge = 'test_challenge_123';
        const fullUrl = `${webhookUrl}?hub.mode=subscribe&hub.verify_token=${config.verifyToken}&hub.challenge=${testChallenge}`;

        console.log(`📤 Sending GET request to:`);
        console.log(`   ${fullUrl}\n`);

        const result = await makeHttpRequest(fullUrl);

        if (result.body === testChallenge) {
            console.log(`✅ SUCCESS: Webhook responded with challenge`);
            console.log(`   Response: ${result.body}`);
            console.log(`   Status: ${result.status}\n`);
            return true;
        } else {
            console.log(`❌ FAILED: Unexpected response`);
            console.log(`   Expected: ${testChallenge}`);
            console.log(`   Got: ${result.body}`);
            console.log(`   Status: ${result.status}\n`);
            return false;
        }
    } catch (error) {
        console.log(`❌ ERROR: ${error.message}\n`);
        return false;
    }
}

async function testInvalidToken() {
    console.log('🧪 Test 2: Invalid Token Rejection');
    console.log('───────────────────────────────────────────\n');

    try {
        const fullUrl = `${webhookUrl}?hub.mode=subscribe&hub.verify_token=wrong_token&hub.challenge=test`;

        console.log(`📤 Testing with invalid token...\n`);

        const result = await makeHttpRequest(fullUrl);

        if (result.status === 403) {
            console.log(`✅ SUCCESS: Webhook rejected invalid token`);
            console.log(`   Status: ${result.status}`);
            console.log(`   Response: ${result.body}\n`);
            return true;
        } else {
            console.log(`❌ FAILED: Webhook accepted invalid token`);
            console.log(`   Status: ${result.status}\n`);
            return false;
        }
    } catch (error) {
        console.log(`❌ ERROR: ${error.message}\n`);
        return false;
    }
}

async function testEndpointAccessibility() {
    console.log('🧪 Test 3: Endpoint Accessibility');
    console.log('───────────────────────────────────────────\n');

    try {
        const fullUrl = `${webhookUrl}`;

        console.log(`📤 Testing if endpoint is accessible...\n`);

        const result = await makeHttpRequest(fullUrl);

        // Should get 400 Bad Request (no query params)
        if (result.status === 400) {
            console.log(`✅ SUCCESS: Endpoint is accessible`);
            console.log(`   Status: ${result.status} (Expected)`);
            console.log(`   (Returns 400 because we didn't provide query params)\n`);
            return true;
        } else if (result.status === 200) {
            console.log(`✅ SUCCESS: Endpoint is accessible`);
            console.log(`   Status: ${result.status}\n`);
            return true;
        } else {
            console.log(`⚠️  WARNING: Unexpected status code`);
            console.log(`   Status: ${result.status}\n`);
            return false;
        }
    } catch (error) {
        console.log(`❌ ERROR: Endpoint not accessible`);
        console.log(`   ${error.message}\n`);
        return false;
    }
}

async function testHttps() {
    console.log('🧪 Test 4: HTTPS Connection');
    console.log('───────────────────────────────────────────\n');

    try {
        if (!config.productionDomain.startsWith('https://')) {
            console.log(`❌ FAILED: Domain is not HTTPS`);
            console.log(`   Domain: ${config.productionDomain}`);
            console.log(`   WhatsApp requires HTTPS\n`);
            return false;
        }

        console.log(`✅ SUCCESS: Domain uses HTTPS`);
        console.log(`   Domain: ${config.productionDomain}\n`);
        return true;
    } catch (error) {
        console.log(`❌ ERROR: ${error.message}\n`);
        return false;
    }
}

// Helper function
function makeHttpRequest(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                resolve({
                    status: res.statusCode,
                    body: data
                });
            });
        }).on('error', (err) => {
            reject(err);
        });
    });
}

// Run tests
async function runAllTests() {
    const results = [];

    results.push(await testHttps());
    results.push(await testEndpointAccessibility());
    results.push(await testWebhook());
    results.push(await testInvalidToken());

    // Summary
    console.log('═'.repeat(50));
    console.log('\n📊 Test Summary\n');

    const passed = results.filter(r => r).length;
    const total = results.length;

    console.log(`   ✅ Passed: ${passed}/${total}`);
    console.log(`   ❌ Failed: ${total - passed}/${total}\n`);

    if (passed === total) {
        console.log('🎉 All tests passed! Your webhook is configured correctly.\n');
        console.log('Next steps:');
        console.log('  1. Update webhook URL in WhatsApp Business dashboard');
        console.log('  2. Verify webhook handshake in dashboard');
        console.log('  3. Send a test WhatsApp message');
        console.log('  4. Check logs for successful message processing\n');
    } else {
        console.log('⚠️  Some tests failed. Check the output above.\n');
    }
}

// Main
if (config.productionDomain === 'https://your-domain.com') {
    console.log('❌ ERROR: Please provide your production domain\n');
    console.log('Usage:');
    console.log('  node webhook-config-tester.js <production-domain>\n');
    console.log('Examples:');
    console.log('  node webhook-config-tester.js https://myapp.vercel.app');
    console.log('  node webhook-config-tester.js https://us-central1-myproject.cloudfunctions.net');
    console.log('  node webhook-config-tester.js https://myapp.netlify.app\n');
    process.exit(1);
}

runAllTests().catch(console.error);
