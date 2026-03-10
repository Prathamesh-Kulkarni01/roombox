import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb, getAdminAuth } from '@/lib/firebaseAdmin';
import { verifyPassword } from '@/lib/password-utils';

export async function POST(req: NextRequest) {
    try {
        const { phone, password } = await req.json();

        if (!phone || !password) {
            return NextResponse.json({ error: 'Phone number and password are required' }, { status: 400 });
        }

        const appDb = await getAdminDb();
        const auth = await getAdminAuth();

        // 1. Find user in Firestore
        const cleanPhone = phone.replace(/\D/g, '');
        const variations = [phone, cleanPhone, `+${cleanPhone}`];
        if (cleanPhone.length === 10) variations.push(`+91${cleanPhone}`);
        if (cleanPhone.length === 12 && cleanPhone.startsWith('91')) variations.push(cleanPhone.slice(2));

        console.log(`[PhoneLogin] Starting login for ${phone}. Variations:`, variations);

        let userDoc = null;
        for (const v of variations) {
            const snap = await appDb.collection('users').where('phone', '==', v).limit(1).get();
            if (!snap.empty) {
                userDoc = snap.docs[0];
                console.log(`[PhoneLogin] Found user doc via variation: ${v}`);
                break;
            }
        }

        if (!userDoc) {
            console.log(`[PhoneLogin] User NOT found in Firestore for phone variations checked.`);
            return NextResponse.json({ error: 'No account found with this phone number' }, { status: 404 });
        }

        const userData = userDoc.data();
        const uid = userDoc.id;
        const internalEmail = `${cleanPhone.slice(-10)}@roombox.app`; // Use last 10 digits for consistency

        console.log(`[PhoneLogin] User found: ${uid}, Email: ${internalEmail}. Proceeding to Auth check.`);

        let verifyData: any;
        let verifyResponse: any;

        const attemptAuth = async (email: string) => {
            const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
            const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`, {
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
            // Success! Generate custom token with tenant-specific claims
            const customToken = await auth.createCustomToken(uid, {
                role: 'tenant',
                guestId: userData.guestId,
                ownerId: userData.ownerId
            });
            return NextResponse.json({ success: true, customToken });
        }

        console.log(`[PhoneLogin] Auth failed for ${internalEmail}. Error:`, verifyData.error?.message);

        // 3. Fallback: Check legacy Firestore password (Migration Support)
        if (userData.password) {
            const isLegacyValid = verifyPassword(password, userData.password);
            if (isLegacyValid) {
                console.log(`[PhoneLogin] Legacy match for ${uid}. Migrating to Firebase Auth...`);
                // Auto-migrate to Firebase Auth
                try {
                    await auth.updateUser(uid, { email: internalEmail, password }).catch(async (e) => {
                        if (e.code === 'auth/user-not-found') {
                            await auth.createUser({
                                uid,
                                email: internalEmail,
                                password,
                                phoneNumber: phone.startsWith('+') ? phone : `+91${cleanPhone}`
                            });
                        }
                    });

                    // Remove legacy password from Firestore
                    await userDoc.ref.update({
                        password: require('firebase-admin').firestore.FieldValue.delete(),
                        updatedAt: Date.now()
                    });

                    const customToken = await auth.createCustomToken(uid, {
                        role: 'tenant',
                        guestId: userData.guestId,
                        ownerId: userData.ownerId
                    });
                    return NextResponse.json({ success: true, customToken });
                } catch (migrationErr) {
                    console.error('[PhoneLogin] Auto-migration failed:', migrationErr);
                }
            }
        }

        // 4. Handle errors gracefully
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
