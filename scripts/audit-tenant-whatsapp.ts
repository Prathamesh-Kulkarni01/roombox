/**
 * Tenant WhatsApp Journey Audit Simulation
 * 
 * Simulates a tenant interacting with the RoomBox WhatsApp Bot.
 * Verifies:
 *  1. Auto-login via phone number
 *  2. Lazy Onboarding flow (Name/Terms)
 *  3. Tenant Portal navigation and balance check
 *  4. Complaint logging
 */

import { getAdminDb } from '../src/lib/firebaseAdmin';
import { workflowEngine } from '../src/lib/whatsapp/workflow-engine';
import { handleIncomingMessage } from '../src/lib/whatsapp/smart-router';
import * as sessionState from '../src/lib/whatsapp/session-state';
import * as sendMessage from '../src/lib/whatsapp/send-message';

// --- Mocks ---
const mockSessions = new Map<string, any>();
const lastMessages = new Map<string, string[]>();

// Override session state functions
(sessionState as any).getSession = async (phone: string) => {
    return mockSessions.get(phone) || { state: 'IDLE', data: {}, lastUpdated: Date.now() };
};

(sessionState as any).updateSession = async (phone: string, state: string, data: any) => {
    const current = mockSessions.get(phone) || { state: 'IDLE', data: {}, lastUpdated: Date.now() };
    mockSessions.set(phone, {
        state,
        data: { ...current.data, ...data },
        lastUpdated: Date.now()
    });
};

(sessionState as any).clearSession = async (phone: string) => {
    mockSessions.delete(phone);
};

// Override send message function
(sendMessage as any).sendWhatsAppMessage = async (phone: string, text: string) => {
    console.log(`\n[BOT -> ${phone}]:\n${text}\n-------------------`);
    if (!lastMessages.has(phone)) lastMessages.set(phone, []);
    lastMessages.get(phone)!.push(text);
    return { messaging_product: 'whatsapp', contacts: [], messages: [{ id: 'mock-id' }] };
};

async function runAudit() {
    console.log('🚀 Starting Tenant WhatsApp Journey Audit...');

    // Ensure we are talking to the emulator
    process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
    const db = await getAdminDb();

    // 1. Find the test tenant created in Step 2
    console.log('--- Phase 1: Context Discovery ---');
    const TARGET_PHONE = '7498526036';
    const guestSnap = await db.collectionGroup('guests')
        .where('phone', 'in', [TARGET_PHONE, '+91' + TARGET_PHONE])
        .orderBy('createdAt', 'desc')
        .limit(1)
        .get();
    if (guestSnap.empty) {
        throw new Error(`Could not find tenant with phone ${TARGET_PHONE}. Please run audit-owner-journey.ts first.`);
    }
    const guestDoc = guestSnap.docs[0];
    const guestData = guestDoc.data();
    const phone = guestData.phone; // standardized e.g., "+917498526035"
    const guestId = guestDoc.id;

    console.log(`✅ Found Tenant: ${guestData.name} (${phone})`);
    console.log(`📍 Path: ${guestDoc.ref.path}`);
    console.log(`💰 Data:`, JSON.stringify(guestData, null, 2));
    console.log(`📍 Location: ${guestData.pgName}, Room ${guestData.roomNo}`);

    // 2. Initial Contact & Auto-Login
    console.log('\n--- Phase 2: First Contact & Auto-Login ---');
    await handleIncomingMessage({ from: phone, msgBody: 'hi', messageType: 'text' });

    // Verify auto-login and lazy onboarding trigger
    const session = await sessionState.getSession(phone);
    if (!session.data.isAuthenticatedTenant) throw new Error('Tenant failed to auto-login!');
    console.log('✅ Auto-login successful.');

    const lastMsg = lastMessages.get(phone)!.pop();
    if (!lastMsg!.includes('Welcome to RoomBox')) throw new Error('Missing welcome message!');
    if (!lastMsg!.includes('full name')) throw new Error('Lazy onboarding did not trigger (missing Name prompt)!');
    console.log('✅ Lazy Onboarding triggered correctly.');

    // 3. Complete Lazy Onboarding
    console.log('\n--- Phase 3: Completing Onboarding ---');
    // Current Step: welcomeAndName
    await handleIncomingMessage({ from: phone, msgBody: 'skip', messageType: 'text' });
    console.log('✅ Name confirmed (skipped).');

    // Current Step: askEmail
    await handleIncomingMessage({ from: phone, msgBody: 'skip', messageType: 'text' });
    console.log('✅ Email collected (skipped).');

    // Current Step: askKycPhoto
    await handleIncomingMessage({ from: phone, msgBody: 'skip', messageType: 'text' });
    console.log('✅ Photo collected (skipped).');

    // Current Step: askKycAadhaar
    await handleIncomingMessage({ from: phone, msgBody: 'skip', messageType: 'text' });
    console.log('✅ Aadhaar collected (skipped).');

    // Current Step: finishOnboarding
    // Verify Firestore 'isOnboarded' status
    const updatedGuest = await guestDoc.ref.get();
    if (updatedGuest.data()?.isOnboarded !== true) throw new Error('Firestore: isOnboarded flag not set to true!');
    console.log('✅ Onboarding completed and persisted in Firestore.');

    // 4. Information Retrieval (Balance Check)
    console.log('\n--- Phase 4: Checking Balance ---');
    // Send "Menu" to move from finishOnboarding to tenantPortal
    await handleIncomingMessage({ from: phone, msgBody: 'Menu', messageType: 'text' });

    // Option 1: View Rent Details
    await handleIncomingMessage({ from: phone, msgBody: '1', messageType: 'text' });

    const balanceMsg = lastMessages.get(phone)!.pop();
    console.log(`Balance Message Received: ${balanceMsg}`);
    if (!balanceMsg!.includes('7000')) throw new Error('Incorrect balance displayed! Expected 7000.');
    console.log('✅ Balance check verified accurately.');

    // 5. Support Flow (Raise Complaint)
    console.log('\n--- Phase 5: Raising a Complaint ---');
    // Go back to menu
    await handleIncomingMessage({ from: phone, msgBody: 'Menu', messageType: 'text' });
    // Option 4: Maintenance Request (based on tenantPortal menu)
    await handleIncomingMessage({ from: phone, msgBody: '4', messageType: 'text' });
    // Category: Water / Plumbing (Option 2)
    await handleIncomingMessage({ from: phone, msgBody: '2', messageType: 'text' });

    // In this workflow, maintenanceConfirmed is a display step that doesn't take input for description.
    // It just confirms the category.
    const maintenanceMsg = lastMessages.get(phone)!.pop();
    if (!maintenanceMsg!.includes('Water / Plumbing')) throw new Error('Maintenance request failed or incorrect category!');
    console.log('✅ Maintenance request flow verified.');

    // 6. Payment Link
    console.log('\n--- Phase 6: Payment Link ---');
    await handleIncomingMessage({
        from: phone,
        msgBody: 'Menu', // Return to menu from maintenanceConfirmed
        messageType: 'text'
    });
    await handleIncomingMessage({
        from: phone,
        msgBody: '2', // Pay Rent
        messageType: 'text'
    });

    const payMsg = lastMessages.get(phone)!.pop();
    console.log(`Payment Message Received: ${payMsg}`);
    if (!payMsg!.includes('https://roombox.netlify.app/tenant/pay')) {
        throw new Error('Incorrect payment link displayed!');
    }
    console.log('✅ Payment link verified.');

    // 7. Exit Request (Give Notice)
    console.log('\n--- Phase 7: Exit Request (Give Notice) ---');
    await handleIncomingMessage({
        from: phone,
        msgBody: 'Menu',
        messageType: 'text'
    });
    await handleIncomingMessage({
        from: phone,
        msgBody: '6', // Give Notice
        messageType: 'text'
    });

    const noticePrompt = lastMessages.get(phone)!.pop();
    console.log(`Notice Prompt: ${noticePrompt}`);
    if (!noticePrompt!.includes('30-day notice')) {
        throw new Error('Give Notice prompt not shown correctly!');
    }

    await handleIncomingMessage({
        from: phone,
        msgBody: '1', // Confirm Notice
        messageType: 'text'
    });

    const noticeConfirmMsg = lastMessages.get(phone)!.pop();
    console.log(`Notice Confirmation: ${noticeConfirmMsg}`);
    if (!noticeConfirmMsg!.includes('Notice Recorded Successfully')) {
        throw new Error('Notice confirmation message not shown!');
    }

    // Verify in Firestore
    const updatedGuestAfterNotice = await guestDoc.ref.get();
    const guestDataAfterNotice = updatedGuestAfterNotice.data();
    if (guestDataAfterNotice?.onNotice !== true) {
        throw new Error('onNotice flag not updated in Firestore!');
    }
    console.log('✅ Exit request flow verified and persisted.');

    console.log('\n✨ Tenant WhatsApp Journey Audit Complete. ALL PHASES PASSED.');
}

runAudit().catch(err => {
    console.error('\n❌ Audit Failed:', err);
    process.exit(1);
});
