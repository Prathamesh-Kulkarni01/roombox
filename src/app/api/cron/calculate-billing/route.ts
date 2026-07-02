'use server';

import { NextRequest, NextResponse } from 'next/server';
import { runMonthlyBillingCron } from '@/lib/actions/subscriptionActions';
import { isCronAuthorized, unauthorizedCronResponse } from '@/lib/cron/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  if (!isCronAuthorized(request)) {
    return unauthorizedCronResponse();
  }

  try {
    const result = await runMonthlyBillingCron();
    if (result.success) {
      return NextResponse.json({ success: true, message: `Successfully processed billing for ${result.processedCount} owner(s).` });
    } else {
      return NextResponse.json({ success: false, message: 'Failed to execute billing flow.', error: result.error }, { status: 500 });
    }
  } catch (error) {
    console.error('Cron job error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ success: false, message: 'An internal server error occurred.', error: errorMessage }, { status: 500 });
  }
}
