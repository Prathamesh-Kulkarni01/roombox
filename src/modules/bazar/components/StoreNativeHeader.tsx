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
  const [customAddress, setCustomAddress] = useState('');
  const [savedUserAddress, setSavedUserAddress] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const addr = localStorage.getItem('bazar_delivery_address');
      if (addr && addr.trim().length > 0) {
        setSavedUserAddress(addr.trim());
      }
    }
  }, [isLocationModalOpen]);

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

          <div className="space-y-3 mt-3">
            {savedUserAddress && (
              <button
                onClick={() => {
                  setDeliveryLocation(`Home · ${savedUserAddress}`);
                  setIsLocationModalOpen(false);
                }}
                className="w-full p-3 rounded-2xl border border-[#16834A] bg-[#16834A]/5 text-left flex items-start justify-between transition-all"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-[#16834A]" />
                    <p className="font-bold text-xs text-[#171A18]">Saved Address</p>
                  </div>
                  <p className="text-[11px] text-[#777F79] leading-tight line-clamp-2">
                    {savedUserAddress}
                  </p>
                </div>
                <div className="h-5 w-5 rounded-full bg-[#16834A] text-white flex items-center justify-center shrink-0">
                  <Check className="h-3 w-3" />
                </div>
              </button>
            )}

            <div className="space-y-2 pt-1 border-t border-border/50">
              <label className="text-[11px] font-bold text-muted-foreground">
                Enter delivery address or landmark:
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customAddress}
                  onChange={(e) => setCustomAddress(e.target.value)}
                  placeholder="उदा. मेन रोड, बस स्थानकाजवळ, घर क्र. १२"
                  className="flex-1 text-xs px-3 py-2 rounded-xl border border-border bg-background focus:outline-hidden focus:border-[#16834A]"
                />
                <Button
                  size="sm"
                  disabled={!customAddress.trim()}
                  onClick={() => {
                    const trimmed = customAddress.trim();
                    setDeliveryLocation(`Delivery · ${trimmed}`);
                    if (typeof window !== 'undefined') {
                      localStorage.setItem('bazar_delivery_address', trimmed);
                    }
                    setIsLocationModalOpen(false);
                  }}
                  className="bg-[#16834A] hover:bg-[#16834A]/90 text-white text-xs font-bold rounded-xl"
                >
                  Set
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

