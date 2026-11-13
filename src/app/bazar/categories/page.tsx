'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { 
  ArrowLeft, 
  Search, 
  Mic, 
  ChevronRight,
  Plus,
  Minus,
  Sparkles,
  ShoppingBag,
  Flame,
  LayoutGrid,
  Carrot,
  Apple,
  Milk,
  Cookie,
  Coffee,
  Wheat,
  Smile,
  Baby,
  Dog,
  Home as HomeIcon,
  Snowflake,
  Filter
} from 'lucide-react';
import { GroceryCartProvider, useGroceryCart } from '@/modules/bazar/context/GroceryCartContext';
import { BAZAR_PRODUCT_CATALOG, type GroceryProduct } from '@/modules/bazar/data/groceryCatalog';
import { GroceryProductCard } from '@/modules/bazar/components/GroceryProductCard';
import { NativeFloatingCartBar } from '@/modules/bazar/components/NativeFloatingCartBar';
import { NativeAppBottomNav } from '@/modules/bazar/components/NativeAppBottomNav';
import { ProductDetailsSheet } from '@/modules/bazar/components/ProductDetailsSheet';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';

interface SubcategoryFilter {
  id: string;
  label: string;
}

const CATEGORY_ITEMS = [
  { id: 'vegetables', label: 'भाज्या', labelEn: 'Vegetables', icon: Carrot, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  { id: 'fruits', label: 'फळे', labelEn: 'Fruits', icon: Apple, color: 'text-rose-500', bg: 'bg-rose-50' },
  { id: 'dairy', label: 'दूधजन्य', labelEn: 'Dairy & Bakery', icon: Milk, color: 'text-blue-500', bg: 'bg-blue-50' },
  { id: 'snacks', label: 'स्नॅक्स', labelEn: 'Snacks', icon: Cookie, color: 'text-amber-500', bg: 'bg-amber-50' },
  { id: 'beverages', label: 'पेये', labelEn: 'Beverages', icon: Coffee, color: 'text-orange-500', bg: 'bg-orange-50' },
  { id: 'staples', label: 'अन्नधान्य', labelEn: 'Atta, Rice & Dal', icon: Wheat, color: 'text-yellow-600', bg: 'bg-yellow-50' },
  { id: 'personal', label: 'वैयक्तिक काळजी', labelEn: 'Personal Care', icon: Smile, color: 'text-teal-600', bg: 'bg-teal-50' },
  { id: 'household', label: 'घरगुती', labelEn: 'Household', icon: HomeIcon, color: 'text-purple-600', bg: 'bg-purple-50' },
  { id: 'meat', label: 'मांसाहारी', labelEn: 'Meat & Eggs', icon: Snowflake, color: 'text-red-600', bg: 'bg-red-50' },
  { id: 'baby', label: 'लहान मुलांचे', labelEn: 'Baby Care', icon: Baby, color: 'text-pink-500', bg: 'bg-pink-50' },
  { id: 'pet', label: 'पाळीव प्राणी', labelEn: 'Pet Care', icon: Dog, color: 'text-amber-700', bg: 'bg-amber-50' },
];

const VEGETABLE_FILTERS: SubcategoryFilter[] = [
  { id: 'all', label: 'All' },
  { id: 'leafy', label: 'Leafy' },
  { id: 'tomato', label: 'Tomato' },
  { id: 'potato', label: 'Potato' },
  { id: 'onion', label: 'Onion' },
];

function CategoriesContent() {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState<string>('vegetables');
  const [activeSubFilter, setActiveSubFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<GroceryProduct | null>(null);
  const [isCartSheetOpen, setIsCartSheetOpen] = useState(false);

  const { items, totalItems, subtotal, deliveryFee, totalSavings, finalTotal, clearCart } = useGroceryCart();

  // Products for the active category
  const filteredProducts = BAZAR_PRODUCT_CATALOG.filter(p => {
    const matchesCat = p.category === selectedCategory || selectedCategory === 'all';
    if (activeSubFilter === 'all') return matchesCat;
    return matchesCat && p.name.toLowerCase().includes(activeSubFilter);
  });

  const activeCategoryObj = CATEGORY_ITEMS.find(c => c.id === selectedCategory) || CATEGORY_ITEMS[0];

  return (
    <div className="w-full min-h-screen bg-[#F8FAF9] text-[#0F1713] flex justify-center pb-24 selection:bg-[#0D7C4D]/20">
      {/* Mobile-First Screen Shell (430px max width on desktop) */}
      <div className="w-full max-w-[430px] bg-[#FFFFFF] min-h-screen shadow-md flex flex-col relative border-x border-[#E5E9E6]">
        
        {/* ─────────────────────────────────────────────────────────────
            1. TOP APP BAR (Back, Title & Search Bar)
        ───────────────────────────────────────────────────────────── */}
        <header className="sticky top-0 z-30 bg-[#FFFFFF] border-b border-[#E5E9E6] px-3.5 pt-3 pb-2.5 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Link
                href="/bazar"
                className="h-8 w-8 rounded-full flex items-center justify-center hover:bg-[#F2F4F3] active:scale-90 transition-all text-[#0F1713]"
              >
                <ArrowLeft className="h-5 w-5 stroke-[2.2]" />
              </Link>
              <h1 className="font-black text-base text-[#0F1713]">
                {activeCategoryObj.label} ({activeCategoryObj.labelEn})
              </h1>
            </div>

            <div className="flex items-center gap-1">
              <span className="text-[11px] font-bold text-[#0D7C4D] bg-[#E8F5EE] px-2 py-0.5 rounded-full">
                {filteredProducts.length} items
              </span>
            </div>
          </div>

          {/* Search bar inside category */}
          <div className="relative flex items-center">
            <Search className="absolute left-3.5 h-4 w-4 text-[#8A948D]" />
            <input
              type="text"
              placeholder={`Search in ${activeCategoryObj.labelEn}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 pl-9 pr-9 rounded-xl bg-[#F2F4F3] text-xs text-[#0F1713] placeholder:text-[#8A948D] font-medium border-transparent focus:bg-[#FFFFFF] focus:border-[#0D7C4D] focus:outline-hidden transition-all"
            />
            {searchQuery ? (
              <button onClick={() => setSearchQuery('')} className="absolute right-3 text-[#8A948D]">
                ×
              </button>
            ) : (
              <Mic className="absolute right-3.5 h-4 w-4 text-[#8A948D]" />
            )}
          </div>
        </header>

        {/* ─────────────────────────────────────────────────────────────
            2. HORIZONTAL CATEGORIES QUICK REEL (Matching Row 2 Screen 2)
        ───────────────────────────────────────────────────────────── */}
        <div className="py-2.5 px-3.5 border-b border-[#F2F4F3] bg-[#FAFBFB] overflow-x-auto no-scrollbar scroll-smooth flex gap-3">
          {CATEGORY_ITEMS.map(cat => {
            const isSelected = selectedCategory === cat.id;
            const Icon = cat.icon;
            return (
              <button
                key={cat.id}
                onClick={() => {
                  setSelectedCategory(cat.id);
                  setActiveSubFilter('all');
                }}
                className="flex flex-col items-center gap-1 shrink-0 active:scale-95 transition-all"
              >
                <div className={`h-11 w-11 rounded-2xl flex items-center justify-center border transition-all ${
                  isSelected
                    ? 'bg-[#0D7C4D] text-white border-[#0D7C4D] shadow-sm shadow-[#0D7C4D]/30'
                    : 'bg-[#FFFFFF] text-[#525C56] border-[#E5E9E6] hover:border-[#0D7C4D]/40'
                }`}>
                  <Icon className="h-5 w-5" />
                </div>
                <span className={`text-[10px] font-bold tracking-tight text-center ${
                  isSelected ? 'text-[#0D7C4D]' : 'text-[#525C56]'
                }`}>
                  {cat.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* ─────────────────────────────────────────────────────────────
            3. SUBCATEGORY PILLS (All, Leafy, Tomato, Potato, Onion)
        ───────────────────────────────────────────────────────────── */}
        <div className="px-3.5 py-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar border-b border-[#F2F4F3]">
          {VEGETABLE_FILTERS.map(filter => {
            const isSelected = activeSubFilter === filter.id;
            return (
              <button
                key={filter.id}
                onClick={() => setActiveSubFilter(filter.id)}
                className={`px-3 py-1 rounded-full text-xs font-bold shrink-0 transition-all active:scale-95 ${
                  isSelected
                    ? 'bg-[#0D7C4D] text-white shadow-2xs'
                    : 'bg-[#F2F4F3] text-[#525C56] hover:bg-[#E5E9E6]'
                }`}
              >
                {filter.label}
              </button>
            );
          })}
        </div>

        {/* ─────────────────────────────────────────────────────────────
            4. PRODUCT DISCOVERY 2-COLUMN GRID (Matching Screen 2 Bottom)
        ───────────────────────────────────────────────────────────── */}
        <main className="px-3.5 pt-3 pb-6 flex-1 space-y-3">
          <div className="flex items-center justify-between text-xs text-[#525C56]">
            <span className="font-bold text-[#0F1713]">{filteredProducts.length} Items Available</span>
            <span className="flex items-center gap-1 text-[#0D7C4D] font-bold cursor-pointer">
              <Filter className="h-3 w-3" />
              Filter & Sort
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {filteredProducts.map(product => (
              <GroceryProductCard
                key={product.id}
                product={product}
                onOpenDetails={(p) => setSelectedProduct(p)}
              />
            ))}
          </div>
        </main>

        {/* ─────────────────────────────────────────────────────────────
            5. NATIVE FLOATING CART BAR
        ───────────────────────────────────────────────────────────── */}
        <NativeFloatingCartBar onOpenCart={() => setIsCartSheetOpen(true)} />

        {/* ─────────────────────────────────────────────────────────────
            6. PRODUCT DETAILS BOTTOM SHEET
        ───────────────────────────────────────────────────────────── */}
        <ProductDetailsSheet
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
        />

        {/* ─────────────────────────────────────────────────────────────
            7. CART SHEET
        ───────────────────────────────────────────────────────────── */}
        <Sheet open={isCartSheetOpen} onOpenChange={setIsCartSheetOpen}>
          <SheetContent side="bottom" className="rounded-t-[28px] max-h-[85vh] overflow-y-auto p-5 bg-[#FFFFFF] max-w-[430px] mx-auto">
            <SheetHeader className="text-left pb-3 border-b border-[#E5E9E6]">
              <SheetTitle className="text-base font-black text-[#0F1713] flex items-center gap-2">
                <ShoppingBag className="h-5 w-5 text-[#0D7C4D]" />
                माझी टोपली (Cart - {totalItems} items)
              </SheetTitle>
              <SheetDescription className="text-xs text-[#8A948D]">
                Fresh Mart Supermarket · 15-25 min delivery
              </SheetDescription>
            </SheetHeader>

            <div className="space-y-4 pt-3">
              <div className="divide-y divide-[#E5E9E6] max-h-56 overflow-y-auto">
                {items.map(item => (
                  <div key={item.product.id + (item.selectedVariantId || '')} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-[#0F1713]">{item.product.name}</p>
                      <p className="text-[11px] text-[#8A948D]">{item.unit} · Qty: {item.quantity}</p>
                    </div>
                    <span className="font-black text-[#0F1713]">
                      ₹{item.price * item.quantity}
                    </span>
                  </div>
                ))}
              </div>

              <div className="bg-[#F2F4F3] rounded-2xl p-3.5 space-y-2 text-xs">
                <div className="flex justify-between text-[#525C56]">
                  <span>Item Total</span>
                  <span className="font-medium text-[#0F1713]">₹{subtotal}</span>
                </div>
                <div className="flex justify-between text-[#525C56]">
                  <span>Delivery Fee</span>
                  {deliveryFee === 0 ? (
                    <span className="text-[#0D7C4D] font-bold">FREE</span>
                  ) : (
                    <span className="font-medium text-[#0F1713]">₹{deliveryFee}</span>
                  )}
                </div>
                <div className="pt-2 border-t border-[#E5E9E6] flex justify-between font-black text-sm text-[#0F1713]">
                  <span>To Pay</span>
                  <span>₹{finalTotal}</span>
                </div>
              </div>

              <Link href="/bazar/checkout" className="block w-full" onClick={() => setIsCartSheetOpen(false)}>
                <Button
                  type="button"
                  className="w-full h-12 bg-[#0D7C4D] hover:bg-[#0A663F] text-white font-black rounded-xl text-sm shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Proceed to Checkout</span>
                  <span>(₹{finalTotal})</span>
                </Button>
              </Link>
            </div>
          </SheetContent>
        </Sheet>

        {/* ─────────────────────────────────────────────────────────────
            8. BOTTOM NAVIGATION BAR
        ───────────────────────────────────────────────────────────── */}
        <NativeAppBottomNav />

      </div>
    </div>
  );
}

export default function CategoriesPage() {
  return <CategoriesContent />;
}

