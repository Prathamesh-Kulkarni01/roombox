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

        let userDoc = null;
        for (const v of variations) {
            const snap = await appDb.collection('users').where('phone', '==', v).limit(1).get();
            if (!snap.empty) {
                userDoc = snap.docs[0];
                break;
            }
        }

        if (!userDoc) {
            return NextResponse.json({ error: 'No account found with this phone number' }, { status: 404 });
        }

        const userData = userDoc.data();
        const uid = userDoc.id;
        const internalEmail = `${cleanPhone}@roombox.app`;

        // 2. Try verifying via Firebase Auth REST API (the Identity Toolkit)
        const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
        const verifyResponse = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: internalEmail,
                password,
                returnSecureToken: true
            })
        });

        const verifyData = await verifyResponse.json();

        if (verifyResponse.ok) {
            // Success! Generate custom token with tenant-specific claims
            const customToken = await auth.createCustomToken(uid, {
                role: 'tenant',
                guestId: userData.guestId,
                ownerId: userData.ownerId
            });
            return NextResponse.json({ success: true, customToken });
        }

        // 3. Fallback: Check legacy Firestore password (Migration Support)
        if (userData.password) {
            const isLegacyValid = verifyPassword(password, userData.password);
            if (isLegacyValid) {
                console.log(`[PhoneLogin] Legacy match for ${uid}. Migrating to Firebase Auth...`);
                // Auto-migrate to Firebase Auth
                try {
                    await auth.updateUser(uid, { password }).catch(async (e) => {
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
        const errorMsg = verifyData.error?.message === 'INVALID_PASSWORD' || verifyData.error?.message === 'EMAIL_NOT_FOUND'
            ? 'Incorrect phone number or password.'
            : 'Login failed. Please try again.';

        return NextResponse.json({ error: errorMsg }, { status: 401 });

    } catch (error: any) {
        console.error('Phone login error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
