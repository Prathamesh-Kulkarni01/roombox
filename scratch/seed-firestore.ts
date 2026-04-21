
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp } from 'firebase-admin/app';

async function seedFirestore() {
    process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
    process.env.FIREBASE_PROJECT_ID = 'roombox-test';

    try {
        initializeApp({ projectId: 'roombox-test' });
    } catch (e) {}

    const db = getFirestore();

    const uid = 'YJdln9goSTMiH9fGXTA1QuHdXC62';
    const email = 'bot_tester_9@roombox.app';

    console.log(`Checking user document for ${uid}...`);
    const userRef = db.collection('users').doc(uid);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
        console.log('User document MISSING. Seeding...');
        await userRef.set({
            id: uid,
            email,
            role: 'owner',
            name: 'Bot Tester',
            status: 'active',
            createdAt: new Date().toISOString(),
            schemaVersion: 2,
            subscription: {
                planId: 'pro',
                status: 'active'
            }
        });
        console.log('User document seeded successfully.');
    } else {
        console.log('User document already exists.');
    }
}

seedFirestore().catch(console.error);
