import { NextRequest, NextResponse } from 'next/server';
import { bazarService } from '@/modules/bazar/services';
import { BazarWhatsAppNotificationService } from '@/modules/bazar/services/whatsappNotificationService';
import type { BazarOrder } from '@/modules/bazar/schemas';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const orderData = body as Partial<BazarOrder>;

    const orderId = await bazarService.createOrder({
      ...orderData,
      storeId: orderData.storeId || 'default_store',
      orderStatus: 'placed',
      paymentStatus: orderData.paymentMethod === 'cod' ? 'pending' : 'paid',
    });

    const fullOrder: BazarOrder = {
      ...(orderData as any),
      id: orderId,
      storeId: orderData.storeId || 'default_store',
      orderStatus: 'placed',
      paymentStatus: orderData.paymentMethod === 'cod' ? 'pending' : 'paid',
      createdAt: new Date().toISOString(),
      schemaVersion: 1
    };

    // Trigger Regional Marathi WhatsApp notification asynchronously (non-blocking)
    BazarWhatsAppNotificationService.sendOrderPlacedCustomerNotification(fullOrder).catch((err) => {
      console.warn('[Bazar WhatsApp] Customer notification error:', err?.message || err);
    });

    return NextResponse.json({
      success: true,
      orderId,
      message: 'Order created successfully'
    });
  } catch (e: any) {
    console.error('Order creation error:', e);
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const orderId = searchParams.get('id') || searchParams.get('orderId');
    if (orderId) {
      const order = await bazarService.getOrderById(orderId);
      return NextResponse.json({ success: true, order });
    }

    const storeId = searchParams.get('storeId') || 'default_store';
    const orders = await bazarService.getOrdersByStore(storeId);
    return NextResponse.json({ success: true, orders });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { orderId, status } = body;
    if (!orderId || !status) {
      return NextResponse.json({ success: false, error: 'orderId and status required' }, { status: 400 });
    }
    await bazarService.updateOrderStatus(orderId, status);

    // Fetch order to send regional Marathi status update to customer
    bazarService.getOrderById(orderId).then((order) => {
      if (order) {
        BazarWhatsAppNotificationService.sendOrderStatusUpdateNotification(order, status).catch((err) => {
          console.warn('[Bazar WhatsApp] Status notification error:', err?.message || err);
        });
      }
    }).catch(() => {});

    return NextResponse.json({ success: true, message: 'Status updated' });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

