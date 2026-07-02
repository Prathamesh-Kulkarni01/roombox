'use server';

import { NextRequest, NextResponse } from 'next/server';
import { runMaintenanceCron } from '@/lib/cron/maintenance';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const secret = process.env.CRON_SECRET;
    const isProd = process.env.NODE_ENV === 'production';

    if (isProd && (!secret || authHeader !== `Bearer ${secret}`)) {
      return new Response('Unauthorized', { status: 401 });
    }

    const results = await runMaintenanceCron({ includeEnterprise: true });

    return NextResponse.json({
      success: true,
      message: 'Standard and enterprise maintenance cron completed.',
      results,
    });
  } catch (error: any) {
    console.error('Cron maintenance error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
