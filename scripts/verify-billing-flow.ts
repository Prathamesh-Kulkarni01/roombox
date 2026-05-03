import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { getAdminDb } from '../src/lib/firebaseAdmin';
import { processRecharge } from '../src/lib/actions/walletActions';
import { generateMonthlyInvoice } from '../src/lib/actions/billingActions';

/**
 * Billing Flow Verification Script
 * 
 * 1. Seeds a test user with a wallet.
 * 2. Performs a recharge (Auditable).
 * 3. Generates a monthly invoice (Atomic, Logs Ledger, Snapshots).
 * 4. Verifies the ledger entries and wallet balance.
 */
async function verifyBillingFlow() {
    console.log("🧪 Starting Billing Flow Verification...");
    
    try {
        const db = await getAdminDb();
        const testUserId = "test-billing-user-" + Date.now();
        const userRef = db.collection('users').doc(testUserId);

        console.log(`👤 Creating test user: ${testUserId}`);
        await userRef.set({
            email: "billing-test@example.com",
            wallet: {
                balance: 0,
                trialBalance: 0,
                rechargeBalance: 0,
                dues: 0
            },
            subscription: {
                status: 'active',
                planId: 'monthly'
            }
        });

        // 1. Perform Recharge
        console.log("💰 Step 1: Performing Recharge of ₹1000...");
        const rechargeResult = await processRecharge({
            ownerId: testUserId,
            amount: 1000,
            description: "Verification Recharge"
        });

        if (!rechargeResult.success) throw new Error("Recharge failed: " + rechargeResult.error);
        console.log(`   ✅ Recharge successful. New Balance: ₹${rechargeResult.newBalance}`);

        // 2. Add some test tenants to simulate usage
        console.log("🏠 Step 2: Seeding 5 test tenants in users_data...");
        const tenantsRef = db.collection('users_data').doc(testUserId).collection('guests');
        for (let i = 0; i < 5; i++) {
            await tenantsRef.add({ 
                name: `Tenant ${i}`, 
                status: 'active',
                moveInDate: new Date().toISOString(),
                phone: `999990000${i}`
            });
        }

        // 3. Generate Monthly Invoice
        const month = "2026-05";
        console.log(`📄 Step 3: Generating Invoice for ${month}...`);
        const invoiceResult = await generateMonthlyInvoice(testUserId, month);

        if (!invoiceResult.success) throw new Error("Invoice generation failed: " + invoiceResult.error);
        
        // Fetch the generated invoice to show details
        const invoiceDoc = await userRef.collection('monthly_invoices').doc(month).get();
        const invoiceData = invoiceDoc.data();
        console.log(`   ✅ Invoice generated! Total: ₹${invoiceData?.totalAmount}`);
        
        const updatedUserDoc = await userRef.get();
        console.log(`   ✅ New Balance after billing: ₹${updatedUserDoc.data()?.wallet?.balance}`);

        // 4. Verify Ledger Entries
        console.log("🔍 Step 4: Verifying Ledger Entries...");
        const ledgerSnap = await userRef.collection('billing_ledger').get();
        console.log(`   Found ${ledgerSnap.size} ledger entries:`);
        ledgerSnap.forEach(doc => {
            const data = doc.data();
            console.log(`   - [${data.type}] ₹${data.amount}: ${data.description}`);
        });

        // 5. Final Audit Check
        console.log("⚖️ Step 5: Final Audit Check...");
        const finalUserDoc = await userRef.get();
        const finalWallet = finalUserDoc.data()?.wallet;
        
        let calculated = 0;
        ledgerSnap.forEach(doc => {
            const data = doc.data();
            calculated += data.amount;
        });

        const diff = Math.abs(finalWallet.balance - calculated);
        if (diff < 0.01) {
            console.log(`   🏆 SUCCESS: Wallet balance (₹${finalWallet.balance.toFixed(2)}) matches Ledger sum (₹${calculated.toFixed(2)})!`);
        } else {
            console.error(`   ❌ FAILURE: Discrepancy of ₹${diff.toFixed(2)} detected.`);
        }

    } catch (error) {
        console.error("❌ Verification failed:", error);
    }
}

verifyBillingFlow().catch(console.error);
