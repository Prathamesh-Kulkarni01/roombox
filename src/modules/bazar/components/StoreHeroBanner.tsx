'use client';

import { Star, Clock, MapPin, Zap } from 'lucide-react';

interface StoreHeroBannerProps {
  storeName: string;
}

export function StoreHeroBanner({ storeName }: StoreHeroBannerProps) {
  return (
    <div className="px-3.5 pt-3 pb-2">
      <div className="bg-[#FFFFFF] rounded-2xl border border-[#ECEFEC] p-3 shadow-xs">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <h2 className="font-bold text-base text-[#171A18] tracking-tight">
              {storeName}
            </h2>
            
            {/* Store Stats Pills */}
            <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#777F79]">
              <span className="flex items-center gap-1 font-bold text-[#171A18] bg-[#F6F7F5] px-1.5 py-0.5 rounded-md">
                <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                4.7
                <span className="font-normal text-[#777F79]">(1.2k)</span>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 font-medium text-[#171A18]">
                <Clock className="h-3 w-3 text-[#16834A]" />
                15–25 mins
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3 text-[#777F79]" />
                1.2 km
              </span>
            </div>
          </div>

          <div className="shrink-0 text-right">
            <span className="inline-block bg-[#16834A]/10 text-[#16834A] text-[10px] font-bold px-2 py-0.5 rounded-full border border-[#16834A]/20">
              Open Now
            </span>
            <p className="text-[10px] text-[#777F79] mt-1">Min. ₹99</p>
          </div>
        </div>

        {/* Free Delivery Banner Pill */}
        <div className="mt-2.5 pt-2 border-t border-[#ECEFEC] flex items-center gap-1.5 text-xs text-[#16834A] font-semibold">
          <Zap className="h-3.5 w-3.5 fill-[#16834A] text-[#16834A] shrink-0" />
          <span className="text-[11px]">Free delivery on orders above ₹299</span>
        </div>
      </div>
    </div>
  );
}

