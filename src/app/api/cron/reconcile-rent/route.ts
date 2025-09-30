
import { reconcileAllGuests } from '@/ai/flows/reconcile-rent-cycles-flow';
import { runReconciliationTest } from '@/lib/reconciliation.test';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const secret = process.env.CRON_SECRET;
    
    // Check if this is a Cypress test run
    const scenario = request.headers.get('X-Cypress-Scenario');
    if (scenario) {
        console.log(`[Test] Running Cypress scenario: ${scenario}`);
        const result = runReconciliationTest(scenario);
        return NextResponse.json(result);
    }

    const isProd = process.env.NODE_ENV === 'production';
    if (isProd && (!secret || authHeader !== `Bearer ${secret}`)) {
      return new Response('Unauthorized', { status: 401 });
    }

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
