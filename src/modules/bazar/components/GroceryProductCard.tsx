'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Plus, Minus, Heart } from 'lucide-react';
import { useGroceryCart } from '../context/GroceryCartContext';
import type { GroceryProduct } from '../data/groceryCatalog';
import { resolveProductImage } from '../services/imageResolver';

interface GroceryProductCardProps {
  product: GroceryProduct;
  storeId?: string;
  storeName?: string;
  onOpenDetails?: (product: GroceryProduct) => void;
}

export function GroceryProductCard({ product, storeId, storeName, onOpenDetails }: GroceryProductCardProps) {
  const { getItemQuantity, addToCart, updateQuantity } = useGroceryCart();
  const [selectedVariantId, setSelectedVariantId] = useState<string | undefined>(
    product.variants?.[0]?.id
  );
  const [isFavorited, setIsFavorited] = useState(false);

  const activeVariant = product.variants?.find(v => v.id === selectedVariantId);
  const currentUnit = activeVariant ? activeVariant.unit : product.unit;
  const currentPrice = activeVariant ? activeVariant.price : product.price;
  const currentMrp = activeVariant ? activeVariant.mrp : product.mrp;
  const currentDiscount = activeVariant ? (activeVariant.discountPercent || product.discountPercent) : product.discountPercent;

  const quantity = getItemQuantity(product.id, selectedVariantId);
  const displayImage = resolveProductImage(
    product.name, 
    product.category, 
    product.imageUrl, 
    product.descriptionMarathi
  );

  return (
    <div className="bg-[#FFFFFF] rounded-2xl border border-[#E5E9E6] p-2.5 flex flex-col justify-between shadow-xs hover:border-[#0D7C4D]/40 transition-all relative group">
      
      {/* Top Discount Badge & Heart */}
      <div className="relative w-full">
        {currentDiscount > 0 && (
          <span className="absolute top-0 left-0 z-10 bg-[#EF4444] text-white text-[9px] font-black px-1.5 py-0.5 rounded-md shadow-2xs">
            {currentDiscount}% OFF
          </span>
        )}

        <button 
          onClick={(e) => {
            e.stopPropagation();
            setIsFavorited(!isFavorited);
          }}
          className="absolute top-0 right-0 z-10 p-1 rounded-full text-[#A0A7A2] hover:text-[#EF4444] transition-colors"
          aria-label="Save to favorites"
        >
          <Heart className={`h-4 w-4 ${isFavorited ? 'fill-[#EF4444] text-[#EF4444]' : 'stroke-[1.8]'}`} />
        </button>

        {/* Clickable Area for Image and Details */}
        <div 
          onClick={() => onOpenDetails && onOpenDetails(product)}
          className="cursor-pointer pt-3 pb-1 flex items-center justify-center"
        >
          <div className="relative h-28 w-28 flex items-center justify-center">
            <Image
              src={displayImage}
              alt={product.name}
              fill
              sizes="(max-width: 768px) 45vw, 220px"
              className="object-contain group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
            />
          </div>
        </div>
      </div>

      {/* Brand & Name */}
      <div 
        onClick={() => onOpenDetails && onOpenDetails(product)} 
        className="cursor-pointer space-y-0.5 pt-1"
      >
        <p className="text-[10px] font-bold text-[#8A948D] uppercase tracking-wider">
          {product.brand}
        </p>
        <h4 className="font-bold text-xs text-[#0F1713] line-clamp-2 leading-snug min-h-[32px]">
          {product.name}
        </h4>

        {/* Variant selector dropdown or single unit text */}
        {product.variants && product.variants.length > 1 ? (
          <div className="pt-1" onClick={(e) => e.stopPropagation()}>
            <select
              value={selectedVariantId}
              onChange={(e) => setSelectedVariantId(e.target.value)}
              className="w-auto max-w-full text-[11px] font-bold text-[#525C56] bg-[#F2F4F3] border border-[#E5E9E6] rounded-md px-1.5 py-0.5 focus:outline-hidden cursor-pointer"
            >
              {product.variants.map(v => (
                <option key={v.id} value={v.id}>
                  {v.unit}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <p className="text-[11px] font-medium text-[#8A948D] pt-0.5">
            {currentUnit}
          </p>
        )}
      </div>

      {/* Bottom Pricing & ADD / Stepper Button */}
      <div className="mt-2.5 pt-2 border-t border-[#F2F4F3] flex items-center justify-between gap-1">
        <div>
          <div className="flex items-baseline gap-1">
            <span className="font-black text-sm text-[#0F1713]">
              ₹{currentPrice}
            </span>
            {currentMrp > currentPrice && (
              <span className="text-[10px] text-[#8A948D] line-through font-medium">
                ₹{currentMrp}
              </span>
            )}
          </div>
        </div>

        {/* Action Button: ADD or Stepper */}
        {quantity === 0 ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              addToCart(product, selectedVariantId, storeId, storeName);
            }}
            disabled={!product.inStock}
            className="h-7 px-3 rounded-lg border-2 border-[#0D7C4D] bg-[#FFFFFF] text-[#0D7C4D] hover:bg-[#E8F5EE] active:scale-95 font-black text-xs flex items-center gap-1 transition-all"
          >
            <Plus className="h-3 w-3 stroke-[3]" />
            <span>ADD</span>
          </button>
        ) : (
          <div className="h-7 flex items-center bg-[#0D7C4D] text-white rounded-lg shadow-2xs overflow-hidden">
            <button
              onClick={(e) => {
                e.stopPropagation();
                updateQuantity(product.id, quantity - 1, selectedVariantId);
              }}
              className="h-7 w-6 flex items-center justify-center hover:bg-[#0A663F] active:scale-90 transition-all"
              aria-label="Decrease quantity"
            >
              <Minus className="h-3 w-3 stroke-[2.5]" />
            </button>
            <span className="font-black text-xs px-1 min-w-[16px] text-center select-none">
              {quantity}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                updateQuantity(product.id, quantity + 1, selectedVariantId);
              }}
              disabled={quantity >= product.maxStock}
              className="h-7 w-6 flex items-center justify-center hover:bg-[#0A663F] active:scale-90 transition-all"
              aria-label="Increase quantity"
            >
              <Plus className="h-3 w-3 stroke-[2.5]" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
