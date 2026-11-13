'use client';

import { STORE_PROMOTIONAL_OFFERS } from '../data/groceryCatalog';
import { Tag } from 'lucide-react';

export function StorePromotionalOffers() {
  return (
    <div className="pt-2 pb-1">
      <div className="flex gap-2.5 overflow-x-auto px-3.5 scrollbar-hide scroll-smooth">
        {STORE_PROMOTIONAL_OFFERS.map((offer: any) => (
          <div
            key={offer.id}
            className="shrink-0 w-[240px] bg-[#FFFFFF] rounded-2xl border border-[#ECEFEC] p-3 shadow-2xs hover:border-[#16834A]/40 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="bg-[#E64B45] text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded-md tracking-wider">
                  {offer.badge}
                </span>
                <Tag className="h-3.5 w-3.5 text-[#16834A]" />
              </div>
              <h4 className="font-bold text-xs text-[#171A18] leading-tight line-clamp-1">
                {offer.headline}
              </h4>
              <p className="text-[11px] text-[#777F79] mt-0.5 leading-snug line-clamp-2">
                {offer.description}
              </p>
            </div>
            
            <button className="mt-2 text-left text-[11px] font-bold text-[#16834A] hover:underline">
              Explore Offer →
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

