import { NextRequest, NextResponse } from "next/server";
import { getAdminDb, getAdminAuth } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { token, password } = body;

        if (!token || !password) {
            return NextResponse.json({ error: "Token and password are required" }, { status: 400 });
        }

        if (password.length < 6) {
            return NextResponse.json({ error: "Password must be at least 6 characters long" }, { status: 400 });
        }

        const adminDb = await getAdminDb();
        const magicLinkRef = adminDb.collection("magic_links").doc(token);
        const magicLinkDoc = await magicLinkRef.get();

        if (!magicLinkDoc.exists) {
            return NextResponse.json({ error: "Invalid or expired setup link" }, { status: 401 });
        }

        const magicLinkData = magicLinkDoc.data();

        if (magicLinkData?.expiresAt && Date.now() > magicLinkData.expiresAt) {
            await magicLinkRef.delete();
            return NextResponse.json({ error: "Link has expired. Please request a new one." }, { status: 401 });
        }

        // Allow retry if the same token was already consumed by set-password (e.g., network error on first attempt)
        if (magicLinkData?.used && magicLinkData?.consumedBy !== 'set-password') {
            return NextResponse.json({ error: "This link has already been used." }, { status: 401 });
        }

        const phone = magicLinkData?.phone;
        if (!phone) {
            return NextResponse.json({ error: "Invalid link data (missing phone)." }, { status: 500 });
        }

        // Find existing user in Firestore to get the UID (which is doc id)
        const cleanPhone = phone.replace(/\D/g, '');
        const cleanPhoneDigits = cleanPhone.slice(-10);
        const variations = [
            phone, 
            cleanPhone, 
            `+${cleanPhone}`,
            `+91${cleanPhoneDigits}`,
            `91${cleanPhoneDigits}`,
            cleanPhoneDigits
        ];

        let userDoc = null;
        for (const v of variations) {
            const snap = await adminDb.collection('users').where('phone', '==', v).limit(1).get();
            if (!snap.empty) {
                userDoc = snap.docs[0];
                break;
            }
        }

        if (!userDoc) {
            // Safety net: If onboardTenant failed to create a user doc, create one now from magic link data
            console.warn(`[set-password] No user doc found for phone ${phone}. Creating from magic link data...`);
            const fallbackUid = magicLinkData?.guestId || magicLinkData?.staffId || `phone-${cleanPhoneDigits}`;
            const userRef = adminDb.collection('users').doc(fallbackUid);
            await userRef.set({
                phone: phone.startsWith('+') ? phone : (phone.length === 10 ? `+91${phone}` : phone),
                role: magicLinkData?.role || 'tenant',
                guestId: magicLinkData?.guestId || null,
                staffId: magicLinkData?.staffId || null,
                ownerId: magicLinkData?.ownerId || null,
                pgId: magicLinkData?.pgId || null,
                name: 'Tenant',
                createdAt: Date.now(),
            }, { merge: true });
            userDoc = await userRef.get();
            console.log(`[set-password] Fallback user doc created: ${fallbackUid}`);
        }

        const uid = userDoc.id;
        const auth = await getAdminAuth();
        const internalEmail = `${cleanPhone.slice(-10)}@roombox.app`;

        // Update or Create the user in Firebase Auth
        let finalUid = uid;
        try {
            await auth.updateUser(uid, {
                email: internalEmail,
                password: password,
                disabled: false
            });
        } catch (error: any) {
            // If user not found on the Firestore UID, or email/phone is already taken by another UID
            const isConflict = error.code === 'auth/email-already-exists' || error.code === 'auth/phone-number-already-exists';
            
            if (error.code === 'auth/user-not-found' || isConflict) {
                try {
                    // Search for an existing account with this phone or email
                    let existingAuthUser = null;
                    try {
                        existingAuthUser = await auth.getUserByEmail(internalEmail);
                    } catch (e) {
                        try {
                            const standardizedPhone = phone.startsWith('+') ? phone : (phone.length === 10 ? `+91${phone}` : phone);
                            existingAuthUser = await auth.getUserByPhoneNumber(standardizedPhone);
                        } catch (e2) {
                            // Truly does not exist
                        }
                    }

                    if (existingAuthUser) {
                        finalUid = existingAuthUser.uid;
                        // Update the existing auth record
                        await auth.updateUser(finalUid, {
                            email: internalEmail,
                            password: password,
                            disabled: false
                        });

                        // CRITICAL: If the Auth UID differs from our Firestore UID, 
                        // we must ensure a Firestore document exists at the Auth UID
                        if (finalUid !== uid) {
                            console.warn(`[set-password] UID Mismatch: Firestore=${uid}, Auth=${finalUid}. Migrating document.`);
                            const oldDocRef = adminDb.collection('users').doc(uid);
                            const newDocRef = adminDb.collection('users').doc(finalUid);
                            const oldDocSnap = await oldDocRef.get();
                            
                            if (oldDocSnap.exists) {
                                await newDocRef.set({
                                    ...oldDocSnap.data(),
                                    updatedAt: Date.now(),
                                    schemaVersion: 4
                                }, { merge: true });
                                // Optionally delete old doc, but merging is safer for now
                            }
                        }
                    } else {
                        // Truly new user
                        await auth.createUser({
                            uid: uid,
                            email: internalEmail,
                            phoneNumber: phone.startsWith('+') ? phone : (phone.length === 10 ? `+91${phone}` : phone),
                            password: password,
                            displayName: userDoc.data()?.name || 'Tenant'
                        });
                    }
                } catch (e: any) {
                    console.error("[set-password] Error in user creation/recovery:", e);
                    throw e;
                }
            } else {
                throw error;
            }
        }

        // Use the final established UID for tokens and further operations
        const finalUserDoc = await adminDb.collection('users').doc(finalUid).get();

        const role = magicLinkData?.role || finalUserDoc.data()?.role || 'tenant';
        const guestId = magicLinkData?.guestId || finalUserDoc.data()?.guestId || null;
        const staffId = magicLinkData?.staffId || finalUserDoc.data()?.staffId || null;
        const ownerId = magicLinkData?.ownerId || finalUserDoc.data()?.ownerId;
        const pgId = magicLinkData?.pgId || finalUserDoc.data()?.pgId;
        const permissions = finalUserDoc.data()?.permissions || {};

        // 5. Update user metadata & Clear legacy data
        const userUpdates: any = {
            role,
            status: 'active',
            updatedAt: new Date(),
            schemaVersion: 4 // Latest schema version
        };

        if (guestId) userUpdates.guestId = guestId;
        if (staffId) userUpdates.staffId = staffId;
        if (ownerId) userUpdates.ownerId = ownerId;
        if (pgId) userUpdates.pgId = pgId;

        // Clear legacy password from Firestore if it exists
        if (finalUserDoc.data()?.password) {
            userUpdates.password = FieldValue.delete();
        }

        await finalUserDoc.ref.update(userUpdates);

        const claims: any = {
            role,
            ownerId,
            pgId,
        };
        
        if (guestId) claims.guestId = guestId;
        if (staffId) claims.staffId = staffId;
        
        // Handle staff permissions
        if (role !== 'owner' && role !== 'tenant' && role !== 'admin') {
            claims.permissions = permissions;
            claims.pgs = finalUserDoc.data()?.pgIds || (pgId ? [pgId] : []);
        }

        // Set claims PERMANENTLY on the user's Auth record for standard logins on other browsers
        await auth.setCustomUserClaims(finalUid, claims);

        // Generate Custom Token to sign them in immediately with current session claims
        const customToken = await auth.createCustomToken(finalUid, claims);

        // Mark token as consumed (don't delete — allows retries if client-side signIn fails)
        await magicLinkRef.update({
            used: true,
            usedAt: Date.now(),
            consumedBy: 'set-password'
        });

        return NextResponse.json({
            success: true,
            customToken,
            role
        });

    } catch (error) {
        console.error("Set password error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
