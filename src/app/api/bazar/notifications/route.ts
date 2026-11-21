import { NextRequest, NextResponse } from 'next/server';
import { BazarWhatsAppNotificationService } from '@/modules/bazar/services/whatsappNotificationService';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, phone, name, storeName, storePhone } = body;

    const cleanPhone = (phone || '').replace(/\D/g, '').slice(-10);
    if (!cleanPhone || cleanPhone.length !== 10) {
      return NextResponse.json({ success: false, error: 'A valid 10-digit phone number is required' }, { status: 400 });
    }

    let result;
    if (type === 'welcome') {
      result = await BazarWhatsAppNotificationService.sendCustomerWelcomeNotification(cleanPhone, name);
    } else if (type === 'customer_added') {
      result = await BazarWhatsAppNotificationService.sendMerchantCustomerAddedNotification(
        cleanPhone, 
        name || 'ग्राहक', 
        storeName || 'स्थानिक सुपर बझार', 
        storePhone
      );
    } else {
      return NextResponse.json({ success: false, error: 'Invalid notification type' }, { status: 400 });
    }

    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

