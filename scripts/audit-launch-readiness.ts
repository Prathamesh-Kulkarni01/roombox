/**
 * scripts/audit-launch-readiness.ts
 * 
 * Comprehensive Audit for Launch Readiness, focusing on:
 * 1. Ghost Mode (Symbolic Rent) - Complete Lifecycle
 * 2. Offline Payments (Cash/Direct UPI)
 * 3. Schema Versioning & Data Consistency
 */

import { getAdminDb } from '../src/lib/firebaseAdmin';
import { TenantService } from '../src/services/tenantService';
import { Guest, LedgerEntry } from '../src/lib/types';
import { Firestore } from 'firebase-admin/firestore';

const OWNER_ID = 'launch-audit-owner';
const PG_ID = 'launch-pg-1';

async function setupTestData(db: Firestore) {
    console.log('--- Phase 0: Setup Test Data ---');
    // Setup Owner
    await db.collection('users').doc(OWNER_ID).set({
        id: OWNER_ID,
        name: 'Launch Readiness Auditor',
        role: 'owner',
        subscription: { planId: 'pro' }
    });

    // Setup PG
    await db.collection('users_data').doc(OWNER_ID).collection('pgs').doc(PG_ID).set({
        id: PG_ID,
        name: 'Launch Audit PG',
        ownerId: OWNER_ID,
        floors: [{
            id: 'f1', name: 'Floor 1',
            rooms: [{
                id: 'r1', name: '101',
                beds: [
                    { id: 'b1', name: 'Bed 1', guestId: null },
                    { id: 'b2', name: 'Bed 2', guestId: null }
                ]
            }]
        }]
    });
    console.log('✅ Test environment ready.');
}

async function runAudit() {
    const db = await getAdminDb();
    const appDb = db; // In current script they are same
    await setupTestData(db);

    const testResults: { name: string; pass: boolean; actual?: any; expected?: any }[] = [];
    const report = (name: string, pass: boolean, actual?: any, expected?: any) => {
        testResults.push({ name, pass, actual, expected });
        console.log(`${pass ? '✅' : '❌'} ${name} ${!pass ? `(Expected: ${expected}, Actual: ${actual})` : ''}`);
        if (!pass) {
            console.error(`FAILED: ${name}`);
        }
    };

    // --- SCENARIO 1: Ghost Mode Onboarding ---
    console.log('\n--- Scenario 1: Ghost Mode (Symbolic Rent) Onboarding ---');
    const ghostTenantInput = {
        ownerId: OWNER_ID,
        name: 'Ghost Tenant',
        phone: '9000000001',
        pgId: PG_ID,
        pgName: 'Launch Audit PG',
        roomId: 'r1',
        roomName: '101',
        bedId: 'b1',
        rentAmount: 0,
        deposit: 0,
        amountType: 'symbolic',
        symbolicRentValue: '1 UNIT',
        symbolicDepositValue: '1 UNIT',
        joinDate: new Date().toISOString(),
        dueDate: '5',
        planId: 'pro'
    };

    const { guest: ghostGuest } = await TenantService.onboardTenant(db, appDb, ghostTenantInput);
    report('Ghost Guest IDs created', !!ghostGuest.id);
    report('Ghost Guest amountType is symbolic', ghostGuest.amountType === 'symbolic', ghostGuest.amountType);
    report('Ghost Guest Balance is 0', ghostGuest.balance === 0, ghostGuest.balance);
    
    const initialLedger = ghostGuest.ledger || [];
    const symbolicRentEntry = initialLedger.find(l => l.type === 'debit' && l.amountType === 'symbolic' && l.description.includes('Rent'));
    report('Ghost Guest Ledger has symbolic rent', !!symbolicRentEntry);
    report('Ghost Guest rentStatus is unpaid', ghostGuest.rentStatus === 'unpaid', ghostGuest.rentStatus);

    // --- SCENARIO 2: Ghost Mode Payment ---
    console.log('\n--- Scenario 2: Ghost Mode Payment ---');
    // Pay for Rent
    await TenantService.recordPayment(db, {
        ownerId: OWNER_ID,
        guestId: ghostGuest.id,
        amount: 0,
        amountType: 'symbolic',
        symbolicValue: '1 UNIT',
        paymentMode: 'cash',
        notes: 'Rent Payment'
    });
    
    // Pay for Deposit (to make it fully paid)
    const paymentRes = await TenantService.recordPayment(db, {
        ownerId: OWNER_ID,
        guestId: ghostGuest.id,
        amount: 0,
        amountType: 'symbolic',
        symbolicValue: '1 UNIT',
        paymentMode: 'cash',
        notes: 'Deposit Payment'
    });
    
    report('Ghost Payment status became paid', paymentRes.newStatus === 'paid', paymentRes.newStatus);
    report('Ghost Payment balance stayed 0', paymentRes.newBalance === 0, paymentRes.newBalance);
    
    const creditEntry = paymentRes.guest.ledger.find(l => l.type === 'credit' && l.amountType === 'symbolic');
    report('Ghost Ledger has symbolic credit', !!creditEntry);
    const gTyped = paymentRes.guest as any;
    report('Ghost Payment history has symbolic value', gTyped.paymentHistory && gTyped.paymentHistory[0].symbolicValue === '1 UNIT');

    // --- SCENARIO 3: Offline Numeric Payment ---
    console.log('\n--- Scenario 3: Offline Numeric (Cash) Payment ---');
    const numericTenantInput = {
        ownerId: OWNER_ID,
        name: 'Numeric Tenant',
        phone: '9000000002',
        pgId: PG_ID,
        pgName: 'Launch Audit PG',
        roomId: 'r1',
        roomName: '101',
        bedId: 'b2',
        rentAmount: 10000,
        deposit: 5000,
        amountType: 'numeric',
        joinDate: new Date().toISOString(),
        dueDate: '10',
        planId: 'pro'
    };
    const { guest: numericGuest } = await TenantService.onboardTenant(db, appDb, numericTenantInput);
    report('Numeric Guest onboarded, balance = 15000', numericGuest.balance === 15000, numericGuest.balance);

    const numericPayment = await TenantService.recordPayment(db, {
        ownerId: OWNER_ID,
        guestId: numericGuest.id,
        amount: 10000,
        paymentMode: 'cash',
        notes: 'Rent via Cash'
    });
    report('Numeric Payment balance is 5000', numericPayment.newBalance === 5000, numericPayment.newBalance);
    report('Numeric Payment status is partial', numericPayment.newStatus === 'partial', numericPayment.newStatus);

    // --- SCENARIO 4: Reconciliation Stability ---
    console.log('\n--- Scenario 4: Fast-Forward Billing (Numeric) ---');
    // Fast forward 1 month for numeric guest
    const futureDate = new Date();
    futureDate.setMonth(futureDate.getMonth() + 1);
    
    const { guest: reconGuest } = await TenantService.reconcileRentCycle(db, OWNER_ID, numericGuest.id, futureDate.toISOString());
    report('Reconciliation added 1 month rent (5000 + 10000 = 15000)', reconGuest.balance === 15000, reconGuest.balance);

    // --- SCENARIO 5: Schema Versioning ---
    console.log('\n--- Scenario 5: Schema Versioning Check ---');
    // We expect schemaVersion 3 (based on types.ts)
    const guestDoc = await db.collection('users_data').doc(OWNER_ID).collection('guests').doc(reconGuest.id).get();
    const guestData = guestDoc.data();
    report('Guest document has correct schemaVersion (>= 2)', (guestData?.schemaVersion || 0) >= 2, guestData?.schemaVersion);

    // --- SUMMARY ---
    console.log('\n--- 🚀 LAUNCH READINESS AUDIT SUMMARY ---');
    const passed = testResults.filter(r => r.pass).length;
    const total = testResults.length;
    console.log(`Passed: ${passed} / ${total}`);
    
    if (passed === total) {
        console.log('\n✨ SYSTEM READY FOR LAUNCH! All critical pathways verified.');
    } else {
        console.log('\n⚠️ LAUNCH BLOCKED: Some critical pathways failed audit.');
        process.exit(1);
    }
}

runAudit().catch(err => {
    console.error('\n❌ Audit Crashed:', err);
    process.exit(1);
});
