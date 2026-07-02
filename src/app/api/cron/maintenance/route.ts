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
    const enterprise = results.enterprise as {
      failed?: number;
      queued?: number;
      succeeded?: number;
    };
    const enterpriseFailed = enterprise?.failed ?? 0;
    const enterpriseQueued = enterprise?.queued ?? 0;
    const allEnterpriseSucceeded = enterpriseQueued === 0 || enterpriseFailed === 0;

    return NextResponse.json({
      success: allEnterpriseSucceeded,
      message: allEnterpriseSucceeded
        ? 'Standard and enterprise maintenance cron completed.'
        : 'Standard maintenance completed; some enterprise dispatches failed.',
      results,
    }, { status: allEnterpriseSucceeded ? 200 : 207 });
  } catch (error: any) {
    console.error('Cron maintenance error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
