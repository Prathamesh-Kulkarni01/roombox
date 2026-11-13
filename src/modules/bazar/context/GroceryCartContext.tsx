'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import type { GroceryProduct } from '../data/groceryCatalog';

export interface GroceryCartItem {
  product: GroceryProduct;
  selectedVariantId?: string;
  unit: string;
  price: number;
  quantity: number;
}

export interface StoreSwitchConflict {
  currentStoreName: string;
  newStoreName: string;
  pendingProduct: GroceryProduct;
  pendingVariantId?: string;
  pendingStoreId: string;
  pendingStoreName: string;
}

interface GroceryCartContextType {
  items: GroceryCartItem[];
  cartStoreId: string | null;
  cartStoreName: string | null;
  storeConflict: StoreSwitchConflict | null;
  addToCart: (product: GroceryProduct, variantId?: string, storeId?: string, storeName?: string) => { success: boolean; conflict?: StoreSwitchConflict };
  confirmSwitchStore: () => void;
  dismissSwitchStore: () => void;
  removeFromCart: (productId: string, variantId?: string) => void;
  updateQuantity: (productId: string, quantity: number, variantId?: string) => void;
  clearCart: () => void;
  getItemQuantity: (productId: string, variantId?: string) => number;
  totalItems: number;
  totalSavings: number;
  totalMrp: number;
  subtotal: number;
  deliveryFee: number;
  finalTotal: number;
  deliveryLocation: string;
  setDeliveryLocation: (location: string) => void;
}

const GroceryCartContext = createContext<GroceryCartContextType | undefined>(undefined);

export function GroceryCartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<GroceryCartItem[]>([]);
  const [cartStoreId, setCartStoreId] = useState<string | null>(null);
  const [cartStoreName, setCartStoreName] = useState<string | null>(null);
  const [storeConflict, setStoreConflict] = useState<StoreSwitchConflict | null>(null);
  const [deliveryLocation, setDeliveryLocation] = useState('Home · Palus, Sangli');

  // Load cart and active store from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('bazar_grocery_cart');
      if (saved) {
        setItems(JSON.parse(saved));
      }
      const savedStoreId = localStorage.getItem('bazar_cart_store_id');
      if (savedStoreId) {
        setCartStoreId(savedStoreId);
      }
      const savedStoreName = localStorage.getItem('bazar_cart_store_name');
      if (savedStoreName) {
        setCartStoreName(savedStoreName);
      }
      const savedLoc = localStorage.getItem('bazar_delivery_loc');
      if (savedLoc) {
        setDeliveryLocation(savedLoc);
      }
    } catch {
      // Local storage fallback
    }
  }, []);

  // Save cart and active store to localStorage
  const persistCart = (updated: GroceryCartItem[], storeId?: string | null, storeName?: string | null) => {
    setItems(updated);
    try {
      localStorage.setItem('bazar_grocery_cart', JSON.stringify(updated));
      const sId = storeId !== undefined ? storeId : (updated.length === 0 ? null : cartStoreId);
      const sName = storeName !== undefined ? storeName : (updated.length === 0 ? null : cartStoreName);
      setCartStoreId(sId);
      setCartStoreName(sName);
      if (sId) {
        localStorage.setItem('bazar_cart_store_id', sId);
      } else {
        localStorage.removeItem('bazar_cart_store_id');
      }
      if (sName) {
        localStorage.setItem('bazar_cart_store_name', sName);
      } else {
        localStorage.removeItem('bazar_cart_store_name');
      }
    } catch {
      // Ignore storage errors
    }
  };

  const getItemQuantity = (productId: string, variantId?: string): number => {
    const item = items.find(
      i => i.product.id === productId && (!variantId || i.selectedVariantId === variantId)
    );
    return item ? item.quantity : 0;
  };

  /**
   * Zomato-style Single Store Rule:
   * Prevents adding products from different bazars/stores.
   * If adding from another store, flags a conflict prompt.
   */
  const addToCart = (
    product: GroceryProduct, 
    variantId?: string, 
    incomingStoreId?: string, 
    incomingStoreName?: string
  ): { success: boolean; conflict?: StoreSwitchConflict } => {
    const targetStoreId = incomingStoreId || 'fresh-mart';
    const targetStoreName = incomingStoreName || (targetStoreId === 'fresh-mart' ? 'Fresh Mart Supermarket' : 'Selected Store');

    // Check if cart has items from another store
    if (items.length > 0 && cartStoreId && cartStoreId !== targetStoreId) {
      const conflict: StoreSwitchConflict = {
        currentStoreName: cartStoreName || 'Previous Store',
        newStoreName: targetStoreName,
        pendingProduct: product,
        pendingVariantId: variantId,
        pendingStoreId: targetStoreId,
        pendingStoreName: targetStoreName,
      };
      setStoreConflict(conflict);
      return { success: false, conflict };
    }

    const activeVariant = product.variants?.find(v => v.id === variantId);
    const unit = activeVariant ? activeVariant.unit : product.unit;
    const price = activeVariant ? activeVariant.price : product.price;

    const existingIndex = items.findIndex(
      i => i.product.id === product.id && (!variantId || i.selectedVariantId === variantId)
    );

    if (existingIndex > -1) {
      const currentQty = items[existingIndex].quantity;
      if (currentQty >= product.maxStock) return { success: true };
      const updated = [...items];
      updated[existingIndex].quantity = currentQty + 1;
      persistCart(updated, targetStoreId, targetStoreName);
    } else {
      const updated = [
        ...items,
        {
          product,
          selectedVariantId: variantId,
          unit,
          price,
          quantity: 1,
        },
      ];
      persistCart(updated, targetStoreId, targetStoreName);
    }
    return { success: true };
  };

  // User confirmed switching store: clear old cart & add new store item
  const confirmSwitchStore = () => {
    if (!storeConflict) return;
    const { pendingProduct, pendingVariantId, pendingStoreId, pendingStoreName } = storeConflict;
    const activeVariant = pendingProduct.variants?.find(v => v.id === pendingVariantId);
    const unit = activeVariant ? activeVariant.unit : pendingProduct.unit;
    const price = activeVariant ? activeVariant.price : pendingProduct.price;

    const newItems: GroceryCartItem[] = [
      {
        product: pendingProduct,
        selectedVariantId: pendingVariantId,
        unit,
        price,
        quantity: 1,
      },
    ];
    persistCart(newItems, pendingStoreId, pendingStoreName);
    setStoreConflict(null);
  };

  const dismissSwitchStore = () => {
    setStoreConflict(null);
  };

  const updateQuantity = (productId: string, quantity: number, variantId?: string) => {
    if (quantity <= 0) {
      removeFromCart(productId, variantId);
      return;
    }

    const updated = items.map(i => {
      if (i.product.id === productId && (!variantId || i.selectedVariantId === variantId)) {
        const cappedQty = Math.min(quantity, i.product.maxStock);
        return { ...i, quantity: cappedQty };
      }
      return i;
    });
    persistCart(updated);
  };

  const removeFromCart = (productId: string, variantId?: string) => {
    const updated = items.filter(
      i => !(i.product.id === productId && (!variantId || i.selectedVariantId === variantId))
    );
    if (updated.length === 0) {
      persistCart([], null, null);
    } else {
      persistCart(updated);
    }
  };

  const clearCart = () => {
    persistCart([], null, null);
  };

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  
  const totalMrp = items.reduce((sum, i) => {
    const variant = i.product.variants?.find(v => v.id === i.selectedVariantId);
    const itemMrp = variant ? variant.mrp : i.product.mrp;
    return sum + itemMrp * i.quantity;
  }, 0);

  const totalSavings = Math.max(0, totalMrp - subtotal);
  const deliveryFee = subtotal >= 299 || subtotal === 0 ? 0 : 25;
  const finalTotal = subtotal + deliveryFee;

  return (
    <GroceryCartContext.Provider
      value={{
        items,
        cartStoreId,
        cartStoreName,
        storeConflict,
        addToCart,
        confirmSwitchStore,
        dismissSwitchStore,
        removeFromCart,
        updateQuantity,
        clearCart,
        getItemQuantity,
        totalItems,
        totalSavings,
        totalMrp,
        subtotal,
        deliveryFee,
        finalTotal,
        deliveryLocation,
        setDeliveryLocation,
      }}
    >
      {children}
    </GroceryCartContext.Provider>
  );
}

export function useGroceryCart() {
  const context = useContext(GroceryCartContext);
  if (!context) {
    throw new Error('useGroceryCart must be used within a GroceryCartProvider');
  }
  return context;
}
