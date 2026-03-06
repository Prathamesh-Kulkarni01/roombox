import { sendWhatsAppMessage, sendWhatsAppInteractiveMessage } from './send-message';
import { generateUpiIntentLink } from './upi-intent';
import { getSession, updateSession, clearSession } from './session-state';
import { ADD_TENANT_FORM } from './form-config';
import { getAdminDb } from '@/lib/firebaseAdmin';
import * as crypto from 'crypto';

// Mock DB for Registered Users
const MOCK_DB = {
    owners: ['917498526035', '9999', '1234'],
    tenants: ['1111', '2222']
};

export async function handleIncomingMessage(data: any) {
    const { from, msgBody, messageType, rawData } = data;
    const text = msgBody?.trim() || '';
    const lowerText = text.toLowerCase();

    console.log(`Analyzing message from ${from}...`);

    const session = getSession(from);

    // --- LOGGED IN USER ROUTING ---
    if (session.data?.isAuthenticatedOwner) {
        await handleOwnerLogic(from, text, session);
        return;
    }

    if (session.data?.isAuthenticatedTenant) {
        await handleTenantLogic(from, text, session);
        return;
    }

    // --- AUTHENTICATION & ENTRY FLOW ---
    if (session.state !== 'IDLE') {
        await handleAuthActiveState(from, text, session);
        return;
    }

    // 2. Base Entry (IDLE State)
    if (lowerText === 'hi' || lowerText === 'hello' || lowerText === 'menu') {
        const adminDb = await getAdminDb();
        let matchedOwner: any = null;
        let matchedOwnerId: string | null = null;

        let formattedPhone = from.replace(/\\D/g, '');
        if (formattedPhone.startsWith('91') && formattedPhone.length === 12) {
            formattedPhone = formattedPhone.substring(2); // Remove 91 for standard 10 digit check if that's how it's stored
        }

        try {
            // First check with country code (which is how WhatsApp sends it, e.g. 91xxxxxxxxxx)
            const ownersSnapshot = await adminDb.collection('users')
                .where('role', '==', 'owner')
                .where('phone', '==', from.replace(/\\D/g, ''))
                .get();

            if (!ownersSnapshot.empty) {
                matchedOwner = ownersSnapshot.docs[0].data();
                matchedOwnerId = ownersSnapshot.docs[0].id;
            } else {
                // Also check without country code just in case
                if (formattedPhone.length === 10) {
                    const ownersLocalSnapshot = await adminDb.collection('users')
                        .where('role', '==', 'owner')
                        .where('phone', '==', formattedPhone)
                        .get();

                    if (!ownersLocalSnapshot.empty) {
                        matchedOwner = ownersLocalSnapshot.docs[0].data();
                        matchedOwnerId = ownersLocalSnapshot.docs[0].id;
                    }
                }
            }
        } catch (err) {
            console.error("Firestore Error checking phone:", err);
        }

        if (matchedOwner) {
            // AUTO LOGIN 🪄
            updateSession(from, 'IDLE', {
                isAuthenticatedOwner: true,
                ownerName: matchedOwner.name || 'Owner',
                ownerId: matchedOwnerId
            });
            await sendWhatsAppMessage(from, `✅ *Login Successful*\n\nWelcome back, ${matchedOwner.name || 'Owner'}!`);
            await showOwnerMenu(from);
            return;
        }

        // If not matched directly on "hi", show the fallback menu
        updateSession(from, 'AWAITING_USER_ROLE');
        const msg = `Welcome to RentSutra 🏠\n\nWho are you?\n\n1️⃣ Property Owner / PG Owner\n2️⃣ Tenant\n3️⃣ New User (Register)\n4️⃣ Support`;
        await sendWhatsAppMessage(from, msg);
    } else {
        await sendWhatsAppMessage(from, `Welcome to RentSutra 🏠\n\nReply *Hi* to get started.`);
    }
}

// --- AUTHENTICATION HANDLERS ---
async function handleAuthActiveState(to: string, text: string, session: any) {
    if (text.toLowerCase() === 'cancel') {
        clearSession(to);
        await sendWhatsAppMessage(to, "❌ Login cancelled. Reply *Hi* to start over.");
        return;
    }

    switch (session.state) {
        case 'AWAITING_USER_ROLE':
            if (text === '1') {
                // If they reached here, the auto-login failed.
                clearSession(to);
                await sendWhatsAppMessage(to, "❌ Your number is not registered as an Owner.\n\nPlease login to the RentSutra App and navigate to *Settings* to add and verify your WhatsApp number.\n\nDashboard Link: https://roombox.app/dashboard/settings\n\nOnce verified, just say *Hi* here and you will be logged in automatically! 🪄");
            } else if (text === '2') {
                // Simplified tenant login for now
                updateSession(to, 'IDLE', { isAuthenticatedTenant: true });
                await sendWhatsAppMessage(to, "✅ Login Successful!\n\nWelcome to RentSutra Tenant Portal.");
                await showTenantMenu(to);
            } else {
                await sendWhatsAppMessage(to, "Coming soon! Please reply *1* for Owner or *2* for Tenant, or *Cancel* to exit.");
            }
            break;

        default:
            clearSession(to);
            await sendWhatsAppMessage(to, "Session reset. Reply *Hi* to begin.");
    }
}

// --- OWNER LOGIC ---
async function handleOwnerLogic(to: string, text: string, session: any) {
    const lowerText = text.toLowerCase();

    // 1. Handle Active Multi-Step States
    if (session.state !== 'IDLE') {
        await handleOwnerActiveState(to, text, session);
        return;
    }

    // 2. Handle Menu Routing
    if (lowerText === 'hi' || lowerText === 'menu') {
        await showOwnerMenu(to);
    } else if (lowerText === '1') {
        const buildings = `*Your Buildings (PGs)*\n\n1. Sai PG - Wakad (10/12 Occupied)\n2. Ganesh PG - Hinjewadi (45/50 Occupied)\n3. Add New Property\n\nReply with a number to view PG details.`;
        await sendWhatsAppMessage(to, buildings);
    } else if (lowerText === '2') {
        const todayPayments = `*Today's Payments*\n\nTotal Collected Today: ₹14,500\n\nTenants:\n1️⃣ Rahul Sharma - ₹6,000\n2️⃣ Amit Patil - ₹4,500\n3️⃣ Neha Joshi - ₹4,000\n\nOptions:\n1 View Payment Details\n2 Download Report\n3 Back to Menu`;
        await sendWhatsAppMessage(to, todayPayments);
    } else if (lowerText === '3') {
        const monthly = `*This Month Rent Collected*\n\nTotal Expected: ₹1,20,000\nCollected: ₹92,000\nPending: ₹28,000\n\nActions:\n1 View Collected Tenants\n2 View Pending Tenants\n3 Send Reminder to All Pending`;
        await sendWhatsAppMessage(to, monthly);
    } else if (lowerText === '4') {
        const pending = `*Pending Rent List*\n\n1️⃣ Rohan Patil - ₹6000 - Due 3 Days\n2️⃣ Aman Singh - ₹5000 - Due Today\n3️⃣ Priya Kulkarni - ₹7000 - Late 2 Days\n\nReply *Menu* to return.`;
        await sendWhatsAppMessage(to, pending);
    } else if (lowerText === '5') {
        await sendWhatsAppMessage(to, "Select Tenant to send reminder:\n1️⃣ Rohan Patil\n2️⃣ Aman Singh\n3️⃣ All Pending Tenants");
    } else if (lowerText === '6' || lowerText === 'add tenant') {
        updateSession(to, 'SELECTING_PG');
        await sendWhatsAppMessage(to, "Let's Onboard a New Tenant. Select Property:\n1️⃣ Sai PG\n2️⃣ Ganesh PG\n\nReply with the PG name or ID.");
    } else if (lowerText === '7') {
        // Lifecycle
        await sendWhatsAppMessage(to, "*Tenant Lifecycle Management*\n\nSelect Tenant:\n1️⃣ Rahul Sharma\n2️⃣ Neha Joshi\n3️⃣ Amit Patil");
    } else if (lowerText === '8') {
        await sendWhatsAppMessage(to, "📊 *Reports & Analytics*\n1 Daily Collection\n2 Monthly Collection\n3 Occupancy Rate\n4 Pending Rent Summary\n5 Property Performance");
    } else if (lowerText === '9') {
        const token = crypto.randomBytes(20).toString('hex'); // Mock token generation
        await sendWhatsAppMessage(to, `🔐 *Secure Dashboard Login*\n\nTap here to open your RentSutra Dashboard settings directly:\nhttps://roombox.app/login/magic?token=${token}\n\n_Link expires in 15 minutes._`);
    } else {
        await sendWhatsAppMessage(to, `Reply *Menu* to see all options.`);
    }
}

async function handleOwnerActiveState(to: string, text: string, session: any) {
    if (text.toLowerCase() === 'cancel') {
        updateSession(to, 'IDLE');
        await sendWhatsAppMessage(to, "❌ Operation cancelled. Reply *Menu* to start over.");
        return;
    }

    switch (session.state) {
        case 'SELECTING_PG':
            updateSession(to, 'SELECTING_ROOM', { selectedPg: text });
            await sendWhatsAppMessage(to, `Selected Property *${text}*. Now, which *Room* are they moving into? (e.g. 101)`);
            break;

        case 'SELECTING_ROOM':
            updateSession(to, 'SELECTING_BED', { ...session.data, selectedRoom: text });
            await sendWhatsAppMessage(to, `Room *${text}*. Which *Bed*? (e.g. B1)`);
            break;

        case 'SELECTING_BED':
            const startState = {
                ...session.data,
                selectedBed: text,
                currentFormIndex: 0,
                formData: {}
            };
            updateSession(to, 'DYNAMIC_FORM_FILLING', startState);
            await sendWhatsAppMessage(to, `Bed *${text}* saved.\n\n` + ADD_TENANT_FORM[0].prompt);
            break;

        case 'DYNAMIC_FORM_FILLING':
            const { currentFormIndex, formData } = session.data;
            const currentField = ADD_TENANT_FORM[currentFormIndex];

            // 1. Validation
            let valueToSave = text;
            if (currentField.validationRegex && !currentField.validationRegex.test(text.replace(/\\s/g, ''))) {
                if (!currentField.validationRegex.test(text.trim())) {
                    await sendWhatsAppMessage(to, `⚠️ ${currentField.validationErrorMsg}`);
                    return;
                }
            }

            if (!currentField.required && text.toLowerCase() === 'skip') {
                valueToSave = '';
            }

            // 2. Save Data & Increment
            const newFormData = { ...formData, [currentField.id]: valueToSave };
            const nextIndex = currentFormIndex + 1;

            if (nextIndex < ADD_TENANT_FORM.length) {
                // Continue to next question
                updateSession(to, 'DYNAMIC_FORM_FILLING', { ...session.data, currentFormIndex: nextIndex, formData: newFormData });
                await sendWhatsAppMessage(to, ADD_TENANT_FORM[nextIndex].prompt);
            } else {
                // Finished the array. Finalize the Tenant!
                const finalData = {
                    pg: session.data.selectedPg,
                    room: session.data.selectedRoom,
                    bed: session.data.selectedBed,
                    ...newFormData
                };

                let successSummary = `✅ *Tenant Onboarded Successfully*\n\n`;
                successSummary += `*Tenant Details*\nName: ${finalData.name}\nRoom: ${finalData.room}\nRent: ₹${finalData.rentAmount}\nDeposit: ₹${finalData.depositAmount}\n\n`;
                successSummary += `Tenant WhatsApp has been activated and they have received their welcome message.`;

                updateSession(to, 'IDLE');
                await sendWhatsAppMessage(to, successSummary);
            }
            break;

        default:
            updateSession(to, 'IDLE');
            await sendWhatsAppMessage(to, "Something went wrong. Let's start over. Reply *Menu*.");
    }
}

// --- TENANT LOGIC ---
async function handleTenantLogic(to: string, text: string, session: any) {
    const lowerText = text.toLowerCase();

    if (lowerText === 'hi' || lowerText === 'menu') {
        await showTenantMenu(to);
    } else if (lowerText === '1') {
        await sendWhatsAppMessage(to, "*Your Rent Details*\n\nRent: ₹6000\nDue Date: 5 March\nProperty: Sai PG\nRoom: 203\n\nReply *2* to Pay Now.");
    } else if (lowerText === '2' || lowerText.includes('pay')) {
        const upiLink = generateUpiIntentLink('rentok@icici', 'Sai PG', 6000, 'Rent Payment');
        await sendWhatsAppMessage(to, `💳 *Pay Your Rent*\n\nTap the link below to pay instantly via UPI (GPay/PhonePe):\n${upiLink}`);
    } else if (lowerText === '4' || lowerText.includes('issue')) {
        await sendWhatsAppMessage(to, "🔧 *Raise Maintenance Request*\n\nReply with what is broken:\n1️⃣ Electricity\n2️⃣ Water\n3️⃣ Cleaning\n4️⃣ Other");
    } else {
        await sendWhatsAppMessage(to, `Reply *Menu* to see your options.`);
    }
}

// --- MENU BUILDERS ---
async function showOwnerMenu(to: string) {
    const menu = `*Owner Dashboard*\n\n` +
        `1️⃣ View Properties / PGs\n` +
        `2️⃣ Today’s Payments\n` +
        `3️⃣ This Month Rent Collected\n` +
        `4️⃣ Pending Rents\n` +
        `5️⃣ Send Rent Reminders\n` +
        `6️⃣ Onboard New Tenant\n` +
        `7️⃣ Tenant Lifecycle Management\n` +
        `8️⃣ Reports & Analytics\n` +
        `9️⃣ Settings (Magic Link)`;
    await sendWhatsAppMessage(to, menu);
}

async function showTenantMenu(to: string) {
    const menu = `*Welcome to RentSutra*\n\n` +
        `1️⃣ View Rent Details\n` +
        `2️⃣ Pay Rent\n` +
        `3️⃣ Payment History\n` +
        `4️⃣ Maintenance Request\n` +
        `5️⃣ Contact Owner`;
    await sendWhatsAppMessage(to, menu);
}

