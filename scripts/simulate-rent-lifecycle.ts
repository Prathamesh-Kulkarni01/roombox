import { getAdminDb } from '../src/lib/firebaseAdmin';
import { reconcileAllGuests } from '../src/lib/actions/reconciliationActions';
import { getReminderForGuest } from '../src/lib/reminder-logic';
import { addMinutes, addHours, addDays, format, parseISO } from 'date-fns';
import type { Guest } from '../src/lib/types';
import * as fs from 'fs';

// Mock WhatsApp logs
const waLogsPath = 'wa-simulation-logs.txt';
if (fs.existsSync(waLogsPath)) fs.unlinkSync(waLogsPath);

function logWA(to: string, message: string) {
    fs.appendFileSync(waLogsPath, `[WA to ${to}] ${message}\n`);
}

function getWALogLength() {
    if (!fs.existsSync(waLogsPath)) return 0;
    return fs.readFileSync(waLogsPath, 'utf8').trim().split('\n').filter(l => l.length > 0).length;
}

async function runReminderJob(db: any, now: Date) {
    const ownersSnapshot = await db.collection('users').where('role', '==', 'owner').get();
    let remindersSent = 0;

    for (const ownerDoc of ownersSnapshot.docs) {
        const ownerId = ownerDoc.id;
        const guestsSnapshot = await db.collection('users_data').doc(ownerId).collection('guests')
            .where('isVacated', '==', false)
            .get();

        for (const guestDoc of guestsSnapshot.docs) {
            const guest = guestDoc.data() as Guest;
            const reminderInfo = getReminderForGuest(guest, now);

            if (reminderInfo.shouldSend && reminderInfo.type) {
                // Idempotency check 
                if (guest.lastReminderType === reminderInfo.type && guest.lastReminderSentAt) {
                    const lastSent = new Date(guest.lastReminderSentAt);
                    const diffMs = now.getTime() - lastSent.getTime();
                    // For short cycles, we satisfy "exactly once" by letting it trigger if time has passed.
                    // But in a real cron, it triggers based on the current minute.
                    // Given our simulation jumps, we just want to see it trigger at the right time.
                    if (diffMs < 60000) continue;
                }

                logWA(guest.phone || 'no-phone', reminderInfo.body);
                remindersSent++;

                await guestDoc.ref.update({
                    lastReminderSentAt: now.toISOString(),
                    lastReminderType: reminderInfo.type
                });
            }
        }
    }
    return remindersSent;
}

async function recordPayment(db: any, ownerId: string, guestId: string, amount: number, now: Date) {
    const ref = db.collection('users_data').doc(ownerId).collection('guests').doc(guestId);
    const guestDoc = await ref.get();
    const guest = guestDoc.data() as Guest;

    const creditEntry = {
        id: `pay-${now.getTime()}`,
        date: now.toISOString(),
        type: 'credit',
        description: `Payment of ₹${amount}`,
        amount: amount
    };

    const newLedger = [...(guest.ledger || []), creditEntry];
    const totalDebits = newLedger.filter((e: any) => e.type === 'debit').reduce((s: number, e: any) => s + e.amount, 0);
    const totalCredits = newLedger.filter((e: any) => e.type === 'credit').reduce((s: number, e: any) => s + e.amount, 0);
    const balance = totalDebits - totalCredits;

    let status: 'paid' | 'unpaid' | 'partial' = 'paid';
    if (balance > 0) {
        status = totalCredits > 0 ? 'partial' : 'unpaid';
    }

    await ref.update({
        ledger: newLedger,
        balance: balance,
        rentStatus: status
    });
    console.log(`[Payment] Recorded ₹${amount} for ${guest.name}. New Balance: ${balance}, Status: ${status}`);
}

async function runSimulation() {
    process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
    const db = await getAdminDb();

    console.log('--- STEP 1: CREATE TEST TENANTS ---');
    const ownerId = 'tester_owner';
    const pgId = 'tester_pg';
    const startDate = new Date('2026-04-01T10:00:00Z');

    // Cleanup previous test data
    const existingGuests = await db.collection('users_data').doc(ownerId).collection('guests').get();
    for (const d of existingGuests.docs) await d.ref.delete();

    await db.collection('users').doc(ownerId).set({ name: 'Tester Owner', role: 'owner' });
    await db.collection('users_data').doc(ownerId).collection('properties').doc(pgId).set({ name: 'Tester PG' });

    const tenantConfigs = [
        { id: 'tenant_a', name: 'Tenant A (Hour)', cycle: 'hours', rent: 1000, phone: '9100000001' },
        { id: 'tenant_b', name: 'Tenant B (Day)', cycle: 'days', rent: 5000, phone: '9100000002' },
        { id: 'tenant_c', name: 'Tenant C (Month)', cycle: 'months', rent: 7000, phone: '9100000003' }
    ];

    for (const config of tenantConfigs) {
        await db.collection('users_data').doc(ownerId).collection('guests').doc(config.id).set({
            id: config.id,
            name: config.name,
            phone: config.phone,
            rentAmount: config.rent,
            depositAmount: config.rent * 2,
            pgId,
            ownerId,
            isVacated: false,
            balance: 0,
            rentStatus: 'paid',
            rentCycleUnit: config.cycle,
            rentCycleValue: 1,
            moveInDate: startDate.toISOString(),
            dueDate: startDate.toISOString(),
            ledger: [],
            createdAt: startDate.getTime()
        });
    }

    console.log('--- STEP 2: RENT GENERATION VERIFICATION ---');
    let currentTime = addMinutes(startDate, 1);
    console.log(`Simulating Time: ${currentTime.toISOString()}`);
    await reconcileAllGuests(undefined, currentTime);

    for (const config of tenantConfigs) {
        const snap = await db.collection('users_data').doc(ownerId).collection('guests').doc(config.id).get();
        const guest = snap.data() as Guest;
        console.log(`Tenant ${config.id}: Balance=${guest.balance}, Status=${guest.rentStatus}`);
    }

    console.log('--- STEP 3: REMINDER TIMELINE TEST ---');
    const testTMinus3 = async () => {
        console.log('\n--- Testing T-3 Reminders ---');
        const tA_T3 = addMinutes(startDate, 57);
        console.log(`Checking Tenant A at ${tA_T3.toISOString()}`);
        await runReminderJob(db, tA_T3);

        const tB_T3 = addHours(addDays(startDate, 1), -3);
        console.log(`Checking Tenant B at ${tB_T3.toISOString()}`);
        await runReminderJob(db, tB_T3);

        const tC_T3 = addDays(new Date('2026-05-01T10:00:00Z'), -3);
        console.log(`Checking Tenant C at ${tC_T3.toISOString()}`);
        await runReminderJob(db, tC_T3);
    };
    await testTMinus3();

    console.log('\n--- STEP 7: CRON DUPLICATION TEST ---');
    const tA_T3 = addMinutes(startDate, 57);
    console.log(`Running reconciliation again for Tenant A at ${tA_T3.toISOString()} (Same window)`);
    await reconcileAllGuests(undefined, tA_T3);
    const snapA = await db.collection('users_data').doc(ownerId).collection('guests').doc('tenant_a').get();
    const guestA = snapA.data() as Guest;
    const debits = guestA.ledger.filter(e => e.type === 'debit').length;
    console.log(`Tenant A Debits: ${debits}`);
    if (debits > 1) console.error('❌ Duplicate rent generated!');

    console.log('\n--- STEP 5: PARTIAL PAYMENT TEST (Tenant B) ---');
    await recordPayment(db, ownerId, 'tenant_b', 2000, addHours(addDays(startDate, 1), -2));
    const snapB = await db.collection('users_data').doc(ownerId).collection('guests').doc('tenant_b').get();
    console.log(`Tenant B Status: ${snapB.data()?.rentStatus}`);

    console.log('\n--- STEP 4: PAYMENT INTERRUPTION TEST (Tenant A) ---');
    await recordPayment(db, ownerId, 'tenant_a', 1000, addMinutes(startDate, 58));
    const logsBefore = getWALogLength();
    await runReminderJob(db, addMinutes(startDate, 59));
    const logsAfter = getWALogLength();
    if (logsAfter > logsBefore) console.error('❌ Reminder sent after payment!');
    else console.log('✅ Reminder suppressed after payment.');

    console.log('\n--- STEP 8: MULTI-CYCLE CONSISTENCY ---');
    let simTime = addHours(startDate, 1);
    for (let i = 1; i <= 5; i++) {
        simTime = addMinutes(simTime, 1);
        await reconcileAllGuests(undefined, simTime);
        simTime = addHours(simTime, 1);
    }
    const finalA = (await db.collection('users_data').doc(ownerId).collection('guests').doc('tenant_a').get()).data() as Guest;
    console.log(`Tenant A Final: Ledger Entries=${finalA.ledger.length}, Balance=${finalA.balance}`);

    console.log('\n--- FINAL WHATSAPP LOG SUMMARY ---');
    if (fs.existsSync(waLogsPath)) console.log(fs.readFileSync(waLogsPath, 'utf8'));

    console.log('\n--- Simulation Complete ---');
}

runSimulation().catch(console.error);
