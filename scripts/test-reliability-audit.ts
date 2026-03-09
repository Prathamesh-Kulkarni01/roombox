import { getAdminDb } from '../src/lib/firebaseAdmin';
import { reconcileAllGuests, reconcileSingleGuest } from '../src/lib/actions/reconciliationActions';
import { getReminderForGuest } from '../src/lib/reminder-logic';
import { addMinutes, addHours, addDays, addMonths, format, parseISO, startOfDay, subSeconds } from 'date-fns';
import type { Guest } from '../src/lib/types';
import * as fs from 'fs';

// --- MOCKING & LOGGING ---
const auditLogPath = 'reliability-audit-results.txt';
if (fs.existsSync(auditLogPath)) fs.unlinkSync(auditLogPath);

function auditLog(section: string, message: string, isError = false) {
    const log = `[${section}] ${isError ? '❌' : '✅'} ${message}\n`;
    console.log(log.trim());
    fs.appendFileSync(auditLogPath, log);
}

const waLogsPath = 'wa-reliability-logs.txt';
if (fs.existsSync(waLogsPath)) fs.unlinkSync(waLogsPath);

function logWA(to: string, type: string, message: string) {
    fs.appendFileSync(waLogsPath, `[WA to ${to}][Type: ${type}] ${message}\n`);
}

// --- HELPERS ---

async function runReminderJob(db: any, ownerId: string, now: Date) {
    const guestsSnapshot = await db.collection('users_data').doc(ownerId).collection('guests')
        .where('isVacated', '==', false)
        .get();

    let sentCount = 0;
    for (const doc of guestsSnapshot.docs) {
        const guest = doc.data() as Guest;
        const reminder = getReminderForGuest(guest, now);
        if (reminder.shouldSend && reminder.type) {
            // Idempotency check
            if (guest.lastReminderType === reminder.type && guest.lastReminderSentAt) {
                const lastSent = new Date(guest.lastReminderSentAt);
                const diffMs = now.getTime() - lastSent.getTime();
                if (diffMs < 60000) continue;
            }

            logWA(guest.phone || 'no-phone', reminder.type, reminder.body);
            sentCount++;
            await doc.ref.update({
                lastReminderSentAt: now.toISOString(),
                lastReminderType: reminder.type
            });
        }
    }
    return sentCount;
}

async function recordPayment(db: any, ownerId: string, guestId: string, amount: number, now: Date) {
    const ref = db.collection('users_data').doc(ownerId).collection('guests').doc(guestId);
    const guest = (await ref.get()).data() as Guest;

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

    await ref.update({
        ledger: newLedger,
        balance: balance,
        rentStatus: balance <= 0 ? 'paid' : (totalCredits > 0 ? 'partial' : 'unpaid')
    });
}

// --- AUDIT STEPS ---

async function runAudit() {
    process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
    process.env.FIREBASE_PROJECT_ID = 'roombox-test';
    const db = await getAdminDb();
    const ownerId = 'reliability_auditor';
    const pgId = 'audit_pg';

    // Cleanup
    const guestsCol = db.collection('users_data').doc(ownerId).collection('guests');
    const existing = await guestsCol.get();
    for (const d of existing.docs) await d.ref.delete();

    auditLog('SETUP', 'Isolated environment initialized.');

    // --- STEP 1: TIMEZONE CONSISTENCY ---
    // Simulating offsets: IST (+5.5h)
    const baseTime = new Date('2026-06-01T10:00:00Z');

    // Tenant B (IST) - Due Date feels like it's 5.5 hours ahead of UTC
    // In our system, dueDate is ISO string (UTC).
    // If the due date is 2026-06-01T00:00:00Z (UTC), it's 5:30 AM IST.
    await guestsCol.doc('tenant_b_ist').set({
        id: 'tenant_b_ist', name: 'Tenant B (IST)', phone: '91222', rentAmount: 5000, pgId, ownerId,
        isVacated: false, balance: 0, rentStatus: 'paid', rentCycleUnit: 'days', rentCycleValue: 1,
        moveInDate: baseTime.toISOString(), dueDate: baseTime.toISOString(), ledger: [], createdAt: baseTime.getTime(),
        timezone: 'Asia/Kolkata'
    });

    // We verify if overdue detection works when we cross the UTC boundary
    // At June 2 10:01, it should have charged June 1 AND June 2 (Total 10000)
    const tB_DueOffset = addDays(baseTime, 1);
    await reconcileSingleGuest({ ownerId, guestId: 'tenant_b_ist', now: addMinutes(tB_DueOffset, 1) });
    const snapB = await guestsCol.doc('tenant_b_ist').get();
    if (snapB.data()?.balance === 10000) {
        auditLog('STEP 1', 'Reconciliation catches up both periods at boundary correctly.');
    } else {
        auditLog('STEP 1', `Reconciliation failed or over/under charged. Balance: ${snapB.data()?.balance}`, true);
    }

    // --- STEP 2: MID-CYCLE RENT CHANGE ---
    const tJoin = new Date('2026-07-01T10:00:00Z');
    await guestsCol.doc('tenant_rent_change').set({
        id: 'tenant_rent_change', name: 'Rent Change Test', phone: '91333', rentAmount: 7000, pgId, ownerId,
        isVacated: false, balance: 0, rentStatus: 'paid', rentCycleUnit: 'months', rentCycleValue: 1,
        moveInDate: tJoin.toISOString(), dueDate: tJoin.toISOString(), ledger: [], createdAt: tJoin.getTime()
    });

    // 1. Initial charge
    await reconcileSingleGuest({ ownerId, guestId: 'tenant_rent_change', now: addMinutes(tJoin, 1) });

    // 2. Change rent halfway
    await guestsCol.doc('tenant_rent_change').update({ rentAmount: 8000 });

    // 3. Verify current balance still 7000
    const snapRC1 = await guestsCol.doc('tenant_rent_change').get();
    if (snapRC1.data()?.balance === 7000) {
        auditLog('STEP 2', 'Current cycle balance unchanged by rent modification.');
    } else {
        auditLog('STEP 2', 'Current cycle balance corrupted by rent modification!', true);
    }

    // 4. Trigger next cycle
    const tNextMonth = addMonths(tJoin, 1);
    await reconcileSingleGuest({ ownerId, guestId: 'tenant_rent_change', now: addMinutes(tNextMonth, 1) });
    const snapRC2 = await guestsCol.doc('tenant_rent_change').get();
    if (snapRC2.data()?.balance === 15000) { // 7000 + 8000
        auditLog('STEP 2', 'Next cycle used updated rent amount correctly.');
    } else {
        auditLog('STEP 2', `Next cycle rent mismatch! Expected 15000, got ${snapRC2.data()?.balance}`, true);
    }

    // --- STEP 3: MID-CYCLE MOVE-OUT ---
    await guestsCol.doc('tenant_move_out').set({
        id: 'tenant_move_out', name: 'Move Out Test', phone: '91444', rentAmount: 1000, pgId, ownerId,
        isVacated: false, balance: 0, rentStatus: 'paid', rentCycleUnit: 'days', rentCycleValue: 1,
        moveInDate: baseTime.toISOString(), dueDate: baseTime.toISOString(), ledger: [], createdAt: baseTime.getTime()
    });

    // Vacate halfway
    await guestsCol.doc('tenant_move_out').update({ isVacated: true });

    // Try to reconcile next day
    await reconcileSingleGuest({ ownerId, guestId: 'tenant_move_out', now: addDays(baseTime, 2) });
    const snapMO = await guestsCol.doc('tenant_move_out').get();
    if (snapMO.data()?.balance === 0) {
        auditLog('STEP 3', 'Vacated tenant correctly ignored for future charges.');
    } else {
        auditLog('STEP 3', 'Vacated tenant was charged rent!', true);
    }

    // --- STEP 4: MID-CYCLE TENANT JOIN ---
    const tCycleStart = new Date('2026-08-01T00:00:00Z');
    const tJoinMid = addDays(tCycleStart, 15); // Joins 15 days late

    await guestsCol.doc('tenant_join_mid').set({
        id: 'tenant_join_mid', name: 'Join Mid Test', phone: '91777', rentAmount: 1000, pgId, ownerId,
        isVacated: false, balance: 0, rentStatus: 'paid', rentCycleUnit: 'months', rentCycleValue: 1,
        moveInDate: tJoinMid.toISOString(), dueDate: tJoinMid.toISOString(), ledger: [], createdAt: tJoinMid.getTime()
    });

    // 1. Reconcile at join time
    await reconcileSingleGuest({ ownerId, guestId: 'tenant_join_mid', now: addMinutes(tJoinMid, 1) });
    const snapJoin1 = await guestsCol.doc('tenant_join_mid').get();

    // 2. Reconcile at next cycle start (Sept 1)
    const tNextCycle = addMonths(tCycleStart, 1);
    await reconcileSingleGuest({ ownerId, guestId: 'tenant_join_mid', now: addMinutes(tNextCycle, 1) });
    const snapJoin2 = await guestsCol.doc('tenant_join_mid').get();

    // Since they joined Aug 15, the Sept 1 reconcile should NOT have triggered a new charge yet (next is Sept 15)
    if (snapJoin2.data()?.balance === 1000) {
        auditLog('STEP 4', 'Mid-cycle join: Tenant not double-charged at natural month boundary.');
    } else {
        auditLog('STEP 4', `Mid-cycle join charge error! Expected 1000, got ${snapJoin2.data()?.balance}`, true);
    }

    // --- STEP 4.5: LOCALIZED REMINDER ---
    const tReminder = new Date('2026-09-01T05:00:00Z'); // 10:30 AM IST
    await guestsCol.doc('tenant_localized_reminder').set({
        id: 'tenant_localized_reminder', name: 'Localized Reminder Test', phone: '91888', rentAmount: 5000, pgId, ownerId,
        isVacated: false, balance: 5000, rentStatus: 'unpaid', rentCycleUnit: 'months', rentCycleValue: 1,
        moveInDate: tReminder.toISOString(), dueDate: tReminder.toISOString(), ledger: [{ type: 'debit', amount: 5000, date: tReminder.toISOString() }], createdAt: tReminder.getTime(),
        timezone: 'Asia/Kolkata'
    });

    // Simulate running the reminder job at 10:30 AM IST (which is 5:00 AM UTC)
    // This should trigger a 'due' reminder.
    const tCheck = addMinutes(tReminder, 1);
    const sentLocalized = await runReminderJob(db, ownerId, tCheck);
    if (sentLocalized >= 1) {
        auditLog('STEP 4.5', 'Localized reminder sent correctly based on guest timezone.');
    } else {
        auditLog('STEP 4.5', 'Localized reminder failed to send or sent incorrectly.', true);
    }


    // --- STEP 5: RACE CONDITION (Payment vs Reminder) ---
    await guestsCol.doc('tenant_race').set({
        id: 'tenant_race', name: 'Race Test', phone: '91555', rentAmount: 1000, pgId, ownerId,
        isVacated: false, balance: 1000, rentStatus: 'unpaid', rentCycleUnit: 'days', rentCycleValue: 1,
        moveInDate: baseTime.toISOString(), dueDate: baseTime.toISOString(), ledger: [{ type: 'debit', amount: 1000, date: baseTime.toISOString() }], createdAt: baseTime.getTime()
    });

    // 1. Record payment
    await recordPayment(db, ownerId, 'tenant_race', 1000, baseTime);

    // 2. Immediately run reminder
    const sent = await runReminderJob(db, ownerId, baseTime);
    if (sent === 0) {
        auditLog('STEP 5', 'Reminder suppressed for guest who just paid.');
    } else {
        auditLog('STEP 5', 'Reminder sent to a paid tenant! Race condition risk detected.', true);
    }

    // --- STEP 6: CRON FAILURE RECOVERY ---
    // Target: Miss one day window
    const tResume = addMinutes(addDays(baseTime, 2), 1);
    await reconcileSingleGuest({ ownerId, guestId: 'tenant_b_ist', now: tResume });
    const snapFail = await guestsCol.doc('tenant_b_ist').get();
    // It should have caught up for June 1, June 2, June 3 (if T+2 days passed)
    // June 1 10:00 (Start)
    // June 2 10:00 (Due)
    // June 3 10:00 (Due)
    // Now is June 3 10:01
    if (snapFail.data()?.balance === 15000) {
        auditLog('STEP 6', 'System caught up on missed cycles correctly.');
    } else {
        auditLog('STEP 6', `Catch-up failed. Expected 15000, got ${snapFail.data()?.balance}`, true);
    }

    // --- STEP 7: 12 MONTH CONSISTENCY ---
    let tMonth = new Date('2026-01-01T10:00:00Z');
    await guestsCol.doc('tenant_long').set({
        id: 'tenant_long', name: 'Long Term Test', phone: '91666', rentAmount: 1000, pgId, ownerId,
        isVacated: false, balance: 0, rentStatus: 'paid', rentCycleUnit: 'months', rentCycleValue: 1,
        moveInDate: tMonth.toISOString(), dueDate: tMonth.toISOString(), ledger: [], createdAt: tMonth.getTime()
    });

    for (let i = 0; i < 12; i++) {
        tMonth = addMonths(tMonth, 1);
        await reconcileSingleGuest({ ownerId, guestId: 'tenant_long', now: addMinutes(tMonth, 1) });
    }
    const snapLong = await guestsCol.doc('tenant_long').get();
    // Starts Jan 1 (charged for Jan)
    // Iteration 0: Feb 1 (charged for Feb) ...
    // Iteration 11: Jan 1 Next Year (charged for Jan Next Year)
    // Total 13 charges is correct for prepaid coverage of 13 cycles.
    if (snapLong.data()?.balance === 13000) {
        auditLog('STEP 7', '12-month simulation: Mathematics remain consistent (13 charges for Jan-Jan prepaid).');
    } else {
        auditLog('STEP 7', `Drift detected after 12 months! Expected 13000, got ${snapLong.data()?.balance}`, true);
    }

    console.log('\n--- AUDIT COMPLETE ---');
    console.log('Summary saved to reliability-audit-results.txt');
}

runAudit().catch(console.error);
