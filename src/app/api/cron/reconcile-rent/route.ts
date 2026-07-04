

import { reconcileAllGuests } from '@/lib/actions/reconciliationActions';
import { NextRequest, NextResponse } from 'next/server';
import { isCronAuthorized, unauthorizedCronResponse } from '@/lib/cron/auth';

export async function GET(request: NextRequest) {
  try {
    if (!isCronAuthorized(request)) {
      return unauthorizedCronResponse();
    }

    const isProd = process.env.NODE_ENV === 'production';
    const result = await reconcileAllGuests(isProd ? undefined : 50);

    if (!result.success) {
      console.warn(`Rent reconciliation job completed with ${result.errorCount} error(s).`);
    }

    return NextResponse.json({
      success: true,
      message: `Successfully reconciled rent cycles for ${result.reconciledCount} guests.`,
      errors: result.errorCount,
    });
  } catch (error: any) {
    console.error('Cron job error [reconcile-rent]:', error);
    return NextResponse.json(
      { success: false, message: error?.message || 'An internal server error occurred.' },
      { status: 500 }
    );
  }
}
