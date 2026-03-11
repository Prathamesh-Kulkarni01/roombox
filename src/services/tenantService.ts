/**
 * tenantService.ts — Unified Tenant & Guest service logic
 *
 * This is the SINGLE SOURCE OF TRUTH for all tenant operations,
 * shared between the Web UI (via API routes) and the WhatsApp bot.
 * It combines the old GuestService and TenantService logic.
 */
import { Firestore, FieldValue } from 'firebase-admin/firestore';
import * as crypto from 'crypto';
import { runReconciliationLogic } from '@/lib/reconciliation';
import { CURRENT_SCHEMA_VERSION, type Guest, type PG, type LedgerEntry, type SubmittedKycDocument } from '@/lib/types';
import { getPlanLimit } from '@/lib/permissions';
import { parseDateString } from '@/lib/utils';

export interface Tenant {
    id: string;
    name: string;
    pgName?: string;
    rentAmount: number;
    balance: number;
    paymentStatus: string;
}

export interface RentSummary {
    expected: number;
    collected: number;
    pending: number;
}

export class TenantService {
    /**
     * Checks if the owner has reached their guest limit.
     */
    static async checkGuestLimit(db: Firestore, ownerId: string, planId: string, batchSize: number = 1): Promise<void> {
        const limit = getPlanLimit(planId, 'guests');
        if (limit === 'unlimited') return;

        const snap = await db.collection('users_data').doc(ownerId).collection('guests')
            .where('isVacated', '==', false)
            .get();

        if (snap.size + batchSize > limit) {
            throw new Error(`Guest limit reached (${limit}). Please upgrade your plan.`);
        }
    }

    /**
     * Generates a single-use magic link token for a tenant.
     * Use this whenever the tenant needs to log in without a password.
     */
    static async generateMagicLink(appDb: Firestore, guestId: string, phone: string, ownerId: string, pgName?: string): Promise<string> {
        const token = crypto.randomBytes(32).toString('hex');

        await appDb.collection('magic_links').doc(token).set({
            token,
            guestId,
            phone,
            ownerId,
            pgName: pgName || 'RentSutra',
            createdAt: Date.now(),
            expiresAt: Date.now() + (24 * 60 * 60 * 1000), // 24 hours expiry
            used: false
        });

        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://rentsutra.app';
        return `${appUrl}/invite/${token}`;
    }

    /**
     * Onboards a new tenant with centralized logic.
     * Handles Firestore updates, bed assignment, user linking/invites, and welcome notifications.
     */
    static async onboardTenant(db: Firestore, appDb: Firestore, input: any): Promise<{ guest: Guest, magicLink?: string }> {
        const {
            ownerId,
            name,
            phone,
            email,
            pgId,
            pgName,
            bedId,
            roomId,
            roomName,
            rentAmount,
            deposit,
            joinDate,
            dueDate,
            rentCycleUnit = 'months',
            rentCycleValue = 1,
            planId
        } = input;

        console.log(`[TenantService.onboardTenant] Starting for ${name} (${phone})`);
        let magicLinkResult: string | undefined;
        await this.checkGuestLimit(db, ownerId, planId);

        console.log(`[TenantService.onboardTenant] Starting onboarding for ${name} (${phone || 'no phone'})`);

        const pgRef = db.collection('users_data').doc(ownerId).collection('pgs').doc(pgId);

        const guestId = `g-${Date.now()}`;
        const now = new Date().toISOString();

        const rawPhone = phone || '';
        const cleanPhoneStr = rawPhone.replace(/\D/g, '');
        // For standard 10 digit Indian numbers, prefix with +91 if not present.
        // Otherwise just use the digits (prefixed with + if they had country code)
        const standardizedPhone = cleanPhoneStr.length === 10 ? `+91${cleanPhoneStr}` :
            (cleanPhoneStr ? `+${cleanPhoneStr}` : '');

        const newGuest = await db.runTransaction(async (transaction) => {
            const pgDoc = await transaction.get(pgRef);
            if (!pgDoc.exists) {
                console.error(`[TenantService.onboardTenant] Property not found: ${pgId}`);
                throw new Error('Property not found');
            }
            const pgData = pgDoc.data()!;

            // Verify room and bed exist
            let targetBed: any = null;
            if (pgData.floors && bedId && bedId !== 'N/A') {
                for (const floor of pgData.floors as any[]) {
                    for (const room of floor.rooms as any[]) {
                        if (room.beds) {
                            const bed = (room.beds as any[]).find((b: any) => b && b.id === bedId);
                            if (bed) {
                                targetBed = bed;
                                break;
                            }
                        }
                    }
                    if (targetBed) break;
                }

                if (!targetBed) {
                    throw new Error(`Bed not found in property hierarchy: ${bedId}`);
                }
                if (targetBed.guestId) {
                    throw new Error('Bed is already occupied.');
                }
            }

            // Pre-calculate the anchor day and next due date so we fast-forward the first cycle
            // since we are manually billing it right now.
            const { calculateFirstDueDate } = require('@/lib/utils');
            const { format } = require('date-fns');

            // Robust parsing of joinDate
            const startOfCycle = (joinDate && typeof joinDate === 'string')
                ? (parseDateString(joinDate) || new Date(joinDate))
                : new Date(joinDate || now);

            if (isNaN(startOfCycle.getTime())) {
                console.error(`[TenantService.onboardTenant] Invalid joinDate received: ${joinDate}`);
                throw new Error('Invalid joining date format.');
            }

            // If a specific due date (day of month) is provided, use it as the anchor.
            // Otherwise, anchor to the join date.
            const anchorDay = Number(dueDate) || startOfCycle.getDate();
            const numericRent = Number(rentAmount) || 0;
            const numericDeposit = Number(deposit || 0);

            const initialLedger: LedgerEntry[] = [];
            let initialBalance = 0;

            if (numericRent > 0) {
                initialLedger.push({
                    id: `rent-${Date.now()}-initial`,
                    date: startOfCycle.toISOString(),
                    type: 'debit',
                    description: `Rent for Cycle Starting ${format(startOfCycle, 'do MMM')}`,
                    amount: numericRent,
                });
                initialBalance += numericRent;
            }

            if (numericDeposit > 0) {
                initialLedger.push({
                    id: `deposit-${Date.now()}-initial`,
                    date: startOfCycle.toISOString(),
                    type: 'debit',
                    description: `Security Deposit`,
                    amount: numericDeposit,
                });
                initialBalance += numericDeposit;
            }

            const nextDueDate = calculateFirstDueDate(startOfCycle, rentCycleUnit || 'months', rentCycleValue || 1, anchorDay);

            const guestToCreate: Guest = {
                id: guestId,
                ownerId,
                name,
                email: email || '',
                phone: standardizedPhone,
                pgId,
                pgName: pgName || pgData.name,
                bedId: bedId || '',
                roomId: roomId || '',
                roomName: roomName || '',
                rentAmount: numericRent,
                depositAmount: numericDeposit,
                balance: initialBalance,
                paidAmount: 0,
                rentStatus: initialBalance > 0 ? 'unpaid' : 'paid',
                paymentStatus: initialBalance > 0 ? 'pending' : 'paid',
                isVacated: false,
                kycStatus: 'not_submitted',
                documents: [],
                ledger: initialLedger,
                paymentHistory: [],
                dueDate: (dueDate ? new Date(dueDate) : nextDueDate).toISOString(),
                joinDate: startOfCycle.toISOString(),
                moveInDate: startOfCycle.toISOString(),
                rentCycleUnit: rentCycleUnit || 'months',
                rentCycleValue: rentCycleValue || 1,
                billingAnchorDay: anchorDay,
                createdAt: Date.now(),
                noticePeriodDays: 30,
                schemaVersion: CURRENT_SCHEMA_VERSION,
                isOnboarded: false, // Tenant self-onboarding via WhatsApp not yet complete
            } as unknown as Guest;

            // Save guest
            const guestDocRef = db.collection('users_data').doc(ownerId).collection('guests').doc(guestId);
            transaction.set(guestDocRef, guestToCreate);

            // Update PG occupancy & Bed assignment
            const pgUpdates: any = { occupancy: FieldValue.increment(1) };
            if (bedId && bedId !== 'N/A' && pgData.floors) {
                console.log(`[TenantService.onboardTenant] Marking bed ${bedId} as occupied`);
                pgUpdates.floors = (pgData.floors as any[]).map((floor: any) => ({
                    ...floor,
                    rooms: floor.rooms.map((room: any) => ({
                        ...room,
                        beds: room.beds.map((bed: any) =>
                            bed.id === bedId ? { ...bed, guestId } : bed
                        ),
                    })),
                }));
            }

            transaction.update(pgRef, pgUpdates);

            // Generate Default Password
            let rawDefaultPassword = null;
            if (phone) {
                // Generate a random 6-character alphanumeric password
                const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
                let randomPassword = '';
                try {
                    const crypto = require('crypto');
                    const randomBytes = crypto.randomBytes(6);
                    for (let i = 0; i < 6; i++) {
                        randomPassword += chars[randomBytes[i] % chars.length];
                    }
                } catch {
                    // Fallback if crypto isn't available
                    for (let i = 0; i < 6; i++) {
                        randomPassword += chars.charAt(Math.floor(Math.random() * chars.length));
                    }
                }

                rawDefaultPassword = randomPassword;
            }

            // We enhance the returned guest object with the raw default password so the UI can display it
            if (rawDefaultPassword) {
                (guestToCreate as any)._defaultPassword = rawDefaultPassword;
            }

            transaction.update(pgRef, pgUpdates);

            return guestToCreate;
        });

        console.log(`[TenantService.onboardTenant] Successfully committed tenant document: ${guestId}`);

        // 1. Link/Invite User & Magic Link Generation
        let magicLink: string | null = null;
        if (appDb) {
            try {
                // Find user by email or phone to link and notify via FCM
                let userDoc: any = null;
                if (email) {
                    const snap = await appDb.collection('users').where('email', '==', email).limit(1).get();
                    if (!snap.empty) userDoc = snap.docs[0];
                }
                if (!userDoc && phone) {
                    const cleanPhone = phone.replace(/\D/g, '');
                    const variations = [cleanPhone];
                    if (cleanPhone.length === 10) {
                        variations.push('91' + cleanPhone);
                        variations.push('+91' + cleanPhone);
                    } else if (cleanPhone.length === 12 && cleanPhone.startsWith('91')) {
                        variations.push(cleanPhone.substring(2));
                        variations.push('+91' + cleanPhone);
                    }

                    for (const v of variations) {
                        const snap = await appDb.collection('users').where('phone', '==', v).limit(1).get();
                        if (!snap.empty) {
                            userDoc = snap.docs[0];
                            break;
                        }
                    }
                }

                if (userDoc) {
                    const userData = userDoc.data();
                    console.log(`[TenantService.onboardTenant] Found existing user ${userDoc.id}. Linking...`);
                    await appDb.doc(`users/${userDoc.id}`).update({
                        guestId,
                        pgId,
                        ownerId,
                        phone: standardizedPhone,
                        role: 'tenant', // Explicitly upgrade/restore role to tenant
                        status: 'active'
                    }); // Ensure phone and role are synced

                    // Also ensure Firebase Auth user exists/is updated if we have a password
                    if (phone && (newGuest as any)._defaultPassword) {
                        try {
                            const { getAdminAuth } = await import('@/lib/firebaseAdmin');
                            const auth = await getAdminAuth();
                            const internalEmail = `${standardizedPhone.replace(/\D/g, '').slice(-10)}@roombox.app`;

                            try {
                                await auth.updateUser(userDoc.id, {
                                    password: (newGuest as any)._defaultPassword
                                });
                            } catch (e: any) {
                                if (e.code === 'auth/user-not-found') {
                                    await auth.createUser({
                                        uid: userDoc.id,
                                        email: internalEmail,
                                        password: (newGuest as any)._defaultPassword,
                                        phoneNumber: standardizedPhone
                                    });
                                }
                            }
                        } catch (authErr) {
                            console.warn('[TenantService.onboardTenant] Firebase Auth update failed:', authErr);
                        }
                    }

                    if (userData.fcmToken) {
                        try {
                            const { getAdminMessaging } = await import('@/lib/firebaseAdmin');
                            const messaging = await getAdminMessaging();
                            console.log(`[TenantService.onboardTenant] Sending FCM to token: ${userData.fcmToken.substring(0, 10)}...`);
                            await messaging.send({
                                token: userData.fcmToken,
                                notification: {
                                    title: '🏠 Welcome to RentSutra!',
                                    body: `You have been added as a tenant in ${pgName || newGuest.pgName}.`
                                },
                                webpush: { fcmOptions: { link: '/' } }
                            });
                            console.log(`[TenantService.onboardTenant] FCM sent successfully.`);
                        } catch (fcmErr) { console.warn(`[TenantService.onboardTenant] FCM Notify Failed:`, fcmErr); }
                    }
                } else {
                    // AUTO-VERIFICATION: If no user doc exists, create a skeleton one with the phone number
                    // and create a Firebase Auth user
                    if (phone) {
                        console.log(`[TenantService.onboardTenant] Creating skeleton user & Firebase Auth for phone: ${standardizedPhone}`);

                        // Use a phone-based ID if no email exists to avoid collisions
                        const cleanPhoneDigits = standardizedPhone.replace(/\D/g, '');
                        const uid = `phone-${cleanPhoneDigits.slice(-10)}`;
                        const internalEmail = `${cleanPhoneDigits.slice(-10)}@roombox.app`;

                        const userPlaceholder: any = {
                            phone: standardizedPhone,
                            role: 'tenant',
                            guestId,
                            pgId,
                            ownerId,
                            name,
                            createdAt: Date.now(),
                        };

                        // Create Firebase Auth User
                        if ((newGuest as any)._defaultPassword) {
                            try {
                                const { getAdminAuth } = await import('@/lib/firebaseAdmin');
                                const auth = await getAdminAuth();
                                await auth.createUser({
                                    uid,
                                    email: internalEmail,
                                    password: (newGuest as any)._defaultPassword,
                                    phoneNumber: standardizedPhone
                                });
                                console.log(`[TenantService.onboardTenant] Firebase Auth user created: ${uid}`);
                            } catch (authErr) {
                                console.warn('[TenantService.onboardTenant] Firebase Auth creation failed:', authErr);
                            }
                        }

                        await appDb.collection('users').doc(uid).set(userPlaceholder, { merge: true });
                    }

                    if (email) {
                        console.log(`[TenantService.onboardTenant] No user found for ${email}. Creating invite and magic link...`);
                        await appDb.doc(`invites/${email}`).set({ email, ownerId, role: 'tenant', details: newGuest, createdAt: Date.now() });
                    }
                }
            } catch (userLinkErr) {
                console.warn(`[TenantService.onboardTenant] User link/FCM failed:`, userLinkErr);
            }
        }

        // 2. WhatsApp Welcome
        if (phone) {
            try {
                let formattedPhone = phone.replace(/\D/g, '');
                if (formattedPhone.length === 10) formattedPhone = '91' + formattedPhone;

                const { sendWhatsAppTemplate } = await import('@/lib/whatsapp/send-message');

                // Fetch Owner Phone for "Message Owner" button
                const ownerSnap = await db.collection('users_data').doc(ownerId).get();
                let ownerPhone = '';
                if (ownerSnap.exists) {
                    ownerPhone = (ownerSnap.data() as any).phone || '';
                    ownerPhone = ownerPhone.replace(/\D/g, '');
                    if (ownerPhone.length === 10) ownerPhone = '91' + ownerPhone;
                }

                const appUrl = (process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || 'https://rentsutra-v1.netlify.app');
                const dashboardUrl = await TenantService.generateMagicLink(appDb, guestId, standardizedPhone, ownerId, pgName || newGuest.pgName || 'RentSutra');
                magicLinkResult = dashboardUrl;

                console.log(`[TenantService.onboardTenant] Attempting to send WhatsApp template welcome to ${formattedPhone}`);

                // Use a verified, reachable logo URL for the header
                // Fallback to the Netlify app since local roombox.in might not be resolvable to Meta servers.
                const logoUrl = `${appUrl}/icons/icon-512x512.png`;

                const components = [
                    {
                        type: 'header',
                        parameters: [
                            {
                                type: 'image',
                                image: {
                                    link: logoUrl
                                }
                            }
                        ]
                    },
                    {
                        type: 'body',
                        parameters: [
                            { type: 'text', text: name }, // {{1}}
                            { type: 'text', text: pgName || newGuest.pgName || 'Our Property' }, // {{2}}
                            { type: 'text', text: roomName || 'Assigned Room' }, // {{3}}
                            { type: 'text', text: String(newGuest.rentAmount || 0) }, // {{4}}
                            { type: 'text', text: ownerPhone || 'Host' }, // {{5}}
                            { type: 'text', text: dashboardUrl } // {{6}} (Full URL in Body)
                        ]
                    }
                ];

                const result = await sendWhatsAppTemplate(formattedPhone, 'new_guest_welcome_utility_2', 'en_US', components, ownerId, guestId);

                if (!result.success) {
                    console.warn(`[onboardTenant] Template failed, sending fallback text message...`);
                    const fallbackMsg = `👋 *Welcome to ${pgName || newGuest.pgName}!*\n\nHi ${name}, your host has added you to the portal.\n\nRoom: ${roomName || 'Assigned Room'}\nRent: ₹${newGuest.rentAmount}\n\nAccess your Dashboard here: ${dashboardUrl}`;
                    await import('@/lib/whatsapp/send-message').then(m => m.sendWhatsAppMessage(formattedPhone, fallbackMsg, ownerId, guestId));
                } else {
                    console.log(`[onboardTenant] WhatsApp template welcome sent successfully to ${formattedPhone}`);
                }
            } catch (waErr) {
                console.warn(`[TenantService.onboardTenant] WA Notify Failed:`, waErr);
            }
        }

        console.log(`[TenantService.onboardTenant] Onboarding complete for ${guestId}`);
        return { guest: newGuest, magicLink: magicLinkResult };
    }

    /**
     * Update a tenant record atomically.
     */
    static async updateTenant(db: Firestore, ownerId: string, guestId: string, updates: Partial<Guest>): Promise<void> {
        console.log(`[TenantService.updateTenant] Updating ${guestId}`);

        // Safety check for mandatory fields
        if (updates.hasOwnProperty('dueDate') && (updates.dueDate === undefined || updates.dueDate === null)) {
            throw new Error('dueDate cannot be null or undefined');
        }
        if (updates.hasOwnProperty('moveInDate') && (updates.moveInDate === undefined || updates.moveInDate === null)) {
            throw new Error('moveInDate cannot be null or undefined');
        }

        await db.collection('users_data').doc(ownerId).collection('guests').doc(guestId).update(updates);
    }

    /**
     * Initiate exit process.
     */
    static async initiateTenantExit(db: Firestore, ownerId: string, guestId: string, noticePeriodDays: number = 30): Promise<Partial<Guest>> {
        console.log(`[TenantService.initiateTenantExit] Initiating exit for ${guestId}`);
        const exitDate = new Date();
        exitDate.setDate(exitDate.getDate() + noticePeriodDays);
        const exitDateStr = exitDate.toISOString();
        await db.collection('users_data').doc(ownerId).collection('guests').doc(guestId).set({ exitDate: exitDateStr }, { merge: true });
        return { id: guestId, exitDate: exitDateStr };
    }

    /**
     * Vacate a tenant: mark vacated, free bed, decrement occupancy.
     */
    static async vacateTenant(db: Firestore, ownerId: string, guestId: string, appDb?: Firestore, sendWhatsApp: boolean = false): Promise<{ guestId: string; pgId: string }> {
        console.log(`[TenantService.vacateTenant] Vacating ${guestId}`);
        const guestRef = db.collection('users_data').doc(ownerId).collection('guests').doc(guestId);
        const snap = await guestRef.get();
        if (!snap.exists) throw new Error(`Guest not found: ${guestId}`);

        const guest = snap.data() as Guest;
        const pgRef = db.collection('users_data').doc(ownerId).collection('pgs').doc(guest.pgId);
        const pgSnap = await pgRef.get();
        if (!pgSnap.exists) throw new Error(`PG not found: ${guest.pgId}`);

        const pgData = pgSnap.data()!;
        const vacatedAt = new Date().toISOString();

        // Perform Deposit Reconciliation
        const totalDebits = (guest.ledger || []).filter(e => e.type === 'debit').reduce((sum, e) => sum + e.amount, 0);
        const totalCredits = (guest.ledger || []).filter(e => e.type === 'credit').reduce((sum, e) => sum + e.amount, 0);
        const currentBalance = totalDebits - totalCredits;

        // As per the Escrow Model: Deposit is handled entirely separately from operating rent.
        // It is NOT injected into the ledger as a credit/debit until final settlement logic.
        let finalSettlementAmount = 0;

        if (guest.depositAmount && guest.depositAmount > 0) {
            finalSettlementAmount = guest.depositAmount - currentBalance;
        } else {
            finalSettlementAmount = -currentBalance;
        }

        // Positive finalSettlementAmount means the PG owner physically refunds the tenant.
        // Negative finalSettlementAmount means the tenant must still pay the remaining debt.

        const ledgerUpdates: any[] = [];

        // Free the bed in floors data
        const updatedFloors = pgData.floors
            ? (pgData.floors as any[]).map((floor: any) => ({
                ...floor,
                rooms: floor.rooms.map((room: any) => ({
                    ...room,
                    beds: room.beds.map((bed: any) =>
                        bed.guestId === guestId ? { ...bed, guestId: null } : bed
                    ),
                })),
            }))
            : undefined;

        const batch = db.batch();

        const guestUpdates: any = {
            isVacated: true,
            exitDate: vacatedAt,
            finalSettlementAmount
        };

        if (ledgerUpdates.length > 0) {
            guestUpdates.ledger = FieldValue.arrayUnion(...ledgerUpdates);
        }

        batch.update(guestRef, guestUpdates);
        batch.update(pgRef, {
            occupancy: Math.max(0, (pgData.occupancy || 0) - 1),
            ...(updatedFloors ? { floors: updatedFloors } : {}),
        });
        await batch.commit();

        // Clear user's active guestId (best-effort)
        if (guest.userId && appDb) {
            try {
                await appDb.doc(`users/${guest.userId}`).set({ guestId: null, pgId: null }, { merge: true });
            } catch (e) {
                console.warn('[TenantService.vacateTenant] Could not clear user guestId:', e);
            }
        }

        // WhatsApp Settlement Notification
        if (sendWhatsApp && guest.phone) {
            try {
                let formattedPhone = guest.phone.replace(/\D/g, '');
                if (formattedPhone.length === 10) formattedPhone = '91' + formattedPhone;

                const { format } = require('date-fns');
                const exitDateStr = format(new Date(), 'do MMM yyyy');
                const settlementText = finalSettlementAmount > 0
                    ? `You will receive a refund of ₹${finalSettlementAmount.toLocaleString('en-IN')}`
                    : finalSettlementAmount < 0
                        ? `You have a pending due of ₹${Math.abs(finalSettlementAmount).toLocaleString('en-IN')}`
                        : `Your account is fully settled (₹0 balance).`;

                const msg = `👋 *Hi ${guest.name}, your checkout from ${guest.pgName} is confirmed.*\n\n` +
                    `*Checkout Date:* ${exitDateStr}\n` +
                    `*Security Deposit:* ₹${(guest.depositAmount || 0).toLocaleString('en-IN')}\n` +
                    `*Unpaid Dues:* ₹${currentBalance.toLocaleString('en-IN')}\n\n` +
                    `*Final Settlement:* ${settlementText}\n\n` +
                    `Thank you for staying with us!`;

                const { sendWhatsAppMessage } = await import('@/lib/whatsapp/send-message');
                await sendWhatsAppMessage(formattedPhone, msg, ownerId, guestId);
                console.log(`[TenantService.vacateTenant] WhatsApp settlement sent to ${formattedPhone}`);
            } catch (err) {
                console.warn(`[TenantService.vacateTenant] WA Notify Failed:`, err);
            }
        }

        console.log(`[TenantService.vacateTenant] ${guestId} vacated successfully.`);
        return { guestId, pgId: guest.pgId };
    }

    /**
     * Record payment and run reconciliation.
     * Wrapped in a Firestore transaction to prevent race conditions
     * (e.g., owner updating rent while tenant pays simultaneously).
     */
    static async recordPayment(db: Firestore, input: {
        ownerId: string,
        guestId?: string,
        guest?: Guest,
        amount: number,
        paymentMode?: string,
        notes?: string
    }): Promise<{ guest: Guest, ledgerEntry: LedgerEntry, newBalance: number, newStatus: string }> {
        const { ownerId, amount, paymentMode = 'cash', notes = '' } = input;
        const resolvedGuestId = input.guestId || input.guest?.id;

        if (!resolvedGuestId) throw new Error('Guest or guestId required');
        if (!amount || Number(amount) <= 0) throw new Error('Payment amount must be greater than 0');

        const guestRef = db.collection('users_data').doc(ownerId).collection('guests').doc(resolvedGuestId);
        const now = new Date();

        const creditEntry: LedgerEntry = {
            id: `credit-${Date.now()}`,
            date: now.toISOString(),
            type: 'credit',
            description: `${notes || 'Rent Payment'} (${paymentMode})`,
            amount: Number(amount),
        };

        console.log(`[TenantService.recordPayment] Recording payment (transactional) for ${resolvedGuestId}`);

        const result = await db.runTransaction(async (txn) => {
            const snap = await txn.get(guestRef);
            if (!snap.exists) throw new Error('Guest not found');
            const guest = snap.data() as Guest;

            if (guest.isVacated) throw new Error('Cannot record payment for a vacated tenant');

            const guestWithPayment = {
                ...guest,
                ledger: [...(guest.ledger || []), creditEntry],
                paymentHistory: [
                    ...(guest.paymentHistory || []),
                    {
                        id: `pay-${Date.now()}`,
                        date: now.toISOString(),
                        amount: Number(amount),
                        method: paymentMode,
                        forMonth: now.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }),
                    },
                ],
            };

            const { guest: reconciledGuest } = runReconciliationLogic(guestWithPayment as Guest, now);

            const totalDebits = reconciledGuest.ledger.filter(e => e.type === 'debit').reduce((sum, e) => sum + e.amount, 0);
            const totalCredits = reconciledGuest.ledger.filter(e => e.type === 'credit').reduce((sum, e) => sum + e.amount, 0);
            const newBalance = Number((totalDebits - totalCredits).toFixed(2));

            const hasRemainder = Math.abs((totalCredits % reconciledGuest.rentAmount)) > 0.01 &&
                Math.abs((totalCredits % reconciledGuest.rentAmount) - reconciledGuest.rentAmount) > 0.01;

            const finalGuest = {
                ...reconciledGuest,
                balance: newBalance,
                rentStatus: (newBalance > 0 ? (hasRemainder ? 'partial' : 'unpaid') : 'paid') as 'paid' | 'unpaid' | 'partial'
            };

            txn.set(guestRef, finalGuest, { merge: true });

            // Send WhatsApp Receipt Template (Non-blocking)
            (async () => {
                try {
                    const phone = finalGuest.phone;
                    if (!phone) return;

                    let formattedPhone = phone.replace(/\D/g, '');
                    if (formattedPhone.length === 10) formattedPhone = '91' + formattedPhone;

                    const { sendWhatsAppTemplate } = await import('@/lib/whatsapp/send-message');

                    const appUrl = (process.env.APP_URL || 'https://roombox.in');
                    const receiptUrl = `${appUrl}/ledger/${creditEntry.id}`;

                    await sendWhatsAppTemplate(formattedPhone, 'new_payment_success_receipt_utility', 'en_US', [
                        {
                            type: 'body',
                            parameters: [
                                { type: 'text', text: finalGuest.name },
                                { type: 'text', text: String(amount) },
                                { type: 'text', text: creditEntry.description },
                                { type: 'text', text: String(newBalance) },
                                { type: 'text', text: creditEntry.id },
                                { type: 'text', text: receiptUrl } // {{6}}
                            ]
                        }
                    ], ownerId, resolvedGuestId);
                    console.log(`[recordPayment] WhatsApp receipt sent to ${formattedPhone}`);
                } catch (receiptErr) {
                    console.warn(`[recordPayment] Failed to send WhatsApp receipt:`, receiptErr);
                }
            })();

            return {
                guest: finalGuest,
                ledgerEntry: creditEntry,
                newBalance,
                newStatus: finalGuest.rentStatus,
            };
        });

        console.log(`[TenantService.recordPayment] Payment recorded. New Balance: ${result.newBalance}`);
        return result;
    }

    /**
     * Voids a previously recorded payment by removing its ledger entry and recalculating balance.
     */
    static async voidPayment(db: Firestore, ownerId: string, guestId: string, ledgerEntryId: string): Promise<{ newBalance: number; newStatus: string }> {
        console.log(`[TenantService.voidPayment] Voiding entry ${ledgerEntryId} for guest ${guestId}`);
        const guestRef = db.collection('users_data').doc(ownerId).collection('guests').doc(guestId);

        const result = await db.runTransaction(async (txn) => {
            const snap = await txn.get(guestRef);
            if (!snap.exists) throw new Error('Guest not found');
            const guest = snap.data() as Guest;

            const entryToVoid = (guest.ledger || []).find(e => e.id === ledgerEntryId);
            if (!entryToVoid) throw new Error('Ledger entry not found');
            if (entryToVoid.type !== 'credit') throw new Error('Only credit (payment) entries can be voided');

            const updatedLedger = (guest.ledger || []).filter(e => e.id !== ledgerEntryId);

            // Re-calculate balance from scratch for safety
            const totalDebits = updatedLedger.filter(e => e.type === 'debit').reduce((sum, e) => sum + e.amount, 0);
            const totalCredits = updatedLedger.filter(e => e.type === 'credit').reduce((sum, e) => sum + e.amount, 0);
            const newBalance = totalDebits - totalCredits;

            const hasCredits = updatedLedger.some(e => e.type === 'credit');
            const newStatus = (newBalance > 0 ? (hasCredits ? 'partial' : 'unpaid') : 'paid') as 'paid' | 'unpaid' | 'partial';

            const finalGuest = {
                ...guest,
                ledger: updatedLedger,
                balance: newBalance,
                rentStatus: newStatus
            };

            txn.set(guestRef, finalGuest, { merge: true });

            return {
                newBalance,
                newStatus
            };
        });

        console.log(`[TenantService.voidPayment] Success. New Balance: ${result.newBalance}`);
        return result;
    }


    /**
     * KYC status update.
     */
    static async updateKycStatus(db: Firestore, ownerId: string, guestId: string, status: 'verified' | 'rejected', reason?: string): Promise<void> {
        console.log(`[TenantService.updateKycStatus] Setting ${guestId} to ${status}`);
        await db.collection('users_data').doc(ownerId).collection('guests').doc(guestId).set({
            kycStatus: status,
            kycRejectReason: reason || null,
        }, { merge: true });
    }

    /**
     * Submit KYC documents.
     */
    static async submitKycDocuments(db: Firestore, ownerId: string, guestId: string, documents: SubmittedKycDocument[]): Promise<void> {
        console.log(`[TenantService.submitKycDocuments] ${guestId} submitted ${documents.length} docs`);
        await db.collection('users_data').doc(ownerId).collection('guests').doc(guestId).set({
            kycStatus: 'pending',
            documents,
        }, { merge: true });
    }

    /**
     * Reset KYC.
     */
    static async resetKyc(db: Firestore, ownerId: string, guestId: string): Promise<void> {
        console.log(`[TenantService.resetKyc] Resetting KYC for ${guestId}`);
        await db.collection('users_data').doc(ownerId).collection('guests').doc(guestId).set({
            kycStatus: 'not-started',
            kycRejectReason: null,
            documents: [],
        }, { merge: true });
    }

    /**
     * Add charge.
     */
    static async addCharge(db: Firestore, ownerId: string, guestId: string, charge: { description: string, amount: number }): Promise<LedgerEntry> {
        console.log(`[TenantService.addCharge] Adding charge to ${guestId}: ${charge.description}`);
        const newCharge: LedgerEntry = {
            id: `charge-${Date.now()}`,
            date: new Date().toISOString(),
            type: 'debit',
            description: charge.description,
            amount: charge.amount,
        };
        await db.collection('users_data').doc(ownerId).collection('guests').doc(guestId).update({
            ledger: FieldValue.arrayUnion(newCharge),
        });
        return newCharge;
    }

    /**
     * Remove charge.
     */
    static async removeCharge(db: Firestore, ownerId: string, guestId: string, chargeId: string): Promise<void> {
        console.log(`[TenantService.removeCharge] Removing ${chargeId} from ${guestId}`);
        const guestRef = db.collection('users_data').doc(ownerId).collection('guests').doc(guestId);
        const snap = await guestRef.get();
        if (!snap.exists) throw new Error('Guest not found');
        const guest = snap.data() as Guest;
        const charge = (guest.ledger || []).find(c => c.id === chargeId);
        if (!charge) throw new Error('Charge not found');
        await guestRef.update({ ledger: FieldValue.arrayRemove(charge) });
    }

    /**
     * Shared room charge.
     */
    static async addSharedRoomCharge(db: Firestore, ownerId: string, roomId: string, charge: { description: string, amount: number }): Promise<{ updatedCount: number }> {
        console.log(`[TenantService.addSharedRoomCharge] Adding ${charge.amount} shared charge to room ${roomId}`);
        const guestsSnap = await db.collection('users_data').doc(ownerId).collection('guests')
            .where('roomId', '==', roomId)
            .where('isVacated', '==', false)
            .get();

        if (guestsSnap.empty) throw new Error('No active guests in this room');

        const chargePerGuest = charge.amount / guestsSnap.docs.length;
        const batch = db.batch();
        guestsSnap.docs.forEach(doc => {
            const newCharge: LedgerEntry = {
                id: `charge-${Date.now()}-${doc.id}`,
                date: new Date().toISOString(),
                type: 'debit',
                description: charge.description,
                amount: chargePerGuest,
            };
            batch.update(doc.ref, { ledger: FieldValue.arrayUnion(newCharge) });
        });
        await batch.commit();
        return { updatedCount: guestsSnap.docs.length };
    }

    /**
     * Fetches monthly summary.
     */
    static async getMonthlyRentSummary(db: Firestore, ownerId: string): Promise<RentSummary> {
        const guestsSnap = await db.collection('users_data').doc(ownerId).collection('guests').where('isVacated', '==', false).get();
        let expected = 0;
        let collected = 0;
        guestsSnap.forEach(doc => {
            const d = doc.data();
            expected += (d.rentAmount || 0);
            collected += (d.paidAmount || 0);
        });
        return { expected, collected, pending: expected - collected };
    }

    /**
     * Fetches tenants.
     */
    static async getActiveTenants(db: Firestore, ownerId: string, limit: number = 200, status?: string): Promise<any[]> {
        let query = db.collection('users_data').doc(ownerId).collection('guests').where('isVacated', '==', false);
        if (status) query = query.where('paymentStatus', '==', status);
        const snap = await query.limit(limit).get();
        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    }

    /**
     * Advance billing cycles.
     */
    static async reconcileRentCycle(db: Firestore, ownerId: string, guestId: string, mockDate?: string): Promise<{ guest: Guest, cyclesProcessed: number }> {
        const guestRef = db.collection('users_data').doc(ownerId).collection('guests').doc(guestId);
        const snap = await guestRef.get();
        if (!snap.exists) throw new Error('Guest not found');
        const guest = snap.data() as Guest;
        const now = mockDate ? new Date(mockDate) : new Date();
        const { guest: reconciledGuest, cyclesProcessed } = runReconciliationLogic(guest, now);
        if (cyclesProcessed > 0 || JSON.stringify(guest) !== JSON.stringify(reconciledGuest)) {
            await guestRef.set(reconciledGuest, { merge: true });
        }
        return { guest: reconciledGuest, cyclesProcessed };
    }

    /**
     * Notifies a tenant about a complaint status change via WhatsApp.
     */
    static async notifyComplaintStatusChange(db: Firestore, ownerId: string, complaintId: string, status: string): Promise<void> {
        console.log(`[TenantService.notifyComplaintStatusChange] Root call for ${complaintId} -> ${status}`);
        const complaintRef = db.collection('users_data').doc(ownerId).collection('complaints').doc(complaintId);
        const compSnap = await complaintRef.get();
        if (!compSnap.exists) return;

        const compData = compSnap.data() as any;
        const guestId = compData.guestId;
        if (!guestId) return;

        const guestRef = db.collection('users_data').doc(ownerId).collection('guests').doc(guestId);
        const guestSnap = await guestRef.get();
        if (!guestSnap.exists) return;

        const guestData = guestSnap.data() as Guest;
        const phone = guestData.phone;
        if (!phone) return;

        const statusLabel = status === 'resolved' ? '✅ *Resolved*' :
            status === 'in-progress' ? '⏳ *In Progress*' : status;

        const message = `🔧 *Update on your Maintenance Request*\n\n` +
            `Issue: ${compData.description || compData.category}\n` +
            `New Status: ${statusLabel}\n\n` +
            (status === 'resolved' ? `If this isn't fixed yet, please contact your landlord.` : `We are working on it!`);

        try {
            let formattedPhone = phone.replace(/\D/g, '');
            if (formattedPhone.length === 10) formattedPhone = '91' + formattedPhone;

            const { sendWhatsAppTemplate } = await import('@/lib/whatsapp/send-message');
            const appUrl = (process.env.APP_URL || 'https://roombox.in');
            const statusUrl = `${appUrl}/complaints/${complaintId}`;
            const title = compData.description || compData.category;
            const updateMessage = status === 'resolved' ? 'Fixed! Contact landlord if issue persists.' : 'We are working on it!';

            await sendWhatsAppTemplate(formattedPhone, 'new_maintenance_ticket_update', 'en_US', [
                {
                    type: 'body',
                    parameters: [
                        { type: 'text', text: guestData.pgName || 'Property' }, // {{1}}
                        { type: 'text', text: guestData.name }, // {{2}}
                        { type: 'text', text: title }, // {{3}}
                        { type: 'text', text: status.toUpperCase() }, // {{4}}
                        { type: 'text', text: updateMessage }, // {{5}}
                        { type: 'text', text: statusUrl } // {{6}}
                    ]
                }
            ], ownerId, guestId);

            console.log(`[TenantService.notifyComplaintStatusChange] WhatsApp template notification sent to ${formattedPhone}`);
        } catch (err) {
            console.warn(`[TenantService.notifyComplaintStatusChange] Failed to send WhatsApp:`, err);
        }
    }
}
