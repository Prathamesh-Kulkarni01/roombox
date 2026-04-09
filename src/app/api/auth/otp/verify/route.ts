import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb, getAdminAuth, selectOwnerDataAdminDb } from '@/lib/firebaseAdmin';

export async function POST(req: NextRequest) {
    try {
        const { phone, otp } = await req.json();
        console.log(`[OTP Verify] Attempting verification for phone: ${phone}, code: ${otp}`);

        if (!phone || !otp) {
            return NextResponse.json({ error: 'Phone and OTP are required' }, { status: 400 });
        }

        const appDb = await getAdminDb();
        const auth = await getAdminAuth();
        const cleanPhone = phone.replace(/\D/g, '');

        let userRole: any = null;
        let ownerId: string | null = null;
        let guestId: string | null = null;
        let staffId: string | null = null;
        let magicLinkDocId: string | null = null;
        let isInviteCode = false;
        let invitationData: any = null;
        let magicLinkDoc: any = null;

        // 1. Check system_otps (Standard OTP)
        const otpDoc = await appDb.collection('system_otps').doc(cleanPhone).get();
        if (otpDoc.exists) {
            const otpData = otpDoc.data()!;
            console.log(`[OTP Verify] Found system_otp for ${cleanPhone}.`);
            if (otpData.otp === otp) {
                if (otpData.expiresAt > Date.now()) {
                    console.log(`[OTP Verify] system_otp valid.`);
                    userRole = otpData.role || 'unassigned';
                    ownerId = otpData.ownerId;
                } else {
                    console.warn(`[OTP Verify] system_otp expired.`);
                    return NextResponse.json({ error: 'OTP expired. Please request a new one.' }, { status: 400 });
                }
            } else {
                console.warn(`[OTP Verify] system_otp mismatch. Expected ${otpData.otp}, got ${otp}`);
                // Fall through to magic_links if mismatch
            }
        }

        // 2. Check magic_links (6-digit Setup Codes / Invite Codes)
        if (!userRole) {
            const magicSnap = await appDb.collection('magic_links')
                .where('inviteCode', '==', otp)
                .where('used', '==', false)
                .get();

            console.log(`[OTP Verify] Found ${magicSnap.size} magic_link documents for code ${otp}`);

            if (!magicSnap.empty) {
                // Find a magic link that matches this phone number
                for (const mDoc of magicSnap.docs) {
                    const m = mDoc.data();
                    const dp = (m.phone || '').replace(/\D/g, '');
                    const cp = cleanPhone;

                    console.log(`[OTP Verify] Evaluating magic_link. Stored Phone: ${m.phone} (${dp}), Input Phone: ${phone} (${cp})`);

                    if (dp === cp || dp.slice(-10) === cp.slice(-10)) {
                        console.log(`[OTP Verify] Magic link matched phone. Role: ${m.role}`);
                        if (m.expiresAt && m.expiresAt < Date.now()) {
                            console.warn(`[OTP Verify] Magic link expired.`);
                            return NextResponse.json({ error: 'Setup code expired. Please contact owner.' }, { status: 400 });
                        }

                        isInviteCode = true;
                        invitationData = m;
                        magicLinkDocId = mDoc.id;
                        magicLinkDoc = mDoc;
                        userRole = m.role || 'tenant';
                        ownerId = m.ownerId;
                        staffId = m.staffId;
                        guestId = m.guestId;
                        break;
                    }
                }
            }
        }

        if (!userRole) {
            console.warn(`[OTP Verify] No valid OTP or Invite Code found for ${phone}/${otp}`);
            return NextResponse.json({ error: 'Incorrect code or phone number.' }, { status: 400 });
        }

        // 3. Find user record in appDb ('users' collection)
        const cleanPhoneDigits = cleanPhone.slice(-10);
        const variations = [
            cleanPhone,
            `+91${cleanPhoneDigits}`,
            `91${cleanPhoneDigits}`,
            cleanPhoneDigits,
            `+${cleanPhone}` // In case it was already standardized
        ];
        
        console.log(`[OTP Verify] Searching for user document. Variations: ${JSON.stringify(variations)}`);
        
        let userDocSnap = null;
        for (const v of variations) {
            const snap = await appDb.collection('users').where('phone', '==', v).limit(1).get();
            if (!snap.empty) {
                userDocSnap = snap.docs[0];
                console.log(`[OTP Verify] User found using variation: ${v}`);
                break;
            }
        }

        if (!userDocSnap && isInviteCode && invitationData?.email) {
            console.log(`[OTP Verify] User not found by phone. Trying email: ${invitationData.email}`);
            const emailSnap = await appDb.collection('users').where('email', '==', invitationData.email).limit(1).get();
            if (!emailSnap.empty) {
                userDocSnap = emailSnap.docs[0];
                console.log(`[OTP Verify] User found by email.`);
            }
        }

        if (!userDocSnap) {
            console.error(`[OTP Verify] User record NOT found in 'users' collection for phone ${phone}`);
            return NextResponse.json({ error: 'User record not found. Please contact your property owner.' }, { status: 404 });
        }

        const userData = userDocSnap.data()!;
        const uid = userDocSnap.id;

        // 4. Cleanup
        if (isInviteCode && magicLinkDocId) {
            await appDb.collection('magic_links').doc(magicLinkDocId).update({
                used: true,
                usedAt: Date.now(),
                verifiedPhone: phone
            });
        } else if (otpDoc.exists) {
            await otpDoc.ref.delete();
        }

        // 5. Auto-link Guest to UID if needed
        const finalGuestId = userData.guestId || guestId;
        const finalOwnerId = userData.ownerId || ownerId;

        if (finalGuestId && finalOwnerId) {
            try {
                const guestRef = appDb.collection('users_data').doc(finalOwnerId).collection('guests').doc(finalGuestId);
                const gSnap = await guestRef.get();
                if (gSnap.exists && !gSnap.data()?.uid) {
                    await guestRef.update({ uid, linkedAt: Date.now(), inviteStatus: 'ACTIVE' });
                    console.log(`[OTP Verify] Auto-linked guest ${finalGuestId} to UID ${uid}`);
                }
            } catch (err) {
                console.warn(`[OTP Verify] Guest auto-link failed:`, err);
            }
        }

        // 6. Generate Custom Token
        const claims: any = {
            role: userData.role || userRole,
            ownerId: finalOwnerId || (userData.role === 'owner' ? uid : null),
        };

        if (claims.role === 'tenant') {
            claims.guestId = finalGuestId;
        } else if (claims.role !== 'owner' && claims.role !== 'admin') {
            // Staff roles
            const finalStaffId = userData.staffId || staffId;
            claims.staffId = finalStaffId;
            claims.pgId = userData.pgId || invitationData?.pgId;
            
            // Read permissions from the authoritative staff record, not the skeleton user doc.
            // The user doc often lacks permissions; the staff doc is the source of truth.
            let staffPermissions = userData.permissions;
            if ((!staffPermissions || staffPermissions.length === 0) && finalStaffId && finalOwnerId) {
                try {
                    const staffRef = appDb.collection('users_data').doc(finalOwnerId).collection('staff').doc(finalStaffId);
                    const staffSnap = await staffRef.get();
                    if (staffSnap.exists && staffSnap.data()?.permissions) {
                        staffPermissions = staffSnap.data()!.permissions;
                        console.log(`[OTP Verify] Loaded permissions from staff record: ${JSON.stringify(staffPermissions)}`);
                    }
                } catch (err) {
                    console.warn(`[OTP Verify] Could not read staff permissions:`, err);
                }
            }
            claims.permissions = staffPermissions || [];
            claims.pgs = userData.pgIds || (claims.pgId ? [claims.pgId] : []);
        }

        // 7. Ensure Firebase Auth user exists
        try {
            await auth.getUser(uid);
        } catch (err: any) {
            if (err.code === 'auth/user-not-found') {
                console.log(`[OTP Verify] Auto-provisioning Firebase Auth user: ${uid}`);
                await auth.createUser({
                    uid,
                    phoneNumber: userData.phone || (cleanPhone.length === 10 ? `+91${cleanPhone}` : `+${cleanPhone}`),
                    displayName: userData.name || 'User',
                });
            } else {
                throw err;
            }
        }

        const customToken = await auth.createCustomToken(uid, claims);
        await auth.setCustomUserClaims(uid, claims);

        console.log(`[OTP Verify] Success. Token generated for UID: ${uid}`);
        return NextResponse.json({ success: true, customToken });

    } catch (error: any) {
        console.error('Verify OTP error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
