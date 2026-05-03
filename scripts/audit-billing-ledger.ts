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
}
// Force Emulator for local audit if no credentials found
if (!process.env.FIREBASE_PRIVATE_KEY && !process.env.FIRESTORE_EMULATOR_HOST) {
    process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8081';
    console.log(`   - No credentials found, defaulting to Emulator: ${process.env.FIRESTORE_EMULATOR_HOST}`);
}

import type { User, BillingLedgerEntry } from '../src/lib/types';

async function auditBillingLedger() {
    // Dynamic import to avoid hoisting issues
    const { getAdminDb } = await import('../src/lib/firebaseAdmin');
    console.log("🚀 Starting Billing Ledger Audit...");
    
    try {
        const db = await getAdminDb();
        const usersSnap = await db.collection('users').get();
        
        let totalIssues = 0;
        let totalChecked = 0;

        for (const userDoc of usersSnap.docs) {
            const userId = userDoc.id;
            const userData = userDoc.data() as User;
            const wallet = userData.wallet;

            if (!wallet) continue;

            totalChecked++;
            console.log(`\n🧐 Auditing User: ${userId} (${userData.email || 'No Email'})`);

            // Fetch all ledger entries for this user
            const ledgerSnap = await db.collection('users').doc(userId).collection('billing_ledger').get();
            const entries = ledgerSnap.docs.map(d => d.data() as BillingLedgerEntry);

            if (entries.length === 0) {
                console.log(`   ℹ️ No ledger entries found yet (Expected for existing users before migration).`);
                // If the user has a balance but no ledger, we might want to flag this for a "legacy sync"
                if (wallet.balance > 0) {
                    console.log(`   ⚠️ User has balance ₹${wallet.balance.toFixed(2)} but NO ledger entries.`);
                }
                continue;
            }

            // 1. Ledger vs Wallet Balance
            let calculatedBalance = 0;
            let totalCredits = 0;
            let totalDebits = 0;
            let metadataIssues = 0;

            entries.forEach(entry => {
                calculatedBalance += entry.amount;
                if (entry.amount > 0) {
                    totalCredits += entry.amount;
                } else {
                    totalDebits += Math.abs(entry.amount);
                }

                // Check Metadata Truth
                if (entry.type === 'TENANT_USAGE') {
                    if (!entry.metadata?.tenantIds || entry.metadata.tenantIds.length === 0) {
                        console.warn(`      ⚠️  TENANT_USAGE entry ${entry.id} missing tenantIds!`);
                        metadataIssues++;
                    }
                }
                if (entry.type === 'BASE_FEE' && !entry.metadata?.planId) {
                    console.warn(`      ⚠️  BASE_FEE entry ${entry.id} missing planId!`);
                    metadataIssues++;
                }
            });

            const currentBalance = (wallet.balance || 0) - (wallet.dues || 0);
            const balanceDiscrepancy = Math.abs(currentBalance - calculatedBalance);
            const hasBalanceIssue = balanceDiscrepancy > 0.01;

            // 2. Ledger vs Wallet Transactions (Sanity Check)
            const txnSnap = await db.collection('users').doc(userId).collection('wallet_transactions').get();
            const txns = txnSnap.docs.map(d => d.data());
            const txnNet = txns.reduce((sum, t) => {
                if (t.type === 'recharge' || t.type === 'admin_credit') return sum + t.amount;
                if (t.type === 'debit' || t.type === 'admin_debit') return sum - t.amount;
                return sum;
            }, 0);
            
            // Note: txnNet should match currentBalance (Bal-Dues) if all debits were recorded as dues when balance < 0
            const txnDiscrepancy = Math.abs(currentBalance - txnNet);

            // 3. Invoice Breakdown Check
            const invoiceSnap = await db.collection('users').doc(userId).collection('monthly_invoices').get();
            let invoiceIssues = 0;
            invoiceSnap.docs.forEach(doc => {
                const inv = doc.data();
                if (!inv.breakdown?.ledgerIds || inv.breakdown.ledgerIds.length === 0) {
                    console.warn(`      ⚠️  Invoice ${doc.id} missing linked ledgerIds!`);
                    invoiceIssues++;
                }
                if (inv.tenantCount > 0 && (!inv.breakdown?.tenantIds || inv.breakdown.tenantIds.length === 0)) {
                    console.warn(`      ⚠️  Invoice ${doc.id} missing tenantIds breakdown!`);
                    invoiceIssues++;
                }
            });

            console.log(`   - Net Wallet (Bal-Dues): ₹${currentBalance.toFixed(2)}`);
            console.log(`   - Calculated Ledger:     ₹${calculatedBalance.toFixed(2)}`);
            console.log(`   - Transaction Sum:       ₹${txnNet.toFixed(2)}`);

            if (hasBalanceIssue || txnDiscrepancy > 0.01 || metadataIssues > 0 || invoiceIssues > 0) {
                totalIssues++;
                if (hasBalanceIssue) console.error(`   ❌ BALANCE DISCREPANCY! Diff: ₹${balanceDiscrepancy.toFixed(2)}`);
                if (txnDiscrepancy > 0.01) console.error(`   ❌ TRANSACTION DISCREPANCY! Diff: ₹${txnDiscrepancy.toFixed(2)}`);
                if (metadataIssues > 0) console.error(`   ❌ METADATA TRUTH FAILED! (${metadataIssues} issues)`);
                if (invoiceIssues > 0) console.error(`   ❌ INVOICE BREAKDOWN FAILED! (${invoiceIssues} issues)`);
                
                console.log(`   📜 Ledger Detail:`);
                entries.forEach(e => {
                    let dateStr = '??-??-??';
                    const createdAt = (e as any).createdAt || (e as any).created_at;
                    if (createdAt) {
                        if (typeof createdAt.toDate === 'function') {
                            dateStr = createdAt.toDate().toISOString().split('T')[0];
                        } else if (typeof createdAt === 'string') {
                            dateStr = createdAt.split('T')[0];
                        }
                    }
                    console.log(`      [${dateStr}] ${e.type.padEnd(15)}: ₹${e.amount.toFixed(2)}`);
                });
            } else {
                console.log(`   ✅ All checks passed (Balance, Transactions, Metadata).`);
            }
        }

        console.log("\n" + "=".repeat(40));
        console.log(`📊 Audit Summary:`);
        console.log(`   - Users Checked: ${totalChecked}`);
        console.log(`   - Total Issues:  ${totalIssues}`);
        console.log("=".repeat(40));

        if (totalIssues === 0) {
            console.log("🏆 Audit Passed. Transaction-level truth verified across all users.");
        } else {
            console.warn("⚠️ Audit Failed. Some inconsistencies found.");
        }
    } catch (error) {
        console.error("Critical error during audit:", error);
    }
}

auditBillingLedger().catch(console.error);
