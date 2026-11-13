import type { BaseEntity } from '@/core/database/schema';

export const BAZAR_SCHEMA_VERSION = 1;

export interface BazarStore extends BaseEntity {
  name: string;
  nameMarathi?: string;
  slug: string; // e.g. "shree-super-bazar-palus"
  ownerId: string;
  phone: string;
  category: string;
  address: string;
  town: 'Palus' | 'Tasgaon' | 'Islampur' | 'Sangli' | string;
  location?: {
    lat: number;
    lng: number;
  };
  isActive: boolean;
  googleSheetConfig?: {
    spreadsheetId: string;
    sheetName: string;
    lastSyncedAt?: string;
    syncStatus?: 'idle' | 'syncing' | 'success' | 'error';
    syncMessage?: string;
  };
  branding?: {
    logoUrl?: string;
    bannerUrl?: string;
    themeColor?: string;
    customDomain?: string;
  };
  deliveryRadiusKm?: number;
  minOrderValue?: number;
  freeDeliveryThreshold?: number;
  schemaVersion: number;
}

export interface BazarProduct extends BaseEntity {
  storeId: string;
  name: string;
  nameMarathi?: string;
  description?: string;
  price: number;
  discountPrice?: number;
  unit: string; // e.g. "1 kg", "500 g", "1 Litre", "1 Packet"
  category: string;
  categoryMarathi?: string;
  inStock: boolean;
  stockQuantity?: number;
  barcode?: string;
  sku?: string;
  images?: string[];
  isMasterProduct?: boolean;
  schemaVersion: number;
}

export interface MasterCatalogItem {
  id: string;
  name: string;
  nameMarathi: string;
  category: string;
  categoryMarathi: string;
  unit: string;
  mrp: number;
  defaultPrice: number;
  barcode?: string;
  imageUrl?: string;
}

export interface BazarOrder extends BaseEntity {
  orderNumber: string;
  storeId: string;
  storeName?: string;
  customerId: string;
  customerPhone: string;
  customerName: string;
  deliveryAddress?: string;
  deliveryType?: 'home_delivery' | 'store_pickup';
  paymentMethod?: 'upi' | 'cod' | 'khata';
  items: Array<{
    productId: string;
    productName: string;
    unit?: string;
    quantity: number;
    price: number;
  }>;
  totalAmount: number;
  deliveryFee?: number;
  paymentStatus: 'pending' | 'paid' | 'failed';
  orderStatus: 'placed' | 'confirmed' | 'preparing' | 'dispatched' | 'delivered' | 'cancelled';
  orderSource?: 'pwa' | 'whatsapp_text' | 'whatsapp_voice';
  voiceNoteUrl?: string;
  notes?: string;
  schemaVersion: number;
}
