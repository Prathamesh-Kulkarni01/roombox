'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import type { BazarProduct } from '@/modules/bazar/schemas';

export interface CartItem {
  product: BazarProduct;
  quantity: number;
}

interface BazarCartContextType {
  items: CartItem[];
  addToCart: (product: BazarProduct) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
  language: 'mr' | 'en';
  toggleLanguage: () => void;
  favoriteStores: string[];
  toggleFavoriteStore: (storeSlug: string) => void;
  isFavoriteStore: (storeSlug: string) => boolean;
}

const BazarCartContext = createContext<BazarCartContextType | undefined>(undefined);

export function BazarCartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [language, setLanguage] = useState<'mr' | 'en'>('mr'); // Marathi by default
  const [favoriteStores, setFavoriteStores] = useState<string[]>([]);

  // Load cart and favorites from localStorage
  useEffect(() => {
    try {
      const savedFavorites = localStorage.getItem('bazar_favorites');
      if (savedFavorites) {
        setFavoriteStores(JSON.parse(savedFavorites));
      }
      const savedLang = localStorage.getItem('bazar_lang') as 'mr' | 'en';
      if (savedLang) {
        setLanguage(savedLang);
      }
    } catch (e) {
      console.warn('LocalStorage error:', e);
    }
  }, []);

  const toggleLanguage = () => {
    const nextLang = language === 'mr' ? 'en' : 'mr';
    setLanguage(nextLang);
    localStorage.setItem('bazar_lang', nextLang);
  };

  const toggleFavoriteStore = (storeSlug: string) => {
    setFavoriteStores(prev => {
      const next = prev.includes(storeSlug)
        ? prev.filter(s => s !== storeSlug)
        : [...prev, storeSlug];
      localStorage.setItem('bazar_favorites', JSON.stringify(next));
      return next;
    });
  };

  const isFavoriteStore = (storeSlug: string) => favoriteStores.includes(storeSlug);

  const addToCart = (product: BazarProduct) => {
    setItems(prev => {
      const existing = prev.find(i => i.product.id === product.id);
      if (existing) {
        return prev.map(i =>
          i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const removeFromCart = (productId: string) => {
    setItems(prev => prev.filter(i => i.product.id !== productId));
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setItems(prev =>
      prev.map(i => (i.product.id === productId ? { ...i, quantity } : i))
    );
  };

  const clearCart = () => setItems([]);

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
  const totalPrice = items.reduce((sum, i) => sum + i.product.price * i.quantity, 0);

  return (
    <BazarCartContext.Provider
      value={{
        items,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        totalItems,
        totalPrice,
        language,
        toggleLanguage,
        favoriteStores,
        toggleFavoriteStore,
        isFavoriteStore,
      }}
    >
      {children}
    </BazarCartContext.Provider>
  );
}

export function useBazarCart() {
  const context = useContext(BazarCartContext);
  if (!context) {
    throw new Error('useBazarCart must be used within a BazarCartProvider');
  }
  return context;
}

