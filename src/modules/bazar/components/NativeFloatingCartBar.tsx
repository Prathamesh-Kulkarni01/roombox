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
    <div 
      className="fixed left-0 right-0 z-50 px-3 max-w-[430px] mx-auto pointer-events-none transition-all duration-300"
      style={{ bottom: '16px' }}
    >
      <div className="w-full h-12 bg-primary text-primary-foreground rounded-2xl px-3.5 flex items-center justify-between shadow-xl shadow-primary/30 pointer-events-auto border border-primary/20">
        
        {/* Left: Cart Icon with Badge + Items summary */}
        <div className="flex items-center gap-2.5">
          <div className="relative flex items-center justify-center">
            <ShoppingBag className="h-5 w-5" />
            <span className="absolute -top-1.5 -right-2 bg-rose-500 text-white text-[9px] font-black h-4 w-4 rounded-full flex items-center justify-center border-2 border-primary">
              {totalItems}
            </span>
          </div>

          <div className="leading-tight">
            <p className="font-extrabold text-xs">
              {totalItems} {language === 'mr' ? 'वस्तू' : 'items'} · ₹{subtotal}
            </p>
            {cartStoreName ? (
              <p className="text-[10px] text-primary-foreground/80 font-medium line-clamp-1">
                {cartStoreName}
              </p>
            ) : totalSavings > 0 ? (
              <p className="text-[10px] text-yellow-300 font-bold">
                {language === 'mr' ? `₹${totalSavings} बचत!` : `₹${totalSavings} saved!`}
              </p>
            ) : (
              <p className="text-[10px] text-primary-foreground/90 font-medium">
                ⚡ {language === 'mr' ? '१०-१५ मिनिटांत डिलिव्हरी' : '10-15 Min Delivery'}
              </p>
            )}
          </div>
        </div>

        {/* Right: View Cart Button Pill */}
        <button
          onClick={onOpenCart}
          className="h-8 px-3 rounded-xl bg-white text-slate-900 hover:bg-slate-50 active:scale-95 font-black text-xs flex items-center gap-1 transition-all shadow-md"
        >
          <span>{language === 'mr' ? 'टोपली पाहा' : 'View Cart'}</span>
          <ArrowRight className="h-3.5 w-3.5 stroke-[2.5]" />
        </button>

      </div>
    </div>
  );
}
