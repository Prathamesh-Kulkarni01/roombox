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
  language?: 'mr' | 'en';
}

export function GroceryProductCard({ 
  product, 
  storeId, 
  storeName, 
  onOpenDetails,
  language = 'mr' 
}: GroceryProductCardProps) {
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
    <div className="bg-card text-card-foreground rounded-2xl border border-border p-2.5 flex flex-col justify-between shadow-2xs hover:shadow-md hover:border-primary/50 transition-all relative group">
      
      {/* Top Discount Badge & Heart */}
      <div className="relative w-full">
        {currentDiscount > 0 && (
          <span className="absolute top-0 left-0 z-10 bg-gradient-to-r from-rose-600 to-[#E11D48] text-white text-[9px] font-black px-1.5 py-0.5 rounded-md shadow-2xs uppercase tracking-tight">
            {currentDiscount}% OFF
          </span>
        )}

        <button 
          onClick={(e) => {
            e.stopPropagation();
            setIsFavorited(!isFavorited);
          }}
          className="absolute top-0 right-0 z-10 p-1 rounded-full text-slate-300 hover:text-rose-500 transition-colors"
          aria-label="Save to favorites"
        >
          <Heart className={`h-4 w-4 ${isFavorited ? 'fill-rose-500 text-rose-500' : 'stroke-[1.8]'}`} />
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
        <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
          {product.brand}
        </p>
        <h4 className="font-extrabold text-xs text-foreground line-clamp-2 leading-snug min-h-[32px]">
          {product.name}
        </h4>

        {/* Variant selector dropdown or single unit text */}
        {product.variants && product.variants.length > 1 ? (
          <div className="pt-1" onClick={(e) => e.stopPropagation()}>
            <select
              value={selectedVariantId}
              onChange={(e) => setSelectedVariantId(e.target.value)}
              className="w-auto max-w-full text-[11px] font-bold text-foreground bg-muted border border-border rounded-lg px-2 py-0.5 focus:outline-hidden focus:ring-1 focus:ring-primary cursor-pointer transition-colors"
            >
              {product.variants.map(v => (
                <option key={v.id} value={v.id} className="bg-card text-foreground">
                  {v.unit}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <p className="text-[11px] font-semibold text-muted-foreground pt-0.5">
            {currentUnit}
          </p>
        )}
      </div>

      {/* Bottom Pricing & ADD / Stepper Button */}
      <div className="mt-2.5 pt-2 border-t border-border flex items-center justify-between gap-1">
        <div>
          <div className="flex items-baseline gap-1">
            <span className="font-black text-sm text-foreground">
              ₹{currentPrice}
            </span>
            {currentMrp > currentPrice && (
              <span className="text-[10px] text-slate-400 line-through font-medium">
                ₹{currentMrp}
              </span>
            )}
          </div>
        </div>

        {/* Action Button: Zepto-Style ADD or Stepper (Zero Layout Shift) */}
        <div className="h-8 min-w-[70px] flex items-center justify-end">
          {quantity === 0 ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                addToCart(product, selectedVariantId, storeId, storeName);
              }}
              disabled={!product.inStock}
              className="h-8 px-3.5 rounded-xl border border-primary/80 bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground active:scale-95 font-black text-xs flex items-center gap-1 transition-all shadow-2xs"
            >
              <Plus className="h-3 w-3 stroke-[3]" />
              <span>ADD</span>
            </button>
          ) : (
            <div className="h-8 flex items-center bg-primary text-primary-foreground rounded-xl shadow-xs overflow-hidden">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  updateQuantity(product.id, quantity - 1, selectedVariantId);
                }}
                className="h-8 w-7 flex items-center justify-center hover:bg-black/10 active:scale-90 transition-all"
                aria-label="Decrease quantity"
              >
                <Minus className="h-3 w-3 stroke-[2.5]" />
              </button>
              <span className="font-black text-xs px-1 min-w-[18px] text-center select-none">
                {quantity}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  updateQuantity(product.id, quantity + 1, selectedVariantId);
                }}
                disabled={quantity >= product.maxStock}
                className="h-8 w-7 flex items-center justify-center hover:bg-black/10 active:scale-90 transition-all"
                aria-label="Increase quantity"
              >
                <Plus className="h-3 w-3 stroke-[2.5]" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
