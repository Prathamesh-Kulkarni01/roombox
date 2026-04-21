import { initializeApp, cert, getApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

async function checkEmulator() {
    process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
    process.env.FIREBASE_PROJECT_ID = 'roombox-test';
    
    if (getApps().length === 0) {
        initializeApp({ projectId: 'roombox-test' });
    }
    
    const db = getFirestore();
    const ownerId = 'YJdln9goSTMiH9fGXTA1QuHdXC62';
    
    console.log(`Checking data for owner: ${ownerId}`);
    
    try {
        const userDoc = await db.collection('users').doc(ownerId).get();
        console.log('User Doc:', userDoc.exists ? userDoc.data() : 'MISSING');
        
        const pgs = await db.collection('users_data').doc(ownerId).collection('pgs').get();
        console.log('PGs Count:', pgs.size);
        pgs.docs.forEach(doc => {
            console.log(`- PG: ${doc.id}`, doc.data().name);
        });
    } catch (err: any) {
        console.error('Firestore Error:', err.message);
    }
}

checkEmulator().catch(console.error);
