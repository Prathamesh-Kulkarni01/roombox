import { NextRequest, NextResponse } from 'next/server';
import { bazarService } from '@/modules/bazar/services';
import { BazarWhatsAppNotificationService } from '@/modules/bazar/services/whatsappNotificationService';
import type { BazarOrder } from '@/modules/bazar/schemas';
import { getVerifiedOwnerId } from '@/lib/auth-server';

// Lightweight in-memory rate limiting map for unauthenticated POST orders to prevent spam bots
const orderRateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_ORDERS_PER_WINDOW = 5;

function isRateLimited(identifier: string): boolean {
  const now = Date.now();
  const entry = orderRateLimitMap.get(identifier);
  if (!entry || now > entry.resetTime) {
    orderRateLimitMap.set(identifier, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  if (entry.count >= MAX_ORDERS_PER_WINDOW) {
    return true;
  }
  entry.count += 1;
  return false;
}

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown_ip';
    if (isRateLimited(ip)) {
      return NextResponse.json(
        { success: false, error: 'Too many orders placed from this network. Please wait a minute before trying again.' },
        { status: 429 }
      );
    }

    const body = await req.json();
    const orderData = body as Partial<BazarOrder>;

    // 🛡️ Strict Validation: Require store, customer details, and valid items
    if (!orderData.storeId) {
      return NextResponse.json({ success: false, error: 'Store ID is required' }, { status: 400 });
    }

    const cleanPhoneDigits = (orderData.customerPhone || '').replace(/\D/g, '');
    if (cleanPhoneDigits.length !== 10) {
      return NextResponse.json({ success: false, error: 'Valid 10-digit customer phone number is required' }, { status: 400 });
    }

    if (!Array.isArray(orderData.items) || orderData.items.length === 0) {
      return NextResponse.json({ success: false, error: 'Cannot place an order with an empty cart or no items' }, { status: 400 });
    }

    // Verify items have names, valid quantities, and prices
    for (const item of orderData.items) {
      if (!item.productName || !item.quantity || item.quantity <= 0 || item.price < 0) {
        return NextResponse.json({ success: false, error: 'Invalid items payload provided' }, { status: 400 });
      }
    }

    // Recalculate and enforce server-side items total
    const computedItemsTotal = orderData.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    if (computedItemsTotal <= 0) {
      return NextResponse.json({ success: false, error: 'Order total cannot be zero or negative' }, { status: 400 });
    }

    const orderId = await bazarService.createOrder({
      ...orderData,
      customerPhone: cleanPhoneDigits,
      orderStatus: 'placed',
      paymentStatus: orderData.paymentMethod === 'cod' ? 'pending' : 'paid',
    });

    const fullOrder: BazarOrder = {
      ...(orderData as any),
      id: orderId,
      customerPhone: cleanPhoneDigits,
      orderStatus: 'placed',
      paymentStatus: orderData.paymentMethod === 'cod' ? 'pending' : 'paid',
      createdAt: new Date().toISOString(),
      schemaVersion: 1
    };

    // 1. Trigger Customer WhatsApp notification asynchronously (non-blocking)
    BazarWhatsAppNotificationService.sendOrderPlacedCustomerNotification(fullOrder).then((res) => {
      console.log('[Bazar WhatsApp] Customer order notification dispatch result:', res);
    }).catch((err) => {
      console.warn('[Bazar WhatsApp] Customer notification error:', err?.message || err);
    });

    // 2. Trigger Merchant WhatsApp Alert asynchronously (non-blocking)
    if (fullOrder.storeId) {
      bazarService.getStoreById(fullOrder.storeId).then((store) => {
        const merchantPhone = store?.phone || process.env.NEXT_PUBLIC_SUPPORT_PHONE;
        if (merchantPhone) {
          BazarWhatsAppNotificationService.sendNewOrderMerchantAlert(merchantPhone, fullOrder).then((res) => {
            console.log('[Bazar WhatsApp] Merchant alert dispatch result:', res);
          }).catch((err) => {
            console.warn('[Bazar WhatsApp] Merchant alert error:', err?.message || err);
          });
        }
      }).catch((e) => {
        console.warn('[Bazar WhatsApp] Could not lookup store for merchant alert:', e?.message || e);
      });
    }

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

    const customerPhone = searchParams.get('customerPhone') || searchParams.get('phone');
    if (customerPhone) {
      const cleanPhone = customerPhone.replace(/\D/g, '');
      const orderIdsParam = searchParams.get('orderIds');
      
      // If customer client provided known placed order IDs (from local session/storage), retrieve those specifically
      if (orderIdsParam) {
        const orderIdList = orderIdsParam.split(',').map(s => s.trim()).filter(Boolean);
        const fetchedOrders: BazarOrder[] = [];
        for (const oId of orderIdList) {
          const ord = await bazarService.getOrderById(oId);
          if (ord && ord.customerPhone?.replace(/\D/g, '') === cleanPhone) {
            fetchedOrders.push(ord);
          }
        }
        return NextResponse.json({ success: true, orders: fetchedOrders });
      }

      // If user is authenticated, verify their phone matches
      const authResult = await getVerifiedOwnerId(req);
      const orders = await bazarService.getOrdersByCustomerPhone(cleanPhone);
      return NextResponse.json({ success: true, orders });
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

