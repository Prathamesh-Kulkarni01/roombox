/**
 * scripts/verify-billing-system.ts
 * 
 * Verifies the integrity of the billing and payment system.
 */

import { getAdminDb } from '../src/lib/firebaseAdmin';
import { PaymentSchema } from '../src/lib/schema';

async function verifyBillingSystem() {
    console.log('🚀 Starting Billing System Verification...');
    
    const db = await getAdminDb();
    const results = {
        totalPayments: 0,
        invalidPayments: [] as string[],
        missingUpiIds: [] as string[]
    };

    try {
        // 1. Scan all payments
        console.log('Scanning payments...');
        const paymentsSnap = await db.collectionGroup('payments').get();
        for (const doc of paymentsSnap.docs) {
            results.totalPayments++;
            const data = doc.data();
            
            // Validate against schema
            const validation = PaymentSchema.safeParse(data);
            if (!validation.success) {
                results.invalidPayments.push(`${doc.ref.path}: ${validation.error.message}`);
            }
        }

        // 2. Check PGs for UPI configuration if online payments are enabled
        console.log('Checking PG UPI configurations...');
        const pgsSnap = await db.collectionGroup('pgs').get();
        for (const doc of pgsSnap.docs) {
            const data = doc.data();
            if (data.direct_upi_enabled && !data.upiId) {
                results.missingUpiIds.push(doc.ref.path);
            }
        }

        console.log('\n--- 📊 BILLING SYSTEM REPORT ---');
        console.log(`Total Payments Checked: ${results.totalPayments}`);
        
        if (results.invalidPayments.length > 0) {
            console.log(`❌ Invalid Payments: ${results.invalidPayments.length}`);
            results.invalidPayments.slice(0, 5).forEach(p => console.log(`   - ${p}`));
        } else {
            console.log('✅ All payment records are schema-valid.');
        }

        if (results.missingUpiIds.length > 0) {
            console.log(`⚠️ PGs with missing UPI ID (Direct UPI enabled): ${results.missingUpiIds.length}`);
            results.missingUpiIds.slice(0, 5).forEach(p => console.log(`   - ${p}`));
        } else {
            console.log('✅ All PGs with Direct UPI enabled have UPI IDs.');
        }

        if (results.invalidPayments.length > 0) {
            console.error('\n❌ BILLING VERIFICATION FAILED.');
            process.exit(1);
        } else {
            console.log('\n✨ BILLING SYSTEM VERIFIED!');
        }

    } catch (err: any) {
        console.error('\n💥 Billing Verification Crashed:', err);
        process.exit(1);
    }
}

verifyBillingSystem();
