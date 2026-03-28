import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb, getAdminAuth } from '@/lib/firebaseAdmin';

export async function POST(req: NextRequest) {
    try {
        const { phone, otp } = await req.json();

        if (!phone || !otp) {
            return NextResponse.json({ error: 'Phone and OTP are required' }, { status: 400 });
        }

        const cleanPhone = phone.replace(/\D/g, '');
        const appDb = await getAdminDb();
        const auth = await getAdminAuth();

        // 1. Verify OTP
        const otpDoc = await appDb.collection('system_otps').doc(cleanPhone).get();
        if (!otpDoc.exists) {
            return NextResponse.json({ error: 'OTP not found. Please request a new one.' }, { status: 400 });
        }

        const otpData = otpDoc.data()!;
        if (otpData.expiresAt < Date.now()) {
            return NextResponse.json({ error: 'OTP expired. Please request a new one.' }, { status: 400 });
        }

        if (otpData.otp !== otp) {
            await otpDoc.ref.update({ attempts: (otpData.attempts || 0) + 1 });
            if ((otpData.attempts || 0) >= 3) {
                await otpDoc.ref.delete();
                return NextResponse.json({ error: 'Too many incorrect attempts. Please request a new OTP.' }, { status: 400 });
            }
            return NextResponse.json({ error: 'Invalid OTP' }, { status: 400 });
        }

        // 2. Find user document by phone
        const variations = [cleanPhone, `+91${cleanPhone}`, `91${cleanPhone}`];
        let userDoc = null;
        for (const v of variations) {
            const snap = await appDb.collection('users').where('phone', '==', v).limit(1).get();
            if (!snap.empty) {
                userDoc = snap.docs[0];
                break;
            }
        }

        if (!userDoc) {
            return NextResponse.json({ error: 'User record not found' }, { status: 404 });
        }

        const userData = userDoc.data();
        const uid = userDoc.id;

        // 3. Delete OTP after successful verification
        await otpDoc.ref.delete();

        // 4. Auto-link: If user has a guestId but no UID linked on the guest doc, link now
        //    This handles first-time login after owner adds them.
        if (userData.guestId && userData.ownerId) {
            try {
                const guestRef = appDb
                    .collection('users_data')
                    .doc(userData.ownerId)
                    .collection('guests')
                    .doc(userData.guestId);
                const guestSnap = await guestRef.get();

                if (guestSnap.exists) {
                    const guestData = guestSnap.data()!;
                    // Only link if not already linked to a uid (avoid overwriting)
                    if (!guestData.uid) {
                        await guestRef.update({
                            uid,
                            inviteStatus: 'ACTIVE',
                            linkedAt: Date.now(),
                        });
                        console.log(`[LINK] UID ${uid} linked to guest ${userData.guestId}`);
                    }
                }
            } catch (linkErr) {
                console.warn('[OTP Verify] Guest auto-link failed:', linkErr);
            }
        }

        // 5. Build custom token claims
        const claims: any = {
            role: userData.role || 'tenant',
            ownerId: userData.ownerId || (userData.role === 'owner' ? uid : null),
        };

        if (userData.role === 'tenant') {
            claims.guestId = userData.guestId;
        }

        if (userData.role !== 'owner' && userData.role !== 'tenant' && userData.role !== 'admin') {
            claims.permissions = userData.permissions || {};
            claims.pgId = userData.pgId;
            claims.pgs = [userData.pgId];
        }

        const customToken = await auth.createCustomToken(uid, claims);
        // Also persist claims for future standard logins
        await auth.setCustomUserClaims(uid, claims);

        return NextResponse.json({ success: true, customToken });

    } catch (error: any) {
        console.error('Verify OTP error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
