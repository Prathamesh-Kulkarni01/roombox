import { NextResponse } from 'next/server';
import { getAdminDb, getAdminAuth } from '@/lib/firebaseAdmin';
import crypto from 'crypto';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { ownerId, tenantId, phone } = body;

        if (!ownerId || !tenantId || !phone) {
            return NextResponse.json({ success: false, error: 'ownerId, tenantId, and phone are required.' }, { status: 400 });
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
        const phoneVariations = [phone, cleanPhone, `+91${cleanPhone}`, `91${cleanPhone}`];

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

        // 3. Update or Create Firebase Auth User
        const uid = userId || `phone-${cleanPhone}`;
        const internalEmail = `${cleanPhone}@roombox.app`;

        try {
            await auth.updateUser(uid, {
                password: newPassword
            });
            console.log(`[GeneratePassword] Updated Firebase Auth for ${uid}`);
        } catch (e: any) {
            if (e.code === 'auth/user-not-found') {
                await auth.createUser({
                    uid,
                    email: internalEmail,
                    password: newPassword,
                    phoneNumber: phone.startsWith('+') ? phone : `+91${cleanPhone}`
                });
                console.log(`[GeneratePassword] Created Firebase Auth for ${uid}`);

                // Also ensure a skeleton doc exists in Firestore if we created a new user
                if (!userId) {
                    await db.collection('users').doc(uid).set({
                        phone: phone.startsWith('+') ? phone : `+91${cleanPhone}`,
                        role: 'tenant',
                        ownerId: ownerId,
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
