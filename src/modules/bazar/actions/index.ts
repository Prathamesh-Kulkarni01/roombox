'use server';

import { bazarService } from '../services';
import type { BazarStore, BazarProduct, BazarOrder, BazarCustomer } from '../schemas';
import type { SheetSyncResult } from '../services/googleSheetsSync';
import { GoogleSheetsSyncBridge } from '../services/googleSheetsSync';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { BazarWhatsAppNotificationService } from '../services/whatsappNotificationService';

const STORES_COLLECTION = 'bazar_stores';
const PRODUCTS_COLLECTION = 'bazar_products';
const ORDERS_COLLECTION = 'bazar_orders';
const CUSTOMERS_COLLECTION = 'bazar_customers';

/**
 * Fetch or initialize merchant store profile (using Admin SDK on server)
 */
export async function getMerchantStoreAction(ownerId: string): Promise<BazarStore | null> {
  try {
    const adminDb = await getAdminDb();
    const snap = await adminDb.collection(STORES_COLLECTION).where('ownerId', '==', ownerId).limit(1).get();
    if (snap.empty) {
      // Fallback: check by ID or client service
      return bazarService.getStoreByOwner(ownerId);
    }
    const d = snap.docs[0];
    const data = d.data() as BazarStore;
    return {
      ...data,
      id: d.id,
      schemaVersion: data.schemaVersion ?? 1,
    };
  } catch (err) {
    console.warn('[ServerAction] getMerchantStoreAction fallback to client service:', err);
    return bazarService.getStoreByOwner(ownerId);
  }
}

/**
 * Save / Update merchant store details (using Admin SDK on server to bypass client permission issues)
 */
export async function saveStoreAction(store: Partial<BazarStore> & { ownerId: string }): Promise<{ success: boolean; storeId?: string; error?: string }> {
  try {
    const adminDb = await getAdminDb();
    const storeId = store.id || `store_${Date.now()}`;
    const payload: Partial<BazarStore> = {
      ...store,
      schemaVersion: 1,
      updatedAt: new Date().toISOString(),
    };

    if (!store.id) {
      payload.createdAt = new Date().toISOString();
      payload.isActive = true;
    }

    await adminDb.collection(STORES_COLLECTION).doc(storeId).set(payload, { merge: true });
    return { success: true, storeId };
  } catch (e: any) {
    console.warn('[ServerAction] Admin SDK saveStore failed, attempting service fallback:', e?.message || e);
    try {
      const storeId = await bazarService.saveStore(store);
      return { success: true, storeId };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }
}

/**
 * Fetch products for store
 */
export async function getStoreProductsAction(storeId: string): Promise<BazarProduct[]> {
  try {
    const adminDb = await getAdminDb();
    const snap = await adminDb.collection(PRODUCTS_COLLECTION).where('storeId', '==', storeId).get();
    if (!snap.empty) {
      return snap.docs.map(d => {
        const data = d.data() as BazarProduct;
        return {
          ...data,
          id: d.id,
          unit: data.unit ?? '1 Pack',
          inStock: data.inStock ?? true,
          schemaVersion: data.schemaVersion ?? 1,
        };
      });
    }
    return bazarService.getProductsByStore(storeId);
  } catch (err) {
    return bazarService.getProductsByStore(storeId);
  }
}

/**
 * 1-Click Import of Sangli/Palus Regional Master Catalog
 */
export async function importRegionalMasterCatalogAction(storeId: string): Promise<{ success: boolean; count?: number; error?: string }> {
  try {
    const adminDb = await getAdminDb();
    const { SANGLI_REGIONAL_MASTER_CATALOG } = await import('../services/masterCatalog');
    const { resolveProductImage } = await import('../services/imageResolver');

    const batch = adminDb.batch();
    let count = 0;

    for (const item of SANGLI_REGIONAL_MASTER_CATALOG) {
      const prodId = `prod_${storeId}_${item.id}`;
      const prodRef = adminDb.collection(PRODUCTS_COLLECTION).doc(prodId);
      const matchedImage = resolveProductImage(item.name, item.category, item.imageUrl, item.nameMarathi);

      const newProduct: BazarProduct = {
        id: prodId,
        storeId,
        name: item.name,
        nameMarathi: item.nameMarathi,
        price: item.defaultPrice,
        discountPrice: item.mrp > item.defaultPrice ? item.mrp : undefined,
        unit: item.unit,
        category: item.category,
        categoryMarathi: item.categoryMarathi,
        inStock: true,
        barcode: item.barcode,
        images: [matchedImage],
        isMasterProduct: true,
        schemaVersion: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      batch.set(prodRef, newProduct, { merge: true });
      count++;
    }

    await batch.commit();
    return { success: true, count };
  } catch (e: any) {
    console.warn('[ServerAction] Admin SDK master catalog import failed, attempting service fallback:', e?.message || e);
    try {
      const res = await bazarService.importMasterCatalogIntoStore(storeId);
      return { success: true, count: res.importedCount };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
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
 * Get all active registered stores in Bazar (Admin SDK)
 */
export async function getAllActiveStoresAction(): Promise<BazarStore[]> {
  try {
    const adminDb = await getAdminDb();
    const snap = await adminDb.collection(STORES_COLLECTION).where('isActive', '==', true).get();
    if (snap.empty) {
      return [];
    }
    return snap.docs.map(doc => {
      const data = doc.data() as BazarStore;
      return {
        ...data,
        id: doc.id,
        schemaVersion: data.schemaVersion ?? 1,
      };
    });
  } catch (err) {
    console.warn('[ServerAction] getAllActiveStoresAction failed:', err);
    return [];
  }
}

/**
 * Get Store Orders
 */
export async function getStoreOrdersAction(storeId: string): Promise<BazarOrder[]> {
  return bazarService.getOrdersByStore(storeId);
}

/**
 * Add Walk-in customer to store directory and send automated Welcome & Order link via WhatsApp API
 */
export async function addStoreCustomerAndSendInviteAction(params: {
  storeId: string;
  storeName: string;
  storePhone?: string;
  storeSlug?: string;
  customerName: string;
  customerPhone: string;
}): Promise<{ success: boolean; customerId?: string; error?: string }> {
  try {
    const { storeId, storeName, storePhone, storeSlug, customerName, customerPhone } = params;
    const cleanPhone = customerPhone.replace(/\D/g, '').slice(-10);
    if (!cleanPhone || cleanPhone.length !== 10) {
      return { success: false, error: 'अचूक १० अंकी मोबाईल नंबर आवश्यक आहे.' };
    }

    const adminDb = await getAdminDb();
    const customerId = `cust_${storeId}_${cleanPhone}`;
    const customerRef = adminDb.collection(CUSTOMERS_COLLECTION).doc(customerId);

    const now = new Date().toISOString();
    const customerRecord: Partial<BazarCustomer> = {
      id: customerId,
      storeId,
      name: customerName.trim() || 'ग्राहक',
      phone: cleanPhone,
      addedBy: 'merchant_invite',
      lastInvitedAt: now,
      schemaVersion: 1,
      updatedAt: now,
    };

    // Save or update customer record in Firestore
    await customerRef.set(customerRecord, { merge: true });

    // Send direct automated WhatsApp message via Cloud API
    await BazarWhatsAppNotificationService.sendMerchantCustomerAddedNotification(
      cleanPhone,
      customerName.trim() || 'ग्राहक मित्र',
      storeName,
      storePhone,
      storeSlug
    );

    return { success: true, customerId };
  } catch (err: any) {
    console.error('[ServerAction] addStoreCustomerAndSendInviteAction error:', err);
    return { success: false, error: err.message || 'ग्राहक जोडताना किंवा मेसेज पाठवताना त्रुटी आली.' };
  }
}

/**
 * Get all registered walk-in customers for a store
 */
export async function getStoreCustomersAction(storeId: string): Promise<BazarCustomer[]> {
  try {
    const adminDb = await getAdminDb();
    const snap = await adminDb.collection(CUSTOMERS_COLLECTION)
      .where('storeId', '==', storeId)
      .limit(200)
      .get();

    if (snap.empty) return [];
    return snap.docs.map(d => {
      const data = d.data() as BazarCustomer;
      return {
        ...data,
        id: d.id,
        schemaVersion: data.schemaVersion ?? 1,
      };
    });
  } catch (err) {
    console.warn('[ServerAction] getStoreCustomersAction error:', err);
    return [];
  }
}
