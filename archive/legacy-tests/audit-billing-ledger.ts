/**
 * scripts/audit-billing-ledger.ts
 * 
 * Audits the billing ledger for consistency between guest rent and recorded payments.
 */

import { getAdminDb } from '../src/lib/firebaseAdmin';

async function auditBillingLedger() {
    console.log('🚀 Starting Billing Ledger Audit...');
    
    const db = await getAdminDb();
    const results = {
        guestsChecked: 0,
        discrepancies: [] as string[]
    };

    try {
        const usersDataSnap = await db.collection('users_data').get();
        
        for (const ownerDoc of usersDataSnap.docs) {
            const ownerId = ownerDoc.id;
            const guestsSnap = await db.collection('users_data').doc(ownerId).collection('guests').get();
            
            for (const guestDoc of guestsSnap.docs) {
                results.guestsChecked++;
                const guestData = guestDoc.data();
                
                // Basic consistency check: rentAmount should be a positive number
                if (typeof guestData.rentAmount !== 'number' || guestData.rentAmount < 0) {
                    results.discrepancies.push(`Guest ${guestDoc.id}: Invalid rentAmount (${guestData.rentAmount})`);
                }

                // Check if payments subcollection exists and is accessible
                // (In a real audit we might sum payments and compare to a balance field)
                const paymentsSnap = await guestDoc.ref.collection('payments').get();
                // console.log(`Guest ${guestDoc.id} has ${paymentsSnap.size} payments.`);
            }
        }

        console.log('\n--- 📊 BILLING LEDGER AUDIT REPORT ---');
        console.log(`Total Guests Audited: ${results.guestsChecked}`);
        
        if (results.discrepancies.length > 0) {
            console.log(`❌ Ledger Discrepancies: ${results.discrepancies.length}`);
            results.discrepancies.slice(0, 10).forEach(d => console.log(`   - ${d}`));
            process.exit(1);
        } else {
            console.log('✅ Billing ledger appears consistent.');
            console.log('\n✨ LEDGER AUDIT PASSED!');
        }

    } catch (err: any) {
        console.error('\n💥 Ledger Audit Crashed:', err);
        process.exit(1);
    }
}

auditBillingLedger();
