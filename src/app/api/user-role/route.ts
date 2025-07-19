
import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, doc, setDoc, getDoc } from 'firebase-admin/firestore';
import { headers } from 'next/headers';
import type { User, UserRole } from '@/lib/types';

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY || '{}');

if (!getApps().length) {
    initializeApp({
        credential: cert(serviceAccount)
    });
}
const db = getFirestore();

async function getUserIdFromToken(request: NextRequest): Promise<string | null> {
    const authHeader = headers().get('Authorization');
    if (!authHeader) return null;
    const token = authHeader.split('Bearer ')[1];
    if (!token) return null;
    try {
        const decodedToken = await getAuth().verifyIdToken(token);
        return decodedToken.uid;
    } catch (error) {
        return null;
    }
}

export async function POST(request: NextRequest) {
    const userId = await getUserIdFromToken(request);
    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { newRole }: { newRole: UserRole } = await request.json();
    if (!newRole) {
        return NextResponse.json({ error: 'New role is required' }, { status: 400 });
    }

    const userDocRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const currentUserData = userDoc.data() as User;
    const { guestId, ownerId, ...restOfUser } = currentUserData;

    const updatedUser: User = {
        ...restOfUser,
        role: newRole,
    };
    
    if (newRole === 'owner') {
        updatedUser.subscription = { planId: 'free', status: 'active' };
    }

    await setDoc(userDocRef, updatedUser, { merge: true });

    return NextResponse.json(updatedUser);
}
