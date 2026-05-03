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
    dotenv.config({ path: envPath });
}

process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8081';

async function inspectUser() {
    const { getAdminDb } = await import('../src/lib/firebaseAdmin');
    const db = await getAdminDb();
    const userId = 'owner_verify_1777785772226';

    console.log(`\n🔍 Detailed Inspection for User: ${userId}`);
    
    const userSnap = await db.collection('users').doc(userId).get();
    const userData = userSnap.data();
    
    console.log('\n--- Wallet ---');
    console.log(JSON.stringify(userData?.wallet, null, 2));

    console.log('\n--- Billing Ledger ---');
    const ledgerSnap = await db.collection('users').doc(userId).collection('billing_ledger').get();
    ledgerSnap.docs.forEach((d: any) => {
        const data = d.data();
        console.log(`[${d.id}] ${data.type}: ₹${data.amount} (${data.createdAt})`);
    });

    console.log('\n--- Wallet Transactions ---');
    const transSnap = await db.collection('users').doc(userId).collection('wallet_transactions').get();
    transSnap.docs.forEach((d: any) => {
        const data = d.data();
        console.log(`[${d.id}] ${data.type}: ₹${data.amount} (Trial: ${data.trialDeducted}, Recharge: ${data.rechargeDeducted}, Dues: ${data.duesIncurred}) - ${data.description}`);
    });
}

inspectUser().catch(console.error);
