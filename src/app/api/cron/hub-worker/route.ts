import { NextRequest, NextResponse } from 'next/server';
import { isCronAuthorized, unauthorizedCronResponse } from '@/lib/cron/auth';

const DEPRECATION_MESSAGE =
  'Deprecated: use GET /api/cron/maintenance for consolidated standard and enterprise cron dispatch.';

/** @deprecated Use /api/cron/maintenance instead */
export async function GET(request: NextRequest) {
  if (!isCronAuthorized(request)) {
    return unauthorizedCronResponse();
  }

  return NextResponse.json(
    { success: false, deprecated: true, error: DEPRECATION_MESSAGE },
    { status: 410 }
  );
}
