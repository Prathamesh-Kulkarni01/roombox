'use client';

import { useGroceryCart } from '../context/GroceryCartContext';
import { ShoppingBag, ArrowRight } from 'lucide-react';

interface NativeFloatingCartBarProps {
  onOpenCart: () => void;
}

export function NativeFloatingCartBar({ onOpenCart }: NativeFloatingCartBarProps) {
  const { totalItems, subtotal, totalSavings, cartStoreName } = useGroceryCart();

  if (totalItems === 0) return null;

  return (
    <div className="fixed bottom-16 left-0 right-0 z-40 px-3 pb-2 max-w-[430px] mx-auto animate-in slide-in-from-bottom duration-300 pointer-events-none">
      <div className="w-full h-12 bg-[#0D7C4D] text-white rounded-2xl px-3.5 flex items-center justify-between shadow-xl shadow-[#0D7C4D]/30 pointer-events-auto border border-white/20">
        
        {/* Left: Cart Icon with Badge + Items summary */}
        <div className="flex items-center gap-2.5">
          <div className="relative flex items-center justify-center">
            <ShoppingBag className="h-5 w-5" />
            <span className="absolute -top-1.5 -right-2 bg-[#EF4444] text-white text-[9px] font-black h-4 w-4 rounded-full flex items-center justify-center border-2 border-[#0D7C4D]">
              {totalItems}
            </span>
          </div>

          <div className="leading-tight">
            <p className="font-extrabold text-xs">
              {totalItems} items · ₹{subtotal}
            </p>
            {cartStoreName ? (
              <p className="text-[10px] text-emerald-100 font-medium line-clamp-1">
                From {cartStoreName}
              </p>
            ) : totalSavings > 0 ? (
              <p className="text-[10px] text-emerald-200 font-medium">
                You're saving ₹{totalSavings}
              </p>
            ) : (
              <p className="text-[10px] text-white/80 font-medium">
                Standard packing & delivery
              </p>
            )}
          </div>
        </div>

        {/* Right: View Cart Button Pill */}
        <button
          onClick={onOpenCart}
          className="h-8 px-3.5 rounded-xl bg-[#FFFFFF] text-[#0D7C4D] font-extrabold text-xs flex items-center gap-1 shadow-xs hover:bg-emerald-50 active:scale-95 transition-all"
        >
          <span>View Cart</span>
          <ArrowRight className="h-3.5 w-3.5 stroke-[2.5]" />
        </button>
      </div>
    </div>
  );
}
