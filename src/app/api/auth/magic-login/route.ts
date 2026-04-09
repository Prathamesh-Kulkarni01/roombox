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
            pgName: data.pgName,
            role: data.role || 'tenant'
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
        const phone = magicLinkData.phone;
        const cleanPhoneDigits = phone.replace(/\D/g, '');
        const cleanPhoneTenDigits = cleanPhoneDigits.slice(-10);
        const variations = [
            phone, 
            cleanPhoneDigits, 
            `+${cleanPhoneDigits}`,
            `+91${cleanPhoneTenDigits}`,
            `91${cleanPhoneTenDigits}`,
            cleanPhoneTenDigits
        ];
        
        let uid = magicLinkData.guestId || 
                  magicLinkData.staffId || 
                  (magicLinkData.role === 'staff' ? `staff-${cleanPhoneTenDigits}` : `phone-${cleanPhoneTenDigits}`);

        let userDoc = null;
        for (const v of variations) {
            const snap = await adminDb.collection('users').where('phone', '==', v).limit(1).get();
            if (!snap.empty) {
                userDoc = snap.docs[0];
                uid = userDoc.id;
                break;
            }
        }

        // Mark as used immediately to prevent race conditions
        await magicLinkRef.update({
            used: true,
            usedAt: Date.now()
        });

        const userRef = adminDb.collection('users').doc(uid);
        const userDocSnapshot = await userRef.get();
        
        // Use the snapshot data for claims if available, otherwise fallback to matching logic
        const role = magicLinkData.role || userDocSnapshot?.data()?.role || 'tenant';
        const permissions = userDocSnapshot?.data()?.permissions || {};
        const pgId = magicLinkData.pgId || userDocSnapshot?.data()?.pgId;

        const claims: any = {
            role,
            guestId: magicLinkData.guestId || userDocSnapshot?.data()?.guestId,
            staffId: magicLinkData.staffId || userDocSnapshot?.data()?.staffId,
            ownerId: magicLinkData.ownerId || userDocSnapshot?.data()?.ownerId,
            pgId: pgId
        };

        if (role !== 'owner' && role !== 'tenant' && role !== 'admin') {
            claims.permissions = permissions;
            claims.pgs = userDocSnapshot?.data()?.pgIds || (pgId ? [pgId] : []);
        }

        const customToken = await auth.createCustomToken(uid, claims);
        // Also persist claims for future standard logins
        await auth.setCustomUserClaims(uid, claims);

        // Ensure the User doc is updated with current info if it exists
        if (userDocSnapshot.exists) {
            const existingData = userDocSnapshot.data() || {};
            await userRef.update({
                guestId: magicLinkData.guestId || existingData.guestId || null,
                staffId: magicLinkData.staffId || existingData.staffId || null,
                ownerId: magicLinkData.ownerId,
                role,
                status: 'active',
                updatedAt: new Date()
            });
        }

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
