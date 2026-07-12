import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb, getAdminAuth, selectOwnerDataAdminDb } from '@/lib/firebaseAdmin';
import { verifyPassword } from '@/lib/password-utils';
import { resolveTenant } from '@/platform/auth/server/tenant-resolver';
import { isEnterpriseIsolated } from '@/lib/enterprise/isolation';

export async function POST(req: NextRequest) {
    try {
        const { phone, password } = await req.json();

        if (!phone || !password) {
            return NextResponse.json({ error: 'Phone number and password are required' }, { status: 400 });
        }

        const appDb = await getAdminDb();
        const centralAuth = await getAdminAuth();

        const cleanPhone = phone.replace(/\D/g, '');
        const variations = [phone, cleanPhone, `+${cleanPhone}`];
        if (cleanPhone.length === 10) variations.push(`+91${cleanPhone}`);
        if (cleanPhone.length === 12 && cleanPhone.startsWith('91')) variations.push(cleanPhone.slice(2));

        const cleanPhoneDigits = cleanPhone.slice(-10);
        const internalEmail = `${cleanPhoneDigits}@roombox.app`;

        console.log(`[PhoneLogin] Starting login for ${phone}. Variations:`, variations);

        // ── 1. Search in central DB first ──────────────────────────────────────────────
        let userDoc = null;
        let isEnterpriseUser = false;
        let enterpriseOwnerId: string | null = null;

        for (const v of variations) {
            const snap = await appDb.collection('users').where('phone', '==', v).limit(1).get();
            if (!snap.empty) {
                userDoc = snap.docs[0];
                console.log(`[PhoneLogin] Found user doc via variation: ${v}`);
                break;
            }
        }

        // ── 2. If not found in central DB, check enterprise context from subdomain ──────
        // This handles tenants whose user records live exclusively in the enterprise DB.
        if (!userDoc) {
            console.log(`[PhoneLogin] User not found in central DB. Checking enterprise context...`);
            
            const { tenantId, isEnterprise } = await resolveTenant(req);
            
            if (isEnterprise && tenantId) {
                console.log(`[PhoneLogin] Enterprise context detected. Searching in custom DB for ownerId: ${tenantId}`);
                const customDb = await selectOwnerDataAdminDb(tenantId);
                
                // Search in guests sub-collection (enterprise tenant structure)
                for (const v of variations) {
                    const guestSnap = await customDb
                        .collection('users_data')
                        .doc(tenantId)
                        .collection('guests')
                        .where('phone', '==', v)
                        .limit(1)
                        .get();
                    if (!guestSnap.empty) {
                        userDoc = guestSnap.docs[0];
                        isEnterpriseUser = true;
                        enterpriseOwnerId = tenantId;
                        console.log(`[PhoneLogin] Found enterprise guest via variation: ${v}`);
                        break;
                    }
                }

                // Also check users collection in enterprise DB
                if (!userDoc) {
                    for (const v of variations) {
                        const snap = await customDb.collection('users').where('phone', '==', v).limit(1).get();
                        if (!snap.empty) {
                            userDoc = snap.docs[0];
                            isEnterpriseUser = true;
                            enterpriseOwnerId = tenantId;
                            console.log(`[PhoneLogin] Found enterprise user doc via variation: ${v}`);
                            break;
                        }
                    }
                }
            }
        } else {
            // Check if the central user is linked to an enterprise owner
            const userData = userDoc.data();
            if (userData?.ownerId) {
                const ownerDoc = await appDb.collection('users').doc(userData.ownerId).get();
                if (ownerDoc.exists) {
                    const ownerData = ownerDoc.data();
                    if (isEnterpriseIsolated(ownerData as Record<string, unknown>)) {
                        isEnterpriseUser = true;
                        enterpriseOwnerId = userData.ownerId;
                        console.log(`[PhoneLogin] Central user belongs to enterprise owner: ${enterpriseOwnerId}`);
                    }
                }
            }
        }

        if (!userDoc) {
            console.log(`[PhoneLogin] User NOT found in Firestore for phone variations checked.`);
            return NextResponse.json({ error: 'No account found with this phone number' }, { status: 404 });
        }

        const userData = userDoc.data();
        const uid = userDoc.id;

        // ── 3. Determine which auth instance and API key to use ────────────────────────
        // Enterprise users authenticate against their owner's Firebase project.
        let activeAuth = centralAuth;
        let firebaseApiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
        
        if (isEnterpriseUser && enterpriseOwnerId) {
            const { auth: tenantAuth } = await resolveTenant(req);
            if (tenantAuth && tenantAuth !== centralAuth) {
                activeAuth = tenantAuth;
                console.log(`[PhoneLogin] Using enterprise Auth for owner: ${enterpriseOwnerId}`);
            }
            
            // Fetch enterprise clientConfig to get the correct API key for REST calls
            try {
                const ownerDocForConfig = await appDb.collection('users').doc(enterpriseOwnerId).get();
                const clientConfig = ownerDocForConfig.data()?.subscription?.enterpriseProject?.clientConfig;
                if (clientConfig?.apiKey) {
                    firebaseApiKey = clientConfig.apiKey;
                    console.log(`[PhoneLogin] Using enterprise Firebase API key for authentication`);
                }
            } catch (configErr) {
                console.warn('[PhoneLogin] Could not fetch enterprise clientConfig, using central API key:', configErr);
            }
        }

        console.log(`[PhoneLogin] User found: ${uid}, Email: ${internalEmail}. Proceeding to Auth check.`);

        let verifyData: any;
        let verifyResponse: any;

        const attemptAuth = async (email: string) => {
            const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${firebaseApiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password, returnSecureToken: true })
            });
            return { ok: res.ok, data: await res.json() };
        };

        // Try standard 10-digit format first
        const authResult = await attemptAuth(internalEmail);
        verifyResponse = { ok: authResult.ok };
        verifyData = authResult.data;

        // Fallback: Try full clean phone digits if 10-digit fails
        if (!authResult.ok && verifyData.error?.message === 'EMAIL_NOT_FOUND') {
            const legacyEmail = `${cleanPhone}@roombox.app`;
            console.log(`[PhoneLogin] 10-digit email not found, trying legacy: ${legacyEmail}`);
            const legacyResult = await attemptAuth(legacyEmail);
            if (legacyResult.ok) {
                verifyResponse.ok = true;
                verifyData = legacyResult.data;
            }
        }

        if (verifyResponse.ok) {
            console.log(`[PhoneLogin] Auth Success for ${uid}`);
            // Determine the actual UID from the auth response (may differ from Firestore doc ID)
            const authUid = verifyData.localId || uid;
            
            // Use the verified auth UID for the custom token
            const tokenUid = authUid;
            const claims: any = {
                role: userData?.role || 'tenant',
                guestId: userData?.guestId || userData?.id,
                ownerId: userData?.ownerId || enterpriseOwnerId,
                pgId: userData?.pgId,
            };

            // Create custom token using the appropriate auth instance
            const customToken = await activeAuth.createCustomToken(tokenUid, claims);
            await activeAuth.setCustomUserClaims(tokenUid, claims);
            
            return NextResponse.json({ success: true, customToken, isEnterpriseUser });
        }

        console.log(`[PhoneLogin] Auth failed for ${internalEmail}. Error:`, verifyData.error?.message);

        // 4. Fallback: Check legacy Firestore password (Migration Support)
        if (userData?.password) {
            const isLegacyValid = verifyPassword(password, userData.password);
            if (isLegacyValid) {
                console.log(`[PhoneLogin] Legacy match for ${uid}. Migrating to Firebase Auth...`);
                try {
                    await activeAuth.updateUser(uid, { email: internalEmail, password }).catch(async (e) => {
                        if (e.code === 'auth/user-not-found') {
                            await activeAuth.createUser({
                                uid,
                                email: internalEmail,
                                password,
                                phoneNumber: phone.startsWith('+') ? phone : `+91${cleanPhoneDigits}`
                            });
                        }
                    });

                    // Remove legacy password from Firestore
                    await userDoc.ref.update({
                        password: require('firebase-admin').firestore.FieldValue.delete(),
                        updatedAt: Date.now()
                    });

                    const claims: any = {
                        role: userData?.role || 'tenant',
                        guestId: userData?.guestId || userData?.id,
                        ownerId: userData?.ownerId || enterpriseOwnerId,
                        pgId: userData?.pgId,
                    };
                    const customToken = await activeAuth.createCustomToken(uid, claims);
                    await activeAuth.setCustomUserClaims(uid, claims);
                    return NextResponse.json({ success: true, customToken, isEnterpriseUser });
                } catch (migrationErr) {
                    console.error('[PhoneLogin] Auto-migration failed:', migrationErr);
                }
            }
        }

        // 5. Handle errors gracefully
        const errorCode = verifyData.error?.message;
        const errorMsg = (errorCode === 'INVALID_PASSWORD' || errorCode === 'EMAIL_NOT_FOUND')
            ? 'Incorrect phone number or password.'
            : (errorCode === 'USER_DISABLED' ? 'This account has been disabled.' : 'Login failed. Please try again.');

        return NextResponse.json({ error: errorMsg, code: errorCode }, { status: 401 });

    } catch (error: any) {
        console.error('Phone login error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
