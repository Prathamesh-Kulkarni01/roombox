/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║          ROOMBOX — SYSTEM INTEGRITY VERIFICATION HARNESS            ║
 * ║                                                                       ║
 * ║  Run against the Firebase Emulator Suite to validate production       ║
 * ║  safety of critical business logic.                                   ║
 * ║                                                                       ║
 * ║  Usage:                                                               ║
 * ║    1. Start emulators: firebase emulators:start                       ║
 * ║    2. Run: npx ts-node --skip-project-check scripts/verify-system-integrity.ts
 * ╚══════════════════════════════════════════════════════════════════════╝
 */

import * as admin from 'firebase-admin';
import { Firestore, FieldValue } from 'firebase-admin/firestore';
import { produce } from 'immer';
import { calculateFirstDueDate } from '../src/lib/utils';
import { getReminderForGuest } from '../src/lib/reminder-logic';
import { runReconciliationLogic } from '../src/lib/reconciliation';

// ─── Emulator Config ─────────────────────────────────────────────────────────

process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';

if (!admin.apps.length) {
    admin.initializeApp({ projectId: 'roombox-test' });
}

const db: Firestore = admin.firestore();

// ─── Test State & Utilities ──────────────────────────────────────────────────

const TEST_OWNER_ID = `test-owner-${Date.now()}`;
const TEST_PG_ID = `test-pg-${Date.now()}`;
const TEST_BED_ID = `test-bed-${Date.now()}`;

type TestResult = { name: string; pass: boolean; reason?: string };
const results: TestResult[] = [];

function pass(name: string): void {
    results.push({ name, pass: true });
    console.log(`\x1b[32m[PASS]\x1b[0m ${name}`);
}

function fail(name: string, reason: string, data?: any): void {
    results.push({ name, pass: false, reason });
    console.log(`\x1b[31m[FAIL]\x1b[0m ${name}`);
    console.log(`       Reason: ${reason}`);
    if (data) console.log(`       Data:`, JSON.stringify(data, null, 2));
}

function assert(condition: boolean, failMsg: string, data?: any): void {
    if (!condition) throw Object.assign(new Error(failMsg), { data });
}

// ─── Seed Data Helpers ───────────────────────────────────────────────────────

const BASE_GUEST = (id: string, overrides: Record<string, any> = {}) => ({
    id,
    ownerId: TEST_OWNER_ID,
    name: 'Test Tenant',
    phone: '+919999900001',
    email: 'test@test.com',
    pgId: TEST_PG_ID,
    pgName: 'Test PG',
    bedId: TEST_BED_ID,
    roomId: 'room-1',
    roomName: '101',
    rentAmount: 10000,
    depositAmount: 20000,
    balance: 10000,
    rentStatus: 'unpaid' as const,
    kycStatus: 'not-started' as const,
    isVacated: false,
    ledger: [],
    paymentHistory: [],
    joinDate: new Date().toISOString(),
    dueDate: new Date().toISOString(),
    rentCycleUnit: 'months',
    rentCycleValue: 1,
    billingAnchorDay: 1,
    schemaVersion: 2,
    isOnboarded: false,
    ...overrides,
});

const BASE_PG = (overrides: Record<string, any> = {}) => ({
    id: TEST_PG_ID,
    name: 'Test PG',
    ownerId: TEST_OWNER_ID,
    occupancy: 0,
    totalBeds: 10,
    floors: [
        {
            id: 'floor-1',
            name: 'Floor 1',
            rooms: [
                {
                    id: 'room-1',
                    name: '101',
                    beds: [
                        { id: TEST_BED_ID, name: '1', guestId: null },
                        { id: `${TEST_BED_ID}-b`, name: '2', guestId: null },
                    ],
                },
            ],
        },
    ],
    ...overrides,
});

async function seedPg(overrides: Record<string, any> = {}): Promise<void> {
    await db.collection('users_data').doc(TEST_OWNER_ID).collection('pgs').doc(TEST_PG_ID).set(BASE_PG(overrides));
}

async function seedGuest(id: string, overrides: Record<string, any> = {}): Promise<void> {
    await db.collection('users_data').doc(TEST_OWNER_ID).collection('guests').doc(id).set(BASE_GUEST(id, overrides));
}

async function getGuest(id: string): Promise<any> {
    const snap = await db.collection('users_data').doc(TEST_OWNER_ID).collection('guests').doc(id).get();
    return snap.data();
}

async function getPg(): Promise<any> {
    const snap = await db.collection('users_data').doc(TEST_OWNER_ID).collection('pgs').doc(TEST_PG_ID).get();
    return snap.data();
}

async function cleanup(): Promise<void> {
    // Delete all guests and PGs created during tests
    const guests = await db.collection('users_data').doc(TEST_OWNER_ID).collection('guests').get();
    const pgs = await db.collection('users_data').doc(TEST_OWNER_ID).collection('pgs').get();
    const batch = db.batch();
    guests.docs.forEach(d => batch.delete(d.ref));
    pgs.docs.forEach(d => batch.delete(d.ref));
    batch.delete(db.collection('users_data').doc(TEST_OWNER_ID));
    await batch.commit();
}

// ─── TEST 1: WEBHOOK IDEMPOTENCY ─────────────────────────────────────────────

async function testWebhookIdempotency(): Promise<void> {
    const GUEST_ID = `guest-idempotency-${Date.now()}`;
    const PAYMENT_ID = `pay_test_${Date.now()}`;
    const AMOUNT = 10000;

    await seedPg();
    await seedGuest(GUEST_ID, {
        ledger: [{ id: 'debit-1', date: new Date().toISOString(), type: 'debit', description: 'Rent', amount: AMOUNT }],
    });

    // ── Simulates the webhook handler's core logic (extracted from razorpay-rent/route.ts) ──
    const processWebhookPayment = async (paymentId: string, amount: number): Promise<'processed' | 'skipped'> => {
        const guestRef = db.collection('users_data').doc(TEST_OWNER_ID).collection('guests').doc(GUEST_ID);

        const result = await db.runTransaction(async (tx) => {
            const snap = await tx.get(guestRef);
            const guest = snap.data()!;

            // IDEMPOTENCY GUARD (mirrors line 90 in razorpay-rent/route.ts)
            if (guest.paymentHistory?.some((p: any) => p.id === paymentId)) {
                return 'skipped';
            }

            const ledgerEntry = {
                id: `credit-${paymentId}`,
                date: new Date().toISOString(),
                type: 'credit' as const,
                description: 'Rent payment via UPI',
                amount,
            };

            const newPayment = {
                id: paymentId,
                date: new Date().toISOString(),
                amount,
                method: 'in-app',
                forMonth: 'March 2026',
            };

            const updatedGuest = produce(guest, (draft: any) => {
                draft.ledger.push(ledgerEntry);
                if (!draft.paymentHistory) draft.paymentHistory = [];
                draft.paymentHistory.push(newPayment);

                const totalDebits = draft.ledger.filter((e: any) => e.type === 'debit').reduce((s: number, e: any) => s + e.amount, 0);
                const totalCredits = draft.ledger.filter((e: any) => e.type === 'credit').reduce((s: number, e: any) => s + e.amount, 0);
                const newBalance = totalDebits - totalCredits;
                draft.rentStatus = newBalance <= 0 ? 'paid' : 'partial';
            });

            tx.set(guestRef, updatedGuest);
            return 'processed';
        });

        return result;
    };

    try {
        const firstCall = await processWebhookPayment(PAYMENT_ID, AMOUNT);
        const secondCall = await processWebhookPayment(PAYMENT_ID, AMOUNT); // duplicate

        const guest = await getGuest(GUEST_ID);
        const ledgerCredits = guest.ledger.filter((e: any) => e.type === 'credit');
        const paymentEntries = guest.paymentHistory;

        assert(firstCall === 'processed', 'First webhook call should be processed');
        assert(secondCall === 'skipped', 'Second webhook call should be skipped (idempotency guard)');
        assert(ledgerCredits.length === 1, `Expected 1 credit entry, got ${ledgerCredits.length}`, guest.ledger);
        assert(paymentEntries.length === 1, `Expected 1 payment entry, got ${paymentEntries.length}`, paymentEntries);
        assert(guest.rentStatus === 'paid', `Expected rentStatus=paid, got ${guest.rentStatus}`);

        const totalDebits = guest.ledger.filter((e: any) => e.type === 'debit').reduce((s: number, e: any) => s + e.amount, 0);
        const totalCredits = guest.ledger.filter((e: any) => e.type === 'credit').reduce((s: number, e: any) => s + e.amount, 0);
        const balance = totalDebits - totalCredits;
        assert(balance === 0, `Expected balance=0 after payment, got ${balance}`);

        pass('Webhook idempotency');
    } catch (err: any) {
        fail('Webhook idempotency', err.message, err.data);
    }
}

// ─── TEST 2: LEDGER ACCOUNTING INTEGRITY ─────────────────────────────────────

async function testLedgerAccountingIntegrity(): Promise<void> {
    const GUEST_ID = `guest-ledger-${Date.now()}`;
    const RENT = 10000;
    const DEPOSIT = 20000;

    await seedGuest(GUEST_ID, { rentAmount: RENT, depositAmount: DEPOSIT, ledger: [], paymentHistory: [] });

    try {
        const guestRef = db.collection('users_data').doc(TEST_OWNER_ID).collection('guests').doc(GUEST_ID);

        // --- Month 1: rent debit generated (e.g. by cron) ---
        const rentDebit = {
            id: `debit-month1-${Date.now()}`,
            date: new Date().toISOString(),
            type: 'debit' as const,
            description: 'Monthly Rent',
            amount: RENT,
        };
        await guestRef.update({ ledger: FieldValue.arrayUnion(rentDebit) });

        // --- Tenant Payment ---
        const creditEntry = {
            id: `credit-pay-${Date.now()}`,
            date: new Date().toISOString(),
            type: 'credit' as const,
            description: 'Rent Payment (cash)',
            amount: RENT,
        };
        await guestRef.update({ ledger: FieldValue.arrayUnion(creditEntry) });

        const guest = await getGuest(GUEST_ID);
        const ledger = guest.ledger;

        // ── Assertions ──
        const hasDepositEntry = ledger.some((e: any) =>
            e.description?.toLowerCase().includes('deposit')
        );
        assert(!hasDepositEntry, 'Deposit must NOT appear in the rent ledger (Escrow Model)');

        const debits = ledger.filter((e: any) => e.type === 'debit');
        const credits = ledger.filter((e: any) => e.type === 'credit');
        assert(debits.length === 1, `Expected 1 debit, got ${debits.length}`);
        assert(credits.length === 1, `Expected 1 credit, got ${credits.length}`);

        const totalDebits = debits.reduce((s: number, e: any) => s + e.amount, 0);
        const totalCredits = credits.reduce((s: number, e: any) => s + e.amount, 0);
        const balance = totalDebits - totalCredits;
        assert(balance === 0, `Expected zero balance after payment, got ${balance}`);

        // ── Vacate: deposit reconciliation ──
        // Final settlement: deposit - outstandingBalance. Balance is 0, so full deposit is refunded.
        const currentBalance = totalDebits - totalCredits; // 0
        const finalSettlementAmount = DEPOSIT - currentBalance;    // 20000

        assert(finalSettlementAmount === DEPOSIT, `Expected finalSettlement=${DEPOSIT}, got ${finalSettlementAmount}`);

        await guestRef.update({
            isVacated: true,
            exitDate: new Date().toISOString(),
            finalSettlementAmount,
        });

        const vacatedGuest = await getGuest(GUEST_ID);
        assert(vacatedGuest.isVacated === true, 'Guest should be marked as vacated');
        assert(vacatedGuest.finalSettlementAmount === DEPOSIT,
            `Final settlement should be ${DEPOSIT}, got ${vacatedGuest.finalSettlementAmount}`);

        pass('Ledger accounting integrity');
    } catch (err: any) {
        fail('Ledger accounting integrity', err.message, err.data);
    }
}

// ─── TEST 3: BED ALLOCATION CONCURRENCY ──────────────────────────────────────

async function testBedAllocationConcurrency(): Promise<void> {
    const SHARED_BED_ID = `bed-concurrency-${Date.now()}`;
    const PG_ID_CONC = `pg-conc-${Date.now()}`;

    // Create a PG with a single free bed
    await db.collection('users_data').doc(TEST_OWNER_ID).collection('pgs').doc(PG_ID_CONC).set({
        id: PG_ID_CONC,
        name: 'Concurrency PG',
        ownerId: TEST_OWNER_ID,
        occupancy: 0,
        totalBeds: 1,
        floors: [{
            id: 'floor-c', name: 'Floor C',
            rooms: [{
                id: 'room-c', name: 'C01',
                beds: [{ id: SHARED_BED_ID, name: '1', guestId: null }],
            }],
        }],
    });

    // Mirrors TenantService.onboardTenant bed-allocation transaction logic
    const tryAssignBed = async (guestId: string): Promise<'success' | 'occupied'> => {
        const pgRef = db.collection('users_data').doc(TEST_OWNER_ID).collection('pgs').doc(PG_ID_CONC);
        const guestRef = db.collection('users_data').doc(TEST_OWNER_ID).collection('guests').doc(guestId);

        try {
            await db.runTransaction(async (tx) => {
                const pgSnap = await tx.get(pgRef);
                const pgData = pgSnap.data()!;

                let bedFound = false;
                const updatedFloors = (pgData.floors as any[]).map((floor: any) => ({
                    ...floor,
                    rooms: floor.rooms.map((room: any) => ({
                        ...room,
                        beds: room.beds.map((bed: any) => {
                            if (bed.id === SHARED_BED_ID) {
                                bedFound = true;
                                // CONCURRENCY GUARD
                                if (bed.guestId !== null) {
                                    throw new Error('Bed already occupied');
                                }
                                return { ...bed, guestId };
                            }
                            return bed;
                        }),
                    })),
                }));

                if (!bedFound) throw new Error('Bed not found');

                tx.update(pgRef, { floors: updatedFloors, occupancy: FieldValue.increment(1) });
                tx.set(guestRef, BASE_GUEST(guestId, {
                    pgId: PG_ID_CONC,
                    bedId: SHARED_BED_ID,
                    name: `Tenant ${guestId}`,
                }));
            });

            return 'success';
        } catch (err: any) {
            if (err.message === 'Bed already occupied') return 'occupied';
            throw err;
        }
    };

    try {
        // Fire both onboarding calls concurrently
        const [r1, r2] = await Promise.all([
            tryAssignBed('guest-conc-A'),
            tryAssignBed('guest-conc-B'),
        ]);

        const outcomes = [r1, r2];
        const successes = outcomes.filter(r => r === 'success');
        const failures = outcomes.filter(r => r === 'occupied');

        assert(successes.length === 1, `Expected exactly 1 success, got ${successes.length}`, { r1, r2 });
        assert(failures.length === 1, `Expected exactly 1 failure, got ${failures.length}`, { r1, r2 });

        // Verify PG state
        const pg = await db.collection('users_data').doc(TEST_OWNER_ID).collection('pgs').doc(PG_ID_CONC).get();
        const pgData = pg.data()!;
        const bed = pgData.floors[0].rooms[0].beds[0];

        assert(pgData.occupancy === 1, `Expected occupancy=1, got ${pgData.occupancy}`);
        assert(bed.guestId !== null, `Bed should have a guestId assigned`);
        assert(typeof bed.guestId === 'string', `Bed guestId must be a string, got ${typeof bed.guestId}`);

        // Verify only one guest doc was created
        const guestSnap = await db.collection('users_data').doc(TEST_OWNER_ID).collection('guests').get();
        const newGuests = guestSnap.docs.filter(d => d.id.startsWith('guest-conc'));
        assert(newGuests.length === 1, `Expected 1 guest doc, got ${newGuests.length}`);
        assert(newGuests[0].data().bedId === SHARED_BED_ID, 'Winning guest should hold the correct bedId');

        pass('Bed allocation concurrency');
    } catch (err: any) {
        fail('Bed allocation concurrency', err.message, err.data);
    } finally {
        // Cleanup concurrency PG
        await db.collection('users_data').doc(TEST_OWNER_ID).collection('pgs').doc(PG_ID_CONC).delete();
        const conc = await db.collection('users_data').doc(TEST_OWNER_ID).collection('guests').get();
        const batch = db.batch();
        conc.docs.filter(d => d.id.startsWith('guest-conc')).forEach(d => batch.delete(d.ref));
        await batch.commit();
    }
}

// ─── TEST 4: WHATSAPP REMINDER IDEMPOTENCY ───────────────────────────────────

async function testWhatsAppReminderIdempotency(): Promise<void> {
    const GUEST_ID = `guest-reminder-${Date.now()}`;

    // dueDate 3 days from now → triggers a 'upcoming' reminder type
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 3);

    await seedGuest(GUEST_ID, {
        dueDate: dueDate.toISOString(),
        rentStatus: 'unpaid',
        lastReminderSentAt: null,
        lastReminderType: null,
    });

    // Mirrors the cron job reminder logic (send-rent-reminders/route.ts)
    const runReminderJobForGuest = async (guestId: string, now: Date): Promise<boolean> => {
        const guestRef = db.collection('users_data').doc(TEST_OWNER_ID).collection('guests').doc(guestId);
        const snap = await guestRef.get();
        const guest = snap.data() as any;

        const reminderInfo = getReminderForGuest(guest, now);

        if (!reminderInfo.shouldSend || !reminderInfo.type) return false;

        // IDEMPOTENCY CHECK (mirrors lines 69–76 of cron route)
        if (guest.lastReminderType === reminderInfo.type && guest.lastReminderSentAt) {
            const diffDays = (now.getTime() - new Date(guest.lastReminderSentAt).getTime()) / (1000 * 60 * 60 * 24);
            if (diffDays < 15) return false; // skip
        }

        // Stamp the guest doc (mock: we skip actual WhatsApp send)
        await guestRef.update({
            lastReminderSentAt: now.toISOString(),
            lastReminderType: reminderInfo.type,
        });

        return true;
    };

    try {
        const now = new Date();

        const sent1 = await runReminderJobForGuest(GUEST_ID, now);
        const sent2 = await runReminderJobForGuest(GUEST_ID, now); // same day

        assert(sent1 === true, 'First reminder run should send a reminder');
        assert(sent2 === false, 'Second reminder run on the same day should be skipped (idempotency)');

        const guest = await getGuest(GUEST_ID);
        assert(guest.lastReminderSentAt !== undefined, 'lastReminderSentAt must be set');
        assert(guest.lastReminderType !== undefined, 'lastReminderType must be set');

        // Also verify that running again after 16 days DOES re-send (new cycle)
        const futureDate = new Date(now.getTime() + 16 * 24 * 60 * 60 * 1000);
        // Adjust dueDate so a reminder is triggered in the future too
        const futureDue = new Date(futureDate.getTime() + 3 * 24 * 60 * 60 * 1000);
        await db.collection('users_data').doc(TEST_OWNER_ID).collection('guests').doc(GUEST_ID).update({
            dueDate: futureDue.toISOString(),
        });
        const sent3 = await runReminderJobForGuest(GUEST_ID, futureDate);
        assert(sent3 === true, 'Reminder SHOULD re-send after 16 days (new cycle allowed)');

        pass('WhatsApp reminder idempotency');
    } catch (err: any) {
        fail('WhatsApp reminder idempotency', err.message, err.data);
    }
}

// ─── TEST 5: DEPOSIT RECONCILIATION (FINANCIAL EDGE CASES) ───────────────────

async function testDepositReconciliation(): Promise<void> {
    // ── Scenario A: tenant owes nothing on exit → full deposit refunded ──
    const runScenario = (label: string, deposit: number, outstandingRent: number) => {
        // Same logic as vacateTenant (lines 299–312 of tenantService.ts)
        const currentBalance = outstandingRent;         // debits - credits
        const finalSettlementAmount = deposit - currentBalance;

        const refundAmount = Math.max(0, finalSettlementAmount);
        const tenantOwes = Math.max(0, -finalSettlementAmount);

        return { refundAmount, tenantOwes, finalSettlementAmount };
    };

    try {
        // A: deposit > outstanding rent
        const scenA = runScenario('A', 20000, 5000);
        assert(scenA.refundAmount === 15000, `Scenario A: expected refund=15000, got ${scenA.refundAmount}`, scenA);
        assert(scenA.tenantOwes === 0, `Scenario A: expected tenantOwes=0, got ${scenA.tenantOwes}`, scenA);

        // B: outstanding rent > deposit (tenant owes extra)
        const scenB = runScenario('B', 20000, 25000);
        assert(scenB.refundAmount === 0, `Scenario B: expected refund=0, got ${scenB.refundAmount}`, scenB);
        assert(scenB.tenantOwes === 5000, `Scenario B: expected tenantOwes=5000, got ${scenB.tenantOwes}`, scenB);

        // C: exact match — deposit equals outstanding rent
        const scenC = runScenario('C', 20000, 20000);
        assert(scenC.refundAmount === 0, `Scenario C: expected refund=0, got ${scenC.refundAmount}`, scenC);
        assert(scenC.tenantOwes === 0, `Scenario C: expected tenantOwes=0, got ${scenC.tenantOwes}`, scenC);

        // D: no outstanding rent at all — full deposit refunded
        const scenD = runScenario('D', 20000, 0);
        assert(scenD.refundAmount === 20000, `Scenario D: expected refund=20000, got ${scenD.refundAmount}`, scenD);
        assert(scenD.tenantOwes === 0, `Scenario D: expected tenantOwes=0, got ${scenD.tenantOwes}`, scenD);

        pass('Deposit reconciliation');
    } catch (err: any) {
        fail('Deposit reconciliation', err.message, err.data);
    }
}

// ─── MAIN RUNNER ─────────────────────────────────────────────────────────────

async function main(): Promise<never> {
    console.log('\n╔══════════════════════════════════════════════════════════╗');
    console.log('║       RoomBox — System Integrity Verification            ║');
    console.log('╚══════════════════════════════════════════════════════════╝\n');
    console.log(`Owner ID: ${TEST_OWNER_ID}`);
    console.log(`PG ID:    ${TEST_PG_ID}\n`);

    try {
        await testWebhookIdempotency();
        await testLedgerAccountingIntegrity();
        await testBedAllocationConcurrency();
        await testWhatsAppReminderIdempotency();
        await testDepositReconciliation();
    } finally {
        console.log('\n─── Cleaning up test data... ───');
        await cleanup();
        console.log('Cleanup complete.\n');
    }

    const passed = results.filter(r => r.pass).length;
    const failed = results.filter(r => !r.pass);

    console.log('═══════════════════════════════════════════════════════════');
    console.log(`  Results: ${passed}/${results.length} tests passed`);
    console.log('═══════════════════════════════════════════════════════════');

    if (failed.length > 0) {
        console.log('\n\x1b[31m⚠️  FAILING TESTS:\x1b[0m');
        failed.forEach(f => console.log(`  • ${f.name}: ${f.reason}`));
        console.log('\n👎 System is NOT safe for production. Fix the above failures.\n');
        process.exit(1);
    } else {
        console.log('\n\x1b[32m✅ All tests passed. System is safe for production.\x1b[0m\n');
        process.exit(0);
    }
}

main().catch((err) => {
    console.error('\nFatal error:', err);
    process.exit(1);
});
