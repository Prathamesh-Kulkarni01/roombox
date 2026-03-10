import { NextRequest, NextResponse } from "next/server";
import { getAdminDb, getAdminAuth } from "@/lib/firebaseAdmin";
import { hashPassword } from "@/lib/password-utils";

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

        // Find existing user in Firestore
        const cleanPhone = phone.replace(/\D/g, '');
        const variations = [phone, cleanPhone, `+${cleanPhone}`];
        if (cleanPhone.length === 10) variations.push(`+91${cleanPhone}`);

        let userDocRef = null;
        for (const v of variations) {
            const snap = await adminDb.collection('users').where('phone', '==', v).limit(1).get();
            if (!snap.empty) {
                userDocRef = snap.docs[0].ref;
                break;
            }
        }

        if (!userDocRef) {
            return NextResponse.json({ error: "No user found for this phone number." }, { status: 404 });
        }

        // Hash and save password
        const hashedPassword = hashPassword(password);
        await userDocRef.update({ password: hashedPassword });

        // Generate Custom Token to sign them in immediately
        // By using the Firestore document ID directly as the UID, we bypass Firebase Auth's strict E.164 
        // phone number validation rules. Firebase will automatically provision an Auth record if it doesn't exist.
        const auth = await getAdminAuth();
        const customToken = await auth.createCustomToken(userDocRef.id);

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
