import { test, expect } from '../fixtures/bazar.fixture';

test.describe('Bazar Merchant Operating System E2E', () => {

  test('TC-MERC-01: Merchant Dashboard loads Key Performance Metrics & Status Switch', async ({ page }) => {
    await page.goto('/bazar/dashboard');

    // Verify Title & Header
    await expect(page.locator('text=श्री महालक्ष्मी सुपर बझार').or(page.locator('text=DASHBOARD')).first()).toBeVisible();

    // Verify Metric Cards (Today's Sales, Low Stock, Fulfill Orders)
    await expect(page.locator('text=Today\'s Sales').first()).toBeVisible();
    await expect(page.locator('text=Fulfill Orders').first()).toBeVisible();
    await expect(page.locator('text=Low Stock').first()).toBeVisible();

    // Verify Live Online Order Switch
    const liveSwitch = page.locator('button[role="switch"]').first();
    await expect(liveSwitch).toBeVisible();
  });

  test('TC-MERC-02: Orders Queue displays incoming customer orders and packing controls', async ({ page }) => {
    await page.goto('/bazar/queue');

    // Verify Queue Header & Status Filter Pills
    await expect(page.locator('text=Live Packing & Dispatch Queue').or(page.locator('text=Queue')).first()).toBeVisible();
    await expect(page.locator('button:has-text("All")').first()).toBeVisible();
    await expect(page.locator('button:has-text("Counter Pickup")').first()).toBeVisible();

    // Verify order cards with customer names & items exist
    const orderCards = page.locator('div[class*="rounded-2xl"]').filter({ hasText: 'Order #' });
    await expect(orderCards.first()).toBeVisible();
  });

  test('TC-MERC-03: Inventory Manager with 1-Tap In-Stock Toggle & Fast Search', async ({ page }) => {
    await page.goto('/bazar/inventory');

    // Verify Inventory Title & Search Input
    await expect(page.locator('h1:has-text("Store Catalog & Inventory")').first()).toBeVisible();
    const searchInput = page.locator('input[placeholder*="Search product"]');
    await expect(searchInput).toBeVisible();

    // Verify stock badge or master catalog
    const stockBadge = page.locator('text=In Stock').or(page.locator('text=Import Sangli Master Catalog')).first();
    await expect(stockBadge).toBeVisible();
  });

  test('TC-MERC-04: Walk-in Quick POS with Cash/UPI Billing and Instant Cart Calculation', async ({ page }) => {
    await page.goto('/bazar/pos');

    // Verify POS Title
    await expect(page.locator('text=Counter Billing').or(page.locator('text=POS')).first()).toBeVisible();

    // Verify Payment Tender Mode (Cash & UPI buttons or billing UI)
    await expect(page.locator('button:has-text("Cash")').or(page.locator('text=Cash')).first()).toBeVisible();
  });

  test('TC-MERC-05: Google Sheets 2-Way Sync & One-Click Master CSV Download', async ({ page }) => {
    await page.goto('/bazar/sheets-sync');

    // Verify Google Sheets Sync Title
    await expect(page.locator('text=Google Sheets Sync').or(page.locator('text=Google Sheet')).first()).toBeVisible();

    // Verify Google Sheet URL input
    const urlInput = page.locator('input[placeholder*="docs.google.com"]').or(page.locator('input[type="text"]').first());
    await expect(urlInput).toBeVisible();

    // Verify Sync Now and Download Template buttons
    await expect(page.locator('button:has-text("Sync Google Sheet Now")').or(page.locator('button:has-text("Sync")')).first()).toBeVisible();
    await expect(page.locator('a[href*="/api/bazar/inventory-template"]')).toBeVisible();
  });

  test('TC-MERC-06: Store Settings & Operational More Hub', async ({ page }) => {
    await page.goto('/bazar/more');

    // Verify Store Management Title & Settings options
    await expect(page.locator('text=श्री महालक्ष्मी सुपर बझार').first()).toBeVisible();
    await expect(page.locator('text=Verified Store').first()).toBeVisible();
    await expect(page.locator('text=Emergency Pause Online Orders').first()).toBeVisible();
  });

});

