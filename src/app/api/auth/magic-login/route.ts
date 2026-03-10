import { NextRequest, NextResponse } from "next/server";
import { getAdminDb, getAdminAuth } from "@/lib/firebaseAdmin";
import { serverError, badRequest, unauthorized } from "@/lib/api/apiError";

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const token = searchParams.get('token');

        if (!token) return badRequest("Token is required");

        const adminDb = await getAdminDb();
        const doc = await adminDb.collection("magic_links").doc(token).get();

        if (!doc.exists) return unauthorized("Invalid link");

        const data = doc.data()!;
        if (data.used || (data.expiresAt && Date.now() > data.expiresAt)) {
            return unauthorized("Link expired or already used");
        }

        return NextResponse.json({
            success: true,
            pgName: data.pgName
        });
    } catch (error) {
        return serverError(error, "GET /api/auth/magic-login");
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { token } = body;

        if (!token) {
            return badRequest("Magic login token is required");
        }

        const adminDb = await getAdminDb();
        const magicLinkRef = adminDb.collection("magic_links").doc(token);
        const magicLinkDoc = await magicLinkRef.get();

        if (!magicLinkDoc.exists) {
            return unauthorized("Invalid or expired login link");
        }

        const magicLinkData = magicLinkDoc.data()!;

        // 1. Check expiration (24 hours)
        if (magicLinkData.expiresAt && Date.now() > magicLinkData.expiresAt) {
            return unauthorized("This login link has expired. Please contact your host.");
        }

        // 2. Check if already used
        if (magicLinkData.used) {
            return unauthorized("This login link has already been used.");
        }

        // 3. Find/Provision User & Generate Custom Token
        const auth = await getAdminAuth();

        // We use the ID stored in magic_link or derived from phone
        const uid = magicLinkData.guestId || `phone-${magicLinkData.phone.replace(/\D/g, '')}`;

        // Mark as used immediately to prevent race conditions
        await magicLinkRef.update({
            used: true,
            usedAt: Date.now()
        });

        const customToken = await auth.createCustomToken(uid, {
            role: 'tenant',
            guestId: magicLinkData.guestId,
            ownerId: magicLinkData.ownerId
        });

        return NextResponse.json({
            success: true,
            customToken,
            guestId: magicLinkData.guestId,
            pgName: magicLinkData.pgName
        });

    } catch (error) {
        return serverError(error, "POST /api/auth/magic-login");
    }
}
