
import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, doc, getDoc, setDoc } from 'firebase-admin/firestore';
import { headers } from 'next/headers';
import type { User, PlanName } from '@/lib/types';
import { plans } from '@/lib/mock-data';

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

    const { planId }: { planId: PlanName } = await request.json();
    if (!planId || !plans[planId]) {
        return NextResponse.json({ error: 'Invalid plan ID' }, { status: 400 });
    }

    const userDocRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const currentUserData = userDoc.data() as User;

    // Here you would typically handle payment logic with Stripe, etc.
    // For this app, we'll just update the plan directly.

    const updatedUser: User = {
        ...currentUserData,
        subscription: { ...(currentUserData.subscription || { status: 'active' }), planId },
    };

    await setDoc(userDocRef, updatedUser, { merge: true });

    return NextResponse.json(updatedUser);
}
