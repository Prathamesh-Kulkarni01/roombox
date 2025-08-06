import { sendRentReminders } from '@/ai/flows/send-rent-reminders-flow';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const secret = process.env.CRON_SECRET;

    if (!secret) {
      throw new Error('Server misconfiguration: CRON_SECRET missing.');
    }

    if (authHeader !== `Bearer ${secret}`) {
      throw new Error('Unauthorized');
    }

    const result = await sendRentReminders();

    if (!result.success) {
      throw new Error('Failed to execute rent reminder flow.');
    }

    return NextResponse.json({
      success: true,
      message: `Successfully notified ${result.notifiedCount} tenants.`,
    });
  } catch (error: any) {
    console.error('Cron job error:', error);
    return NextResponse.json(
      { success: false, message: error?.message || 'An internal server error occurred.' },
      { status: error?.message === 'Unauthorized' ? 401 : 500 }
    );
  }
}
