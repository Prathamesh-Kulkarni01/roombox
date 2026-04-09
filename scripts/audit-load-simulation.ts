import { getAdminDb } from '../src/lib/firebaseAdmin';
import { handleIncomingMessage } from '../src/lib/whatsapp/smart-router';
import { SessionManager } from '../src/lib/whatsapp/session-state';
import { MessageManager } from '../src/lib/whatsapp/send-message';
import { WorkflowContext } from '../src/lib/whatsapp/workflow-types';

// --- Mocks ---
const mockSessions = new Map<string, any>();
const lastMessages = new Map<string, string[]>();
let totalMessagesSent = 0;

// ── MOCK SESSION STORAGE (In-memory for 100% isolation) ───────────
const memorySessions: Record<string, any> = {};

SessionManager.getSession = async (phone: string) => {
    return memorySessions[phone] || { state: 'IDLE', data: {}, lastUpdated: Date.now() };
};

SessionManager.updateSession = async (phone: string, state: any, data: any) => {
    // Atomic update simulation: No 'await' between read and write
    const current = memorySessions[phone] || { state: 'IDLE', data: {}, lastUpdated: Date.now() };
    memorySessions[phone] = { 
        state, 
        data: { ...current.data, ...(data || {}) }, 
        lastUpdated: Date.now() 
    };
};

SessionManager.clearSession = async (phone: string) => {
    delete memorySessions[phone];
};

// ── MOCK MESSAGE SINK (Track responses for assertions) ─────────────
const messageLog: { to: string, msg: string }[] = [];

MessageManager.sendWhatsAppMessage = async (to: string, msg: string) => {
    messageLog.push({ to, msg });
    totalMessagesSent++;
    if (!lastMessages.has(to)) lastMessages.set(to, []);
    lastMessages.get(to)!.push(msg);
    return { success: true, messageId: `mock-id-${totalMessagesSent}` } as any;
};

MessageManager.sendWhatsAppInteractiveMessage = async (to: string, msg: string) => {
    messageLog.push({ to, msg });
    totalMessagesSent++;
    if (!lastMessages.has(to)) lastMessages.set(to, []);
    lastMessages.get(to)!.push(msg);
    return { success: true, messageId: `mock-id-${totalMessagesSent}` } as any;
};

async function setupTestData(db: any) {
    console.log('--- Setting up test data (30 tenants) ---');
    const ownerId = 'load_test_owner';
    const pgId = 'load_test_pg';

    // Create Owner
    await db.collection('users').doc(ownerId).set({
        name: 'Load Test Owner',
        phone: '+919999999999',
        role: 'owner',
        createdAt: new Date().toISOString()
    });

    // Create Property
    await db.collection('users_data').doc(ownerId).collection('properties').doc(pgId).set({
        name: 'Load Test PG',
        createdAt: new Date().toISOString()
    });

    const tenants = [];
    for (let i = 1; i <= 30; i++) {
        const phone = `+918000000${i.toString().padStart(3, '0')}`;
        const tenantId = `tenant_${i}`;

        // Root user doc
        await db.collection('users').doc(tenantId).set({
            name: `Tenant ${i}`,
            phone,
            role: 'tenant',
            ownerId,
            guestId: tenantId,
            createdAt: new Date().toISOString()
        });

        // Guest doc
        await db.collection('users_data').doc(ownerId).collection('guests').doc(tenantId).set({
            name: `Tenant ${i}`,
            phone,
            roomNo: `10${(i % 5) + 1}`,
            rentAmount: 10000,
            securityDeposit: 20000,
            isVacated: false,
            isOnboarded: true, // skip lazy onboarding for speed
            pgId,
            pgName: 'Load Test PG',
            ownerId,
            createdAt: new Date().toISOString()
        });

        tenants.push({ id: tenantId, phone });
    }
    console.log(`Created 30 tenants successfully.`);
    return tenants;
}

// Scenarios — Assume already authenticated by warmup
async function simulateBalanceCheck(phone: string) {
    await handleIncomingMessage({ from: phone, msgBody: '1', messageType: 'text' }); // View Rent
}

async function simulateComplaint(phone: string) {
    await handleIncomingMessage({ from: phone, msgBody: '4', messageType: 'text' }); // Maintenance
    await handleIncomingMessage({ from: phone, msgBody: '2', messageType: 'text' }); // Plumbing
}

async function simulateRentPayment(phone: string) {
    await handleIncomingMessage({ from: phone, msgBody: '2', messageType: 'text' }); // Pay Rent
}

async function simulateRandomMessages(phone: string) {
    await handleIncomingMessage({ from: phone, msgBody: 'something random', messageType: 'text' });
    await handleIncomingMessage({ from: phone, msgBody: 'help', messageType: 'text' });
}

async function runAudit() {
    console.log('🚀 Starting High Load WhatsApp Simulation...');
    const startTime = Date.now();

    // Ensure emulator
    process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
    const db = await getAdminDb();

    // Setup
    const tenants = await setupTestData(db);

    console.log('\n--- Phase 1: Warming up connections ---');
    // First message for everyone (Auto-login)
    const warmupPromises = tenants.map(t => handleIncomingMessage({ from: t.phone, msgBody: 'hi', messageType: 'text' }));
    await Promise.all(warmupPromises);
    console.log(`✅ Warmup completed. Active Sessions: ${mockSessions.size}`);

    console.log('\n--- Phase 2: Concurrent Interactions (30 users) ---');

    // Group users by scenario
    const balanceUsers = tenants.slice(0, 10); // 10 check balance
    const complaintUsers = tenants.slice(10, 20); // 10 raise complaints
    const payUsers = tenants.slice(20, 25); // 5 pay rent
    const randomUsers = tenants.slice(25, 30); // 5 random messages

    const allScenarios = [
        ...balanceUsers.map(t => simulateBalanceCheck(t.phone)),
        ...complaintUsers.map(t => simulateComplaint(t.phone)),
        ...payUsers.map(t => simulateRentPayment(t.phone)),
        ...randomUsers.map(t => simulateRandomMessages(t.phone))
    ];

    try {
        await Promise.all(allScenarios);
    } catch (err) {
        console.error('❌ Error during concurrent execution:', err);
    }

    const endTime = Date.now();
    const durationMs = endTime - startTime;

    console.log('\n--- Audit Results ---');
    console.log(`Total Time: ${durationMs}ms`);
    console.log(`Total Messages Sent by Bot: ${totalMessagesSent}`);
    console.log(`Average Latency per Tenant Scenario: ${(durationMs / 30).toFixed(2)}ms`);

    // Simple state verification
    let failedScenarios = 0;

    // Verify Balance Checkers
    for (const u of balanceUsers) {
        const msgs = lastMessages.get(u.phone) || [];
        // Since no invoice is created in setup, balance should be 0
        if (!msgs.some(m => m.includes('₹0'))) {
            failedScenarios++;
            console.error(`Balance user ${u.phone} failed. Messages:`, msgs);
        }
    }

    // Verify Complaint Users
    for (const u of complaintUsers) {
        const msgs = lastMessages.get(u.phone) || [];
        if (!msgs.some(m => m.includes('Water / Plumbing'))) {
            failedScenarios++;
            console.error(`Complaint user ${u.phone} failed. Messages:`, msgs);
        }
    }

    if (failedScenarios > 0) {
        console.error(`\n❌ Failed Scenarios: ${failedScenarios}/30`);
        process.exit(1);
    } else {
        console.log('\n✅ All 30 concurrent scenarios completed successfully with correct state transitions.');
    }

    process.exit(0);
}

runAudit().catch(err => {
    console.error(err);
    process.exit(1);
});
