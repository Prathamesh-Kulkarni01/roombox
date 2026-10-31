import { db } from '@/core/database';
import { collection, doc, getDoc, getDocs, setDoc, query, where, Timestamp } from 'firebase/firestore';
import type { BazarStore, BazarProduct, BazarOrder } from '../schemas';
import { BAZAR_SCHEMA_VERSION } from '../schemas';

const STORES_COLLECTION = 'bazar_stores';
const PRODUCTS_COLLECTION = 'bazar_products';
const ORDERS_COLLECTION = 'bazar_orders';

export class BazarService {
  /**
   * Fetch active stores in Palus Local Bazar
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
   * Fetch products by store
   */
  async getProductsByStore(storeId: string): Promise<BazarProduct[]> {
    if (!db) return [];
    try {
      const q = query(collection(db, PRODUCTS_COLLECTION), where('storeId', '==', storeId));
      const snap = await getDocs(q);
      return snap.docs.map(d => {
        const data = d.data() as BazarProduct;
        return {
          ...data,
          id: d.id,
          schemaVersion: data.schemaVersion ?? BAZAR_SCHEMA_VERSION,
        };
      });
    } catch (e) {
      console.error('[BazarService] getProductsByStore error:', e);
      return [];
    }
  }

  /**
   * Create an order with schema versioning
   */
  async createOrder(orderData: Omit<BazarOrder, 'id' | 'schemaVersion' | 'createdAt' | 'updatedAt'>): Promise<string> {
    if (!db) throw new Error('Database not initialized');
    const orderRef = doc(collection(db, ORDERS_COLLECTION));
    const now = Timestamp.now();
    
    const payload: BazarOrder = {
      ...orderData,
      id: orderRef.id,
      schemaVersion: BAZAR_SCHEMA_VERSION,
      createdAt: now,
      updatedAt: now,
    };

    await setDoc(orderRef, payload);
    return orderRef.id;
  }
}

export const bazarService = new BazarService();

