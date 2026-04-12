import { NextResponse } from 'next/server';
import { getAdminDb, getAdminAuth } from '@/lib/firebaseAdmin';
import { getVerifiedOwnerId } from '@/lib/auth-server';
import crypto from 'crypto';

export async function POST(request: Request) {
    try {
        const { ownerId, error: authError } = await getVerifiedOwnerId(request as any);
        if (!ownerId) {
            return NextResponse.json({ success: false, error: authError || 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { tenantId, phone } = body;

        if (!tenantId || !phone) {
            return NextResponse.json({ success: false, error: 'tenantId and phone are required.' }, { status: 400 });
        }

        const db = await getAdminDb();
        const auth = await getAdminAuth();

        // 1. Generate new random 6-character password
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let newPassword = '';
        try {
            const randomBytes = crypto.randomBytes(6);
            for (let i = 0; i < 6; i++) {
                newPassword += chars[randomBytes[i] % chars.length];
            }
        } catch {
            for (let i = 0; i < 6; i++) {
                newPassword += chars.charAt(Math.floor(Math.random() * chars.length));
            }
        }

        // 2. Find the user ID
        const cleanPhone = phone.replace(/\D/g, '');
        const standardizedPhone = phone.startsWith('+') ? phone : `+91${cleanPhone}`;
        const phoneVariations = [phone, cleanPhone, standardizedPhone, `91${cleanPhone}`];

        let userId = null;
        for (const v of phoneVariations) {
            if (!v) continue;
            const snap = await db.collection('users').where('phone', '==', v).limit(1).get();
            if (!snap.empty) {
                userId = snap.docs[0].id;
                // Important: Remove password from Firestore if it exists (Clean Architecture migration)
                if (snap.docs[0].data().password) {
                    await snap.docs[0].ref.update({
                        password: require('firebase-admin').firestore.FieldValue.delete(),
                        updatedAt: Date.now()
                    });
                }
                break;
            }
        }

        // 2.1 If not found in Firestore, check Firebase Auth directly to avoid collisions
        const internalEmail = `${cleanPhone.slice(-10)}@roombox.app`;
        if (!userId) {
            try {
                let authUser = null;
                try {
                    authUser = await auth.getUserByPhoneNumber(standardizedPhone);
                } catch (e) {
                    try {
                        authUser = await auth.getUserByEmail(internalEmail);
                    } catch (e2) {}
                }

                if (authUser) {
                    userId = authUser.uid;
                    console.log(`[GeneratePassword] Found existing Auth user by phone/email: ${userId}`);
                }
            } catch (e: any) {
                // Not in Auth, safe to proceed with skeleton
            }
        }

        // 3. Update or Create Firebase Auth User
        const uid = userId || `phone-${cleanPhone.slice(-10)}`;

        try {
            await auth.updateUser(uid, {
                password: newPassword
            });
            console.log(`[GeneratePassword] Updated Firebase Auth for ${uid}`);

            // Ensure Firestore user doc exists even if it was only in Auth before
            const userRef = db.collection('users').doc(uid);
            const userSnap = await userRef.get();
            if (!userSnap.exists) {
                await userRef.set({
                    phone: standardizedPhone,
                    role: 'tenant',
                    ownerId: ownerId,
                    tenantId: tenantId,
                    createdAt: Date.now(),
                    updatedAt: Date.now()
                });
            }
        } catch (e: any) {
            if (e.code === 'auth/user-not-found') {
                try {
                    await auth.createUser({
                        uid,
                        email: internalEmail,
                        password: newPassword,
                        phoneNumber: standardizedPhone
                    });
                    console.log(`[GeneratePassword] Created Firebase Auth for ${uid}`);
                } catch (createErr: any) {
                    if (createErr.code === 'auth/phone-number-already-exists') {
                        // This shouldn't happen if getUserByPhoneNumber worked, but for safety:
                        const existingUser = await auth.getUserByPhoneNumber(standardizedPhone);
                        await auth.updateUser(existingUser.uid, { password: newPassword });
                        console.log(`[GeneratePassword] Recovered from phone conflict: updated ${existingUser.uid}`);
                    } else {
                        throw createErr;
                    }
                }

                // Also ensure a skeleton doc exists in Firestore if we created a new user
                const userRef = db.collection('users').doc(uid);
                const userSnap = await userRef.get();
                if (!userSnap.exists) {
                    await userRef.set({
                        phone: standardizedPhone,
                        role: 'tenant',
                        ownerId: ownerId,
                        tenantId: tenantId,
                        createdAt: Date.now(),
                        updatedAt: Date.now()
                    });
                }
            } else {
                throw e;
            }
        }

        // Return the RAW password to the owner so they can share it
        return NextResponse.json({
            success: true,
            newPassword
        });

    } catch (error: any) {
        console.error('Error generating random password:', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}
