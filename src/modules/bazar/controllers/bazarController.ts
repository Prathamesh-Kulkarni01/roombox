import { NextRequest, NextResponse } from 'next/server';
import { bazarService } from '@/modules/bazar/services';
import { corePaymentGateway } from '@/core/payments';

export class BazarController {
  static async handleGet(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const storeId = searchParams.get('storeId');

    try {
      if (storeId) {
        const products = await bazarService.getProductsByStore(storeId);
        return NextResponse.json({ success: true, products });
      }
      const stores = await bazarService.getStores();
      return NextResponse.json({ success: true, stores });
    } catch (error: any) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
  }

  static async handlePost(req: NextRequest) {
    try {
      const body = await req.json();
      const { action } = body;

      if (action === 'create_order') {
        const { orderData } = body;
        if (!orderData?.storeId) {
          return NextResponse.json({ success: false, error: 'Store ID is required' }, { status: 400 });
        }
        const cleanPhone = (orderData.customerPhone || '').replace(/\D/g, '');
        if (cleanPhone.length !== 10) {
          return NextResponse.json({ success: false, error: 'Valid 10-digit phone number is required' }, { status: 400 });
        }
        if (!Array.isArray(orderData.items) || orderData.items.length === 0) {
          return NextResponse.json({ success: false, error: 'Order must contain items' }, { status: 400 });
        }

        const orderId = await bazarService.createOrder({
          ...orderData,
          customerPhone: cleanPhone,
        });

        const paymentIntent = corePaymentGateway.createIntent({
          amount: orderData.totalAmount,
          moduleId: 'bazar',
          entityId: orderId,
          description: `Order ${orderId} on Palus Local Bazar`,
          customer: {
            name: orderData.customerName,
            phone: cleanPhone,
          },
        });

        return NextResponse.json({ success: true, orderId, paymentIntent });
      }

      return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
    } catch (error: any) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
  }
}

