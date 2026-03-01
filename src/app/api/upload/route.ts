import { NextRequest, NextResponse } from 'next/server';
import { uploadDataUriToStorage } from '@/lib/storage';
import { auth } from '@/lib/firebaseAdmin';

export async function POST(req: NextRequest) {
    try {
        const authHeader = req.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const token = authHeader.split('Bearer ')[1];
        const decodedToken = await auth.verifyIdToken(token);
        if (!decodedToken) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { dataUri, folder } = await req.json();

        if (!dataUri) {
            return NextResponse.json({ error: 'No data URI provided' }, { status: 400 });
        }

        const secureUrl = await uploadDataUriToStorage(dataUri, folder || 'pwa-logos');

        return NextResponse.json({ url: secureUrl });
    } catch (error) {
        console.error('Upload API error:', error);
        return NextResponse.json({ error: 'Failed to upload image' }, { status: 500 });
    }
}
