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
        const { staffId, phone } = body;

        if (!staffId || !phone) {
            return NextResponse.json({ success: false, error: 'staffId and phone are required.' }, { status: 400 });
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
        const standardizedPhone = phone.startsWith('+') ? phone : `+91${cleanPhone.slice(-10)}`;
        const internalEmail = `${cleanPhone.slice(-10)}@roombox.app`;
        const phoneVariations = [phone, cleanPhone, standardizedPhone, `91${cleanPhone.slice(-10)}`];

        let userId = null;
        for (const v of phoneVariations) {
            if (!v) continue;
            const snap = await db.collection('users').where('phone', '==', v).limit(1).get();
            if (!snap.empty) {
                userId = snap.docs[0].id;
                // Clean legacy password from Firestore
                if (snap.docs[0].data().password) {
                    await snap.docs[0].ref.update({
                        password: require('firebase-admin').firestore.FieldValue.delete(),
                        updatedAt: Date.now()
                    });
                }
                break;
            }
        }

        // 2.1 Find in Firebase Auth directly to avoid collisions
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
                    console.log(`[StaffGeneratePassword] Found existing Auth user: ${userId}`);
                }
            } catch (authErr) {}
        }

        // 3. Update or Create Firebase Auth User
        const uid = userId || `staff-${cleanPhone.slice(-10)}`;

        try {
            await auth.updateUser(uid, {
                password: newPassword
            });
            console.log(`[StaffGeneratePassword] Updated Firebase Auth for ${uid}`);
        } catch (e: any) {
            if (e.code === 'auth/user-not-found') {
                await auth.createUser({
                    uid,
                    email: internalEmail,
                    password: newPassword,
                    phoneNumber: standardizedPhone,
                    displayName: 'Staff'
                });
                console.log(`[StaffGeneratePassword] Created Firebase Auth for ${uid}`);
            } else {
                throw e;
            }
        }

        // Ensure Firestore user doc reflects the staff link
        const userRef = db.collection('users').doc(uid);
        const userSnap = await userRef.get();
        if (!userSnap.exists) {
            await userRef.set({
                phone: standardizedPhone,
                role: 'staff',
                ownerId,
                staffId,
                status: 'active',
                createdAt: Date.now(),
                updatedAt: Date.now()
            });
        } else {
            // Update role if needed
            await userRef.update({
                staffId,
                role: userSnap.data()?.role || 'staff',
                updatedAt: Date.now()
            });
        }

        return NextResponse.json({
            success: true,
            newPassword
        });

    } catch (error: any) {
        console.error('Error generating staff password:', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}
