'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  Share2, 
  MoreVertical, 
  BadgeCheck, 
  MapPin, 
  ChevronDown,
  Check
} from 'lucide-react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useGroceryCart } from '../context/GroceryCartContext';

interface StoreNativeHeaderProps {
  storeName: string;
}

export function StoreNativeHeader({ storeName }: StoreNativeHeaderProps) {
  const router = useRouter();
  const { deliveryLocation, setDeliveryLocation } = useGroceryCart();
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);

  const sampleAddresses = [
    { label: 'Home', address: 'Flat 402, Green Valley Apartments, Main Road' },
    { label: 'Work', address: 'Office 3B, Tech Park, Station Road' },
    { label: 'Other', address: 'Plot 14, Shivaji Nagar, Behind Market' },
  ];

  const handleShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: storeName,
          text: `Check out ${storeName} on Bazar!`,
          url: window.location.href,
        });
      } catch {
        // dismissed
      }
    }
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-[#FFFFFF] border-b border-[#ECEFEC] px-3.5 pt-2.5 pb-2">
        {/* Top Action Row */}
        <div className="flex items-center justify-between gap-2">
          {/* Left: Back & Store Logo */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.back()}
              className="h-10 w-10 -ml-1 rounded-full flex items-center justify-center text-[#171A18] hover:bg-[#F6F7F5] active:scale-95 transition-all"
              aria-label="Back"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="h-9 w-9 rounded-xl bg-[#16834A] text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
              FM
            </div>
            <div>
              <div className="flex items-center gap-1">
                <h1 className="font-bold text-sm text-[#171A18] leading-tight">
                  {storeName}
                </h1>
                <BadgeCheck className="h-4 w-4 fill-[#16834A] text-white shrink-0" />
              </div>
              <p className="text-[11px] text-[#777F79] font-medium leading-none mt-0.5">
                Local Supermarket
              </p>
            </div>
          </div>

          {/* Right: Share & More */}
          <div className="flex items-center gap-0.5">
            <button
              onClick={handleShare}
              className="h-9 w-9 rounded-full flex items-center justify-center text-[#171A18] hover:bg-[#F6F7F5] active:scale-95 transition-all"
              aria-label="Share"
            >
              <Share2 className="h-4 w-4" />
            </button>
            <button
              className="h-9 w-9 rounded-full flex items-center justify-center text-[#171A18] hover:bg-[#F6F7F5] active:scale-95 transition-all"
              aria-label="More options"
            >
              <MoreVertical className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Compact Delivery Location Bar */}
        <div className="mt-2 pt-1.5 border-t border-[#ECEFEC]/60 flex items-center justify-between">
          <button
            onClick={() => setIsLocationModalOpen(true)}
            className="flex items-center gap-1.5 text-left text-xs font-semibold text-[#171A18] hover:opacity-80 transition-opacity"
          >
            <MapPin className="h-3.5 w-3.5 text-[#16834A] shrink-0" />
            <span className="truncate max-w-[240px] text-[11px]">
              Delivering to <strong className="text-[#16834A]">{deliveryLocation.split('·')[0]}</strong> · {deliveryLocation.split('·')[1] || 'Change'}
            </span>
            <ChevronDown className="h-3.5 w-3.5 text-[#777F79] shrink-0" />
          </button>
        </div>
      </header>

      {/* Delivery Location Picker Modal */}
      <Dialog open={isLocationModalOpen} onOpenChange={setIsLocationModalOpen}>
        <DialogContent className="max-w-md rounded-3xl p-5 bg-[#FFFFFF]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[#171A18]">
              Select Delivery Address
            </DialogTitle>
            <DialogDescription className="text-xs text-[#777F79]">
              Fastest delivery from {storeName} in 15–25 mins
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 mt-3">
            {sampleAddresses.map((addr, idx) => {
              const isSelected = deliveryLocation.startsWith(addr.label);
              return (
                <button
                  key={idx}
                  onClick={() => {
                    setDeliveryLocation(`${addr.label} · ${addr.address}`);
                    setIsLocationModalOpen(false);
                  }}
                  className={`w-full p-3 rounded-2xl border text-left flex items-start justify-between transition-all ${
                    isSelected 
                      ? 'border-[#16834A] bg-[#16834A]/5' 
                      : 'border-[#ECEFEC] hover:bg-[#F6F7F5]'
                  }`}
                >
                  <div className="space-y-0.5">
                    <p className="font-bold text-xs text-[#171A18]">{addr.label}</p>
                    <p className="text-[11px] text-[#777F79] leading-tight line-clamp-1">
                      {addr.address}
                    </p>
                  </div>
                  {isSelected && (
                    <div className="h-5 w-5 rounded-full bg-[#16834A] text-white flex items-center justify-center shrink-0">
                      <Check className="h-3 w-3" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

