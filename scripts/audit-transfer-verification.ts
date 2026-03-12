/**
 * scripts/audit-transfer-verification.ts
 * 
 * Verifies the Tenant Transfer logic across 10 critical financial scenarios.
 */

import * as admin from 'firebase-admin';
import { Firestore, FieldValue } from 'firebase-admin/firestore';
import { TenantService } from '../src/services/tenantService';

// --- Emulator Config ---
process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
if (!admin.apps.length) {
    admin.initializeApp({ projectId: 'roombox-test' });
}
const db: Firestore = admin.firestore();

type TestResult = { name: string; pass: boolean; details?: any };
const results: TestResult[] = [];

function record(name: string, pass: boolean, details?: any) {
    results.push({ name, pass, details });
    console.log(`${pass ? '[PASS]' : '[FAIL]'} ${name}${details ? ' : ' + JSON.stringify(details) : ''}`);
}

async function setupTestEnvironment() {
    const ownerId = 'owner-test';
    const pgId1 = 'pg-alpha';
    const pgId2 = 'pg-beta';

    const pgData = (id: string, name: string) => ({
        id, name, ownerId,
        floors: [{
            id: 'f1', name: 'Floor 1',
            rooms: [
                { id: 'r1', name: '101', beds: [{ id: `b1-${id}`, name: 'Bed 1', guestId: null }, { id: `b2-${id}`, name: 'Bed 2', guestId: null }] },
                { id: 'r2', name: '102', beds: [{ id: `b3-${id}`, name: 'Bed 3', guestId: null }] }
            ]
        }]
    });

    await db.collection('users_data').doc(ownerId).collection('pgs').doc(pgId1).set(pgData(pgId1, 'PG Alpha'));
    await db.collection('users_data').doc(ownerId).collection('pgs').doc(pgId2).set(pgData(pgId2, 'PG Beta'));

    return { ownerId, pgId1, pgId2 };
}

async function runTests() {
    let env = await setupTestEnvironment();

    // SCENARIO 1: Basic Transfer with Pending Balance
    console.log('\n--- Scenario 1: Pending Balance Transfer ---');
    const guestId1 = 'guest-1';
    await db.collection('users_data').doc(env.ownerId).collection('guests').doc(guestId1).set({
        id: guestId1, ownerId: env.ownerId, pgId: env.pgId1, pgName: 'PG Alpha', roomId: 'r1', bedId: `b1-${env.pgId1}`,
        balance: 5000, rentAmount: 10000, depositAmount: 20000,
        ledger: [{ id: 'l1', type: 'debit', amount: 5000, description: 'Pending Rent' }]
    });

    await TenantService.transferGuest(db, env.ownerId, guestId1, {
        newPgId: env.pgId1,
        newRoomId: 'r2',
        newRoomName: '102',
        newBedId: `b3-${env.pgId1}`,
        newRentAmount: 12000,
        newDepositAmount: 20000
    });
    const g1 = (await db.collection('users_data').doc(env.ownerId).collection('guests').doc(guestId1).get()).data();
    record('S1: Balance followed guest', g1?.balance === 5000, { actual: g1?.balance });
    record('S1: Bed Updated', g1?.bedId === `b3-${env.pgId1}`);

    // RESET ENV
    env = await setupTestEnvironment();

    // SCENARIO 2: Transfer with Deposit Increase
    console.log('\n--- Scenario 2: Deposit Upgrade ---');
    const guestId2 = 'guest-2';
    await db.collection('users_data').doc(env.ownerId).collection('guests').doc(guestId2).set({
        id: guestId2, ownerId: env.ownerId, pgId: env.pgId1, pgName: 'PG Alpha', roomId: 'r1', bedId: `b1-${env.pgId1}`,
        balance: 0, rentAmount: 10000, depositAmount: 10000, ledger: []
    });
    await TenantService.transferGuest(db, env.ownerId, guestId2, {
        newPgId: env.pgId2,
        newRoomId: 'r1',
        newRoomName: '101',
        newBedId: `b1-${env.pgId2}`,
        newRentAmount: 10000,
        newDepositAmount: 15000
    });
    const g2 = (await db.collection('users_data').doc(env.ownerId).collection('guests').doc(guestId2).get()).data();
    record('S2: Deposit Delta applied', g2?.balance === 5000, { actual: g2?.balance });
    record('S2: Cross-PG update', g2?.pgId === env.pgId2);

    // RESET ENV
    env = await setupTestEnvironment();

    // SCENARIO 3: Mid-Month Transfer
    console.log('\n--- Scenario 3: Mid-Month (15 Days) Transition ---');
    const guestId3 = 'guest-3';
    await db.collection('users_data').doc(env.ownerId).collection('guests').doc(guestId3).set({
        id: guestId3, ownerId: env.ownerId, pgId: env.pgId1, pgName: 'PG Alpha', roomId: 'r1', bedId: `b1-${env.pgId1}`,
        balance: 0, rentAmount: 10000, depositAmount: 10000,
        ledger: [
            { id: 'rent-month', type: 'debit', amount: 10000, description: 'Rent March' }, 
            { id: 'pay-month', type: 'credit', amount: 10000, description: 'Paid' }
        ]
    });
    await TenantService.transferGuest(db, env.ownerId, guestId3, {
        newPgId: env.pgId1,
        newRoomId: 'r2',
        newRoomName: '102',
        newBedId: `b3-${env.pgId1}`,
        newRentAmount: 15000,
        newDepositAmount: 10000
    });
    const g3 = (await db.collection('users_data').doc(env.ownerId).collection('guests').doc(guestId3).get()).data();
    record('S3: Move documented', g3?.ledger.some((l: any) => l.description.includes('TRANSFER: Moved from')));

    // RESET ENV
    env = await setupTestEnvironment();

    // SCENARIO 4: Deposit Decrease
    console.log('\n--- Scenario 4: Deposit Downgrade ---');
    const guestId4 = 'guest-4';
    await db.collection('users_data').doc(env.ownerId).collection('guests').doc(guestId4).set({
        id: guestId4, ownerId: env.ownerId, pgId: env.pgId2, pgName: 'PG Beta', roomId: 'r1', bedId: `b1-${env.pgId2}`,
        balance: 0, rentAmount: 10000, depositAmount: 20000, ledger: []
    });
    await TenantService.transferGuest(db, env.ownerId, guestId4, {
        newPgId: env.pgId2,
        newRoomId: 'r2',
        newRoomName: '102',
        newBedId: `b3-${env.pgId2}`,
        newRentAmount: 8000,
        newDepositAmount: 15000
    });
    const g4 = (await db.collection('users_data').doc(env.ownerId).collection('guests').doc(guestId4).get()).data();
    record('S4: Deposit Credit applied', g4?.balance === -5000, { actual: g4?.balance });

    // RESET ENV
    env = await setupTestEnvironment();

    // SCENARIO 5: Overpaid Tenant
    console.log('\n--- Scenario 5: Credit Balance Move ---');
    const guestId5 = 'guest-5';
    await db.collection('users_data').doc(env.ownerId).collection('guests').doc(guestId5).set({
        id: guestId5, ownerId: env.ownerId, pgId: env.pgId1, pgName: 'PG Alpha', roomId: 'r1', bedId: `b1-${env.pgId1}`,
        balance: -2000, rentAmount: 5000, depositAmount: 5000, ledger: []
    });
    await TenantService.transferGuest(db, env.ownerId, guestId5, {
        newPgId: env.pgId1,
        newRoomId: 'r2',
        newRoomName: '102',
        newBedId: `b3-${env.pgId1}`,
        newRentAmount: 5000,
        newDepositAmount: 5000
    });
    const g5 = (await db.collection('users_data').doc(env.ownerId).collection('guests').doc(guestId5).get()).data();
    record('S5: Credit stayed active', g5?.balance === -2000, { actual: g5?.balance });

    // RESET ENV
    env = await setupTestEnvironment();

    // SCENARIO 6: Same PG Room Change (Lateral Move)
    console.log('\n--- Scenario 6: Same PG Lateral Move ---');
    const guestId6 = 'guest-6';
    await db.collection('users_data').doc(env.ownerId).collection('guests').doc(guestId6).set({
        id: guestId6, ownerId: env.ownerId, pgId: env.pgId1, pgName: 'PG Alpha', roomId: 'r1', bedId: `b1-${env.pgId1}`,
        balance: 0, rentAmount: 10000, depositAmount: 10000, ledger: []
    });
    await TenantService.transferGuest(db, env.ownerId, guestId6, {
        newPgId: env.pgId1,
        newRoomId: 'r2',
        newRoomName: '102',
        newBedId: `b3-${env.pgId1}`,
        newRentAmount: 10000,
        newDepositAmount: 10000
    });
    const g6 = (await db.collection('users_data').doc(env.ownerId).collection('guests').doc(guestId6).get()).data();
    record('S6: Ledger count (Memo only)', g6?.ledger.length === 1);
    record('S6: Balance remains zero', g6?.balance === 0, { actual: g6?.balance });

    // RESET ENV
    env = await setupTestEnvironment();

    // SCENARIO 7: Occupation Conflict Check (Negative)
    console.log('\n--- Scenario 7: Occupational Conflict ---');
    const guestId7a = 'guest-7a';
    const guestId7b = 'guest-7b';
    // Occupy Bed 3 in Alpha
    const pgAlphaRef = db.collection('users_data').doc(env.ownerId).collection('pgs').doc(env.pgId1);
    const pgAlphaData = (await pgAlphaRef.get()).data();
    if (pgAlphaData) {
        pgAlphaData.floors[0].rooms[1].beds[0].guestId = guestId7b;
        await pgAlphaRef.set(pgAlphaData);
    }

    await db.collection('users_data').doc(env.ownerId).collection('guests').doc(guestId7a).set({
        id: guestId7a, ownerId: env.ownerId, pgId: env.pgId1, roomId: 'r1', bedId: `b1-${env.pgId1}`,
        balance: 0, rentAmount: 10000, depositAmount: 10000
    });
    
    try {
        await TenantService.transferGuest(db, env.ownerId, guestId7a, {
            newPgId: env.pgId1, newRoomId: 'r2', newRoomName: '102', newBedId: `b3-${env.pgId1}`, 
            newRentAmount: 10000, newDepositAmount: 10000
        });
        record('S7: Conflict detection failed', false);
    } catch (e: any) {
        record('S7: Conflict detected (Passed)', e.message.includes('already occupied'), { error: e.message });
    }

    // RESET ENV
    env = await setupTestEnvironment();

    // SCENARIO 8: Full Deposit Refund Move
    console.log('\n--- Scenario 8: Zero Deposit Refund ---');
    const guestId8 = 'guest-8';
    await db.collection('users_data').doc(env.ownerId).collection('guests').doc(guestId8).set({
        id: guestId8, ownerId: env.ownerId, pgId: env.pgId1, pgName: 'PG Alpha', roomId: 'r1', bedId: `b1-${env.pgId1}`,
        balance: 0, rentAmount: 10000, depositAmount: 10000, ledger: []
    });
    await TenantService.transferGuest(db, env.ownerId, guestId8, {
        newPgId: env.pgId1, newRoomId: 'r2', newRoomName: '102', newBedId: `b3-${env.pgId1}`, 
        newRentAmount: 10000, newDepositAmount: 0 // Refund whole deposit
    });
    const g8 = (await db.collection('users_data').doc(env.ownerId).collection('guests').doc(guestId8).get()).data();
    record('S8: Balance is -10000 (Refund)', g8?.balance === -10000, { actual: g8?.balance });
    record('S8: New Deposit is 0', g8?.depositAmount === 0);

    // RESET ENV
    env = await setupTestEnvironment();

    // SCENARIO 9: Cross-PG Move with Balance
    console.log('\n--- Scenario 9: Cross-PG Balance Migration ---');
    const guestId9 = 'guest-9';
    await db.collection('users_data').doc(env.ownerId).collection('guests').doc(guestId9).set({
        id: guestId9, ownerId: env.ownerId, pgId: env.pgId1, pgName: 'PG Alpha', roomId: 'r1', bedId: `b1-${env.pgId1}`,
        balance: 2400, rentAmount: 8000, depositAmount: 10000, ledger: []
    });
    await TenantService.transferGuest(db, env.ownerId, guestId9, {
        newPgId: env.pgId2, newRoomId: 'r1', newRoomName: '101', newBedId: `b1-${env.pgId2}`, 
        newRentAmount: 12000, newDepositAmount: 15000
    });
    const g9 = (await db.collection('users_data').doc(env.ownerId).collection('guests').doc(guestId9).get()).data();
    // 2400 (old balance) + 5000 (deposit delta) = 7400
    record('S9: Cross-PG balance correct (7400)', g9?.balance === 7400, { actual: g9?.balance });

    // RESET ENV
    env = await setupTestEnvironment();

    // SCENARIO 10: History Consistency
    console.log('\n--- Scenario 10: Data Integrity (History) ---');
    const guestId10 = 'guest-10';
    await db.collection('users_data').doc(env.ownerId).collection('guests').doc(guestId10).set({
        id: guestId10, ownerId: env.ownerId, pgId: env.pgId1, pgName: 'PG Alpha', roomId: 'r1', bedId: `b1-${env.pgId1}`,
        balance: 0, rentAmount: 10000, depositAmount: 10000, ledger: []
    });
    await TenantService.transferGuest(db, env.ownerId, guestId10, {
        newPgId: env.pgId2, newRoomId: 'r1', newRoomName: '101', newBedId: `b1-${env.pgId2}`, 
        newRentAmount: 12000, newDepositAmount: 20000
    });
    
    // Check old bed is vacant
    const pgAlpha = (await db.collection('users_data').doc(env.ownerId).collection('pgs').doc(env.pgId1).get()).data();
    const bed1 = pgAlpha?.floors[0].rooms[0].beds[0];
    record('S10: Old bed vacated', bed1.guestId === null);
    
    // Check new bed is occupied
    const pgBeta = (await db.collection('users_data').doc(env.ownerId).collection('pgs').doc(env.pgId2).get()).data();
    const bed1Beta = pgBeta?.floors[0].rooms[0].beds[0];
    record('S10: New bed occupied', bed1Beta.guestId === guestId10);

    // RESET ENV
    env = await setupTestEnvironment();

    // SCENARIO 11: Mid-Month Rent Proration
    console.log('\n--- Scenario 11: Mid-Month Proration ---');
    const guestId11 = 'guest-11';
    await db.collection('users_data').doc(env.ownerId).collection('guests').doc(guestId11).set({
        id: guestId11, ownerId: env.ownerId, pgId: env.pgId1, pgName: 'PG Alpha', roomId: 'r1', bedId: `b1-${env.pgId1}`,
        balance: 0, rentAmount: 5000, depositAmount: 5000, ledger: []
    });
    
    // Transfer with ₹2000 proration charge
    await TenantService.transferGuest(db, env.ownerId, guestId11, {
        newPgId: env.pgId1,
        newRoomId: 'r2',
        newRoomName: '102',
        newBedId: `b3-${env.pgId1}`,
        newRentAmount: 10000,
        newDepositAmount: 5000,
        shouldProrate: true,
        prorationAmount: 2000
    });
    const g11 = (await db.collection('users_data').doc(env.ownerId).collection('guests').doc(guestId11).get()).data();
    record('S11: Proration charge applied', g11?.balance === 2000, { actual: g11?.balance });
    const prorateEntry = g11?.ledger.find((l: any) => l.description.includes('proration'));
    record('S11: Proration ledger entry exists', !!prorateEntry);

    console.log('\n--- AUDIT SUMMARY ---');
    const passedCount = results.filter(r => r.pass).length;
    const failedCount = results.filter(r => !r.pass).length;
    console.log(`Total tests: ${results.length}`);
    console.log(`Passed: ${passedCount}`);
    console.log(`Failed: ${failedCount}`);
}

runTests().catch(console.error);
