import { NextRequest, NextResponse } from 'next/server';
import type { PWAConfig } from '@/lib/types';
import { savePWAConfig } from '@/lib/pwa-config';
import { getVerifiedOwnerId } from '@/lib/auth-server';
import { unauthorized } from '@/lib/api/apiError';

export async function POST(req: NextRequest) {
  try {
    const authResult = await getVerifiedOwnerId(req);
    if (!authResult.ownerId) {
      return unauthorized(authResult.error);
    }
    const ownerId = authResult.ownerId;


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