
import { calculateAndCreateAddons } from '@/lib/actions/subscriptionActions.ts';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic'; // Ensures this route is always executed dynamically

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');

  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', {
      status: 401,
    });
  }

  try {
    const result = await calculateAndCreateAddons();
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
