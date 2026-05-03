
import { ensureOwnerExists, ensurePropertyExists, wipeOwnerData } from '../e2e-tests/api/cleanup';
import * as dotenv from 'dotenv';
import path from 'path';

// Load E2E env
dotenv.config({ path: path.resolve(__dirname, '.env.e2e') });

async function testSetup() {
    const OWNER_ID = 'test_owner_123';
    const OWNER_EMAIL = 'test_owner@example.com';
    const OWNER_PASSWORD = 'Password123!';
    
    console.log('--- Testing E2E Setup ---');
    try {
        await ensureOwnerExists(OWNER_ID, OWNER_EMAIL, OWNER_PASSWORD);
        await wipeOwnerData(OWNER_ID);
        const pgId = await ensurePropertyExists(OWNER_ID, 'Test PG');
        console.log(`Success! Property created: ${pgId}`);
    } catch (err) {
        console.error('Failed setup:', err);
    }
}

testSetup();
