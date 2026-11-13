'use server';

import { bazarService } from '../services';
import type { BazarStore, BazarProduct, BazarOrder } from '../schemas';
import type { SheetSyncResult } from '../services/googleSheetsSync';
import { GoogleSheetsSyncBridge } from '../services/googleSheetsSync';

/**
 * Fetch or initialize merchant store profile
 */
export async function getMerchantStoreAction(ownerId: string): Promise<BazarStore | null> {
  return bazarService.getStoreByOwner(ownerId);
}

/**
 * Save / Update merchant store details
 */
export async function saveStoreAction(store: Partial<BazarStore> & { ownerId: string }): Promise<{ success: boolean; storeId?: string; error?: string }> {
  try {
    const storeId = await bazarService.saveStore(store);
    return { success: true, storeId };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

/**
 * Fetch products for store
 */
export async function getStoreProductsAction(storeId: string): Promise<BazarProduct[]> {
  return bazarService.getProductsByStore(storeId);
}

/**
 * 1-Click Import of Sangli/Palus Regional Master Catalog
 */
export async function importRegionalMasterCatalogAction(storeId: string): Promise<{ success: boolean; count?: number; error?: string }> {
  try {
    const res = await bazarService.importMasterCatalogIntoStore(storeId);
    return { success: true, count: res.importedCount };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

/**
 * Trigger Google Sheet Sync
 */
export async function syncGoogleSheetAction(storeId: string, sheetUrlOrId: string, gid?: string): Promise<SheetSyncResult> {
  return bazarService.syncGoogleSheet(storeId, sheetUrlOrId, gid);
}

/**
 * Toggle stock status
 */
export async function toggleProductStockAction(productId: string, inStock: boolean): Promise<{ success: boolean; error?: string }> {
  try {
    await bazarService.toggleStock(productId, inStock);
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

/**
 * Update product price quickly
 */
export async function updateProductPriceAction(productId: string, price: number, discountPrice?: number): Promise<{ success: boolean; error?: string }> {
  try {
    await bazarService.updateProductPrice(productId, price, discountPrice);
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

/**
 * Save / Create Product manually
 */
export async function saveProductAction(product: Partial<BazarProduct> & { storeId: string; name: string; price: number }): Promise<{ success: boolean; productId?: string; error?: string }> {
  try {
    const productId = await bazarService.saveProduct(product);
    return { success: true, productId };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

/**
 * Delete product from store inventory
 */
export async function deleteProductAction(productId: string): Promise<{ success: boolean; error?: string }> {
  try {
    await bazarService.deleteProduct(productId);
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

/**
 * Get CSV Template for store owners
 */
export async function getCsvTemplateAction(): Promise<string> {
  return GoogleSheetsSyncBridge.getCsvTemplate();
}

/**
 * Get Store Orders
 */
export async function getStoreOrdersAction(storeId: string): Promise<BazarOrder[]> {
  return bazarService.getOrdersByStore(storeId);
}
