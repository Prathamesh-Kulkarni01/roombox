'use client';

import { useGroceryCart } from '../context/GroceryCartContext';
import { AlertTriangle, Trash2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function SingleStoreCartConflictModal() {
  const { storeConflict, confirmSwitchStore, dismissSwitchStore } = useGroceryCart();

  if (!storeConflict) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-sm w-full p-5 space-y-4 shadow-2xl border border-border animate-in zoom-in-95">
        <div className="h-12 w-12 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center mx-auto">
          <AlertTriangle className="h-6 w-6 stroke-[2.5]" />
        </div>

        <div className="text-center space-y-1.5">
          <h3 className="font-extrabold text-base text-foreground">
            Replace cart items? (बझार बदलायचा का?)
          </h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Your cart already contains items from <strong className="text-foreground">{storeConflict.currentStoreName}</strong>. 
            A customer can order from only one bazar at a time.
          </p>
          <p className="text-[11px] text-amber-700 bg-amber-50 py-1 px-2 rounded-lg font-medium">
            Reset cart to start shopping from <span className="font-bold">{storeConflict.newStoreName}</span>?
          </p>
        </div>

        <div className="flex gap-2.5 pt-1">
          <Button
            variant="outline"
            onClick={dismissSwitchStore}
            className="flex-1 h-11 rounded-xl text-xs font-bold border-border"
          >
            Keep Current Cart
          </Button>
          <Button
            onClick={confirmSwitchStore}
            className="flex-1 h-11 rounded-xl text-xs font-bold bg-[#EF4444] hover:bg-[#DC2626] text-white shadow-sm"
          >
            <Trash2 className="h-3.5 w-3.5 mr-1" />
            Reset & Add
          </Button>
        </div>
      </div>
    </div>
  );
}

