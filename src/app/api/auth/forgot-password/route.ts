import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { TenantService } from "@/services/tenantService";
import { sendWhatsAppMessage } from "@/lib/whatsapp/send-message";

export async function POST(req: NextRequest) {
    try {
        const { phone } = await req.json();

        if (!phone) {
            return NextResponse.json({ error: "Phone number is required." }, { status: 400 });
        }

        const appDb = await getAdminDb();

        // 1. Standardize and find user
        const cleanPhone = phone.replace(/\D/g, '');
        const variations = [phone, cleanPhone, `+${cleanPhone}`];
        if (cleanPhone.length === 10) variations.push(`+91${cleanPhone}`);

        let userDoc = null;
        for (const v of variations) {
            const snap = await appDb.collection('users').where('phone', '==', v).limit(1).get();
            if (!snap.empty) {
                userDoc = snap.docs[0];
                break;
            }
        }

        if (!userDoc) {
            return NextResponse.json({ error: "No account found with this phone number." }, { status: 404 });
        }

        const userData = userDoc.data();

        if (userData.role !== 'tenant') {
            return NextResponse.json({ error: "This phone number is not registered as a tenant. Please use the Host login." }, { status: 400 });
        }

        // 2. Fetch PG name for the invite page context
        let pgName = 'RentSutra';
        if (userData.pgId && userData.ownerId) {
            const pgDoc = await appDb.collection('users_data').doc(userData.ownerId).collection('pgs').doc(userData.pgId).get();
            if (pgDoc.exists) {
                pgName = pgDoc.data()?.name || pgName;
            }
        }

        // 3. Generate Magic Link
        const formattedPhone = variations.find(v => v.startsWith("+91")) || `+91${cleanPhone}`;
        const magicLink = await TenantService.generateMagicLink(appDb, userData.guestId, formattedPhone, userData.ownerId, pgName);

        // 3. Send WhatsApp Message
        const messageText = `🔑 *Password Reset Request*\n\nHi ${userData.name},\nWe received a request to access your account.\n\nClick the link below to securely log in and reset your password:\n${magicLink}\n\nIf you didn't request this, please ignore this message.`;

        const waResult = await sendWhatsAppMessage(formattedPhone, messageText);

        if (!waResult.success) {
            throw new Error("Failed to send WhatsApp message.");
        }

        return NextResponse.json({ success: true, message: "A secure login link has been sent to your WhatsApp." });
    } catch (error) {
        console.error("Forgot password API error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
