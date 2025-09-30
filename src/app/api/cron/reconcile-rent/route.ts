
'use server';

import { reconcileAllGuests } from '@/ai/flows/reconcile-rent-cycles-flow';
import { NextRequest, NextResponse } from 'next/server';

// --- API ROUTE HANDLER ---
// This handler is now ONLY for the real cron job.
// Testing is done via unit tests in Cypress that call the pure logic function directly.
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const secret = process.env.CRON_SECRET;
    const isProd = process.env.NODE_ENV === 'production';

    // In production, require a secret to prevent unauthorized access.
    if (isProd && (!secret || authHeader !== `Bearer ${secret}`)) {
      return new Response('Unauthorized', { status: 401 });
    }

    // In a test/dev environment, we might process fewer records to speed things up.
    const result = await reconcileAllGuests(isProd ? undefined : 50);

    if (!result.success) {
      throw new Error('Failed to execute rent reconciliation flow.');
    }

    return NextResponse.json({
      success: true,
      message: `Successfully reconciled rent cycles for ${result.reconciledCount} tenants.`,
    });
  } catch (error: any) {
    console.error('Cron job error [reconcile-rent]:', error);
    return NextResponse.json(
      { success: false, message: error?.message || 'An internal server error occurred.' },
      { status: 500 }
    );
  }
}
