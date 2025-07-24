
import { sendRentReminders } from '@/ai/flows/send-rent-reminders-flow';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');

  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', {
      status: 401,
    });
  }

  try {
    const result = await sendRentReminders();
    if (result.success) {
      return NextResponse.json({ success: true, message: `Successfully notified ${result.notifiedCount} tenants.` });
    } else {
      return NextResponse.json({ success: false, message: 'Failed to execute rent reminder flow.' }, { status: 500 });
    }
  } catch (error) {
    console.error('Cron job error:', error);
    return NextResponse.json({ success: false, message: 'An internal server error occurred.' }, { status: 500 });
  }
}
