'use client';

import { useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { 
  ArrowLeft, 
  Share2, 
  MoreVertical,
  MapPin, 
  Star, 
  Clock, 
  Search, 
  X, 
  Mic, 
  ChevronRight,
  Sparkles,
  ShoppingBag,
  CheckCircle2,
  Bike,
  PackageSearch,
  Check,
  Flame,
  LayoutGrid,
  Apple,
  Carrot,
  Milk,
  Cookie,
  Coffee,
  Wheat,
  Smile
} from 'lucide-react';
import { GroceryCartProvider, useGroceryCart } from '@/modules/bazar/context/GroceryCartContext';
import { 
  BAZAR_PRODUCT_CATALOG, 
  BAZAR_CATEGORIES, 
  BAZAR_STORE_OFFERS, 
  type GroceryProduct 
} from '@/modules/bazar/data/groceryCatalog';
import { GroceryProductCard } from '@/modules/bazar/components/GroceryProductCard';
import { ProductDetailsSheet } from '@/modules/bazar/components/ProductDetailsSheet';
import { NativeFloatingCartBar } from '@/modules/bazar/components/NativeFloatingCartBar';
import { NativeAppBottomNav } from '@/modules/bazar/components/NativeAppBottomNav';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';

function StorefrontScreen() {
  const router = useRouter();
  const params = useParams();
  const storeId = (params?.id as string) || 'fresh-mart';
  const storeName = storeId === 'shree-super-bazar' ? 'Shree Mahalaxmi Super Bazar' : storeId === 'ganesh-dairy-palus' ? 'Ganesh Dairy & Bakery' : storeId === 'tasgaon-krishi-bazar' ? 'Tasgaon Fresh Krishi Bazar' : 'Fresh Mart Supermarket';

  const { 
    items, 
    totalItems, 
    subtotal, 
    totalSavings, 
    deliveryFee, 
    finalTotal, 
    clearCart 
  } = useGroceryCart();

  // State
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<GroceryProduct | null>(null);
  const [isCartSheetOpen, setIsCartSheetOpen] = useState(false);
  const [orderConfirmed, setOrderConfirmed] = useState(false);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return BAZAR_PRODUCT_CATALOG.filter(p => {
      const matchesCategory = activeCategory === 'all' || p.category === activeCategory;
      if (!searchQuery.trim()) return matchesCategory;
      const q = searchQuery.toLowerCase().trim();
      return matchesCategory && (
        p.name.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        p.section.toLowerCase().includes(q)
      );
    });
  }, [searchQuery, activeCategory]);

  // Section Grouping
  const sections = useMemo(() => {
    if (searchQuery.trim() || activeCategory !== 'all') {
      return [{ title: 'All Matching Items', items: filteredProducts }];
    }

    const map = new Map<string, GroceryProduct[]>();
    const order = ['Bestsellers', 'Fresh Vegetables', 'Fresh Fruits'];
    order.forEach(title => map.set(title, []));

    filteredProducts.forEach(p => {
      const list = map.get(p.section) || [];
      list.push(p);
      map.set(p.section, list);
    });

    return Array.from(map.entries())
      .filter(([_, items]) => items.length > 0)
      .map(([title, items]) => ({ title, items }));
  }, [filteredProducts, searchQuery, activeCategory]);

  const handleShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: 'Fresh Mart Supermarket',
          text: 'Order groceries from Fresh Mart on Bazar in 15-25 mins!',
          url: window.location.href,
        });
      } catch {
        // dismissed
      }
    }
  };

  const handleCheckout = () => {
    setIsCartSheetOpen(false);
    if (typeof window !== 'undefined') {
      window.location.href = '/bazar/checkout';
    } else {
      router.push('/bazar/checkout');
    }
  };

  return (
    <div className="w-full min-h-screen bg-[#F8FAF9] text-[#0F1713] flex justify-center pb-24">
      {/* Mobile-First Frame (430px max width on desktop) */}
      <div className="w-full max-w-[430px] bg-[#FFFFFF] min-h-screen shadow-md flex flex-col relative border-x border-[#E5E9E6]">
        
        {/* ─────────────────────────────────────────────────────────────
            1. STORE EXTERIOR HERO BACKGROUND & NAV ACTION BUTTONS
        ───────────────────────────────────────────────────────────── */}
        <div className="relative h-44 w-full bg-[#1A2530] overflow-hidden">
          {/* Real store exterior image with dark overlay */}
          <Image
            src="https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=800&auto=format&fit=crop&q=80"
            alt="Fresh Mart Supermarket"
            fill
            className="object-cover opacity-75"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60" />

          {/* Navigation Bar: Back, Share, Menu */}
          <div className="relative z-10 p-3 pt-4 flex items-center justify-between">
            <button
              onClick={() => router.back()}
              className="h-9 w-9 rounded-full bg-white/90 text-[#0F1713] flex items-center justify-center backdrop-blur-xs shadow-md active:scale-95 transition-all"
              aria-label="Back"
            >
              <ArrowLeft className="h-5 w-5 stroke-[2.2]" />
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={handleShare}
                className="h-9 w-9 rounded-full bg-white/90 text-[#0F1713] flex items-center justify-center backdrop-blur-xs shadow-md active:scale-95 transition-all"
                aria-label="Share"
              >
                <Share2 className="h-4 w-4" />
              </button>
              <button
                className="h-9 w-9 rounded-full bg-white/90 text-[#0F1713] flex items-center justify-center backdrop-blur-xs shadow-md active:scale-95 transition-all"
                aria-label="Options"
              >
                <MoreVertical className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            2. FLOATING WHITE STORE IDENTITY CARD
        ───────────────────────────────────────────────────────────── */}
        <div className="px-3.5 -mt-10 relative z-20">
          <div className="bg-[#FFFFFF] rounded-2xl p-3.5 border border-[#E5E9E6] shadow-md space-y-2">
            <div className="flex items-start justify-between">
              
              {/* Store Avatar & Info */}
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-[#0D7C4D] text-white flex items-center justify-center font-black text-sm shrink-0 shadow-xs">
                  FM
                </div>

                <div>
                  <div className="flex items-center gap-1.5">
                    <h1 className="font-extrabold text-sm text-[#0F1713]">
                      Fresh Mart Supermarket
                    </h1>
                    <span className="h-4 w-4 rounded-full bg-[#0D7C4D] text-white flex items-center justify-center text-[10px]">
                      <Check className="h-2.5 w-2.5 stroke-[3]" />
                    </span>
                  </div>

                  <p className="text-xs text-[#525C56]">
                    पलूस (Palus)
                  </p>
                </div>
              </div>

              {/* Open Now Pill */}
              <span className="inline-flex items-center gap-1 bg-[#E8F5EE] text-[#0D7C4D] text-[11px] font-bold px-2 py-0.5 rounded-full">
                Open Now <ChevronRight className="h-3 w-3" />
              </span>
            </div>

            {/* Rating, Delivery Time, Distance Row */}
            <div className="pt-1 flex items-center gap-2 text-xs text-[#525C56]">
              <span className="flex items-center gap-1 font-bold text-[#0F1713]">
                ★ 4.7 <span className="text-[#8A948D] font-normal">(1.2k)</span>
              </span>
              <span>·</span>
              <span className="flex items-center gap-1 font-semibold text-[#0D7C4D]">
                <Clock className="h-3.5 w-3.5" />
                15–25 min
              </span>
              <span>·</span>
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 text-[#8A948D]" />
                1.2 km
              </span>
            </div>
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            3. "DELIVERING TO HOME" ADDRESS STRIP
        ───────────────────────────────────────────────────────────── */}
        <div className="px-3.5 pt-3">
          <div className="flex items-center justify-between text-xs py-1">
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 text-[#0D7C4D] shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-[#0F1713]">Delivering to Home</p>
                <p className="text-[11px] text-[#8A948D]">पलूस, सांगली</p>
              </div>
            </div>

            <button className="text-xs font-bold text-[#0D7C4D] flex items-center gap-0.5">
              <span>Change</span>
              <ChevronRight className="h-3 w-3" />
            </button>
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            4. SEARCH BAR INSIDE STORE
        ───────────────────────────────────────────────────────────── */}
        <div className="px-3.5 pt-2 pb-1">
          <div className="relative flex items-center">
            <Search className="absolute left-3.5 h-4 w-4 text-[#8A948D]" />
            <input
              type="text"
              placeholder="Search in Fresh Mart..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-10 pr-9 rounded-xl bg-[#F2F4F3] border-transparent text-xs text-[#0F1713] placeholder:text-[#8A948D] font-medium focus:bg-[#FFFFFF] focus:border-[#0D7C4D] focus:outline-hidden transition-all"
            />
            {searchQuery ? (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 text-[#8A948D]"
              >
                <X className="h-4 w-4" />
              </button>
            ) : (
              <Mic className="absolute right-3.5 h-4 w-4 text-[#8A948D]" />
            )}
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            5. PROMOTIONAL OFFERS STRIP (Horizontal Reel)
        ───────────────────────────────────────────────────────────── */}
        {!searchQuery && (
          <div className="pt-2 pb-1">
            <div className="flex gap-2.5 px-3.5 overflow-x-auto no-scrollbar scroll-smooth">
              
              {/* Card 1: FREE Delivery */}
              <div className="shrink-0 w-[170px] bg-[#ECFDF5] border border-[#A7F3D0] rounded-xl p-2.5 flex items-center justify-between">
                <div>
                  <p className="font-black text-xs text-[#0D7C4D]">FREE Delivery</p>
                  <p className="text-[10px] text-[#065F46] mt-0.5">On orders above ₹299</p>
                </div>
                <div className="h-7 w-7 rounded-full bg-[#10B981]/20 flex items-center justify-center shrink-0">
                  <Bike className="h-4 w-4 text-[#0D7C4D]" />
                </div>
              </div>

              {/* Card 2: 20% OFF Snacks */}
              <div className="shrink-0 w-[170px] bg-[#FFF1F2] border border-[#FECDD3] rounded-xl p-2.5 flex items-center justify-between">
                <div>
                  <p className="font-black text-xs text-[#E11D48]">20% OFF</p>
                  <p className="text-[10px] text-[#9F1239] mt-0.5">Snacks & Namkeen</p>
                </div>
                <div className="h-7 w-7 rounded-full bg-[#E11D48]/10 flex items-center justify-center shrink-0">
                  <Sparkles className="h-4 w-4 text-[#E11D48]" />
                </div>
              </div>

              {/* Card 3: Fresh Fruits */}
              <div className="shrink-0 w-[170px] bg-[#EFF6FF] border border-[#BFDBFE] rounded-xl p-2.5 flex items-center justify-between">
                <div>
                  <p className="font-black text-xs text-[#1D4ED8]">Fresh</p>
                  <p className="text-[10px] text-[#1E40AF] mt-0.5">Fruits & Vegetables</p>
                </div>
                <div className="h-7 w-7 rounded-full bg-[#1D4ED8]/10 flex items-center justify-center shrink-0">
                  <Apple className="h-4 w-4 text-[#1D4ED8]" />
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            6. CATEGORY ROUND CHIPS ROW
        ───────────────────────────────────────────────────────────── */}
        <div className="pt-2 pb-2 border-b border-[#F2F4F3]">
          <div className="flex gap-3 px-3.5 overflow-x-auto no-scrollbar scroll-smooth">
            {BAZAR_CATEGORIES.map(cat => {
              const isSelected = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className="flex flex-col items-center gap-1 shrink-0 group active:scale-95 transition-all"
                >
                  <div className={`h-12 w-12 rounded-full flex items-center justify-center transition-all ${
                    isSelected 
                      ? 'bg-[#0D7C4D] text-white shadow-md shadow-[#0D7C4D]/25 scale-105' 
                      : 'bg-[#F2F4F3] text-[#525C56] hover:bg-[#E5E9E6]'
                  }`}>
                    {cat.id === 'all' && <LayoutGrid className="h-5 w-5" />}
                    {cat.id === 'vegetables' && <Carrot className="h-5 w-5 text-emerald-600" />}
                    {cat.id === 'fruits' && <Apple className="h-5 w-5 text-rose-500" />}
                    {cat.id === 'dairy' && <Milk className="h-5 w-5 text-blue-500" />}
                    {cat.id === 'snacks' && <Cookie className="h-5 w-5 text-amber-500" />}
                    {cat.id === 'beverages' && <Coffee className="h-5 w-5 text-orange-500" />}
                    {cat.id === 'staples' && <Wheat className="h-5 w-5 text-yellow-600" />}
                    {cat.id === 'personal' && <Smile className="h-5 w-5 text-teal-600" />}
                  </div>
                  <span className={`text-[11px] font-bold ${
                    isSelected ? 'text-[#0D7C4D]' : 'text-[#525C56]'
                  }`}>
                    {cat.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            7. PRODUCT DISCOVERY (2-Column Zepto / Blinkit Grid)
        ───────────────────────────────────────────────────────────── */}
        <main className="px-3.5 pt-3 space-y-5 flex-1">
          {sections.length === 0 ? (
            <div className="py-20 text-center space-y-2">
              <PackageSearch className="h-10 w-10 mx-auto text-[#8A948D]" />
              <p className="font-bold text-sm text-[#0F1713]">No products found</p>
              <p className="text-xs text-[#8A948D]">Try searching for Milk, Butter, Oil or Eggs</p>
            </div>
          ) : (
            sections.map(section => (
              <section key={section.title} className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h3 className="font-extrabold text-sm text-[#0F1713] tracking-tight flex items-center gap-1.5">
                    {section.title === 'Bestsellers' && (
                      <Flame className="h-4 w-4 fill-[#0D7C4D] text-[#0D7C4D]" />
                    )}
                    <span>{section.title}</span>
                  </h3>
                  <span className="text-xs font-bold text-[#0D7C4D] flex items-center gap-0.5 cursor-pointer">
                    See all <ChevronRight className="h-3.5 w-3.5" />
                  </span>
                </div>

                {/* 2-Column Responsive Grid */}
                <div className="grid grid-cols-2 gap-2.5">
                  {section.items.map(product => (
                    <GroceryProductCard
                      key={product.id}
                      product={product}
                      storeId={storeId}
                      storeName={storeName}
                      onOpenDetails={(p) => setSelectedProduct(p)}
                    />
                  ))}
                </div>
              </section>
            ))
          )}
        </main>

        {/* ─────────────────────────────────────────────────────────────
            8. NATIVE FLOATING CART BAR
        ───────────────────────────────────────────────────────────── */}
        <NativeFloatingCartBar onOpenCart={() => setIsCartSheetOpen(true)} />

        {/* ─────────────────────────────────────────────────────────────
            9. PRODUCT DETAILS BOTTOM SHEET (Swipeable Modal)
        ───────────────────────────────────────────────────────────── */}
        <ProductDetailsSheet
          product={selectedProduct}
          storeId={storeId}
          storeName={storeName}
          onClose={() => setSelectedProduct(null)}
        />

        {/* ─────────────────────────────────────────────────────────────
            10. CART & CHECKOUT SHEET
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

            {orderConfirmed ? (
              <div className="py-12 text-center space-y-3">
                <CheckCircle2 className="h-14 w-14 text-[#0D7C4D] mx-auto animate-bounce" />
                <h3 className="font-extrabold text-lg text-[#0F1713]">Order Confirmed!</h3>
                <p className="text-xs text-[#525C56]">Packing your groceries at Fresh Mart right now.</p>
              </div>
            ) : (
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
                  {totalSavings > 0 && (
                    <div className="flex justify-between text-[#0D7C4D] font-bold">
                      <span>Discount Savings</span>
                      <span>-₹{totalSavings}</span>
                    </div>
                  )}
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
            )}
          </SheetContent>
        </Sheet>

        {/* ─────────────────────────────────────────────────────────────
            11. NATIVE BOTTOM NAVIGATION BAR (Home, Explore, Orders, Account)
        ───────────────────────────────────────────────────────────── */}
        <NativeAppBottomNav />

      </div>
    </div>
  );
}

export default function NativeStoreShoppingPage() {
  return <StorefrontScreen />;
}
