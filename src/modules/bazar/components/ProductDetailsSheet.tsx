'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { 
  X, 
  Plus, 
  Minus, 
  Check, 
  ShieldCheck, 
  Sparkles, 
  Heart,
  Users
} from 'lucide-react';
import { useGroceryCart } from '../context/GroceryCartContext';
import type { GroceryProduct } from '../data/groceryCatalog';

interface ProductDetailsSheetProps {
  product: GroceryProduct | null;
  storeId?: string;
  storeName?: string;
  onClose: () => void;
}

export function ProductDetailsSheet({ product, storeId, storeName, onClose }: ProductDetailsSheetProps) {
  const { getItemQuantity, addToCart, updateQuantity } = useGroceryCart();
  const [selectedVariantId, setSelectedVariantId] = useState<string | undefined>(undefined);

  // Sync selected variant when product changes
  useEffect(() => {
    if (product?.variants && product.variants.length > 0) {
      setSelectedVariantId(product.variants[0].id);
    } else {
      setSelectedVariantId(undefined);
    }
  }, [product]);

  if (!product) return null;

  const activeVariant = product.variants?.find(v => v.id === (selectedVariantId || product.variants?.[0]?.id));
  const currentUnit = activeVariant ? activeVariant.unit : product.unit;
  const currentPrice = activeVariant ? activeVariant.price : product.price;
  const currentMrp = activeVariant ? activeVariant.mrp : product.mrp;
  const currentDiscount = activeVariant ? (activeVariant.discountPercent || product.discountPercent) : product.discountPercent;
  const currentVariantId = activeVariant ? activeVariant.id : undefined;

  const quantity = getItemQuantity(product.id, currentVariantId);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      {/* Dimmed backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-2xs transition-opacity animate-in fade-in"
        onClick={onClose}
      />

      {/* Slide-Up Bottom Sheet */}
      <div className="relative w-full max-w-[430px] bg-card rounded-t-[28px] overflow-hidden shadow-2xl z-10 max-h-[92vh] flex flex-col animate-in slide-in-from-bottom duration-300">
        
        {/* Top Handle and Close Button */}
        <div className="relative pt-3 pb-1 flex items-center justify-center">
          <div className="w-10 h-1 bg-[#E5E9E6] rounded-full cursor-grab" onClick={onClose} />
          <button
            onClick={onClose}
            className="absolute right-4 top-3 h-7 w-7 rounded-full bg-muted text-muted-foreground flex items-center justify-center hover:bg-[#E5E9E6] transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto px-4 pb-24 space-y-4">
          
          {/* Product Big Hero Image */}
          <div className="relative h-60 w-full bg-muted/40 rounded-2xl flex items-center justify-center mt-2 border border-border/60">
            {currentDiscount > 0 && (
              <span className="absolute top-3 left-3 bg-[#EF4444] text-white text-xs font-black px-2 py-0.5 rounded-md shadow-2xs">
                {currentDiscount}% OFF
              </span>
            )}

            <div className="relative h-48 w-48">
              <Image
                src={product.imageUrl}
                alt={product.name}
                fill
                className="object-contain"
                priority
              />
            </div>
          </div>

          {/* Title, Brand, Rating Row */}
          <div>
            <h2 className="text-base font-extrabold text-foreground leading-snug">
              {product.name}
            </h2>
            <p className="text-xs font-bold text-muted-foreground/80 uppercase tracking-wider mt-0.5">
              {product.brand}
            </p>

            <div className="flex items-center gap-2 mt-1.5 text-xs">
              <span className="flex items-center gap-1 font-bold text-primary">
                ★ {product.rating || 4.6}
                <span className="text-muted-foreground/80 font-normal">({(product.totalRatings || 2100).toLocaleString()})</span>
              </span>
              <span>•</span>
              <span className="text-muted-foreground/80 font-medium">{product.ratingCountText || '200+ bought today'}</span>
            </div>
          </div>

          {/* Pricing Row */}
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-foreground">
              ₹{currentPrice}
            </span>
            {currentMrp > currentPrice && (
              <span className="text-sm text-muted-foreground/80 line-through font-semibold">
                ₹{currentMrp}
              </span>
            )}
            {currentDiscount > 0 && (
              <span className="text-xs font-black text-[#EF4444]">
                {currentDiscount}% OFF
              </span>
            )}
          </div>

          {/* Description */}
          <p className="text-xs text-muted-foreground leading-relaxed">
            {product.descriptionMarathi || 'ताजे आणि दर्जेदार उत्पादन, रोजच्या वापरासाठी योग्य.'}
          </p>

          {/* Pack Size / Variant Selector Pills */}
          {product.variants && product.variants.length > 0 && (
            <div className="space-y-2 pt-1">
              <span className="text-xs font-bold text-foreground uppercase tracking-wide">
                Pack Size
              </span>
              <div className="flex flex-wrap gap-2">
                {product.variants.map((v) => {
                  const isSelected = (selectedVariantId || product.variants![0].id) === v.id;
                  return (
                    <button
                      key={v.id}
                      onClick={() => setSelectedVariantId(v.id)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all ${
                        isSelected
                          ? 'border-primary bg-primary/10 text-primary shadow-2xs'
                          : 'border-border bg-card text-muted-foreground hover:bg-muted'
                      }`}
                    >
                      <p>{v.unit}</p>
                      <p className="text-[11px] font-black text-foreground">₹{v.price}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 3 Trust Badges Grid */}
          <div className="grid grid-cols-3 gap-2 pt-2">
            <div className="bg-muted rounded-xl p-2.5 flex flex-col items-center text-center space-y-1">
              <div className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                <Check className="h-4 w-4 stroke-[2.5]" />
              </div>
              <span className="text-[10px] font-bold text-foreground">100% Fresh</span>
            </div>

            <div className="bg-muted rounded-xl p-2.5 flex flex-col items-center text-center space-y-1">
              <div className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                <ShieldCheck className="h-4 w-4 stroke-[2.5]" />
              </div>
              <span className="text-[10px] font-bold text-foreground">Quality Checked</span>
            </div>

            <div className="bg-muted rounded-xl p-2.5 flex flex-col items-center text-center space-y-1">
              <div className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                <Users className="h-4 w-4 stroke-[2.5]" />
              </div>
              <span className="text-[10px] font-bold text-foreground">Suitable for all ages</span>
            </div>
          </div>

        </div>

        {/* Sticky Bottom Action Controller */}
        <div className="absolute bottom-0 left-0 right-0 bg-card border-t border-border p-3 flex items-center gap-3">
          {/* Stepper if quantity > 0 */}
          {quantity > 0 ? (
            <div className="h-12 px-3 flex items-center bg-muted rounded-xl border border-border">
              <button
                onClick={() => updateQuantity(product.id, quantity - 1, currentVariantId)}
                className="h-8 w-8 rounded-lg bg-card flex items-center justify-center text-primary shadow-2xs active:scale-95 transition-all"
              >
                <Minus className="h-4 w-4 stroke-[2.5]" />
              </button>
              <span className="font-black text-sm px-3 min-w-[24px] text-center">
                {quantity}
              </span>
              <button
                onClick={() => updateQuantity(product.id, quantity + 1, currentVariantId)}
                className="h-8 w-8 rounded-lg bg-primary text-white flex items-center justify-center shadow-2xs active:scale-95 transition-all"
              >
                <Plus className="h-4 w-4 stroke-[2.5]" />
              </button>
            </div>
          ) : null}

          <button
            onClick={() => {
              if (quantity === 0) {
                addToCart(product, currentVariantId, storeId, storeName);
              }
              onClose();
            }}
            className="flex-1 h-12 bg-primary hover:bg-primary/90 text-white font-extrabold text-sm rounded-xl flex items-center justify-center shadow-md shadow-[#0D7C4D]/20 active:scale-[0.99] transition-all"
          >
            <span>{quantity > 0 ? 'Done' : `Add to Cart · ₹${currentPrice}`}</span>
          </button>
        </div>

      </div>
    </div>
  );
}
