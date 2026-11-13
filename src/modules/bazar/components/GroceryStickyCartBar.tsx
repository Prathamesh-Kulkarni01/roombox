'use client';

import { useState } from 'react';
import { useGroceryCart } from '../context/GroceryCartContext';
import { 
  ArrowRight, 
  ShoppingBag, 
  Zap, 
  MapPin, 
  CheckCircle2, 
  ChevronRight,
  ShieldCheck,
  Bike
} from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';

export function GroceryStickyCartBar() {
  const { 
    items, 
    totalItems, 
    subtotal, 
    totalSavings, 
    deliveryFee, 
    finalTotal,
    deliveryLocation,
    clearCart 
  } = useGroceryCart();

  const [isOpen, setIsOpen] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);

  if (totalItems === 0) return null;

  const handlePlaceOrder = () => {
    setOrderPlaced(true);
    setTimeout(() => {
      clearCart();
      setIsOpen(false);
      setOrderPlaced(false);
    }, 2000);
  };

  return (
    <>
      {/* Sticky Bottom Full-Width CTA Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#FFFFFF] border-t border-[#ECEFEC] p-3 pb-safe shadow-lg max-w-md md:max-w-2xl mx-auto">
        <button
          onClick={() => setIsOpen(true)}
          className="w-full h-12 bg-[#16834A] hover:bg-[#16834A]/95 active:scale-[0.99] text-white rounded-xl px-4 flex items-center justify-between shadow-md transition-all"
        >
          <div className="flex items-center gap-2">
            <span className="bg-white/20 text-white font-bold text-xs px-2 py-0.5 rounded-md">
              {totalItems} {totalItems === 1 ? 'item' : 'items'}
            </span>
            <span className="font-extrabold text-sm">₹{subtotal}</span>
            {totalSavings > 0 && (
              <span className="text-[11px] text-white/80 font-medium">
                (Saved ₹{totalSavings})
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 font-bold text-xs">
            <span>View Cart</span>
            <ArrowRight className="h-4 w-4" />
          </div>
        </button>
      </div>

      {/* Cart & Checkout Sheet */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent side="bottom" className="rounded-t-[24px] max-h-[85vh] overflow-y-auto p-5 bg-[#FFFFFF]">
          <SheetHeader className="text-left pb-3 border-b border-[#ECEFEC]">
            <SheetTitle className="text-base font-bold text-[#171A18] flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-[#16834A]" />
              My Grocery Cart ({totalItems})
            </SheetTitle>
            <SheetDescription className="text-xs text-[#777F79]">
              Delivering to: <strong className="text-[#171A18]">{deliveryLocation}</strong>
            </SheetDescription>
          </SheetHeader>

          {orderPlaced ? (
            <div className="py-12 text-center space-y-3">
              <CheckCircle2 className="h-14 w-14 text-[#16834A] mx-auto animate-bounce" />
              <h3 className="font-extrabold text-lg text-[#171A18]">Order Placed Successfully!</h3>
              <p className="text-xs text-[#777F79]">Fresh Mart is packing your order now. Expected in 15–25 mins.</p>
            </div>
          ) : (
            <div className="space-y-4 pt-3">
              {/* Items List */}
              <div className="divide-y divide-[#ECEFEC] max-h-56 overflow-y-auto">
                {items.map(item => (
                  <div key={item.product.id + (item.selectedVariantId || '')} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-[#171A18]">{item.product.name}</p>
                      <p className="text-[11px] text-[#777F79]">{item.unit} • Qty: {item.quantity}</p>
                    </div>
                    <span className="font-extrabold text-[#171A18]">
                      ₹{item.price * item.quantity}
                    </span>
                  </div>
                ))}
              </div>

              {/* Bill Details */}
              <div className="bg-[#F6F7F5] rounded-2xl p-3.5 space-y-2 text-xs">
                <div className="flex justify-between text-[#777F79]">
                  <span>Item Total</span>
                  <span className="font-medium text-[#171A18]">₹{subtotal}</span>
                </div>
                <div className="flex justify-between text-[#777F79]">
                  <span>Delivery Fee</span>
                  {deliveryFee === 0 ? (
                    <span className="text-[#16834A] font-bold">FREE</span>
                  ) : (
                    <span className="font-medium text-[#171A18]">₹{deliveryFee}</span>
                  )}
                </div>
                {totalSavings > 0 && (
                  <div className="flex justify-between text-[#16834A] font-bold">
                    <span>Total Discount Savings</span>
                    <span>-₹{totalSavings}</span>
                  </div>
                )}
                <div className="pt-2 border-t border-[#ECEFEC] flex justify-between font-extrabold text-sm text-[#171A18]">
                  <span>To Pay</span>
                  <span>₹{finalTotal}</span>
                </div>
              </div>

              {/* Delivery Speed Card */}
              <div className="flex items-center gap-2 p-2.5 rounded-xl border border-[#ECEFEC] bg-[#FFFFFF] text-xs text-[#777F79]">
                <Bike className="h-4 w-4 text-[#16834A] shrink-0" />
                <span>Standard Delivery: <strong>15–25 mins</strong> from Fresh Mart</span>
              </div>

              {/* Place Order CTA */}
              <Button
                onClick={handlePlaceOrder}
                className="w-full h-12 bg-[#16834A] hover:bg-[#16834A]/90 text-white font-bold rounded-xl text-sm shadow-md"
              >
                Proceed to Pay ₹{finalTotal}
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}

