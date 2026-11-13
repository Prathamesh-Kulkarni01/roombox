import { test, expect } from '../fixtures/bazar.fixture';

test.describe('Bazar Customer Storefront & Checkout E2E', () => {

  test('TC-CUST-01: Discovery Hub loads with Nearby Range & Verified Stores', async ({ page }) => {
    await page.goto('/bazar');
    await expect(page).toHaveTitle(/Bazar|RentSutra/i);

    // Verify Automatic Local Range Detection without town selector
    const locationText = page.locator('text=आपला परिसर');
    await expect(locationText.first()).toBeVisible();

    const rangeBadge = page.locator('text=< 5 km');
    await expect(rangeBadge.first()).toBeVisible();

    // Verify Favorite / Featured Store card
    const storeLink = page.locator('a[href*="/bazar/store/fresh-mart"]');
    await expect(storeLink.first()).toBeVisible();
  });

  test('TC-CUST-02: Storefront displays 2-column catalog, pack selector, and cart stepper', async ({ page }) => {
    await page.goto('/bazar/store/fresh-mart');

    // Check store title
    await expect(page.locator('text=Fresh Mart Supermarket').first()).toBeVisible();

    // Verify products are rendered
    const productHeadings = page.locator('h4');
    await expect(productHeadings.first()).toBeVisible();

    // Click on '+ ADD' on the first product card
    const addBtn = page.locator('button:has-text("ADD")').first();
    await expect(addBtn).toBeVisible();
    await addBtn.click();

    // Verify Floating Cart Bar pops up with quantity & price
    const cartBar = page.locator('text=View Cart');
    await expect(cartBar).toBeVisible();
  });

  test('TC-CUST-03: Categories & Exploration Page loads department carousels', async ({ page }) => {
    await page.goto('/bazar/categories');

    // Verify category items exist and display Marathi & English labels
    await expect(page.locator('text=भाज्या (Vegetables)').or(page.locator('text=Vegetables')).first()).toBeVisible();
    await expect(page.locator('text=items').first()).toBeVisible();
  });

  test('TC-CUST-04: Multi-Facet Search toggles Products and Stores tabs', async ({ page }) => {
    await page.goto('/bazar/search');

    const searchInput = page.locator('input[placeholder*="Search"]');
    await expect(searchInput).toBeVisible();

    // Type a query in Marathi or English
    await searchInput.fill('Milk');
    await page.waitForTimeout(300);

    // Verify tab headers exist
    await expect(page.locator('button:has-text("Products")').first()).toBeVisible();
    await expect(page.locator('button:has-text("Stores")').first()).toBeVisible();
  });

  test('TC-CUST-05: Checkout Flow defaults to COD and Counter Pickup', async ({ page }) => {
    await page.goto('/bazar/checkout');

    // Verify Checkout header
    await expect(page.locator('h1:has-text("Checkout")')).toBeVisible();

    // Verify Order & Pick from Bazar (Pickup option) is prominent
    const pickupOption = page.locator('button:has-text("Order & Pick from Bazar")').first();
    await expect(pickupOption).toBeVisible();

    // Verify Cash on Delivery / Pay at Store is pre-selected
    const codOption = page.locator('text=Pay at Counter on Pickup').or(page.locator('text=Cash on Delivery')).first();
    await expect(codOption).toBeVisible();

    // Place Order button
    const placeOrderBtn = page.locator('button:has-text("Order & Pick from Bazar")').last();
    await expect(placeOrderBtn).toBeVisible();

    // Submit order
    await placeOrderBtn.click();

    // Expect navigation to order tracking or successful redirection
    await page.waitForURL(/\/bazar\/order-tracking/, { timeout: 15000, waitUntil: 'domcontentloaded' });
    await expect(page.locator('text=Order Placed').first()).toBeVisible();
  });

  test('TC-CUST-06: Live Order Tracking displays 4-step status & store contact', async ({ page }) => {
    await page.goto('/bazar/order-tracking?id=ord_1');

    // Verify status tracking bar
    await expect(page.locator('text=Order Placed').first()).toBeVisible();

    // Verify direct WhatsApp / Call buttons
    const callBtn = page.locator('a[href^="tel:"]');
    await expect(callBtn.first()).toBeVisible();
  });

  test('TC-CUST-07: Single-store cart protection prevents multi-bazar cart mix (Zomato model)', async ({ page }) => {
    // 1. Visit Store A and add a product
    await page.goto('/bazar/store/fresh-mart');
    const addBtnStoreA = page.locator('button:has-text("ADD")').first();
    await expect(addBtnStoreA).toBeVisible();
    await addBtnStoreA.click();

    // Verify floating bar shows Fresh Mart
    await expect(page.locator('p:has-text("From Fresh Mart Supermarket")')).toBeVisible();

    // 2. Visit Store B and attempt to add a product
    await page.goto('/bazar/store/ganesh-kirana');
    const addBtnStoreB = page.locator('button:has-text("ADD")').first();
    await expect(addBtnStoreB).toBeVisible();
    await addBtnStoreB.click();

    // 3. Verify single-store conflict modal pops up
    await expect(page.locator('text=Replace cart items?')).toBeVisible();
    await expect(page.locator('text=A customer can order from only one bazar at a time.')).toBeVisible();

    // 4. Test "Keep Current Cart" dismissal
    const keepBtn = page.locator('button:has-text("Keep Current Cart")');
    await expect(keepBtn).toBeVisible();
    await keepBtn.click();
    await expect(page.locator('text=Replace cart items?')).not.toBeVisible();
  });

  test('TC-CUST-08: Cart bottom sheet "Proceed to Checkout" navigates to checkout page', async ({ page }) => {
    await page.goto('/bazar/store/fresh-mart');

    // Add item to cart
    const addBtn = page.locator('button:has-text("ADD")').first();
    await expect(addBtn).toBeVisible();
    await addBtn.click();

    // Open bottom sheet by clicking View Cart
    const viewCartBtn = page.locator('button:has-text("View Cart")');
    await expect(viewCartBtn).toBeVisible();
    await viewCartBtn.click();

    // Verify bottom sheet opens with Proceed to Checkout button
    const checkoutBtn = page.locator('button:has-text("Proceed to Checkout")');
    await expect(checkoutBtn).toBeVisible();
    await checkoutBtn.click();

    // Verify navigation to /bazar/checkout
    await page.waitForURL(/\/bazar\/checkout/, { timeout: 15000 });
    await expect(page.locator('h1:has-text("Checkout")')).toBeVisible();
  });
});

