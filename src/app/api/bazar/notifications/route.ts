import { NextRequest, NextResponse } from 'next/server';
import { BazarWhatsAppNotificationService } from '@/modules/bazar/services/whatsappNotificationService';
import { getVerifiedOwnerId } from '@/lib/auth-server';

// Lightweight rate limiting to prevent SMS/WhatsApp credit exhaustion
const notificationRateLimitMap = new Map<string, { count: number; resetTime: number }>();
const WINDOW_MS = 60 * 1000; // 1 minute
const MAX_NOTIFICATIONS_PER_WINDOW = 5;

function isNotificationRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = notificationRateLimitMap.get(ip);
  if (!entry || now > entry.resetTime) {
    notificationRateLimitMap.set(ip, { count: 1, resetTime: now + WINDOW_MS });
    return false;
  }
  if (entry.count >= MAX_NOTIFICATIONS_PER_WINDOW) {
    return true;
  }
  entry.count += 1;
  return false;
}

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown_ip';
    if (isNotificationRateLimited(ip)) {
      return NextResponse.json(
        { success: false, error: 'Too many requests. Please wait a minute.' },
        { status: 429 }
      );
    }

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

