
process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';
process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
process.env.FIREBASE_PROJECT_ID = 'roombox-test';
process.env.FIREBASE_CLIENT_EMAIL = 'test@example.com';
process.env.FIREBASE_PRIVATE_KEY = 'dummy-key';
process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET = 'test.appspot.com';

import { getAdminAuth } from '../src/lib/firebaseAdmin';

async function main() {
    const auth = await getAdminAuth('roombox-test');
    
    console.log('--- Checking Owner ---');
    try {
        const owner = await auth.getUserByEmail('bot_tester_84667@roombox.app');
        console.log('Owner found:', owner.uid, owner.email);
    } catch (e: any) {
        console.log('Owner NOT found:', e.message);
    }

    console.log('--- Checking Tenant ---');
    try {
        const tenant = await auth.getUserByPhoneNumber('+919876584667');
        console.log('Tenant found:', tenant.uid, tenant.phoneNumber);
    } catch (e: any) {
        console.log('Tenant NOT found:', e.message);
    }
}

main().catch(console.error);
