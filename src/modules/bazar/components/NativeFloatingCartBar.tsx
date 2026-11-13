'use client';

import { useGroceryCart } from '../context/GroceryCartContext';
import { ShoppingBag, ArrowRight } from 'lucide-react';

interface NativeFloatingCartBarProps {
  onOpenCart: () => void;
  language?: 'mr' | 'en';
}

export function NativeFloatingCartBar({ onOpenCart, language = 'mr' }: NativeFloatingCartBarProps) {
  const { totalItems, subtotal, totalSavings, cartStoreName } = useGroceryCart();

  if (totalItems === 0) return null;

  return (
    <div className="fixed bottom-14 left-0 right-0 z-40 px-3 pb-2 max-w-[430px] mx-auto animate-in slide-in-from-bottom duration-300 pointer-events-none">
      <div className="w-full h-12 bg-emerald-600 text-white rounded-2xl px-3.5 flex items-center justify-between shadow-xl shadow-emerald-700/30 pointer-events-auto border border-emerald-500/30">
        
        {/* Left: Cart Icon with Badge + Items summary */}
        <div className="flex items-center gap-2.5">
          <div className="relative flex items-center justify-center">
            <ShoppingBag className="h-5 w-5" />
            <span className="absolute -top-1.5 -right-2 bg-rose-500 text-white text-[9px] font-black h-4 w-4 rounded-full flex items-center justify-center border-2 border-emerald-600">
              {totalItems}
            </span>
          </div>

          <div className="leading-tight">
            <p className="font-extrabold text-xs">
              {totalItems} {language === 'mr' ? 'वस्तू' : 'items'} · ₹{subtotal}
            </p>
            {cartStoreName ? (
              <p className="text-[10px] text-emerald-100 font-medium line-clamp-1">
                {cartStoreName}
              </p>
            ) : totalSavings > 0 ? (
              <p className="text-[10px] text-emerald-200 font-medium">
                {language === 'mr' ? `तुम्ही ₹${totalSavings} वाचवले!` : `You're saving ₹${totalSavings}`}
              </p>
            ) : (
              <p className="text-[10px] text-white/80 font-medium">
                {language === 'mr' ? 'घरपोच डिलिव्हरी' : 'Standard Delivery'}
              </p>
            )}
          </div>
        </div>

        {/* Right: View Cart Button Pill */}
        <button
          onClick={onOpenCart}
          className="h-8 px-3 rounded-xl bg-white text-emerald-700 hover:bg-emerald-50 active:scale-95 font-extrabold text-xs flex items-center gap-1 transition-all shadow-xs"
        >
          <span>{language === 'mr' ? 'टोपली पाहा' : 'View Cart'}</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </button>

      </div>
    </div>
  );
}
