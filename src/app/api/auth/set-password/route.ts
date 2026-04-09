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
            return NextResponse.json({ error: "No user found for this phone number." }, { status: 404 });
        }

        const uid = userDoc.id;
        const auth = await getAdminAuth();
        const internalEmail = `${cleanPhone.slice(-10)}@roombox.app`;

        // Update or Create the user in Firebase Auth
        try {
            await auth.updateUser(uid, {
                email: internalEmail,
                password: password,
                disabled: false
            });
        } catch (error: any) {
            if (error.code === 'auth/user-not-found' || error.code === 'auth/email-already-exists') {
                // If user not found, create it. 
                // If email already exists but on a different UID, this is a conflict we should handle
                // However, usually we expect the internal email to be unique to this phone.
                await auth.createUser({
                    uid: uid,
                    email: internalEmail,
                    phoneNumber: phone.startsWith('+') ? phone : (phone.length === 10 ? `+91${phone}` : phone),
                    password: password,
                    displayName: userDoc.data().name || 'Tenant'
                }).catch(async (e) => {
                    // Final fallback: if uid exists but email mismatch
                    if (e.code === 'auth/uid-already-exists') {
                        await auth.updateUser(uid, { email: internalEmail, password: password });
                    } else {
                        throw e;
                    }
                });
            } else {
                throw error;
            }
        }

        const role = magicLinkData?.role || userDoc.data()?.role || 'tenant';
        const guestId = magicLinkData?.guestId || userDoc.data()?.guestId || null;
        const staffId = magicLinkData?.staffId || userDoc.data()?.staffId || null;
        const ownerId = magicLinkData?.ownerId || userDoc.data()?.ownerId;
        const pgId = magicLinkData?.pgId || userDoc.data()?.pgId;
        const permissions = userDoc.data()?.permissions || {};

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
        if (userDoc.data()?.password) {
            userUpdates.password = FieldValue.delete();
        }

        await userDoc.ref.update(userUpdates);

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
            claims.pgs = userDoc.data()?.pgIds || (pgId ? [pgId] : []);
        }

        // Set claims PERMANENTLY on the user's Auth record for standard logins on other browsers
        await auth.setCustomUserClaims(uid, claims);

        // Generate Custom Token to sign them in immediately with current session claims
        const customToken = await auth.createCustomToken(uid, claims);

        // Delete magic token now that it is consumed
        await magicLinkRef.delete();

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
