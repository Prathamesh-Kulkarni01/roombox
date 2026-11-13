import { NextRequest, NextResponse } from 'next/server';
import { BazarWhatsAppNotificationService } from '@/modules/bazar/services/whatsappNotificationService';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, phone, name, storeName, storePhone } = body;

    if (!phone) {
      return NextResponse.json({ success: false, error: 'Phone number is required' }, { status: 400 });
    }

    let result;
    if (type === 'welcome') {
      result = await BazarWhatsAppNotificationService.sendCustomerWelcomeNotification(phone, name);
    } else if (type === 'customer_added') {
      result = await BazarWhatsAppNotificationService.sendMerchantCustomerAddedNotification(
        phone, 
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

