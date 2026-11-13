"use client";

import { useBazarCart } from '../context/BazarCartContext';
import { Plus, Minus, Package } from 'lucide-react';
import type { BazarProduct } from '../schemas';

interface ProductCardProps {
  product: BazarProduct;
}

export function ProductCard({ product }: ProductCardProps) {
  const { items, addToCart, updateQuantity, language } = useBazarCart();
  const cartItem = items.find((i) => i.product.id === product.id);
  const qty = cartItem?.quantity || 0;

  const title =
    language === "mr" && product.nameMarathi
      ? product.nameMarathi
      : product.name;
  const subtitle =
    language === "mr" && product.nameMarathi ? product.name : undefined;

  return (
    <div className="bg-card border border-border/80 rounded-2xl p-3 flex flex-col justify-between shadow-xs hover:border-primary/40 transition-all relative overflow-hidden">
      <div>
        {/* Placeholder Thumbnail with Pack Unit */}
        <div className="h-28 w-full rounded-xl bg-muted/40 flex flex-col items-center justify-center relative mb-2.5 overflow-hidden">
          <Package className="h-10 w-10 text-muted-foreground/40" />
          <span className="absolute bottom-1.5 right-1.5 bg-background/90 backdrop-blur-xs text-[10px] font-semibold px-2 py-0.5 rounded-md border border-border/60">
            {product.unit}
          </span>
          {product.discountPrice && product.discountPrice > product.price && (
            <span className="absolute top-1.5 left-1.5 bg-destructive text-destructive-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-md shadow-xs">
              ₹{product.discountPrice - product.price} OFF
            </span>
          )}
        </div>

        {/* Title & Unit */}
        <h3 className="font-semibold text-xs text-foreground line-clamp-2 leading-snug">
          {title}
        </h3>
        {subtitle && (
          <p className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">
            {subtitle}
          </p>
        )}
      </div>

      {/* Pricing & 1-Tap Thumb Action using Native Platform Tokens */}
      <div className="mt-3 pt-2 border-t border-border/50 flex items-center justify-between gap-1">
        <div>
          <div className="flex items-baseline gap-1">
            <span className="font-extrabold text-sm text-primary">
              ₹{product.price}
            </span>
            {product.discountPrice && product.discountPrice > product.price && (
              <span className="text-[10px] text-muted-foreground line-through">
                ₹{product.discountPrice}
              </span>
            )}
          </div>
        </div>

        {/* Thumb-friendly Quantity Button */}
        {qty === 0 ? (
          <button
            onClick={() => addToCart(product)}
            className="h-8 px-3.5 rounded-xl bg-primary text-primary-foreground font-bold text-xs flex items-center gap-1 shadow-xs hover:bg-primary/90 active:scale-95 transition-all"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>ADD</span>
          </button>
        ) : (
          <div className="h-8 flex items-center bg-primary text-primary-foreground rounded-xl shadow-xs overflow-hidden">
            <button
              onClick={() => updateQuantity(product.id!, qty - 1)}
              className="h-8 w-8 flex items-center justify-center hover:bg-primary/90 active:bg-primary/80 transition-colors"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <span className="font-extrabold text-xs px-1 min-w-[20px] text-center">
              {qty}
            </span>
            <button
              onClick={() => updateQuantity(product.id!, qty + 1)}
              className="h-8 w-8 flex items-center justify-center hover:bg-primary/90 active:bg-primary/80 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
