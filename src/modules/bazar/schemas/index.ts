import type { BaseEntity } from '@/core/database/schema';

export const BAZAR_SCHEMA_VERSION = 1;

export interface BazarStore extends BaseEntity {
  name: string;
  ownerId: string;
  phone: string;
  category: string;
  address: string;
  location?: {
    lat: number;
    lng: number;
  };
  isActive: boolean;
  schemaVersion: number;
}

export interface BazarProduct extends BaseEntity {
  storeId: string;
  name: string;
  description?: string;
  price: number;
  discountPrice?: number;
  category: string;
  inStock: boolean;
  images?: string[];
  schemaVersion: number;
}

export interface BazarOrder extends BaseEntity {
  orderNumber: string;
  storeId: string;
  customerId: string;
  customerPhone: string;
  customerName: string;
  deliveryAddress?: string;
  items: Array<{
    productId: string;
    productName: string;
    quantity: number;
    price: number;
  }>;
  totalAmount: number;
  paymentStatus: 'pending' | 'paid' | 'failed';
  orderStatus: 'placed' | 'confirmed' | 'preparing' | 'dispatched' | 'delivered' | 'cancelled';
  schemaVersion: number;
}

