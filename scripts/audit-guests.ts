process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
process.env.FIREBASE_PROJECT_ID = 'empty';
process.env.FIREBASE_CLIENT_EMAIL = 'empty';
process.env.FIREBASE_PRIVATE_KEY = 'empty';

import { getAdminDb } from '../src/lib/firebaseAdmin';

async function auditGuests() {
    const db = await getAdminDb();

    console.log('🔍 Starting Guest Data Audit...');

    const ownersSnap = await db.collection('users').where('role', '==', 'owner').get();
    let totalGuests = 0;
    let missingFields = 0;

    for (const ownerDoc of ownersSnap.docs) {
        const ownerId = ownerDoc.id;
        const guestsSnap = await db.collection('users_data').doc(ownerId).collection('guests').get();

        for (const doc of guestsSnap.docs) {
            totalGuests++;
            const guest = doc.data();
            const issues = [];

            if (!guest.dueDate) issues.push('missing dueDate');
            if (!guest.moveInDate) issues.push('missing moveInDate');
            if (guest.rentAmount === undefined) issues.push('missing rentAmount');

            if (issues.length > 0) {
                missingFields++;
                console.log(`❌ Guest [${doc.id}] (${guest.name || 'Unknown'}) - Owner: ${ownerId}`);
                console.log(`   Issues: ${issues.join(', ')}`);
                console.log(`   Raw Data: ${JSON.stringify(guest)}`);
            }
        }
    }

    console.log('\n--- Audit Summary ---');
    console.log(`Total Guests: ${totalGuests}`);
    console.log(`Guests with issues: ${missingFields}`);
    console.log('---------------------');
}

auditGuests().catch(console.error);
