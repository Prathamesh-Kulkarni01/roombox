import { getAdminDb } from '../src/lib/firebaseAdmin';
import { TenantService } from '../src/services/tenantService';

async function runConcurrencyTest(db: any) {
    console.log('--- Running Concurrency Test ---');

    const ownerId = 'fail_test_owner';
    const tenantId = 'fail_test_tenant';

    await db.collection('users').doc(ownerId).set({ name: 'Fail Test Owner', role: 'owner' });
    const ref = db.collection('users_data').doc(ownerId).collection('guests').doc(tenantId);

    await ref.set({
        id: tenantId,
        name: `Fail Tenant`,
        rentAmount: 10000,
        balance: 10000,
        ledger: [],
        dueDate: new Date().toISOString(),
        joinDate: new Date().toISOString(),
        moveInDate: new Date().toISOString(),
        rentCycleUnit: 'months',
        rentCycleValue: 1,
        createdAt: new Date().getTime()
    });

    const guestDoc = await ref.get();
    const guest = guestDoc.data() as any;

    try {
        console.log('Triggering 5 simultaneous payments of ₹2000...');
        // Execute 5 payments concurrently
        await Promise.all([
            TenantService.recordPayment(db, { ownerId, guest: { ...guest }, amount: 2000, notes: 'A' }),
            TenantService.recordPayment(db, { ownerId, guest: { ...guest }, amount: 2000, notes: 'B' }),
            TenantService.recordPayment(db, { ownerId, guest: { ...guest }, amount: 2000, notes: 'C' }),
            TenantService.recordPayment(db, { ownerId, guest: { ...guest }, amount: 2000, notes: 'D' }),
            TenantService.recordPayment(db, { ownerId, guest: { ...guest }, amount: 2000, notes: 'E' })
        ]);

        const finalSnap = await ref.get();
        const finalData = finalSnap.data() as any;
        console.log(`Final Balance: ${finalData.balance}`);
        console.log(`Ledger Entries: ${finalData.ledger.length}`);

        if (finalData.balance !== 0) {
            console.error('❌ Race condition detected! Balance is not 0.');
            return false;
        } else if (finalData.ledger.length !== 6) {
            console.error('❌ Race condition detected! Ledger missing entries.');
            return false;
        }

        console.log('✅ Concurrency test passed. Transactions handled correctly.');
        return true;
    } catch (e: any) {
        console.error('❌ Concurrency test threw error:', e.stack);
        return false;
    }
}

async function runAudit() {
    process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
    const db = await getAdminDb();

    let passed = true;
    const concurrencyResult = await runConcurrencyTest(db);
    if (!concurrencyResult) passed = false;

    if (passed) {
        console.log('\n✅ All failure simulations passed.');
        process.exit(0);
    } else {
        console.error('\n❌ Failure simulation audit failed.');
        process.exit(1);
    }
}

runAudit().catch(err => {
    console.error(err);
    process.exit(1);
});
