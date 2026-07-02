import { NextRequest, NextResponse } from 'next/server';
import { isCronAuthorized, unauthorizedCronResponse } from '@/lib/cron/auth';
import { runMaintenanceCron } from '@/lib/cron/maintenance';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    if (!isCronAuthorized(request)) {
      return unauthorizedCronResponse();
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
