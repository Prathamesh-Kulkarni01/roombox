import { NextRequest, NextResponse } from 'next/server';
import { resolveTenant } from '@/platform/auth/server/tenant-resolver';
import { getAdminAuth } from '@/lib/firebaseAdmin';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const token = authHeader.split('Bearer ')[1];
    const { auth: adminAuth } = await resolveTenant(request);
    const decodedToken = await adminAuth.verifyIdToken(token);
    const verifiedOwnerId = decodedToken.uid;

    if (!verifiedOwnerId) {
      return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 403 });
    }

    const body = await request.json();
    const { recipientPhone, recipientName, amountDue, dueDate, pgName, guestId, ownerId } = body;

    // Security check: Ensure the request owner matches the token owner
    if (verifiedOwnerId !== ownerId) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    if (!recipientPhone || !recipientName || !amountDue || !dueDate || !guestId) {
      return NextResponse.json({ success: false, error: 'Missing parameters' }, { status: 400 });
    }

    const { getBrandedAppUrl } = await import('@/lib/actions/siteActions');
    const ownerAppUrl = await getBrandedAppUrl(ownerId);

    let formattedPhone = recipientPhone.replace(/\D/g, '');
    if (formattedPhone.length === 10) {
      formattedPhone = '91' + formattedPhone;
    }

    const { sendWhatsAppTemplate } = await import('@/lib/whatsapp/send-message');

    const payUrl = `${ownerAppUrl}/pay/${guestId}`;
    const dueDateObj = new Date(dueDate);
    const monthLabel = dueDateObj.toLocaleDateString('en-IN', { month: 'long' });
    const dateLabel = dueDateObj.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

    console.log(`[Transient Reminder API] Dispatching WhatsApp alert for ${recipientName} (${formattedPhone})`);

    await sendWhatsAppTemplate(formattedPhone, 'new_rent_due_reminder_utility', 'en_US', [
      {
        type: 'body',
        parameters: [
          { type: 'text', text: recipientName }, // {{1}}
          { type: 'text', text: monthLabel }, // {{2}}
          { type: 'text', text: dateLabel }, // {{3}}
          { type: 'text', text: String(amountDue) }, // {{4}}
          { type: 'text', text: pgName }, // {{5}}
          { type: 'text', text: payUrl }, // {{6}} - Payment Link in Body
          { type: 'text', text: String(amountDue) } // {{7}} - Balance in Body
        ]
      }
    ], ownerId, guestId);

    return NextResponse.json({ success: true, message: 'Transient reminder dispatched successfully' });

  } catch (error: any) {
    console.error('[Transient Reminder API] Failed to send reminder:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to dispatch alert' }, { status: 500 });
  }
}
