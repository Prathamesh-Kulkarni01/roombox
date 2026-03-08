/**
 * RentSutra — Owner Journey Simulation Audit
 * 
 * Verifies:
 * 1. Owner Profile Creation
 * 2. Property Hierarchy Generation (Bulk)
 * 3. Tenant Onboarding (Bed Assignment, Data Integrity)
 * 4. Rent Reminders & Ledger Accounting
 */

import * as admin from 'firebase-admin';
import { PropertyService } from '../src/services/propertyService';
import { TenantService } from '../src/services/tenantService';
import { getReminderForGuest } from '../src/lib/reminder-logic';
import { Guest } from '../src/lib/types';

// ─── Setup ───────────────────────────────────────────────────────────────────

if (!admin.apps.length) {
    admin.initializeApp({ projectId: 'roombox-test' });
}
const db = admin.firestore();

async function runAudit() {
    console.log('\n🚀 Starting Owner Journey Audit Simulation...');

    // 0. Cleanup previous runs for this phone
    console.log('--- Phase 0: Cleanup ---');
    const TARGET_PHONE = '7498526036';
    const oldGuests = await db.collectionGroup('guests').where('phone', 'in', [TARGET_PHONE, '+91' + TARGET_PHONE]).get();
    for (const doc of oldGuests.docs) {
        console.log(`Deleting old guest: ${doc.id}`);
        await doc.ref.delete();
    }
    const oldUsers = await db.collection('users').where('phone', 'in', [TARGET_PHONE, '+91' + TARGET_PHONE, '91' + TARGET_PHONE]).get();
    for (const doc of oldUsers.docs) {
        console.log(`Deleting old user: ${doc.id}`);
        await doc.ref.delete();
    }

    const TEST_OWNER_ID = `audit-owner-${Date.now()}`;
    const TEST_PG_ID = `audit-pg-${Date.now()}`;

    console.log(`👤 Test Owner ID: ${TEST_OWNER_ID}`);

    try {
        // --- 1. Property Creation (Bulk Setup) ---
        console.log('\n--- Phase 1: Property Setup ---');
        const pg = await PropertyService.createProperty(db, {
            ownerId: TEST_OWNER_ID,
            name: 'Audit Grand Heights',
            location: 'Sector 44, Gurgaon',
            city: 'Gurgaon',
            gender: 'unisex',
            autoSetup: false // We'll do bulk setup manually
        });
        console.log(`✅ Property Created: ${pg.name} (${pg.id})`);

        const hierarchy = await PropertyService.bulkSetupFloors(db, TEST_OWNER_ID, pg.id, {
            floors: 2,
            roomsPerFloor: 2,
            bedsPerRoom: 1,
            startFloorNumber: 1
        });
        console.log(`✅ Hierarchy Built: ${hierarchy.floorsCreated} Floors, ${hierarchy.roomsCreated} Rooms, ${hierarchy.bedsCreated} Beds`);

        const updatedPgSnap = await db.collection('users_data').doc(TEST_OWNER_ID).collection('pgs').doc(pg.id).get();
        const updatedPg = updatedPgSnap.data()!;
        const targetBedId = updatedPg.floors[0].rooms[0].beds[0].id;
        const targetRoomId = updatedPg.floors[0].rooms[0].id;
        const targetRoomName = updatedPg.floors[0].rooms[0].name;

        // --- 2. Tenant Onboarding ---
        console.log('\n--- Phase 2: Tenant Onboarding ---');
        const tenantInput = {
            ownerId: TEST_OWNER_ID,
            name: 'Audit Tenant',
            email: 'audit-tenant@example.com',
            phone: '7498526036',
            pgId: pg.id,
            pgName: pg.name,
            bedId: targetBedId,
            roomId: targetRoomId,
            roomName: targetRoomName,
            rentAmount: 12000,
            deposit: 24000,
            dueDate: new Date().toISOString(),
            joinDate: new Date().toISOString(),
            rentCycleUnit: 'months',
            rentCycleValue: 1
        };

        const guest = await TenantService.onboardTenant(db, db, tenantInput);
        console.log(`✅ Tenant Onboarded: ${guest.name} (${guest.id})`);

        // Final verify PG occupancy
        const finalPgSnap = await db.collection('users_data').doc(TEST_OWNER_ID).collection('pgs').doc(pg.id).get();
        console.log(`📊 PG Occupancy: ${finalPgSnap.data()?.occupancy}/${finalPgSnap.data()?.totalBeds}`);
        if (finalPgSnap.data()?.occupancy !== 1) throw new Error('Occupancy mismatch');

        // --- 3. Rent & Reminder Logic ---
        console.log('\n--- Phase 3: Rent & Reminder Logic ---');

        // Mocking a T-3 reminder check
        const threeDaysOut = new Date();
        threeDaysOut.setDate(threeDaysOut.getDate() + 3);
        const reminderT3 = getReminderForGuest(guest as unknown as Guest, new Date()); // Assuming guest.dueDate is today

        // Actually, guest.dueDate is today in our input.
        // Let's test against 3 days before due date.
        const mockNowT3 = new Date(new Date(guest.dueDate).getTime() - 3 * 24 * 60 * 60 * 1000);
        const resT3 = getReminderForGuest(guest as unknown as Guest, mockNowT3);
        console.log(`🔔 T-3 Reminder Check: ${resT3.shouldSend ? 'OK' : 'FAIL'} (${resT3.type})`);
        if (resT3.type !== 'T-3') throw new Error('T-3 Reminder type mismatch');

        const mockNowT0 = new Date(guest.dueDate);
        const resT0 = getReminderForGuest(guest as unknown as Guest, mockNowT0);
        console.log(`🔔 T0 Reminder Check: ${resT0.shouldSend ? 'OK' : 'FAIL'} (${resT0.type})`);
        if (resT0.type !== 'T0') throw new Error('T0 Reminder type mismatch');

        // --- 4. Payment & Ledger ---
        console.log('\n--- Phase 4: Financial Operations ---');

        // Note: Rent charge is automatically generated upon onboarding by Reconciliation logic
        // (as dueDate is set to 'now' and the first cycle is triggered).

        // Record partial payment
        const payRes = await TenantService.recordPayment(db, {
            ownerId: TEST_OWNER_ID,
            guestId: guest.id,
            amount: 5000,
            paymentMode: 'UPI',
            notes: 'Partial rent'
        });
        console.log(`✅ Partial Payment Recorded: ₹5,000. New Balance: ₹${payRes.newBalance} (Status: ${payRes.guest.rentStatus})`);
        if (payRes.guest.rentStatus !== 'partial') throw new Error(`Rent status should be partial, got ${payRes.guest.rentStatus}`);
        if (payRes.newBalance !== 7000) throw new Error(`Balance should be 7000, got ${payRes.newBalance}`);

        // --- 5. Support & Feedback ---
        console.log('\n--- Phase 5: Operations ---');
        // Add a complaint
        const complaintId = `comp-${Date.now()}`;
        await db.collection('users_data').doc(TEST_OWNER_ID).collection('complaints').doc(complaintId).set({
            guestId: guest.id,
            guestName: guest.name,
            pgId: pg.id,
            category: 'maintenance',
            description: 'Fan not working in Audit Room',
            status: 'open',
            date: new Date().toISOString(),
            schemaVersion: 2
        });
        console.log(`✅ Complaint Logged: "Fan not working"`);

        // --- 6. Cleanup ---
        console.log('\n🧹 [SKIPPED] Cleaning up test data for tenant audit...');
        // await cleanup(TEST_OWNER_ID);
        console.log('✨ Audit Complete. Data seeded for Step 3.');

    } catch (err) {
        console.error('\n❌ Audit Failed:', err);
        // await cleanup(TEST_OWNER_ID);
        process.exit(1);
    }
}

async function cleanup(ownerId: string) {
    const guests = await db.collection('users_data').doc(ownerId).collection('guests').get();
    const pgs = await db.collection('users_data').doc(ownerId).collection('pgs').get();
    const complaints = await db.collection('users_data').doc(ownerId).collection('complaints').get();
    const staff = await db.collection('users_data').doc(ownerId).collection('staff').get();

    const batch = db.batch();
    guests.docs.forEach(d => batch.delete(d.ref));
    pgs.docs.forEach(d => batch.delete(d.ref));
    complaints.docs.forEach(d => batch.delete(d.ref));
    staff.docs.forEach(d => batch.delete(d.ref));
    batch.delete(db.collection('users_data').doc(ownerId));

    // Also cleanup skeleton users created by TenantService
    const users = await db.collection('users').where('ownerId', '==', ownerId).get();
    users.docs.forEach(d => batch.delete(d.ref));

    await batch.commit();
}

runAudit();
