import { test, expect } from '../fixtures/bazar.fixture';

test.describe('Bazar Cross-Application End-to-End Lifecycle', () => {

  test('TC-INT-01: End-to-End Order Creation to Merchant Queue Delivery', async ({ browser }) => {
    test.setTimeout(90000);
    // 1. Create a customer context and browser page
    const customerContext = await browser.newContext();
    const customerPage = await customerContext.newPage();

    // 2. Customer navigates to Storefront
    await customerPage.goto('/bazar/store/fresh-mart', { waitUntil: 'domcontentloaded' });
    await expect(customerPage.locator('text=Fresh Mart Supermarket').first()).toBeVisible();

    // 3. Customer adds product to cart
    const addBtn = customerPage.locator('button:has-text("ADD")').first();
    await expect(addBtn).toBeVisible();
    await addBtn.click();

    // 4. Customer proceeds to Checkout
    await customerPage.goto('/bazar/checkout', { waitUntil: 'domcontentloaded' });
    await expect(customerPage.locator('h1:has-text("Checkout")')).toBeVisible();

    // 5. Customer places order (Counter Pickup with Cash/Pay on pickup)
    const placeOrderBtn = customerPage.locator('button:has-text("Order & Pick from Bazar")').last();
    await expect(placeOrderBtn).toBeVisible();
    await placeOrderBtn.click();

    // 6. Verify Customer is redirected to Order Tracking
    await customerPage.waitForURL(/\/bazar\/order-tracking/, { timeout: 30000, waitUntil: 'domcontentloaded' });
    await expect(customerPage.locator('text=Order Placed').first()).toBeVisible();

    // 7. Merchant checks Packing Queue in separate context
    const merchantContext = await browser.newContext();
    const merchantPage = await merchantContext.newPage();

    await merchantPage.goto('/bazar/queue', { waitUntil: 'domcontentloaded' });
    await expect(merchantPage.locator('text=Live Packing & Dispatch Queue').first()).toBeVisible();

    // 8. Verify order queue contains customer orders
    const orderCards = merchantPage.locator('div[class*="rounded-2xl"]').filter({ hasText: 'Order #' });
    await expect(orderCards.first()).toBeVisible();

    // 9. Merchant checks Dashboard: order appears under Recent Orders with status badge
    await merchantPage.goto('/bazar/dashboard', { waitUntil: 'domcontentloaded' });
    await expect(merchantPage.locator('text=Recent Orders (नवीन ऑर्डर्स)')).toBeVisible();
    await expect(merchantPage.locator('text=Fulfill Orders')).toBeVisible();

    // Cleanup
    await customerContext.close();
    await merchantContext.close();
  });

});

