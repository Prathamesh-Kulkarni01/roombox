
import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, doc, getDoc, setDoc, writeBatch } from 'firebase-admin/firestore';
import { User, Guest } from '@/lib/types';

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY || '{}');

if (!getApps().length) {
    initializeApp({
        credential: cert(serviceAccount)
    });
}
const db = getFirestore();
const adminAuth = getAuth();

export async function POST(request: NextRequest) {
    const { uid, email, displayName, photoURL } = await request.json();

    if (!uid) {
        return NextResponse.json({ error: 'UID is required' }, { status: 400 });
    }

    const userDocRef = doc(db, 'users', uid);
    let userDoc = await getDoc(userDocRef);

    if (userDoc.exists()) {
        return NextResponse.json(userDoc.data());
    }

    if (email) {
        const inviteDocRef = doc(db, 'guest_invites', email);
        const inviteDoc = await getDoc(inviteDocRef);

        if (inviteDoc.exists()) {
            const { ownerId, guestId } = inviteDoc.data();
            const guestDocRef = doc(db, 'users_data', ownerId, 'guests', guestId);
            const guestDoc = await getDoc(guestDocRef);
            const guestData = guestDoc.exists() ? guestDoc.data() as Guest : null;

            const newTenantUser: User = {
                id: uid,
                name: displayName || guestData?.name || 'New Tenant',
                email: email,
                role: 'tenant',
                guestId: guestId,
                ownerId: ownerId,
                avatarUrl: photoURL || `https://placehold.co/40x40.png?text=${((displayName || guestData?.name || 'NT')).slice(0, 2).toUpperCase()}`
            };

            const batch = writeBatch(db);
            batch.set(userDocRef, newTenantUser);
            if (guestDoc.exists()) {
                batch.update(guestDocRef, { userId: uid });
            }
            batch.delete(inviteDocRef);
            await batch.commit();
            return NextResponse.json(newTenantUser);
        }
    }

    const newOwnerUser: User = {
        id: uid,
        name: displayName || 'New Owner',
        email: email || undefined,
        role: 'owner',
        subscription: { planId: 'free', status: 'active' },
        avatarUrl: photoURL || `https://placehold.co/40x40.png?text=${(displayName || 'NU').slice(0, 2).toUpperCase()}`
    };

    await setDoc(userDocRef, newOwnerUser);
    return NextResponse.json(newOwnerUser);
}
