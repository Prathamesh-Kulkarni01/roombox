import { NextRequest, NextResponse } from 'next/server';
import { uploadDataUriToStorage } from '@/lib/storage';
import { getVerifiedOwnerId } from '@/lib/auth-server';
import { unauthorized } from '@/lib/api/apiError';

export async function POST(req: NextRequest) {
    try {
        const authResult = await getVerifiedOwnerId(req);
        if (!authResult.ownerId) {
            return unauthorized(authResult.error);
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
