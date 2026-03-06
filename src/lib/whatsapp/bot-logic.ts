import { sendWhatsAppMessage, sendWhatsAppInteractiveMessage, sendWhatsAppImageMessage } from './send-message';
import { generateUpiIntentLink } from './upi-intent';
import { getSession, updateSession, clearSession } from './session-state';
import { ADD_TENANT_FORM } from './form-config';
import { selectOwnerDataAdminDb, getAdminDb } from '../firebaseAdmin';

export async function handleIncomingMessage(data: any) {
    const { from, msgBody, messageType, rawData } = data;
    const lowerText = msgBody?.toLowerCase() || '';

    const session = getSession(from);

    // Extract text from either the body or use the image ID if it's a media upload
    let text = msgBody?.trim() || '';
    if (messageType === 'image' && rawData?.image?.id) {
        text = rawData.image.id;
    }

    // The original lowerText based on 'text' variable
    const lowerTextFromText = text.toLowerCase();

    console.log(`Analyzing message from ${from}...`);

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
        const adminDb = await getAdminDb(); // Use default app DB for initial lookup
        let matchedOwner: any = null;
        let matchedOwnerId: string | null = null;

        let formattedPhone = from.replace(/\D/g, '');
        if (formattedPhone.startsWith('91') && formattedPhone.length === 12) {
            formattedPhone = formattedPhone.substring(2);
        }

        const ownerSnap = await adminDb.collection('users')
            .where('phone', '==', formattedPhone)
            .limit(1)
            .get();

        if (!ownerSnap.empty) {
            matchedOwner = ownerSnap.docs[0].data();
            matchedOwnerId = ownerSnap.docs[0].id;
        } else {
            // No owner found for phone
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
            await showOwnerMenu(from, getSession(from));
            return;
        }

        // If not matched directly on "hi", show the fallback menu
        updateSession(from, 'AWAITING_USER_ROLE', {});
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
                await sendWhatsAppMessage(to, "❌ Your number is not registered as an Owner.\n\nPlease login to the RentSutra App and navigate to *Settings* to add and verify your WhatsApp number.\n\nDashboard Link: https://reantsutra.netlify.app/dashboard/settings\n\nOnce verified, just say *Hi* here and you will be logged in automatically! 🪄");
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
    const ownerId = session.data.ownerId;

    // 1. Handle Active Multi-Step States
    if (session.state !== 'IDLE') {
        await handleOwnerActiveState(to, text, session);
        return;
    }

    if (lowerText === 'hi' || lowerText === 'menu') {
        await showOwnerMenu(to, session);
    } else if (lowerText === '1') {
        // Real Properties Fetch
        const adminDb = await selectOwnerDataAdminDb(ownerId);
        const pgsSnap = await adminDb.collection('users_data').doc(ownerId).collection('pgs').get();

        if (pgsSnap.empty) {
            await sendWhatsAppMessage(to, "🏠 *Your Buildings*\n\nYou haven't added any properties yet.\n\nReply *Add Property* or visit the dashboard to get started.");
            return;
        }

        let buildingsMsg = `🏠 *Your Buildings (PGs)*\n\n`;
        let index = 1;
        const pgsList: any[] = [];
        pgsSnap.forEach(docSnap => {
            const pg = docSnap.data();
            const occupancy = pg.occupancy || 0;
            const total = pg.totalBeds || 0;
            buildingsMsg += `${index}. ${pg.name} (${occupancy}/${total} Occupied)\n`;
            pgsList.push({ id: docSnap.id, name: pg.name });
            index++;
        });
        buildingsMsg += `\n${index}. Add New Property\n\nReply with a number to view PG details.`;

        updateSession(to, 'SELECTING_PG_DETAILS', { ...session.data, pgsList });
        await sendWhatsAppMessage(to, buildingsMsg);
    } else if (lowerText === '2') {
        // Real Today's Payments (Mocking for now as it requires ledger query)
        const todayPayments = `*Today's Payments*\n\nTotal Collected Today: ₹0\n\nNo payments recorded today.\n\nOptions:\n1 View Payment Details\n2 Download Report\n3 Back to Menu`;
        await sendWhatsAppMessage(to, todayPayments);
    } else if (lowerText === '3') {
        // Real Monthly Summary
        const adminDb = await selectOwnerDataAdminDb(ownerId);
        const guestsSnap = await adminDb.collection('users_data').doc(ownerId).collection('guests').where('isVacated', '==', false).get();

        let expected = 0;
        let collected = 0;
        guestsSnap.forEach(docSnap => {
            const g = docSnap.data();
            expected += (g.rentAmount || 0);
            // This is a simplification; real app would check ledger for current month
            collected += (g.paidAmount || 0);
        });

        const pending = expected - collected;
        const monthly = `*This Month Rent Collected*\n\nTotal Expected: ₹${expected}\nCollected: ₹${collected}\nPending: ₹${pending}\n\nActions:\n1 View Collected Tenants\n2 View Pending Tenants\n3 Send Reminder to All Pending`;
        await sendWhatsAppMessage(to, monthly);
    } else if (lowerText === '4') {
        // Real Pending List
        const adminDb = await selectOwnerDataAdminDb(ownerId);
        const pendingSnap = await adminDb.collection('users_data').doc(ownerId).collection('guests')
            .where('isVacated', '==', false)
            .where('paymentStatus', '==', 'pending')
            .limit(10)
            .get();

        if (pendingSnap.empty) {
            await sendWhatsAppMessage(to, "✅ All your tenants have paid! No pending rents found.");
            return;
        }

        let pendingMsg = `*Pending Rent List*\n\n`;
        let idx = 1;
        pendingSnap.forEach(docSnap => {
            const g = docSnap.data();
            pendingMsg += `${idx}️⃣ ${g.name} - ₹${g.balance || 0}\n`;
            idx++;
        });
        pendingMsg += `\nReply *Menu* to return.`;
        await sendWhatsAppMessage(to, pendingMsg);
    } else if (lowerText === '6' || lowerText === 'add tenant') {
        // Real PG Selection for Onboarding
        const adminDb = await selectOwnerDataAdminDb(ownerId);
        const pgsSnap = await adminDb.collection('users_data').doc(ownerId).collection('pgs').get();

        if (pgsSnap.empty) {
            await sendWhatsAppMessage(to, "❌ You need at least one property to add a tenant.");
            return;
        }

        let pgsMsg = `Let's Onboard a New Tenant. Select Property:\n`;
        let idx = 1;
        const onboardingPgs: any[] = [];
        pgsSnap.forEach(docSnap => {
            const pg = docSnap.data();
            pgsMsg += `${idx}️⃣ ${pg.name}\n`;
            onboardingPgs.push({ id: docSnap.id, name: pg.name });
            idx++;
        });

        updateSession(to, 'SELECTING_PG', { ...session.data, onboardingPgs });
        await sendWhatsAppMessage(to, pgsMsg);
    } else if (lowerText === '7') {
        // Real Tenant Management
        const adminDb = await selectOwnerDataAdminDb(ownerId);
        const guestsSnap = await adminDb.collection('users_data').doc(ownerId).collection('guests')
            .where('isVacated', '==', false)
            .limit(10)
            .get();

        if (guestsSnap.empty) {
            await sendWhatsAppMessage(to, "No active tenants found.");
            return;
        }

        let guestsMsg = `*Tenant Lifecycle Management*\n\nSelect Tenant to Manage:\n`;
        let idx = 1;
        const tenantList: any[] = [];
        guestsSnap.forEach(docSnap => {
            const g = docSnap.data();
            guestsMsg += `${idx}️⃣ ${g.name} (${g.pgName || 'Unknown PG'})\n`;
            tenantList.push({ id: docSnap.id, name: g.name });
            idx++;
        });

        updateSession(to, 'SELECTING_TENANT_LIFECYCLE', { ...session.data, tenantList });
        await sendWhatsAppMessage(to, guestsMsg);
    } else if (lowerText === '5') {
        await sendWhatsAppMessage(to, "📢 *Rent Reminders*\n\nThis will send automated WhatsApp reminders to all tenants with pending rent.\n\nType *Confirm* to proceed or *Menu* to cancel.");
    } else if (lowerText === '8') {
        await sendWhatsAppMessage(to, "📈 *Reports & Analytics*\n\nVisit your dashboard to view detailed financial reports and occupancy analytics.");
    } else if (lowerText === '9') {
        await sendWhatsAppMessage(to, "🔗 *Your Secure Dashboard*\n\nAccess your full property management suite here:\nhttps://reantsutra.netlify.app/dashboard");
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

        case 'SELECTING_TENANT_LIFECYCLE':
            updateSession(to, 'AWAITING_LIFECYCLE_ACTION', { tenantId: text });
            await sendWhatsAppMessage(to, `*Tenant Overview*\nName: Selected Tenant\nRent: ₹6000\nPhone: 9876543210\n\nWhat would you like to do?\n1️⃣ Edit Details\n2️⃣ View/Upload KYC\n3️⃣ Start Move-Out\n\nReply with a number.`);
            break;

        case 'AWAITING_LIFECYCLE_ACTION':
            if (text === '1') {
                updateSession(to, 'EDITING_TENANT_FIELD_SELECTION', session.data);
                await sendWhatsAppMessage(to, `*Edit Details*\n\nWhat would you like to update?\n1️⃣ Name\n2️⃣ Rent Amount\n3️⃣ Phone Number\n\nReply with a number.`);
            } else if (text === '2') {
                updateSession(to, 'AWAITING_KYC_ACTION', session.data);
                await sendWhatsAppMessage(to, `*KYC Documents*\n\n1️⃣ View Photo\n2️⃣ View Aadhaar\n3️⃣ Upload Photo\n4️⃣ Upload Aadhaar\n\nReply with a number.`);
            } else {
                updateSession(to, 'IDLE');
                await sendWhatsAppMessage(to, "Feature not built yet. Returning to Menu. Reply *Menu*.");
            }
            break;

        case 'AWAITING_KYC_ACTION':
            // KYC Management Loop
            if (text === '1') {
                // Mock viewing a photo
                await sendWhatsAppMessage(to, "📸 Sending Tenant Photo...");
                await sendWhatsAppImageMessage(to, "https://firebasestorage.googleapis.com/v0/b/roombox-f7bff.firebasestorage.app/o/mock-kyc-photo.jpg?alt=media");
                updateSession(to, 'IDLE');
            } else if (text === '2') {
                // Mock viewing Aadhaar
                await sendWhatsAppMessage(to, "📄 Sending Aadhaar Card...");
                await sendWhatsAppImageMessage(to, "https://firebasestorage.googleapis.com/v0/b/roombox-f7bff.firebasestorage.app/o/mock-kyc-aadhaar.jpg?alt=media");
                updateSession(to, 'IDLE');
            } else if (text === '3') {
                updateSession(to, 'AWAITING_OWNER_KYC_UPLOAD_PHOTO', session.data);
                await sendWhatsAppMessage(to, "Please send/upload the *Tenant's Photo* now.");
            } else if (text === '4') {
                updateSession(to, 'AWAITING_OWNER_KYC_UPLOAD_AADHAAR', session.data);
                await sendWhatsAppMessage(to, "Please send/upload the *Aadhaar Card Image* now.");
            } else {
                updateSession(to, 'IDLE');
                await sendWhatsAppMessage(to, "Invalid choice. Returning to Menu. Reply *Menu*.");
            }
            break;

        case 'AWAITING_OWNER_KYC_UPLOAD_PHOTO':
        case 'AWAITING_OWNER_KYC_UPLOAD_AADHAAR':
            // 🚨 IMPORTANT: Currently, `text` contains the Media ID if the user sends an image, 
            // but we need to download it from Meta first in a real scenario.
            const docType = session.state === 'AWAITING_OWNER_KYC_UPLOAD_PHOTO' ? 'Photo' : 'Aadhaar Card';

            // Mock Confirmation
            updateSession(to, 'IDLE');
            await sendWhatsAppMessage(to, `✅ *KYC Uploaded*\n\nThe ${docType} has been securely saved to the tenant's profile.\n\nReply *Menu* to return.`);
            break;

        case 'EDITING_TENANT_FIELD_SELECTION':
            let fieldToEdit = '';
            if (text === '1') fieldToEdit = 'name';
            else if (text === '2') fieldToEdit = 'rent amount';
            else if (text === '3') fieldToEdit = 'phone number';

            if (fieldToEdit) {
                updateSession(to, 'EDITING_TENANT_VALUE', { ...session.data, fieldToEdit });
                await sendWhatsAppMessage(to, `Please enter the new ${fieldToEdit}:`);
            } else {
                await sendWhatsAppMessage(to, "Invalid choice. Reply with 1, 2, or 3.");
            }
            break;

        case 'EDITING_TENANT_VALUE':
            const updatedField = session.data.fieldToEdit;
            const updatedValue = text;

            // In a real scenario, we perform a db.collection('guests').doc(tenantId).update({ [fieldToEdit]: updatedValue }) here.
            updateSession(to, 'IDLE');
            await sendWhatsAppMessage(to, `✅ *Update Successful*\n\nTenant's ${updatedField} has been updated to *${updatedValue}*.\n\nReply *Menu* to return to dashboard.`);
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
async function showOwnerMenu(to: string, session: any) {
    const ownerName = session.data?.ownerName || 'Owner';
    const ownerId = session.data?.ownerId;

    // Real-time briefing stats
    let statsMsg = '';
    try {
        const adminDb = await selectOwnerDataAdminDb(ownerId);
        const pgsSnap = await adminDb.collection('users_data').doc(ownerId).collection('pgs').get();
        const guestsSnap = await adminDb.collection('users_data').doc(ownerId).collection('guests').where('isVacated', '==', false).get();

        const totalPgs = pgsSnap.size;
        const totalTenants = guestsSnap.size;

        statsMsg = `📊 *Briefing*: ${totalPgs} Buildings | ${totalTenants} Active Tenants\n\n`;
    } catch (e) {
        console.error("Error fetching menu stats:", e);
    }

    const menu = `*RoomBox Dashboard*\nHi ${ownerName}!\n\n` +
        statsMsg +
        `1️⃣ View Properties / PGs\n` +
        `2️⃣ Today’s Payments\n` +
        `3️⃣ This Month Rent Summary\n` +
        `4️⃣ Pending Rents\n` +
        `5️⃣ Send Rent Reminders\n` +
        `6️⃣ Onboard New Tenant\n` +
        `7️⃣ Tenant Management\n` +
        `8️⃣ Reports & Analytics\n` +
        `9️⃣ Secure Dashboard Link`;
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

