import { NextRequest, NextResponse } from "next/server";
import { resolveTenant } from '@/lib/tenantResolver';
import { getAdminDb, getAdminAuth, selectOwnerDataAdminDb } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import { serverError, badRequest, unauthorized } from "@/lib/api/apiError";
import type { Firestore } from "firebase-admin/firestore";
import { resolveTimeProvider } from "@/lib/providers";

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const token = searchParams.get('token');

        if (!token) return badRequest("Token is required");

        const { db: adminDb } = await resolveTenant(req);
        const doc = await adminDb.collection("magic_links").doc(token).get();

        if (!doc.exists) return unauthorized("Invalid link");

        const timeProvider = resolveTimeProvider();
        const data = doc.data()!;
        if (data.used || (data.expiresAt && timeProvider.now() > data.expiresAt)) {
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

        const { db: adminDb } = await resolveTenant(req);

        // ── 1. Read magic link from central DB (may be full data or a sharded pointer) ───────
        const centralMagicRef = adminDb.collection("magic_links").doc(token);
        const centralMagicDoc = await centralMagicRef.get();

        if (!centralMagicDoc.exists) {
            return unauthorized("Invalid or expired login link");
        }

        const timeProvider = resolveTimeProvider();
        const centralData = centralMagicDoc.data()!;

        if (centralData.expiresAt && timeProvider.now() > centralData.expiresAt) {
            return unauthorized("This login link has expired. Please contact your host.");
        }
        if (centralData.used && centralData.consumedBy !== 'magic-login') {
            return unauthorized("This login link has already been used.");
        }

        // ── 2. If sharded, fetch full magic link from the owner's custom DB ──────────────────
        let magicLinkData = centralData;
        let sourceMagicRef = centralMagicRef;
        let isShardedTenant = false;
        let ownerCustomDb: Firestore | null = null;

        if (centralData.isShardedTenant && centralData.ownerId) {
            isShardedTenant = true;
            console.log(`[magic-login] Sharded tenant detected (ownerId: ${centralData.ownerId}). Reading full magic link from custom DB.`);
            ownerCustomDb = await selectOwnerDataAdminDb(centralData.ownerId);

            const customMagicRef = ownerCustomDb.collection("magic_links").doc(token);
            const customMagicDoc = await customMagicRef.get();

            if (!customMagicDoc.exists) {
                console.error(`[magic-login] Sharded magic link not found in custom DB for ownerId: ${centralData.ownerId}`);
                return unauthorized("Invalid or expired login link");
            }

            magicLinkData = customMagicDoc.data()!;
            sourceMagicRef = customMagicRef;

            if (magicLinkData.used && magicLinkData.consumedBy !== 'magic-login') {
                return unauthorized("This login link has already been used.");
            }
        }

        // ── 3. Resolve or provision Firebase Auth UID ────────────────────────────────────────
        const { auth: auth } = await resolveTenant(req);
        const phone = magicLinkData.phone;
        const cleanPhoneDigits = phone.replace(/\D/g, '');
        const cleanPhoneTenDigits = cleanPhoneDigits.slice(-10);
        const standardizedPhone = phone.startsWith('+') ? phone : (phone.length === 10 ? `+91${phone}` : phone);
        const internalEmail = `${cleanPhoneTenDigits}@roombox.app`;

        // Determine default UID
        let uid = magicLinkData.guestId ||
                  magicLinkData.staffId ||
                  (magicLinkData.role === 'staff' ? `staff-${cleanPhoneTenDigits}` : `phone-${cleanPhoneTenDigits}`);

        // For non-sharded tenants: check central users collection for existing UID
        if (!isShardedTenant) {
            const variations = [
                phone,
                cleanPhoneDigits,
                `+${cleanPhoneDigits}`,
                standardizedPhone,
                `91${cleanPhoneTenDigits}`,
                cleanPhoneTenDigits
            ];

            let userDoc = null;
            for (const v of variations) {
                const snap = await adminDb.collection('users').where('phone', '==', v).limit(1).get();
                if (!snap.empty) {
                    userDoc = snap.docs[0];
                    uid = userDoc.id;
                    break;
                }
            }

            // Try to find in Firebase Auth to ensure we use the actual Auth UID if it exists
            try {
                let authUser = null;
                try {
                    authUser = await auth.getUserByPhoneNumber(standardizedPhone);
                } catch (e) {
                    try {
                        authUser = await auth.getUserByEmail(internalEmail);
                    } catch (e2) {}
                }

                if (authUser && authUser.uid !== uid) {
                    console.warn(`[magic-login] Auth UID mismatch: Firestore=${uid}, Auth=${authUser.uid}. Preferring Auth UID.`);
                    if (userDoc) {
                        const newDocRef = adminDb.collection('users').doc(authUser.uid);
                        await newDocRef.set({
                            ...userDoc.data(),
                            updatedAt: timeProvider.now()
                        }, { merge: true });
                    }
                    uid = authUser.uid;
                }
            } catch (authErr) {
                console.error('[magic-login] Auth discovery error:', authErr);
            }
        } else {
            // Sharded: guestId IS the uid (set during onboarding)
            console.log(`[magic-login] Sharded tenant UID resolved from magic link guestId: ${uid}`);
        }

        // ── 4. Mark as used (both central pointer and source) ────────────────────────────────
        const usedUpdate = { used: true, usedAt: timeProvider.now(), consumedBy: 'magic-login' };
        await sourceMagicRef.update(usedUpdate);
        if (isShardedTenant) {
            // Also mark the central pointer as used
            await centralMagicRef.update({ used: true, usedAt: timeProvider.now() });
        }

        // ── 5. For non-sharded tenants only: update central users/ doc ───────────────────────
        if (!isShardedTenant) {
            const userRef = adminDb.collection('users').doc(uid);
            const userDocSnapshot = await userRef.get();

            const promotionUpdates: any = { updatedAt: timeProvider.now() };

            if (magicLinkData.guestId) {
                promotionUpdates.guestId = magicLinkData.guestId;
                promotionUpdates.pgId = magicLinkData.pgId;
                promotionUpdates.ownerId = magicLinkData.ownerId;
                promotionUpdates.role = 'tenant';
                promotionUpdates.activeTenancies = FieldValue.arrayUnion({
                    guestId: magicLinkData.guestId,
                    pgId: magicLinkData.pgId,
                    ownerId: magicLinkData.ownerId,
                    pgName: magicLinkData.pgName
                });
            }

            if (magicLinkData.staffId) {
                promotionUpdates.staffId = magicLinkData.staffId;
                promotionUpdates.ownerId = magicLinkData.ownerId;
                promotionUpdates.role = magicLinkData.role || 'staff';
                promotionUpdates.activeStaffProfiles = FieldValue.arrayUnion({
                    staffId: magicLinkData.staffId,
                    ownerId: magicLinkData.ownerId,
                    role: magicLinkData.role || 'staff'
                });
            }

            await userRef.update(promotionUpdates);

            const role = magicLinkData.role || userDocSnapshot?.data()?.role || 'tenant';
            const permissions = userDocSnapshot?.data()?.permissions || {};

            const claims: any = {
                role,
                guestId: magicLinkData.guestId || userDocSnapshot?.data()?.guestId,
                staffId: magicLinkData.staffId || userDocSnapshot?.data()?.staffId,
                ownerId: magicLinkData.ownerId || userDocSnapshot?.data()?.ownerId,
                pgId: magicLinkData.pgId || userDocSnapshot?.data()?.pgId
            };

            if (role !== 'owner' && role !== 'tenant' && role !== 'admin') {
                claims.permissions = permissions;
                claims.pgs = userDocSnapshot?.data()?.pgIds || (claims.pgId ? [claims.pgId] : []);
            }

            const customToken = await auth.createCustomToken(uid, claims);
            await auth.setCustomUserClaims(uid, claims);

            if (userDocSnapshot.exists) {
                const existingData = userDocSnapshot.data() || {};
                await userRef.update({
                    guestId: magicLinkData.guestId || existingData.guestId || null,
                    staffId: magicLinkData.staffId || existingData.staffId || null,
                    ownerId: magicLinkData.ownerId,
                    role,
                    status: 'active',
                    updatedAt: timeProvider.date()
                });
            }

            return NextResponse.json({
                success: true,
                customToken,
                guestId: magicLinkData.guestId,
                pgName: magicLinkData.pgName
            });
        }

        // ── 6. Sharded tenant: build claims from magic link WITHOUT touching central users/ ───
        console.log(`[magic-login] Building token for sharded tenant ${uid} (ownerId: ${magicLinkData.ownerId})`);

        const role = magicLinkData.role || 'tenant';
        const claims: any = {
            role,
            guestId: magicLinkData.guestId || null,
            staffId: magicLinkData.staffId || null,
            ownerId: magicLinkData.ownerId,
            pgId: magicLinkData.pgId || null,
        };

        const customToken = await auth.createCustomToken(uid, claims);
        await auth.setCustomUserClaims(uid, claims);

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
