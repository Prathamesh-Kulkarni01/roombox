
import { NextRequest, NextResponse } from 'next/server';
import { getFirestore, collection, getDocs, doc, setDoc, getDoc, deleteDoc, query, where, writeBatch } from 'firebase-firestore';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { headers } from 'next/headers';
import { produce } from 'immer';
import { defaultMenu } from '@/lib/mock-data';
import type { PG, Guest } from '@/lib/types';
import { sendSignInLinkToEmail } from 'firebase/auth';
import { auth as clientAuth } from '@/lib/firebase';

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
        console.error("Token verification failed:", error);
        return null;
    }
}

async function handleGet(request: NextRequest, collectionName: string, id?: string) {
    const userId = await getUserIdFromToken(request);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const ownerId = request.nextUrl.searchParams.get('ownerId') || userId;

    if (id) {
        const docRef = doc(db, 'users_data', ownerId, collectionName, id);
        const docSnap = await getDoc(docRef);
        return docSnap.exists() ? NextResponse.json(docSnap.data()) : NextResponse.json({ error: 'Not Found' }, { status: 404 });
    } else {
        const collRef = collection(db, 'users_data', ownerId, collectionName);
        const snapshot = await getDocs(collRef);
        const data = snapshot.docs.map(doc => doc.data());
        return NextResponse.json(data);
    }
}

async function handlePost(request: NextRequest, collectionName: string) {
    const userId = await getUserIdFromToken(request);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const body = await request.json();
    let newId;
    let data;

    if (collectionName === 'guests') {
        const pgId = body.pgId;
        const pgDocRef = doc(db, 'users_data', userId, 'pgs', pgId);
        const pgDoc = await getDoc(pgDocRef);
        if(!pgDoc.exists()) return NextResponse.json({ error: 'PG not found'}, { status: 404 });
        
        const pg = pgDoc.data() as PG;
        newId = `g-${Date.now()}`;
        data = { ...body, id: newId, kycStatus: 'not-started' };

        const updatedPg = produce(pg, draft => {
            draft.occupancy += 1;
            const bed = draft.floors?.find(f => f.rooms.some(r => r.beds.some(b => b.id === body.bedId)))?.rooms.find(r => r.beds.some(b => b.id === body.bedId))?.beds.find(b => b.id === body.bedId);
            if (bed) bed.guestId = newId;
        });

        const actionCodeSettings = {
            url: `${request.nextUrl.origin}/login/verify?ownerId=${userId}&guestId=${newId}`,
            handleCodeInApp: true,
        };
        // This needs client-side SDK. We might need a separate flow for this.
        // For now, we'll skip sending the email from backend. This should be handled client-side ideally or via a dedicated service.

        const batch = writeBatch(db);
        batch.set(doc(db, 'users_data', userId, 'guests', newId), data);
        batch.set(pgDocRef, updatedPg);
        batch.set(doc(db, 'guest_invites', data.email), { ownerId: userId, guestId: newId });
        await batch.commit();

        return NextResponse.json({ newGuest: data, updatedPg });
    } else if (collectionName === 'pgs') {
        newId = `pg-${Date.now()}`;
        data = { ...body, id: newId, ownerId: userId, images: ['https://placehold.co/600x400.png'], rating: 0, occupancy: 0, totalBeds: 0, rules: [], contact: '', priceRange: { min: 0, max: 0 }, amenities: ['wifi', 'food'], floors: [], menu: defaultMenu };
    } else {
        newId = `${collectionName.slice(0,-1)}-${Date.now()}`;
        data = { ...body, id: newId };
    }
    
    await setDoc(doc(db, 'users_data', userId, collectionName, newId), data);
    return NextResponse.json(data);
}

async function handlePut(request: NextRequest, collectionName: string, id: string) {
    const userId = await getUserIdFromToken(request);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const ownerId = request.nextUrl.searchParams.get('ownerId') || userId;
    
    const body = await request.json();
    const docRef = doc(db, 'users_data', ownerId, collectionName, id);

    if (collectionName === 'guests') {
        const { updatedGuest, updatedPg } = body;
        const batch = writeBatch(db);
        batch.set(docRef, updatedGuest, { merge: true });
        if(updatedPg) {
            const pgDocRef = doc(db, 'users_data', ownerId, 'pgs', updatedPg.id);
            batch.set(pgDocRef, updatedPg);
        }
        await batch.commit();
        return NextResponse.json({ updatedGuest, updatedPg });
    } else {
        await setDoc(docRef, body, { merge: true });
        return NextResponse.json(body);
    }
}

async function handleDelete(request: NextRequest, collectionName: string, id: string) {
    const userId = await getUserIdFromToken(request);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    await deleteDoc(doc(db, 'users_data', userId, collectionName, id));
    return NextResponse.json({ success: true });
}

async function handleGuestVacate(request: NextRequest, guestId: string) {
    const userId = await getUserIdFromToken(request);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const guestDocRef = doc(db, 'users_data', userId, 'guests', guestId);
    const guestDoc = await getDoc(guestDocRef);
    if(!guestDoc.exists()) return NextResponse.json({ error: 'Guest not found' }, { status: 404 });
    const guest = guestDoc.data() as Guest;

    const pgDocRef = doc(db, 'users_data', userId, 'pgs', guest.pgId);
    const pgDoc = await getDoc(pgDocRef);
    if(!pgDoc.exists()) return NextResponse.json({ error: 'PG not found' }, { status: 404 });
    const pg = pgDoc.data() as PG;
    
    const updatedPg = produce(pg, draft => {
        draft.occupancy = Math.max(0, draft.occupancy - 1);
        const bed = draft.floors?.find(f => f.rooms.some(r => r.beds.some(b => b.guestId === guestId)))?.rooms.find(r => r.beds.some(b => b.guestId === guestId))?.beds.find(b => b.guestId === guestId);
        if (bed) bed.guestId = null;
    });
    
    const updatedGuest = { ...guest, exitDate: new Date().toISOString(), isVacated: true };

    const batch = writeBatch(db);
    batch.set(guestDocRef, updatedGuest);
    batch.set(pgDocRef, updatedPg);
    await batch.commit();

    return NextResponse.json({ guest: updatedGuest, pg: updatedPg });
}


export async function GET(request: NextRequest, { params }: { params: { slug: string[] } }) {
    const [collectionName, id] = params.slug;
    return handleGet(request, collectionName, id);
}

export async function POST(request: NextRequest, { params }: { params: { slug: string[] } }) {
    const [collectionName, id] = params.slug;
    if (collectionName === 'guests' && id && request.nextUrl.searchParams.get('action') === 'vacate') {
        return handleGuestVacate(request, id);
    }
    return handlePost(request, collectionName);
}

export async function PUT(request: NextRequest, { params }: { params: { slug: string[] } }) {
    const [collectionName, id] = params.slug;
    return handlePut(request, collectionName, id);
}

export async function DELETE(request: NextRequest, { params }: { params: { slug: string[] } }) {
    const [collectionName, id] = params.slug;
    return handleDelete(request, collectionName, id);
}
