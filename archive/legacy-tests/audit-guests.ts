process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8081';
process.env.FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'roombox-test';

import { getAdminDb } from '../src/lib/firebaseAdmin';

async function auditGuests() {
    const db = await getAdminDb();

    console.log('🔍 Starting Guest Data Audit...');

    const ownersSnap = await db.collection('users').where('role', '==', 'owner').get();
    let totalGuests = 0;
    let missingFields = 0;

    for (const ownerDoc of ownersSnap.docs) {
        const ownerId = ownerDoc.id;
        if (ownerId.includes('test') || ownerId.includes('tester')) continue;
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

    if (missingFields > 0) {
        console.error(`❌ Audit failed: ${missingFields} guests have issues!`);
        process.exit(1);
    } else {
        console.log('✅ Guest audit passed! All real guests have correct fields.');
        process.exit(0);
    }
}

auditGuests().catch(err => {
    console.error(err);
    process.exit(1);
});
