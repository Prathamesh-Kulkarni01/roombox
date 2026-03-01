
import { NextRequest, NextResponse } from 'next/server';
import type { PWAConfig } from '@/lib/types';
import { savePWAConfig } from '@/lib/pwa-config';
import { auth } from '@/lib/firebaseAdmin';

export async function POST(req: NextRequest) {
  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await auth.verifyIdToken(token);
    const ownerId = decodedToken.uid;

    const pwaConfig: PWAConfig = await req.json();

    // Save the PWA config to Firebase
    await savePWAConfig(ownerId, pwaConfig);

    return NextResponse.json({ success: true, ownerId });
  } catch (error) {
    console.error('Failed to save PWA config:', error);
    return NextResponse.json(
      { error: 'Failed to save PWA configuration' },
      { status: 500 }
    );
  }
}