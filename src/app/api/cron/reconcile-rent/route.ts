
import { reconcileRentCycles } from '@/ai/flows/reconcile-rent-cycles-flow';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const secret = process.env.CRON_SECRET;

    if (process.env.NODE_ENV === 'production' && (!secret || authHeader !== `Bearer ${secret}`)) {
      return new Response('Unauthorized', { status: 401 });
    }

    const result = await reconcileRentCycles();

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
