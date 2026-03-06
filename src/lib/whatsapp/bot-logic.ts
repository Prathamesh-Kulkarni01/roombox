import { sendWhatsAppMessage, sendWhatsAppInteractiveMessage, sendWhatsAppImageMessage } from './send-message';
import { getSession, updateSession, clearSession } from './session-state';
import { ADD_TENANT_FORM, ADD_PROPERTY_FORM } from './form-config';
import { selectOwnerDataAdminDb, getAdminDb } from '../firebaseAdmin';
import { generateUpiIntentLink } from './upi-intent';
import { PropertyService } from '../../services/propertyService';
import { TenantService } from '../../services/tenantService';
import { workflowEngine } from './workflow-engine';
import { propertyManagementWorkflow, tenantManagementWorkflow } from './workflow-definitions';

export async function handleIncomingMessage(data: any) {
    const { from, msgBody, messageType, rawData } = data;
    const lowerText = msgBody?.toLowerCase() || '';

    const session = await getSession(from);

    console.log(`[BOT DEBUG] From: ${from} | Msg: ${msgBody} | Active State: ${session.state}`);

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
               .where('phone', '==', from.replace(/\D/g, ''))
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

        // Debug: Log phone verification details
        const allDigits = from.replace(/\D/g, '');
        console.log(`\n[WhatsApp Login Debug] ──────────────────────────`);
        console.log(`  From Phone: ${from}`);
        console.log(`  All Digits: ${allDigits}`);
        console.log(`  Formatted (no CC): ${formattedPhone}`);
        console.log(`  Owner Found: ${matchedOwner ? 'YES' : 'NO'}`);
        if (matchedOwner) {
            console.log(`  Owner ID: ${matchedOwnerId}`);
            console.log(`  Owner Name: ${matchedOwner.name}`);
            console.log(`  Owner Role: ${matchedOwner.role}`);
            console.log(`  Stored Phone: ${matchedOwner.phone}`);
            console.log(`  WhatsApp Verified: ${matchedOwner.whatsappVerified === true ? 'YES' : 'NO'}`);
        }
        console.log(`[WhatsApp Login Debug] ──────────────────────────\n`);

        if (matchedOwner) {
            // AUTO LOGIN 🪄
            await updateSession(from, 'IDLE', {
                isAuthenticatedOwner: true,
                ownerName: matchedOwner.name || 'Owner',
                ownerId: matchedOwnerId
            });
            await sendWhatsAppMessage(from, `✅ *Login Successful*\n\nWelcome back, ${matchedOwner.name || 'Owner'}!`);
            await showOwnerMenu(from, session);
            return;
        }

        // If not matched directly on "hi", show the fallback menu
        await updateSession(from, 'AWAITING_USER_ROLE', {});
        const msg = `Welcome to RentSutra 🏠\n\nWho are you?\n\n1️⃣ Property Owner / PG Owner\n2️⃣ Tenant\n3️⃣ New User (Register)\n4️⃣ Support`;
        await sendWhatsAppMessage(from, msg);
    } else {
        await sendWhatsAppMessage(from, `Welcome to RentSutra 🏠\n\nReply *Hi* to get started.`);
    }
}

// --- AUTHENTICATION HANDLERS ---
async function handleAuthActiveState(to: string, text: string, session: any) {
    if (text.toLowerCase() === 'cancel') {
        await clearSession(to);
        await sendWhatsAppMessage(to, "❌ Login cancelled. Reply *Hi* to start over.");
        return;
    }

    switch (session.state) {
        case 'AWAITING_USER_ROLE':
            if (text === '1') {
                // If they reached here, the auto-login failed.
                await clearSession(to);
                const errorMsg = `❌ *Verification Failed*

Your WhatsApp number is not yet registered or verified in the system.

*What to do:*
1️⃣ Visit Dashboard: https://rentsutra-1.netlify.app/dashboard/settings
2️⃣ Go to *Settings* → *WhatsApp*
3️⃣ Add or verify your phone number
4️⃣ Come back here and say *Hi*

Once verified, you'll be logged in automatically! 🪄

Need help? Reply *Support* for assistance.`;
                await sendWhatsAppMessage(to, errorMsg);
            } else if (text === '2') {
                // Simplified tenant login for now
                await updateSession(to, 'IDLE', { isAuthenticatedTenant: true });
                await sendWhatsAppMessage(to, "✅ Login Successful!\n\nWelcome to RentSutra Tenant Portal.");
                await showTenantMenu(to);
            } else {
                await sendWhatsAppMessage(to, "Coming soon! Please reply *1* for Owner or *2* for Tenant, or *Cancel* to exit.");
            }
            break;

        default:
            await clearSession(to);
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
        // Real Properties Fetch using PropertyService
        const adminDb = await selectOwnerDataAdminDb(ownerId);
        const buildings = await PropertyService.getBuildings(adminDb, ownerId);

        if (buildings.length === 0) {
            await sendWhatsAppMessage(to, "🏠 *Your Buildings*\n\nYou haven't added any properties yet.\n\nReply *Add Property* or visit the dashboard to get started.");
            return;
        }

        let buildingsMsg = `🏠 *Your Buildings (PGs)*\n\n`;
        const pgsList: any[] = [];
        buildings.forEach((b, i) => {
            const index = i + 1;
            buildingsMsg += `${index}. ${b.name} (${b.occupancy}/${b.totalBeds} Occupied)\n`;
            pgsList.push({ id: b.id, name: b.name });
        });
        buildingsMsg += `\n${buildings.length + 1}. Add New Property\n\nReply with a number to view PG details.`;

        await updateSession(to, 'SELECTING_PG_DETAILS', { ...session.data, pgsList });
        await sendWhatsAppMessage(to, buildingsMsg);
    } else if (lowerText === '2') {
        // Real Today's Payments (Mocking for now as it requires ledger query)
        const todayPayments = `*Today's Payments*\n\nTotal Collected Today: ₹0\n\nNo payments recorded today.\n\nOptions:\n1 View Payment Details\n2 Download Report\n3 Back to Menu`;
        await sendWhatsAppMessage(to, todayPayments);
    } else if (lowerText === '3') {
        // Real Monthly Summary using TenantService
        const adminDb = await selectOwnerDataAdminDb(ownerId);
        const summary = await TenantService.getMonthlyRentSummary(adminDb, ownerId);

        const monthly = `*This Month Rent Collected*\n\nTotal Expected: ₹${summary.expected}\nCollected: ₹${summary.collected}\nPending: ₹${summary.pending}\n\nActions:\n1 View Collected Tenants\n2 View Pending Tenants\n3 Send Reminder to All Pending`;
        await sendWhatsAppMessage(to, monthly);
    } else if (lowerText === '4') {
        // Real Pending List using TenantService
        const adminDb = await selectOwnerDataAdminDb(ownerId);
        const pendingTenants = await TenantService.getActiveTenants(adminDb, ownerId, 10, 'pending');

        if (pendingTenants.length === 0) {
            await sendWhatsAppMessage(to, "✅ All your tenants have paid! No pending rents found.");
            return;
        }

        let pendingMsg = `*Pending Rent List*\n\n`;
        pendingTenants.forEach((t, i) => {
            pendingMsg += `${i + 1}️⃣ ${t.name} - ₹${t.balance || 0}\n`;
        });
        pendingMsg += `\nReply *Menu* to return.`;
        await sendWhatsAppMessage(to, pendingMsg);
    } else if (lowerText === '6' || lowerText === 'add tenant') {
        // Real PG Selection for Onboarding using PropertyService
        const adminDb = await selectOwnerDataAdminDb(ownerId);
        const buildings = await PropertyService.getBuildings(adminDb, ownerId);

        if (buildings.length === 0) {
            await sendWhatsAppMessage(to, "❌ You need at least one property to add a tenant.");
            return;
        }

        let pgsMsg = `Let's Onboard a New Tenant. Select Property:\n`;
        const onboardingPgs: any[] = [];
        buildings.forEach((b, i) => {
            const index = i + 1;
            pgsMsg += `${index}️⃣ ${b.name}\n`;
            onboardingPgs.push({ id: b.id, name: b.name });
        });

        await updateSession(to, 'SELECTING_PG', { ...session.data, onboardingPgs });
        await sendWhatsAppMessage(to, pgsMsg);
    } else if (lowerText === '7') {
        // Real Tenant Management using TenantService
        const adminDb = await selectOwnerDataAdminDb(ownerId);
        const activeTenants = await TenantService.getActiveTenants(adminDb, ownerId, 10);

        if (activeTenants.length === 0) {
            await sendWhatsAppMessage(to, "No active tenants found.");
            return;
        }

        let guestsMsg = `*Tenant Lifecycle Management*\n\nSelect Tenant to Manage:\n`;
        const tenantList: any[] = [];
        activeTenants.forEach((t, i) => {
            guestsMsg += `${i + 1}️⃣ ${t.name} (${t.pgName || 'Unknown PG'})\n`;
            tenantList.push({ id: t.id, name: t.name });
        });

        await updateSession(to, 'SELECTING_TENANT_LIFECYCLE', { ...session.data, tenantList });
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
        await updateSession(to, 'IDLE');
        await sendWhatsAppMessage(to, "❌ Operation cancelled. Reply *Menu* to start over.");
        return;
    }

    switch (session.state) {

        case 'SELECTING_PG': {
            const pgIndex = parseInt(text) - 1;
            const onboardingPgs = session.data?.onboardingPgs || [];
            const selectedPgObj = onboardingPgs[pgIndex];
            if (!selectedPgObj) {
                await sendWhatsAppMessage(to, `⚠️ Please reply with a valid number (1-${onboardingPgs.length}).`);
                return;
            }
            await updateSession(to, 'SELECTING_ROOM', { ...session.data, selectedPgId: selectedPgObj.id, selectedPgName: selectedPgObj.name });
            await sendWhatsAppMessage(to, `Selected Property *${selectedPgObj.name}*.\n\nWhich *Room/Bed* are they moving into? (e.g., Room 101, Bed A)\n\nOr just reply *skip* to skip room assignment.`);
            break;
        }


        case 'SELECTING_ROOM': {
            await updateSession(to, 'SELECTING_BED', { ...session.data, selectedRoom: text });
            await sendWhatsAppMessage(to, `Room *${text}*.\n\nNow enter the tenant's name to begin the onboarding form.`);
            // Skip the bed selection, go straight to form filling
            const skipBedState = { ...session.data, selectedRoom: text, selectedBed: 'N/A', currentFormIndex: 0, formData: {} };
            await updateSession(to, 'DYNAMIC_FORM_FILLING', skipBedState);
            await sendWhatsAppMessage(to, ADD_TENANT_FORM[0].prompt);
            break;
        }

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
                await updateSession(to, 'DYNAMIC_FORM_FILLING', { ...session.data, currentFormIndex: nextIndex, formData: newFormData });
                await sendWhatsAppMessage(to, ADD_TENANT_FORM[nextIndex].prompt);
            } else {
                // Finished the form. Save tenant via shared API!
                const finalData = {
                    pg: session.data.selectedPgName,
                    room: session.data.selectedRoom,
                    bed: session.data.selectedBed,
                    pgId: session.data.selectedPgId,
                    pgName: session.data.selectedPgName,
                    roomId: session.data.selectedRoom,
                    roomName: session.data.selectedRoom,
                    bedId: session.data.selectedBed,
                    ...newFormData
                };

                // Persist through the shared /api/tenants endpoint
                try {
                    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9002';
                    const tenantRes = await fetch(`${baseUrl}/api/tenants`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            ownerId: session.data.ownerId,
                            guestData: {
                                name: finalData.name || finalData.tenantName,
                                phone: finalData.phone || finalData.phoneNumber,
                                email: finalData.email || '',
                                pgId: finalData.pgId,
                                pgName: finalData.pgName,
                                roomId: finalData.roomId,
                                roomName: finalData.roomName,
                                bedId: finalData.bedId,
                                rentAmount: finalData.rentAmount || finalData.rent,
                                deposit: finalData.depositAmount || finalData.deposit || 0,
                                joinDate: new Date().toISOString(),
                            }
                        })
                    });
                    const result = await tenantRes.json();
                    if (!result.success) {
                        throw new Error(result.error || 'Failed to save tenant');
                    }
                } catch (saveErr: any) {
                    console.error('Bot: Failed to save tenant via API:', saveErr);
                    await updateSession(to, 'IDLE');
                    await sendWhatsAppMessage(to, `⚠️ Could not save tenant: ${saveErr.message}\n\nPlease add them from the dashboard: https://reantsutra.netlify.app/dashboard`);
                    return;
                }

                let successSummary = `✅ *Tenant Onboarded Successfully!*\n\n`;
                successSummary += `*Name:* ${finalData.name || finalData.tenantName}\n`;
                successSummary += `*Property:* ${finalData.pgName || finalData.pg}\n`;
                successSummary += `*Rent:* ₹${finalData.rentAmount || finalData.rent}\n`;
                successSummary += `*Deposit:* ₹${finalData.depositAmount || finalData.deposit || 0}\n\n`;
                successSummary += `They have been added to your tenant list! Reply *Menu* to continue.`;

                await updateSession(to, 'IDLE');
                await sendWhatsAppMessage(to, successSummary);
            }
            break;


        case 'SELECTING_TENANT_LIFECYCLE': {
            const tenantIndex = parseInt(text) - 1;
            const tenantList = session.data?.tenantList || [];
            const selectedTenant = tenantList[tenantIndex];
            if (!selectedTenant) {
                await sendWhatsAppMessage(to, `⚠️ Please reply with a valid number (1-${tenantList.length}).`);
                return;
            }

            // Load real tenant data
            const ownerId = session.data.ownerId;
            const tenantDb = await (await import('../firebaseAdmin')).selectOwnerDataAdminDb(ownerId);
            const tenantDoc = await tenantDb.collection('users_data').doc(ownerId).collection('guests').doc(selectedTenant.id).get();
            const tenantData = tenantDoc.exists ? tenantDoc.data() : {};

            await updateSession(to, 'AWAITING_LIFECYCLE_ACTION', { ...session.data, tenantId: selectedTenant.id, tenantName: selectedTenant.name });
            await sendWhatsAppMessage(to, `*Tenant: ${selectedTenant.name}*\nPG: ${tenantData?.pgName || 'N/A'}\nRent: ₹${tenantData?.rentAmount || 0}\nBalance Due: ₹${tenantData?.balance || 0}\nPhone: ${tenantData?.phone || 'N/A'}\n\nOptions:\n1️⃣ Edit Details\n2️⃣ View KYC\n3️⃣ Record Payment\n4️⃣ Vacate Tenant\n\nReply with a number.`);
            break;
        }

        case 'AWAITING_LIFECYCLE_ACTION':
            if (text === '1') {
                await updateSession(to, 'EDITING_TENANT_FIELD_SELECTION', session.data);
                await sendWhatsAppMessage(to, `*Edit Details*\n\nWhat would you like to update?\n1️⃣ Name\n2️⃣ Rent Amount\n3️⃣ Phone Number\n\nReply with a number.`);
            } else if (text === '2') {
                await updateSession(to, 'AWAITING_KYC_ACTION', session.data);
                await sendWhatsAppMessage(to, `*KYC Documents*\n\n1️⃣ View Photo\n2️⃣ View Aadhaar\n3️⃣ Upload Photo\n4️⃣ Upload Aadhaar\n\nReply with a number.`);
            } else if (text === '3') {
                // Record Payment flow
                await updateSession(to, 'RECORDING_PAYMENT_AMOUNT', session.data);
                await sendWhatsAppMessage(to, `💰 *Record Payment for ${session.data.tenantName}*\n\nEnter the amount received (numbers only, e.g. 5000):`);
            } else if (text === '4') {
                await updateSession(to, 'CONFIRMING_VACATE', session.data);
                await sendWhatsAppMessage(to, `⚠️ *Vacate Tenant*\n\nAre you sure you want to mark *${session.data.tenantName}* as vacated?\n\nReply *YES* to confirm or *CANCEL* to go back.`);
            } else {
                await updateSession(to, 'IDLE');
                await sendWhatsAppMessage(to, "Invalid choice. Reply *Menu* to start over.");
            }
            break;

        case 'RECORDING_PAYMENT_AMOUNT': {
            const amount = parseFloat(text);
            if (isNaN(amount) || amount <= 0) {
                await sendWhatsAppMessage(to, '⚠️ Please enter a valid amount (numbers only, e.g. 5000):');
                return;
            }
            try {
                const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9002';
                const payRes = await fetch(`${baseUrl}/api/rent`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        ownerId: session.data.ownerId,
                        guestId: session.data.tenantId,
                        amount,
                        paymentMode: 'cash',
                        notes: 'Recorded via WhatsApp'
                    })
                });
                const result = await payRes.json();
                if (!result.success) throw new Error(result.error || 'Payment failed');
                await updateSession(to, 'IDLE');
                await sendWhatsAppMessage(to, `✅ *Payment of ₹${amount} recorded!*\n\nNew Balance: ₹${result.newBalance}\nStatus: ${result.newStatus}\n\nReply *Menu* to continue.`);
            } catch (payErr: any) {
                await updateSession(to, 'IDLE');
                await sendWhatsAppMessage(to, `❌ Payment could not be recorded: ${payErr.message}\n\nPlease use the dashboard to record this payment.`);
            }
            break;
        }

        case 'CONFIRMING_VACATE':
            if (text.toLowerCase() === 'yes') {
                try {
                    const ownerId = session.data.ownerId;
                    const tenantId = session.data.tenantId;
                    const vacateDb = await (await import('../firebaseAdmin')).selectOwnerDataAdminDb(ownerId);
                    await vacateDb.collection('users_data').doc(ownerId).collection('guests').doc(tenantId).update({
                        isVacated: true,
                        exitDate: new Date().toISOString(),
                    });
                    await updateSession(to, 'IDLE');
                    await sendWhatsAppMessage(to, `✅ *${session.data.tenantName}* has been marked as vacated.\n\nReply *Menu* to continue.`);
                } catch (vacateErr: any) {
                    await updateSession(to, 'IDLE');
                    await sendWhatsAppMessage(to, `❌ Could not vacate tenant: ${vacateErr.message}`);
                }
            } else {
                await updateSession(to, 'IDLE');
                await sendWhatsAppMessage(to, '❌ Vacate cancelled. Reply *Menu* to continue.');
            }
            break;

        case 'AWAITING_KYC_ACTION':
            // KYC Management Loop
            if (text === '1') {
                // Mock viewing a photo
                await sendWhatsAppMessage(to, "📸 Sending Tenant Photo...");
                await sendWhatsAppImageMessage(to, "https://firebasestorage.googleapis.com/v0/b/roombox-f7bff.firebasestorage.app/o/mock-kyc-photo.jpg?alt=media");
                await updateSession(to, 'IDLE');
            } else if (text === '2') {
                // Mock viewing Aadhaar
                await sendWhatsAppMessage(to, "📄 Sending Aadhaar Card...");
                await sendWhatsAppImageMessage(to, "https://firebasestorage.googleapis.com/v0/b/roombox-f7bff.firebasestorage.app/o/mock-kyc-aadhaar.jpg?alt=media");
                await updateSession(to, 'IDLE');
            } else if (text === '3') {
                await updateSession(to, 'AWAITING_OWNER_KYC_UPLOAD_PHOTO', session.data);
                await sendWhatsAppMessage(to, "Please send/upload the *Tenant's Photo* now.");
            } else if (text === '4') {
                await updateSession(to, 'AWAITING_OWNER_KYC_UPLOAD_AADHAAR', session.data);
                await sendWhatsAppMessage(to, "Please send/upload the *Aadhaar Card Image* now.");
            } else {
                await updateSession(to, 'IDLE');
                await sendWhatsAppMessage(to, "Invalid choice. Returning to Menu. Reply *Menu*.");
            }
            break;

        case 'AWAITING_OWNER_KYC_UPLOAD_PHOTO':
        case 'AWAITING_OWNER_KYC_UPLOAD_AADHAAR':
            // 🚨 IMPORTANT: Currently, `text` contains the Media ID if the user sends an image, 
            // but we need to download it from Meta first in a real scenario.
            const docType = session.state === 'AWAITING_OWNER_KYC_UPLOAD_PHOTO' ? 'Photo' : 'Aadhaar Card';

            // Mock Confirmation
            await updateSession(to, 'IDLE');
            await sendWhatsAppMessage(to, `✅ *KYC Uploaded*\n\nThe ${docType} has been securely saved to the tenant's profile.\n\nReply *Menu* to return.`);
            break;

        case 'EDITING_TENANT_FIELD_SELECTION':
            let fieldToEdit = '';
            if (text === '1') fieldToEdit = 'name';
            else if (text === '2') fieldToEdit = 'rent amount';
            else if (text === '3') fieldToEdit = 'phone number';

            if (fieldToEdit) {
                await updateSession(to, 'EDITING_TENANT_VALUE', { ...session.data, fieldToEdit });
                await sendWhatsAppMessage(to, `Please enter the new ${fieldToEdit}:`);
            } else {
                await sendWhatsAppMessage(to, "Invalid choice. Reply with 1, 2, or 3.");
            }
            break;

        case 'EDITING_TENANT_VALUE':
            const updatedField = session.data.fieldToEdit;
            const updatedValue = text;

            // In a real scenario, we perform a db.collection('guests').doc(tenantId).update({ [fieldToEdit]: updatedValue }) here.
            await updateSession(to, 'IDLE');
            await sendWhatsAppMessage(to, `✅ *Update Successful*\n\nTenant's ${updatedField} has been updated to *${updatedValue}*.\n\nReply *Menu* to return to dashboard.`);
            break;

        // ============= CASCADING HANDLERS =============
        case 'SELECTING_PG_DETAILS': {
            const pgIndex = parseInt(text) - 1;
            const pgsList = session.data?.pgsList || [];
            
            // Check if user selected "Add New Property"
            if (pgIndex === pgsList.length) {
                // Start property creation form
                await updateSession(to, 'ADDING_PROPERTY_FORM', { 
                    ...session.data, 
                    currentFormIndex: 0, 
                    formData: {} 
                });
                await sendWhatsAppMessage(to, ADD_PROPERTY_FORM[0].prompt);
                break;
            }
            
            // View existing property details
            const selectedPgObj = pgsList[pgIndex];
            if (!selectedPgObj) {
                await sendWhatsAppMessage(to, `⚠️ Please reply with a valid number (1-${pgsList.length + 1}).`);
                return;
            }
            
            // Fetch rooms in this property
            const adminDb = await selectOwnerDataAdminDb(session.data.ownerId);
            const tenants = await TenantService.getActiveTenants(adminDb, session.data.ownerId, 50, undefined, selectedPgObj.id);
            
            let propertyDetailsMsg = `*${selectedPgObj.name}*\n\n`;
            tenants.forEach((t, i) => {
                propertyDetailsMsg += `${i + 1}. ${t.name} - Room ${t.roomNumber || 'N/A'}\n`;
            });
            propertyDetailsMsg += `\n1️⃣ View Tenant\n2️⃣ Record Payment\n3️⃣ Back\n\nReply with option.`;
            
            await updateSession(to, 'VIEWING_PROPERTY_DETAILS', { 
                ...session.data, 
                selectedPgId: selectedPgObj.id, 
                selectedPgName: selectedPgObj.name,
                tenants: tenants 
            });
            await sendWhatsAppMessage(to, propertyDetailsMsg);
            break;
        }

        case 'ADDING_PROPERTY_FORM': {
            const { currentFormIndex, formData } = session.data;
            const currentField = ADD_PROPERTY_FORM[currentFormIndex];

            // Validation
            let valueToSave = text;
            if (currentField.validationRegex && !currentField.validationRegex.test(text.trim())) {
                await sendWhatsAppMessage(to, `⚠️ ${currentField.validationErrorMsg}`);
                return;
            }

            // Save & Increment
            const newFormData = { ...formData, [currentField.id]: valueToSave };
            const nextIndex = currentFormIndex + 1;

            if (nextIndex < ADD_PROPERTY_FORM.length) {
                // Continue to next field
                await updateSession(to, 'ADDING_PROPERTY_FORM', { 
                    ...session.data, 
                    currentFormIndex: nextIndex, 
                    formData: newFormData 
                });
                await sendWhatsAppMessage(to, ADD_PROPERTY_FORM[nextIndex].prompt);
            } else {
                // Finished form - Create property
                try {
                    const adminDb = await selectOwnerDataAdminDb(session.data.ownerId);
                    
                    await adminDb.collection('users_data').doc(session.data.ownerId).collection('properties').add({
                        name: newFormData.name,
                        totalBeds: parseInt(newFormData.totalBeds),
                        location: newFormData.location,
                        baseRent: parseInt(newFormData.baseRent),
                        securityDepositPercent: parseInt(newFormData.securityDepositPercent),
                        createdDate: new Date().toISOString(),
                        occupancy: 0,
                        isActive: true
                    });

                    await updateSession(to, 'IDLE');
                    await sendWhatsAppMessage(to, 
                        `✅ *Property Created Successfully!*\n\n` +
                        `Property: ${newFormData.name}\n` +
                        `Beds: ${newFormData.totalBeds}\n` +
                        `Location: ${newFormData.location}\n` +
                        `Base Rent: ₹${newFormData.baseRent}\n` +
                        `Security Deposit: ${newFormData.securityDepositPercent}%\n\n` +
                        `You can now add tenants to this property!\n\n` +
                        `Reply *Menu* to return to dashboard.`
                    );
                } catch (createErr: any) {
                    await updateSession(to, 'IDLE');
                    await sendWhatsAppMessage(to, `❌ Could not create property: ${createErr.message}`);
                }
            }
            break;
        }

        case 'VIEWING_PROPERTY_DETAILS': {
            if (text === '1') {
                // View tenant - would need tenant selection here
                await sendWhatsAppMessage(to, `📋 Tenant details coming soon.`);
            } else if (text === '2') {
                // Record payment
                await updateSession(to, 'RECORDING_PAYMENT', session.data);
                await sendWhatsAppMessage(to, `💰 How much payment to record?\n(e.g., 5000)`);
            } else if (text === '3') {
                // Back to properties
                await updateSession(to, 'IDLE');
                await sendWhatsAppMessage(to, `↩️ Back to menu. Reply *Menu* to see options.`);
            } else {
                await sendWhatsAppMessage(to, `⚠️ Please reply with 1, 2, or 3.`);
            }
            break;
        }

        case 'RECORDING_PAYMENT': {
            try {
                const amount = parseInt(text);
                if (isNaN(amount) || amount <= 0) {
                    await sendWhatsAppMessage(to, `⚠️ Please enter a valid amount.`);
                    return;
                }

                const adminDb = await selectOwnerDataAdminDb(session.data.ownerId);
                
                // Record payment in ledger
                await adminDb.collection('users_data')
                    .doc(session.data.ownerId)
                    .collection('ledger')
                    .add({
                        amount: amount,
                        date: new Date().toISOString(),
                        type: 'rent_collection',
                        property: session.data.selectedPgName,
                        status: 'completed'
                    });

                await updateSession(to, 'IDLE');
                await sendWhatsAppMessage(to, 
                    `✅ *Payment Recorded*\n\n` +
                    `Amount: ₹${amount}\n` +
                    `Property: ${session.data.selectedPgName}\n` +
                    `Status: Completed\n\n` +
                    `Reply *Menu* to return.`
                );
            } catch (paymentErr: any) {
                await updateSession(to, 'IDLE');
                await sendWhatsAppMessage(to, `❌ Error: ${paymentErr.message}`);
            }
            break;
        }

        default:
            await updateSession(to, 'IDLE');
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
        const stats = await PropertyService.getBriefingStats(adminDb, ownerId);
        statsMsg = `📊 *Briefing*: ${stats.totalBuildings} Buildings | ${stats.totalTenants} Active Tenants\n\n`;
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

