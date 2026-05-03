import * as dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { getAdminDb } from '../src/lib/firebaseAdmin';

async function inspectUser(userId: string) {
    const db = await getAdminDb();
    const userDoc = await db.collection('users').doc(userId).get();
    console.log('--- User Wallet ---');
    console.log(userDoc.data()?.wallet);

    console.log('\n--- Ledger Entries ---');
    const ledgerSnap = await db.collection('users').doc(userId).collection('billing_ledger').get();
    ledgerSnap.docs.forEach(doc => {
        const d = doc.data();
        console.log(`[${d.type}] ${d.amount} - ${d.description} (${d.month})`);
    });

    console.log('\n--- Wallet Transactions ---');
    const txnSnap = await db.collection('users').doc(userId).collection('wallet_transactions').get();
    txnSnap.docs.forEach(doc => {
        const d = doc.data();
        console.log(`[${d.type}] ${d.amount} - ${d.description}`);
    });
}

inspectUser('owner_verify_1777785772226').catch(console.error);
