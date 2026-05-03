import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables
const envPath = [
    path.resolve(process.cwd(), '.env.local'),
    path.resolve(process.cwd(), '.env.development.local'),
    path.resolve(process.cwd(), '.env')
].find(p => {
    try {
        return require('fs').existsSync(p);
    } catch {
        return false;
    }
});

if (envPath) {
    console.log(`   - Loading env from: ${envPath}`);
    dotenv.config({ path: envPath });
} else {
    console.warn("   ⚠️ No .env file found!");
}

// Force Emulator
process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8081';
console.log(`   - Emulator Host set to: ${process.env.FIRESTORE_EMULATOR_HOST}`);

import type { User, BillingLedgerEntry, MonthlyInvoice } from '../src/lib/types';

async function verifyLedgerTruth() {
    // Dynamic import to avoid hoisting issues with process.env
    const { getAdminDb } = await import('../src/lib/firebaseAdmin');
    const { initializeOwnerTrial } = await import('../src/lib/actions/walletActions');
    const { generateMonthlyInvoice } = await import('../src/lib/actions/billingActions');

    const db = await getAdminDb();
    const ownerId = 'ledger_test_owner';
    const monthIso = '2026-05';

    console.log("🚀 Starting End-to-End Ledger Truth Verification...");

    try {
        // 1. Cleanup & Setup
        console.log("   - Cleaning up previous test data...");
        // In emulator, we need to clear subcollections too
        const subcollections = ['monthly_invoices', 'billing_ledger', 'wallet_transactions', 'users_data/ledger_test_owner/guests'];
        for (const sub of ['monthly_invoices', 'billing_ledger', 'wallet_transactions']) {
            const snap = await db.collection('users').doc(ownerId).collection(sub).get();
            const batch = db.batch();
            snap.docs.forEach(doc => batch.delete(doc.ref));
            await batch.commit();
        }
        const guestsSnap = await db.collection('users_data').doc(ownerId).collection('guests').get();
        const guestBatch = db.batch();
        guestsSnap.docs.forEach(doc => guestBatch.delete(doc.ref));
        await guestBatch.commit();

        await db.collection('users').doc(ownerId).delete();
        
        // Setup owner with specific config for predictable math
        await db.collection('users').doc(ownerId).set({
            id: ownerId,
            name: 'Ledger Test Owner',
            email: 'ledger@test.com',
            role: 'owner',
            status: 'active',
            wallet: { trialBalance: 0, rechargeBalance: 0, balance: 0, dues: 0 },
            billingConfig: { 
                planType: 'monthly', 
                baseFee: 500, 
                perTenantFee: 10 
            }
        });

        // 2. Initialize Trial (₹500 credit)
        console.log("   - Initializing Trial...");
        await initializeOwnerTrial(ownerId);

        // 3. Verify Trial Ledger Entry
        const ledgerSnapInitial = await db.collection('users').doc(ownerId).collection('billing_ledger').get();
        const trialEntry = ledgerSnapInitial.docs.find(d => d.data().type === 'TRIAL_CREDIT');
        if (!trialEntry) throw new Error("❌ TRIAL_CREDIT ledger entry missing!");
        console.log(`   ✅ TRIAL_CREDIT ledger entry found (Amount: ₹${trialEntry.data().amount}).`);

        // 4. Add 10 tenants (Predictable: 10 * ₹10 = ₹100 charge)
        console.log("   - Adding 10 test tenants...");
        const guestsColl = db.collection('users_data').doc(ownerId).collection('guests');
        const batch = db.batch();
        for (let i = 1; i <= 10; i++) {
            batch.set(guestsColl.doc(`t${i}`), {
                id: `t${i}`,
                name: `Tenant ${i}`,
                moveInDate: '2026-01-01',
                isVacated: false,
                phone: `+9199999000${i.toString().padStart(2, '0')}`
            });
        }
        await batch.commit();

        // 5. Generate Invoice
        // Expected Bill: 500 (Base) + 100 (Usage) = 600
        // Wallets: 500 Trial
        // Result: Trial=0, Dues=100
        console.log(`   - Generating Invoice for ${monthIso}...`);
        const invoiceResult = await generateMonthlyInvoice(ownerId, monthIso);
        if (!invoiceResult.success) throw new Error(`❌ Invoice generation failed: ${invoiceResult.error}`);

        // 6. Verify Invoice Snapshot
        const invoiceDoc = await db.collection('users').doc(ownerId).collection('monthly_invoices').doc(monthIso).get();
        const invoice = invoiceDoc.data() as MonthlyInvoice;
        
        if (invoice.totalAmount !== 600) throw new Error(`❌ Invoice amount mismatch! Expected 600, got ${invoice.totalAmount}`);
        if (!invoice.breakdown.ledgerIds || invoice.breakdown.ledgerIds.length < 2) {
            throw new Error(`❌ Invoice missing linked ledger entries! Found: ${invoice.breakdown.ledgerIds?.length || 0}`);
        }
        console.log(`   ✅ Invoice snapshot verified (₹${invoice.totalAmount}).`);

        // 7. Verify Detailed Ledger Content
        const ledgerEntriesSnap = await db.collection('users').doc(ownerId).collection('billing_ledger').get();
        const allEntries = ledgerEntriesSnap.docs.map(d => d.data() as BillingLedgerEntry);
        
        const usageEntry = allEntries.find(e => e.type === 'TENANT_USAGE');
        if (!usageEntry) throw new Error("❌ TENANT_USAGE entry missing!");
        if (usageEntry.metadata.tenantCount !== 10) throw new Error("❌ Tenant count in metadata mismatch!");
        if (!usageEntry.metadata.tenantIds || usageEntry.metadata.tenantIds.length !== 10) throw new Error("❌ Tenant IDs missing in metadata!");
        console.log("   ✅ Tenant usage ledger entry verified with full metadata.");

        // 8. Financial Reconciliation
        const userDoc = await db.collection('users').doc(ownerId).get();
        const user = userDoc.data() as User;
        const wallet = user.wallet!;
        
        const netWalletBalance = wallet.balance - (wallet.dues || 0);
        const ledgerSum = allEntries.reduce((sum, e) => sum + e.amount, 0);

        console.log(`   - Wallet State: Bal=₹${wallet.balance}, Dues=₹${wallet.dues}`);
        console.log(`   - Net Wallet:   ₹${netWalletBalance}`);
        console.log(`   - Ledger Total: ₹${ledgerSum}`);

        if (Math.abs(netWalletBalance - ledgerSum) > 0.01) {
            throw new Error(`❌ FINANCIAL DRIFT DETECTED! Net Wallet (${netWalletBalance}) != Ledger Sum (${ledgerSum})`);
        }
        console.log("   ✅ Financial reconciliation successful.");

        console.log("\n🏆 End-to-End Ledger Truth Verification PASSED!");
        process.exit(0);
    } catch (error) {
        console.error("\n❌ Verification Failed:");
        console.error(error);
        process.exit(1);
    }
}

verifyLedgerTruth().catch(err => {
    console.error(err);
    process.exit(1);
});
