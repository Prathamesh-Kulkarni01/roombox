import { NextRequest, NextResponse } from "next/server";
import { resolveTenant } from '@/lib/tenantResolver';
import { getAdminDb, getAdminAuth, selectOwnerDataAdminDb } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import type { Firestore } from "firebase-admin/firestore";

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

        const { db: adminDb, isEnterprise: isReqEnterprise, auth } = await resolveTenant(req);

        // ── 1. Read magic link ───────
        const centralMagicRef = adminDb.collection("magic_links").doc(token);
        const centralMagicDoc = await centralMagicRef.get();

        if (!centralMagicDoc.exists) {
            return NextResponse.json({ error: "Invalid or expired setup link" }, { status: 401 });
        }

        const centralData = centralMagicDoc.data()!;

        if (centralData?.expiresAt && Date.now() > centralData.expiresAt) {
            await centralMagicRef.delete();
            return NextResponse.json({ error: "Link has expired. Please request a new one." }, { status: 401 });
        }

        if (centralData?.used && centralData?.consumedBy !== 'set-password') {
            return NextResponse.json({ error: "This link has already been used." }, { status: 401 });
        }

        let magicLinkData = centralData;
        let sourceMagicRef = centralMagicRef;
        let isShardedTenant = isReqEnterprise || !!(centralData.isShardedTenant && centralData.ownerId);
        let ownerCustomDb: Firestore | null = null;
        let clientConfig: any = null;

        if (isShardedTenant) {
            const ownerId = centralData.ownerId;
            
            // If the request didn't resolve to Enterprise DB automatically, but the link says it's sharded, 
            // we must manually fetch the full link from the custom DB.
            if (!isReqEnterprise && centralData.isShardedTenant && ownerId) {
                console.log(`[set-password] Sharded tenant pointer detected. Reading full magic link from custom DB for ownerId: ${ownerId}`);
                ownerCustomDb = await selectOwnerDataAdminDb(ownerId);
                const customMagicRef = ownerCustomDb.collection("magic_links").doc(token);
                const customMagicDoc = await customMagicRef.get();

                if (!customMagicDoc.exists) {
                    console.error(`[set-password] Sharded magic link not found in custom DB for ownerId: ${ownerId}`);
                    return NextResponse.json({ error: "Invalid or expired setup link" }, { status: 401 });
                }

                magicLinkData = customMagicDoc.data()!;
                sourceMagicRef = customMagicRef;

                if (magicLinkData?.used && magicLinkData?.consumedBy !== 'set-password') {
                    return NextResponse.json({ error: "This link has already been used." }, { status: 401 });
                }
            }

            // Always fetch the client config from the Central DB for the frontend to log in natively
            if (ownerId) {
                const adminDbInstance = await getAdminDb();
                const ownerDoc = await adminDbInstance.collection("users").doc(ownerId).get();
                clientConfig = ownerDoc.data()?.subscription?.enterpriseProject?.clientConfig || null;
            }
        }

        const phone = magicLinkData?.phone;
        if (!phone) {
            return NextResponse.json({ error: "Invalid link data (missing phone)." }, { status: 500 });
        }

        const cleanPhone = phone.replace(/\D/g, '');
        const cleanPhoneDigits = cleanPhone.slice(-10);
        const internalEmail = `${cleanPhoneDigits}@roombox.app`;
        const standardizedPhone = phone.startsWith('+') ? phone : (phone.length === 10 ? `+91${phone}` : phone);

        // ── 3. Resolve UID ────────────────────────────────────────────────────────────────────
        let uid: string;
        let finalUid: string;

        if (isShardedTenant) {
            // Sharded: guestId is the established UID (set during onboarding, no central users/ doc)
            uid = magicLinkData?.guestId || magicLinkData?.staffId || `phone-${cleanPhoneDigits}`;
            finalUid = uid;
            console.log(`[set-password] Sharded tenant UID from magic link: ${uid}`);
        } else {
            // Non-sharded: search central users collection for the UID
            const variations = [phone, cleanPhone, `+${cleanPhone}`, `+91${cleanPhoneDigits}`, `91${cleanPhoneDigits}`, cleanPhoneDigits];
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
                    phone: standardizedPhone,
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

            uid = userDoc.id;
            finalUid = uid;
        }

        // ── 4. Create/Update Firebase Auth record with password ───────────────────────────────
        try {
            await auth.updateUser(uid, {
                email: internalEmail,
                password: password,
                disabled: false
            });
        } catch (error: any) {
            const isConflict = error.code === 'auth/email-already-exists' || error.code === 'auth/phone-number-already-exists';

            if (error.code === 'auth/user-not-found' || isConflict) {
                try {
                    let existingAuthUser = null;
                    try {
                        existingAuthUser = await auth.getUserByEmail(internalEmail);
                    } catch (e) {
                        try {
                            existingAuthUser = await auth.getUserByPhoneNumber(standardizedPhone);
                        } catch (e2) {}
                    }

                    if (existingAuthUser) {
                        finalUid = existingAuthUser.uid;
                        await auth.updateUser(finalUid, {
                            email: internalEmail,
                            password: password,
                            disabled: false
                        });

                        if (!isShardedTenant && finalUid !== uid) {
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
                            }
                        }
                    } else {
                        await auth.createUser({
                            uid: uid,
                            email: internalEmail,
                            phoneNumber: standardizedPhone,
                            password: password,
                            displayName: isShardedTenant ? 'Tenant' : (magicLinkData?.guestId || 'Tenant')
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

        // ── 5. Set JWT claims ─────────────────────────────────────────────────────────────────
        const role = magicLinkData?.role || 'tenant';
        const guestId = magicLinkData?.guestId || null;
        const staffId = magicLinkData?.staffId || null;
        const ownerId = magicLinkData?.ownerId;
        const pgId = magicLinkData?.pgId;

        const claims: any = { role, ownerId, pgId };
        if (guestId) claims.guestId = guestId;
        if (staffId) claims.staffId = staffId;

        if (!isShardedTenant) {
            // For non-sharded: also handle permissions from the Firestore user doc
            const finalUserDoc = await adminDb.collection('users').doc(finalUid).get();
            const permissions = finalUserDoc.data()?.permissions || {};
            if (role !== 'owner' && role !== 'tenant' && role !== 'admin') {
                claims.permissions = permissions;
                claims.pgs = finalUserDoc.data()?.pgIds || (pgId ? [pgId] : []);
            }

            // Update the central users/ doc with metadata
            const userUpdates: any = {
                role,
                status: 'active',
                updatedAt: new Date(),
                schemaVersion: 4
            };
            if (guestId) userUpdates.guestId = guestId;
            if (staffId) userUpdates.staffId = staffId;
            if (ownerId) userUpdates.ownerId = ownerId;
            if (pgId) userUpdates.pgId = pgId;
            if (finalUserDoc.data()?.password) {
                userUpdates.password = FieldValue.delete();
            }
            await finalUserDoc.ref.update(userUpdates);
        } else {
            // Sharded: do NOT write to central users/ doc — all tenant data stays in custom DB
            console.log(`[set-password] Sharded tenant ${finalUid}: skipping central users/ doc write.`);
        }

        await auth.setCustomUserClaims(finalUid, claims);
        let customToken: string | undefined;
        if (!isShardedTenant) {
            customToken = await auth.createCustomToken(finalUid, claims);
        }

        // ── 6. Mark magic link as consumed ───────────────────────────────────────────────────
        await sourceMagicRef.update({
            used: true,
            usedAt: Date.now(),
            consumedBy: 'set-password'
        });
        if (isShardedTenant) {
            await centralMagicRef.update({ used: true, usedAt: Date.now() });
        }

        return NextResponse.json({
            success: true,
            customToken,
            role,
            isShardedTenant,
            email: internalEmail,
            clientConfig
        });

    } catch (error) {
        console.error("Set password error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
