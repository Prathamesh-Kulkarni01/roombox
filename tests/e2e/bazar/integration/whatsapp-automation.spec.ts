import { test, expect } from '@playwright/test';

test.describe('Bazar Regional Marathi WhatsApp Automation Flow', () => {
  test('TC-WA-01: Dispatches dynamic regional Marathi WhatsApp on order placement and status updates', async ({ request }) => {
    // 1. Post a new order with dynamic details
    const orderPayload = {
      storeId: 'fresh-mart',
      storeName: 'श्री महालक्ष्मी सुपर बझार',
      customerName: 'गणेश पाटील',
      customerPhone: '+91 98765 12345',
      deliveryType: 'store_pickup',
      paymentMethod: 'cod',
      totalAmount: 480,
      items: [
        { productId: 'p1', productName: 'कोलम तांदूळ', quantity: 2, price: 150, unit: 'किलो' },
        { productId: 'p2', productName: 'शेंगदाणा तेल', quantity: 1, price: 180, unit: 'लिटर' }
      ],
      schemaVersion: 1
    };

    const res = await request.post('/api/bazar/orders', { data: orderPayload });
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.success).toBeTruthy();
    expect(data.orderId).toBeTruthy();

    const orderId = data.orderId;

    // 2. Advance status to 'packing'
    const patchRes1 = await request.patch('/api/bazar/orders', {
      data: { orderId, status: 'packing' }
    });
    expect(patchRes1.ok()).toBeTruthy();

    // 3. Advance status to 'ready'
    const patchRes2 = await request.patch('/api/bazar/orders', {
      data: { orderId, status: 'ready' }
    });
    expect(patchRes2.ok()).toBeTruthy();

    // 4. Test Welcome WhatsApp Dispatch
    const welcomeRes = await request.post('/api/bazar/notifications', {
      data: {
        type: 'welcome',
        phone: '+91 98765 12345',
        name: 'गणेश पाटील'
      }
    });
    expect(welcomeRes.ok()).toBeTruthy();

    // 5. Test Merchant Customer Added / Khata Notification
    const customerAddedRes = await request.post('/api/bazar/notifications', {
      data: {
        type: 'customer_added',
        phone: '+91 98765 12345',
        name: 'गणेश पाटील',
        storeName: 'श्री महालक्ष्मी सुपर बझार',
        storePhone: '+91 98220 11223'
      }
    });
    expect(customerAddedRes.ok()).toBeTruthy();
  });
});

