import { test, expect } from '../fixtures/bazar.fixture';

test.describe('Bazar Merchant OS: Onboarding, Branding, Product Upload, Stock & Order Management', () => {

  // ─────────────────────────────────────────────────────────────
  // 1. MERCHANT ONBOARDING & STORE PROFILE CONFIGURATION
  // ─────────────────────────────────────────────────────────────
  test('TC-MERC-EXT-01: Merchant Store Profile, Local Geofence & Emergency Pause', async ({ page }) => {
    await page.goto('/bazar/more', { waitUntil: 'domcontentloaded' });

    // Verify Verified Merchant identity
    await expect(page.locator('h1:has-text("श्री महालक्ष्मी सुपर बझार")')).toBeVisible();
    await expect(page.locator('text=Verified Store')).toBeVisible();
    await expect(page.locator('text=पलूस (सांगली)')).toBeVisible();

    // Verify Emergency Pause Online Orders toggle (when shop is crowded)
    const pauseSwitch = page.locator('button[aria-label="Pause online orders"]');
    await expect(pauseSwitch).toBeVisible();
    await pauseSwitch.click();

    // Verify toast notification appears confirming status toggle
    const toastTitle = page.locator('div[class*="font-semibold"]:has-text("Online Orders Paused")').or(page.locator('div[class*="font-semibold"]:has-text("Online Orders Resumed")'));
    await expect(toastTitle.first()).toBeVisible();

    // Verify quick navigation links to Store Operations
    const sheetsLink = page.locator('a[href*="/bazar/sheets-sync"]').first();
    await expect(sheetsLink).toBeVisible();
    const invLink = page.locator('a[href*="/bazar/inventory"]').first();
    await expect(invLink).toBeVisible();
  });

  // ─────────────────────────────────────────────────────────────
  // 2. BRANDING, STORE HERO & PREVIEW ON STOREFRONT
  // ─────────────────────────────────────────────────────────────
  test('TC-MERC-EXT-02: Store Branding, Badges and Public Preview Link', async ({ page }) => {
    await page.goto('/bazar/more', { waitUntil: 'domcontentloaded' });

    // Verify "Preview" button exists and points to the public customer storefront
    const previewBtn = page.locator('a:has-text("Preview")');
    await expect(previewBtn).toBeVisible();
    const href = await previewBtn.getAttribute('href');
    expect(href).toContain('/bazar/store/fresh-mart');

    // Navigate to customer view to verify branding elements are rendered
    await page.goto('/bazar/store/fresh-mart', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('h1:has-text("Fresh Mart Supermarket")')).toBeVisible();
    await expect(page.locator('text=Open Now')).toBeVisible();
    await expect(page.locator('text=पलूस (Palus)').or(page.locator('text=Palus'))).toBeVisible();
  });

  // ─────────────────────────────────────────────────────────────
  // 3. PRODUCT UPLOAD: QUICK ADD PRODUCT MODAL
  // ─────────────────────────────────────────────────────────────
  test('TC-MERC-EXT-03: Product Upload via Quick Add Dialog with Marathi labels and MRP', async ({ page }) => {
    test.setTimeout(60000);
    await page.goto('/bazar/inventory', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('text=Loading store inventory...')).not.toBeVisible({ timeout: 15000 });

    // Open Quick Add Product dialog
    const quickAddBtn = page.locator('button:has-text("Quick Add Product")');
    await expect(quickAddBtn).toBeVisible({ timeout: 15000 });
    await quickAddBtn.click();

    // Verify modal inputs are present
    const nameInput = page.locator('input#p-name');
    const nameMrInput = page.locator('input#p-name-mr');
    const priceInput = page.locator('input#p-price');
    const mrpInput = page.locator('input#p-mrp');
    const unitInput = page.locator('input#p-unit');

    await expect(nameInput).toBeVisible();
    await expect(nameMrInput).toBeVisible();
    await expect(priceInput).toBeVisible();
    await expect(unitInput).toBeVisible();

    // Fill new product form
    const randomSku = `E2E Basmati Rice ${Date.now().toString().slice(-4)}`;
    await nameInput.fill(randomSku);
    await nameMrInput.fill('बासमती तांदूळ');
    await priceInput.fill('110');
    await mrpInput.fill('125');
    await unitInput.fill('1 kg');

    // Submit product
    const submitBtn = page.locator('button:has-text("Save Product")');
    await expect(submitBtn).toBeVisible();
    await submitBtn.click();

    // Verify dialog closes or success toast appears
    await expect(page.locator('input#p-name')).not.toBeVisible({ timeout: 10000 });
  });

  // ─────────────────────────────────────────────────────────────
  // 4. STOCK & INVENTORY MANAGEMENT: SEARCH & INVENTORY CONTROLS
  // ─────────────────────────────────────────────────────────────
  test('TC-MERC-EXT-04: Inventory Management - Search, Master Catalog, and Controls', async ({ page }) => {
    test.setTimeout(60000);
    await page.goto('/bazar/inventory', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('text=Loading store inventory...')).not.toBeVisible({ timeout: 15000 });

    // Search bar is active
    const searchInput = page.locator('input[placeholder*="Search product"]');
    await expect(searchInput).toBeVisible({ timeout: 15000 });

    // If initial catalog is empty, preload button exists; otherwise product items exist
    const preloadBtn = page.locator('button:has-text("Preload Master Catalog Now")');
    const quickAddBtn = page.locator('button:has-text("Quick Add Product")');
    await expect(preloadBtn.or(quickAddBtn)).toBeVisible();

    // Test typing a query
    await searchInput.fill('Rice');
    await page.waitForTimeout(300);
    await searchInput.fill('');
  });

  // ─────────────────────────────────────────────────────────────
  // 5. BULK PRODUCT UPLOAD: GOOGLE SHEETS & CSV SYNC
  // ─────────────────────────────────────────────────────────────
  test('TC-MERC-EXT-05: Bulk Upload via Google Sheets 2-Way Sync & Master Template', async ({ page }) => {
    await page.goto('/bazar/sheets-sync', { waitUntil: 'domcontentloaded' });

    // Verify Sheet URL input and sync controls
    const sheetInput = page.locator('input#sheetUrl');
    await expect(sheetInput).toBeVisible();

    // Verify Sync trigger button
    const syncBtn = page.locator('button:has-text("Sync Now")');
    await expect(syncBtn).toBeVisible();

    // Verify CSV Template action
    const templateBtn = page.locator('button:has-text("Copy CSV Template")').or(page.locator('text=CSV Template'));
    await expect(templateBtn.first()).toBeVisible();
  });

  // ─────────────────────────────────────────────────────────────
  // 6. ORDER HANDLING: LIFECYCLE FROM RECEIVED -> PACKING -> READY
  // ─────────────────────────────────────────────────────────────
  test('TC-MERC-EXT-06: Order Fulfilment Queue - Advance Status from Received to Packing & Ready', async ({ page }) => {
    await page.goto('/bazar/queue', { waitUntil: 'domcontentloaded' });

    // Verify queue loads with order cards
    const orderCards = page.locator('div[class*="rounded-2xl"]').filter({ hasText: 'Order #' });
    await expect(orderCards.first()).toBeVisible();

    // Filter by Counter Pickup orders
    const pickupTab = page.locator('button:has-text("Counter Pickup")');
    await expect(pickupTab).toBeVisible();
    await pickupTab.click();

    // Verify Phone and WhatsApp communication shortcuts
    const phoneBtn = page.locator('a[href^="tel:"]').first();
    const waBtn = page.locator('a[href^="https://wa.me/"]').first();
    await expect(phoneBtn).toBeVisible();
    await expect(waBtn).toBeVisible();

    // Find an order with 'Start Packing Bag' button and advance status
    const startPackingBtn = page.locator('button:has-text("Start Packing Bag")').first();
    if (await startPackingBtn.isVisible()) {
      await startPackingBtn.click();
      // Status badge advances to 'Packing in Progress'
      await expect(page.locator('text=Packing in Progress').first()).toBeVisible();

      // Next action button becomes 'Mark Ready for Pickup'
      const readyBtn = page.locator('button:has-text("Mark Ready for Pickup")').first();
      await expect(readyBtn).toBeVisible();
      await readyBtn.click();

      // Verify final customer notification status
      await expect(page.locator('text=Customer Notified via WhatsApp/SMS').first()).toBeVisible();
    }
  });

});
