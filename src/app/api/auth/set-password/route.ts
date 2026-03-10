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
        const variations = [phone, cleanPhone, `+${cleanPhone}`];
        if (cleanPhone.length === 10) variations.push(`+91${cleanPhone}`);

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

        // Update or Create the user in Firebase Auth
        try {
            await auth.updateUser(uid, {
                password: password,
                disabled: false
            });
        } catch (error: any) {
            if (error.code === 'auth/user-not-found') {
                // If the Auth record doesn't exist yet, create it
                await auth.createUser({
                    uid: uid,
                    phoneNumber: phone.startsWith('+') ? phone : (phone.length === 10 ? `+91${phone}` : phone),
                    password: password,
                    displayName: userDoc.data().name || 'Tenant'
                });
            } else {
                throw error;
            }
        }

        // Clear legacy password from Firestore if it exists
        await userDoc.ref.update({
            password: adminDb.terminate ? adminDb.terminate : null, // Using a workaround if deleteField isn't available directly
            // Better: just set it to a special value or ignore it in the app
            updatedAt: new Date(),
            schemaVersion: 2 // Mark as versioned
        });

        // Specific cleanup for password field
        await userDoc.ref.update({
            password: FieldValue.delete()
        });


        // Generate Custom Token to sign them in immediately
        const customToken = await auth.createCustomToken(uid);

        // Delete magic token now that it is consumed
        await magicLinkRef.delete();

        return NextResponse.json({
            success: true,
            customToken
        });

    } catch (error) {
        console.error("Set password error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
