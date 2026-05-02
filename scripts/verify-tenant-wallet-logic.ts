
process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
process.env.FIREBASE_AUTH_EMULATOR_HOST = 'localhost:9099';

import { getAdminDb } from '../src/lib/firebaseAdmin';
import { TenantService } from '../src/services/tenantService';
import { PRICING_CONFIG } from '../src/lib/constants';
import { Firestore } from 'firebase-admin/firestore';

let db: Firestore;

async function initDb() {
    db = await getAdminDb();
}

const TEST_OWNER_ID = `owner-${Date.now()}`;
const TEST_PG_ID = `pg-${Date.now()}`;
const TEST_BED_ID = `bed-${Date.now()}`;

type TestResult = { name: string; pass: boolean; reason?: string };
const results: TestResult[] = [];

function pass(name: string): void {
    results.push({ name, pass: true });
    console.log(`\x1b[32m[PASS]\x1b[0m ${name}`);
}

function fail(name: string, reason: string): void {
    results.push({ name, pass: false, reason });
    console.log(`\x1b[31m[FAIL]\x1b[0m ${name}`);
}

async function setupOwner(balance: number, planType: 'monthly' | 'yearly' = 'monthly') {
    await db.collection('users').doc(TEST_OWNER_ID).set({
        id: TEST_OWNER_ID,
        role: 'owner',
        wallet: { balance },
        subscription: { status: 'active', planId: 'pro' },
        billingConfig: {
            planType,
            baseFee: 200,
            perTenantFee: planType === 'yearly' ? 8 : 10
        }
    });
}

async function setupPg() {
    await db.collection('users_data').doc(TEST_OWNER_ID).collection('pgs').doc(TEST_PG_ID).set({
        id: TEST_PG_ID,
        name: 'Test PG',
        ownerId: TEST_OWNER_ID,
        occupancy: 0,
        totalBeds: 10,
        floors: [{
            id: 'f1', name: 'Floor 1',
            rooms: [{
                id: 'r1', name: '101',
                beds: [{ id: TEST_BED_ID, name: '1', guestId: null }]
            }]
        }]
    });
}

async function testOnboardingDeduction() {
    try {
        await setupOwner(100); // Start with 100
        await setupPg();

        await TenantService.onboardTenant(db, db, {
            ownerId: TEST_OWNER_ID,
            name: 'Tenant A',
            phone: '+919000000001',
            email: 'a@test.com',
            pgId: TEST_PG_ID,
            pgName: 'Test PG',
            bedId: TEST_BED_ID,
            rentAmount: 5000,
            deposit: 10000,
            joinDate: new Date().toISOString(),
        }, { userId: TEST_OWNER_ID, name: 'Owner', role: 'owner' });

        const ownerSnap = await db.collection('users').doc(TEST_OWNER_ID).get();
        const balance = ownerSnap.data()?.wallet?.balance;
        
        if (balance === 90) {
            pass('Tenant Onboarding Deduction (Monthly Plan: ₹10)');
        } else {
            fail('Tenant Onboarding Deduction', `Expected balance 90, got ${balance}`);
        }
    } catch (e: any) {
        fail('Tenant Onboarding Deduction', e.message);
    }
}

async function testEarlyVacationRefund() {
    try {
        await setupOwner(90);
        
        const joinDate = new Date();
        joinDate.setDate(joinDate.getDate() - 5);

        const guestId = `guest-${Date.now()}`;
        await db.collection('users_data').doc(TEST_OWNER_ID).collection('guests').doc(guestId).set({
            id: guestId,
            ownerId: TEST_OWNER_ID,
            name: 'Tenant B',
            joinDate: joinDate.toISOString(),
            isVacated: false,
            pgId: TEST_PG_ID,
            bedId: TEST_BED_ID,
            onboardingFeeDeducted: 10
        });

        // Vacate
        await TenantService.vacateTenant(db, TEST_OWNER_ID, guestId, { userId: TEST_OWNER_ID, name: 'Owner', role: 'owner' });

        const ownerSnap = await db.collection('users').doc(TEST_OWNER_ID).get();
        const balance = ownerSnap.data()?.wallet?.balance;

        if (balance === 100) {
            pass('Early Vacation Refund (< 10 days stay)');
        } else {
            fail('Early Vacation Refund', `Expected balance 100 (90 + 10 refund), got ${balance}`);
        }
    } catch (e: any) {
        fail('Early Vacation Refund', e.message);
    }
}

async function testLateVacationNoRefund() {
    try {
        await setupOwner(100);
        
        const joinDate = new Date();
        joinDate.setDate(joinDate.getDate() - 15);

        const guestId = `guest-late-${Date.now()}`;
        await db.collection('users_data').doc(TEST_OWNER_ID).collection('guests').doc(guestId).set({
            id: guestId,
            ownerId: TEST_OWNER_ID,
            name: 'Tenant C',
            joinDate: joinDate.toISOString(),
            isVacated: false,
            pgId: TEST_PG_ID,
            bedId: TEST_BED_ID
        });

        // Vacate
        await TenantService.vacateTenant(db, TEST_OWNER_ID, guestId, { userId: TEST_OWNER_ID, name: 'Owner', role: 'owner' });

        const ownerSnap = await db.collection('users').doc(TEST_OWNER_ID).get();
        const balance = ownerSnap.data()?.wallet?.balance;

        if (balance === 100) {
            pass('Late Vacation No Refund (> 10 days stay)');
        } else {
            fail('Late Vacation No Refund', `Expected balance 100, got ${balance}`);
        }
    } catch (e: any) {
        fail('Late Vacation No Refund', e.message);
    }
}

async function testYearlyPlanDeduction() {
    try {
        await setupOwner(100, 'yearly');
        await setupPg();

        await TenantService.onboardTenant(db, db, {
            ownerId: TEST_OWNER_ID,
            name: 'Tenant Yearly',
            phone: '+919000000003',
            email: 'y@test.com',
            pgId: TEST_PG_ID,
            pgName: 'Test PG',
            bedId: TEST_BED_ID,
            rentAmount: 5000,
            deposit: 10000,
            joinDate: new Date().toISOString(),
        }, { userId: TEST_OWNER_ID, name: 'Owner', role: 'owner' });

        const ownerSnap = await db.collection('users').doc(TEST_OWNER_ID).get();
        const balance = ownerSnap.data()?.wallet?.balance;

        if (balance === 92) {
            pass('Yearly Plan Deduction (₹8 instead of ₹10)');
        } else {
            fail('Yearly Plan Deduction', `Expected balance 92, got ${balance}`);
        }
    } catch (e: any) {
        fail('Yearly Plan Deduction', e.message);
    }
}

async function testRestrictionOnNegativeBalance() {
    try {
        await setupOwner(5, 'monthly');
        await setupPg();

        await TenantService.onboardTenant(db, db, {
            ownerId: TEST_OWNER_ID,
            name: 'Tenant Restrictor',
            phone: '+919000000004',
            email: 'r@test.com',
            pgId: TEST_PG_ID,
            pgName: 'Test PG',
            bedId: TEST_BED_ID,
            rentAmount: 5000,
            deposit: 10000,
            joinDate: new Date().toISOString(),
        }, { userId: TEST_OWNER_ID, name: 'Owner', role: 'owner' });

        const ownerSnap = await db.collection('users').doc(TEST_OWNER_ID).get();
        const data = ownerSnap.data();

        if (data?.wallet?.balance === -5 && data?.subscription?.status === 'restricted') {
            pass('Subscription Restricted on Negative Balance');
        } else {
            fail('Subscription Restricted', `Expected balance -5 and restricted status. Got balance ${data?.wallet?.balance} and status ${data?.subscription?.status}`);
        }
    } catch (e: any) {
        fail('Subscription Restricted', e.message);
    }
}

async function testTransferNoExtraDeduction() {
    try {
        await setupOwner(100);
        await setupPg();

        const guestId = `guest-transfer-${Date.now()}`;
        // Manually onboard a tenant with some deduction recorded
        await db.collection('users_data').doc(TEST_OWNER_ID).collection('guests').doc(guestId).set({
            id: guestId,
            ownerId: TEST_OWNER_ID,
            name: 'Tenant T',
            joinDate: new Date().toISOString(),
            isVacated: false,
            pgId: TEST_PG_ID,
            bedId: TEST_BED_ID,
            onboardingFeeDeducted: 10
        });

        const newPgId = `pg-new-${Date.now()}`;
        await db.collection('users_data').doc(TEST_OWNER_ID).collection('pgs').doc(newPgId).set({
            id: newPgId,
            name: 'New PG',
            ownerId: TEST_OWNER_ID,
            occupancy: 0,
            totalBeds: 5,
            floors: [{
                id: 'f1', name: 'Floor 1',
                rooms: [{
                    id: 'r1', name: '101',
                    beds: [{ id: 'bed-new', name: '1', guestId: null }]
                }]
            }]
        });

        // Perform transfer
        await TenantService.transferGuest(db, TEST_OWNER_ID, guestId, {
            newPgId,
            newBedId: 'bed-new',
            newRoomId: 'r1',
            newRoomName: '101',
            performer: { userId: TEST_OWNER_ID, name: 'Owner', role: 'owner' }
        });

        const ownerSnap = await db.collection('users').doc(TEST_OWNER_ID).get();
        const balance = ownerSnap.data()?.wallet?.balance;

        if (balance === 100) {
            pass('Multi-Property Transfer No Extra Deduction');
        } else {
            fail('Multi-Property Transfer No Extra Deduction', `Expected balance 100, got ${balance}`);
        }
    } catch (e: any) {
        fail('Multi-Property Transfer No Extra Deduction', e.message);
    }
}

async function main() {
    console.log('\n--- VERIFYING TENANT WALLET LOGIC ---\n');
    await initDb();
    
    await testOnboardingDeduction();
    await testEarlyVacationRefund();
    await testLateVacationNoRefund();
    await testYearlyPlanDeduction();
    await testRestrictionOnNegativeBalance();
    await testTransferNoExtraDeduction();

    console.log('\n--- RESULTS ---');
    results.forEach(r => {
        if (r.pass) console.log(`✅ ${r.name}`);
        else console.log(`❌ ${r.name}: ${r.reason}`);
    });

    const allPassed = results.every(r => r.pass);
    process.exit(allPassed ? 0 : 1);
}

main().catch(console.error);
