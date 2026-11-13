import { db } from '@/core/database';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  query, 
  where, 
  Timestamp, 
  writeBatch 
} from 'firebase/firestore';
import type { BazarStore, BazarProduct, BazarOrder } from '../schemas';
import { BAZAR_SCHEMA_VERSION } from '../schemas';
import { SANGLI_REGIONAL_MASTER_CATALOG } from './masterCatalog';
import { GoogleSheetsSyncBridge, type SheetRowProduct, type SheetSyncResult } from './googleSheetsSync';
import { resolveProductImage } from './imageResolver';

const STORES_COLLECTION = 'bazar_stores';
const PRODUCTS_COLLECTION = 'bazar_products';
const ORDERS_COLLECTION = 'bazar_orders';

// In-memory order cache fallback to ensure instant cross-route sync even when offline or Firestore emulators are unconfigured
const inMemoryOrdersCache: BazarOrder[] = [];

export class BazarService {
  /**
   * Fetch active stores in Palus / Sangli / Tasgaon / Islampur
   */
  async getStores(): Promise<BazarStore[]> {
    if (!db) return [];
    try {
      const q = query(collection(db, STORES_COLLECTION), where('isActive', '==', true));
      const snap = await getDocs(q);
      return snap.docs.map(d => {
        const data = d.data() as BazarStore;
        return {
          ...data,
          id: d.id,
          schemaVersion: data.schemaVersion ?? BAZAR_SCHEMA_VERSION,
        };
      });
    } catch (e) {
      console.error('[BazarService] getStores error:', e);
      return [];
    }
  }

  /**
   * Fetch store by owner ID
   */
  async getStoreByOwner(ownerId: string): Promise<BazarStore | null> {
    if (!db) return null;
    try {
      const q = query(collection(db, STORES_COLLECTION), where('ownerId', '==', ownerId));
      const snap = await getDocs(q);
      if (snap.empty) return null;
      const d = snap.docs[0];
      const data = d.data() as BazarStore;
      return {
        ...data,
        id: d.id,
        schemaVersion: data.schemaVersion ?? BAZAR_SCHEMA_VERSION,
      };
    } catch (e) {
      console.error('[BazarService] getStoreByOwner error:', e);
      return null;
    }
  }

  /**
   * Create or update store profile
   */
  async saveStore(store: Partial<BazarStore> & { ownerId: string }): Promise<string> {
    if (!db) throw new Error('Database not initialized');
    const storeId = store.id || `store_${Date.now()}`;
    const storeRef = doc(db, STORES_COLLECTION, storeId);
    
    const payload: Partial<BazarStore> = {
      ...store,
      schemaVersion: BAZAR_SCHEMA_VERSION,
      updatedAt: new Date().toISOString(),
    };

    if (!store.id) {
      payload.createdAt = new Date().toISOString();
      payload.isActive = true;
    }

    await setDoc(storeRef, payload, { merge: true });
    return storeId;
  }

  /**
   * Fetch products by store
   */
  async getProductsByStore(storeId: string): Promise<BazarProduct[]> {
    if (!db) return [];
    try {
      const q = query(collection(db, PRODUCTS_COLLECTION), where('storeId', '==', storeId));
      const readPromise = getDocs(q);
      const timeoutPromise = new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Firestore read timeout')), 1000));
      const snap = await Promise.race([readPromise, timeoutPromise]);
      return snap.docs.map(d => {
        const data = d.data() as BazarProduct;
        return {
          ...data,
          id: d.id,
          unit: data.unit ?? '1 Pack',
          inStock: data.inStock ?? true,
          schemaVersion: data.schemaVersion ?? BAZAR_SCHEMA_VERSION,
        };
      });
    } catch (e) {
      console.warn('[BazarService] getProductsByStore warning:', e);
      return [];
    }
  }

  /**
   * Import Sangli Master Catalog into Store in 1-Click
   */
  async importMasterCatalogIntoStore(storeId: string): Promise<{ importedCount: number }> {
    if (!db) return { importedCount: 0 };
    try {
      const batch = writeBatch(db);
      let count = 0;

      for (const item of SANGLI_REGIONAL_MASTER_CATALOG) {
        const prodId = `prod_${storeId}_${item.id}`;
        const prodRef = doc(db, PRODUCTS_COLLECTION, prodId);
        
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
          schemaVersion: BAZAR_SCHEMA_VERSION,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        batch.set(prodRef, newProduct, { merge: true });
        count++;
      }

      await batch.commit();
      return { importedCount: count };
    } catch (e) {
      console.error('[BazarService] importMasterCatalog error:', e);
      throw e;
    }
  }

  /**
   * Sync Google Sheet items into store inventory
   */
  async syncGoogleSheet(storeId: string, spreadsheetUrlOrId: string, gid: string = '0'): Promise<SheetSyncResult> {
    if (!db) {
      return { success: false, importedCount: 0, updatedCount: 0, failedCount: 0, errors: ['Database not connected'] };
    }

    try {
      const spreadsheetId = GoogleSheetsSyncBridge.extractSpreadsheetId(spreadsheetUrlOrId);
      const csvUrl = GoogleSheetsSyncBridge.getCsvExportUrl(spreadsheetId, gid);

      const res = await fetch(csvUrl);
      if (!res.ok) {
        throw new Error(`Failed to fetch Google Sheet CSV: HTTP ${res.status}. Make sure the sheet is shared as "Anyone with link can view".`);
      }

      const csvText = await res.text();
      const parsedItems = GoogleSheetsSyncBridge.parseCsv(csvText);

      if (parsedItems.length === 0) {
        return { success: false, importedCount: 0, updatedCount: 0, failedCount: 0, errors: ['No valid product rows found in Google Sheet. Check header format.'] };
      }

      const batch = writeBatch(db);
      let importedCount = 0;

      for (const item of parsedItems) {
        // Clean unique ID per product name
        const cleanSlug = item.name.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 30);
        const prodId = `prod_${storeId}_${cleanSlug}`;
        const prodRef = doc(db, PRODUCTS_COLLECTION, prodId);

        const matchedImage = resolveProductImage(item.name, item.category, undefined, item.nameMarathi);

        const productData: Partial<BazarProduct> = {
          id: prodId,
          storeId,
          name: item.name,
          nameMarathi: item.nameMarathi,
          category: item.category,
          unit: item.unit,
          price: item.price,
          discountPrice: item.mrp > item.price ? item.mrp : undefined,
          inStock: item.inStock,
          barcode: item.barcode,
          images: [matchedImage],
          schemaVersion: BAZAR_SCHEMA_VERSION,
          updatedAt: new Date().toISOString(),
        };

        batch.set(prodRef, productData, { merge: true });
        importedCount++;
      }

      await batch.commit();

      // Update store sync status
      const storeRef = doc(db, STORES_COLLECTION, storeId);
      await updateDoc(storeRef, {
        'googleSheetConfig.spreadsheetId': spreadsheetId,
        'googleSheetConfig.lastSyncedAt': new Date().toISOString(),
        'googleSheetConfig.syncStatus': 'success',
        'googleSheetConfig.syncMessage': `Successfully synced ${importedCount} items from Google Sheet.`,
      });

      return {
        success: true,
        importedCount,
        updatedCount: 0,
        failedCount: 0,
        errors: [],
      };
    } catch (e: any) {
      console.error('[BazarService] syncGoogleSheet error:', e);
      return {
        success: false,
        importedCount: 0,
        updatedCount: 0,
        failedCount: 0,
        errors: [e.message || 'Unknown sync error'],
      };
    }
  }

  /**
   * Toggle in-stock status for a product
   */
  async toggleStock(productId: string, inStock: boolean): Promise<void> {
    if (!db) return;
    const ref = doc(db, PRODUCTS_COLLECTION, productId);
    await updateDoc(ref, {
      inStock,
      updatedAt: new Date().toISOString(),
    });
  }

  /**
   * Quick update product price & stock
   */
  async updateProductPrice(productId: string, price: number, discountPrice?: number): Promise<void> {
    if (!db) return;
    const ref = doc(db, PRODUCTS_COLLECTION, productId);
    await updateDoc(ref, {
      price,
      ...(discountPrice !== undefined ? { discountPrice } : {}),
      updatedAt: new Date().toISOString(),
    });
  }

  /**
   * Save or Create Product (Manual or customized)
   */
  async saveProduct(product: Partial<BazarProduct> & { storeId: string; name: string; price: number }): Promise<string> {
    if (!db) throw new Error('Database not initialized');
    const productId = product.id || `prod_${product.storeId}_${Date.now()}`;
    const ref = doc(db, PRODUCTS_COLLECTION, productId);

    const autoImage = product.images?.[0] || resolveProductImage(product.name, product.category, undefined, product.nameMarathi);

    const payload: Partial<BazarProduct> = {
      ...product,
      id: productId,
      images: [autoImage],
      inStock: product.inStock ?? true,
      unit: product.unit || '1 unit',
      schemaVersion: BAZAR_SCHEMA_VERSION,
      updatedAt: new Date().toISOString(),
    };

    if (!product.id) {
      payload.createdAt = new Date().toISOString();
    }

    try {
      const writePromise = setDoc(ref, payload, { merge: true });
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Firestore write timeout')), 1000));
      await Promise.race([writePromise, timeoutPromise]);
    } catch (err) {
      console.warn('[BazarService] saveProduct write warning/timeout:', err);
    }
    return productId;
  }

  /**
   * Delete a product from inventory
   */
  async deleteProduct(productId: string): Promise<void> {
    if (!db) return;
    const { deleteDoc } = await import('firebase/firestore');
    const ref = doc(db, PRODUCTS_COLLECTION, productId);
    await deleteDoc(ref);
  }

  /**
   * Create customer order
   */
  async createOrder(orderData: Partial<BazarOrder>): Promise<string> {
    const orderId = orderData.id || `BZ${Date.now().toString().slice(-6)}`;
    const payload: BazarOrder = {
      ...orderData,
      id: orderId,
      orderNumber: orderData.orderNumber || `#${orderId}`,
      orderStatus: orderData.orderStatus || 'placed',
      paymentStatus: orderData.paymentStatus || 'pending',
      storeId: orderData.storeId || 'fresh-mart',
      totalAmount: orderData.totalAmount || 0,
      customerName: orderData.customerName || 'Customer',
      schemaVersion: BAZAR_SCHEMA_VERSION,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as BazarOrder;

    // Save to in-memory order cache immediately
    inMemoryOrdersCache.unshift(payload);

    if (db) {
      try {
        const writePromise = setDoc(doc(db, ORDERS_COLLECTION, orderId), payload);
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Firestore write timeout')), 1000));
        await Promise.race([writePromise, timeoutPromise]);
      } catch (err) {
        console.warn('[BazarService] Firestore write failed or timed out, order kept in local session:', err);
      }
    }
    return orderId;
  }

  /**
   * Fetch active orders for store
   */
  async getOrdersByStore(storeId: string): Promise<BazarOrder[]> {
    const memoryOrders = inMemoryOrdersCache.filter(o => !storeId || o.storeId === storeId || storeId === 'default_store' || o.storeId === 'fresh-mart');
    if (!db) return memoryOrders;
    try {
      const q = query(collection(db, ORDERS_COLLECTION), where('storeId', '==', storeId));
      const readPromise = getDocs(q);
      const timeoutPromise = new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Firestore read timeout')), 1000));
      const snap = await Promise.race([readPromise, timeoutPromise]);
      const dbOrders = snap.docs.map(d => {
        const data = d.data() as BazarOrder;
        return {
          ...data,
          id: d.id,
          schemaVersion: data.schemaVersion ?? BAZAR_SCHEMA_VERSION,
        };
      });
      // Combine Firestore documents with in-memory orders, avoiding duplicates
      const seen = new Set(dbOrders.map(o => o.id));
      const combined = [...dbOrders, ...memoryOrders.filter(o => !seen.has(o.id))];
      return combined;
    } catch (e) {
      console.warn('[BazarService] getOrdersByStore warning/fallback to cache:', e);
      return memoryOrders;
    }
  }

  /**
   * Fetch orders placed by a specific customer phone number
   */
  async getOrdersByCustomerPhone(phone: string): Promise<BazarOrder[]> {
    const cleanDigits = phone.replace(/\D/g, '').slice(-10);
    const memoryOrders = inMemoryOrdersCache.filter(o => {
      const orderPhone = (o.customerPhone || '').replace(/\D/g, '').slice(-10);
      return orderPhone === cleanDigits;
    });

    if (!db) return memoryOrders;
    try {
      const q = query(collection(db, ORDERS_COLLECTION), where('customerPhone', '==', cleanDigits));
      const readPromise = getDocs(q);
      const timeoutPromise = new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Firestore read timeout')), 1500));
      const snap = await Promise.race([readPromise, timeoutPromise]);
      const dbOrders = snap.docs.map(d => {
        const data = d.data() as BazarOrder;
        return {
          ...data,
          id: d.id,
          schemaVersion: data.schemaVersion ?? BAZAR_SCHEMA_VERSION,
        };
      });

      const seen = new Set(dbOrders.map(o => o.id));
      return [...dbOrders, ...memoryOrders.filter(o => !seen.has(o.id))];
    } catch (e) {
      console.warn('[BazarService] getOrdersByCustomerPhone fallback to cache:', e);
      return memoryOrders;
    }
  }
  /**
   * Fetch a single order by ID
   */
  async getOrderById(orderId: string): Promise<BazarOrder | null> {
    const memoryOrder = inMemoryOrdersCache.find(o => o.id === orderId);
    if (memoryOrder) return memoryOrder;

    if (!db) return null;
    try {
      const snap = await getDoc(doc(db, ORDERS_COLLECTION, orderId));
      if (snap.exists()) {
        const data = snap.data() as BazarOrder;
        return {
          ...data,
          id: snap.id,
          schemaVersion: data.schemaVersion ?? BAZAR_SCHEMA_VERSION,
        };
      }
      return null;
    } catch (e) {
      console.warn('[BazarService] getOrderById error:', e);
      return null;
    }
  }

  /**
   * Update order status (placed -> packing -> ready -> delivered / cancelled)
   */
  async updateOrderStatus(orderId: string, status: BazarOrder['orderStatus']): Promise<boolean> {
    const cached = inMemoryOrdersCache.find(o => o.id === orderId);
    if (cached) {
      cached.orderStatus = status;
      cached.updatedAt = new Date().toISOString();
    }

    if (db) {
      try {
        const ref = doc(db, ORDERS_COLLECTION, orderId);
        const updatePromise = setDoc(ref, { orderStatus: status, updatedAt: new Date().toISOString() }, { merge: true });
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Firestore timeout')), 1000));
        await Promise.race([updatePromise, timeoutPromise]);
      } catch (e) {
        console.warn('[BazarService] updateOrderStatus warning:', e);
      }
    }
    return true;
  }
}

export const bazarService = new BazarService();
