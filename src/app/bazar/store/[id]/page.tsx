'use client';

import { useState, useMemo, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { 
  ArrowLeft, 
  Share2, 
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
  BadgeCheck, 
  Flame, 
  LayoutGrid, 
  Apple, 
  Carrot, 
  Milk, 
  Cookie, 
  Coffee, 
  Wheat, 
  Smile,
  Tag,
  ShieldCheck,
  Check,
  PhoneCall,
  MessageCircle,
  Copy,
  Info
} from 'lucide-react';
import { useGroceryCart } from '@/modules/bazar/context/GroceryCartContext';
import { 
  BAZAR_PRODUCT_CATALOG, 
  BAZAR_CATEGORIES, 
  type GroceryProduct 
} from '@/modules/bazar/data/groceryCatalog';
import { BAZAR_TOWN_STORES, type BazarTownStore } from '@/modules/bazar/data/storeDirectory';
import { GroceryProductCard } from '@/modules/bazar/components/GroceryProductCard';
import { ProductDetailsSheet } from '@/modules/bazar/components/ProductDetailsSheet';
import { NativeFloatingCartBar } from '@/modules/bazar/components/NativeFloatingCartBar';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

function StorefrontScreen() {
  const router = useRouter();
  const params = useParams();
  const rawId = (params?.id as string) || 'fresh-mart';

  // Load harmonized store metadata from single source of truth
  const store: BazarTownStore = useMemo(() => {
    const found = BAZAR_TOWN_STORES.find(s => s.slug === rawId || s.id === rawId);
    return found || BAZAR_TOWN_STORES[0];
  }, [rawId]);

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
  const [language, setLanguage] = useState<'mr' | 'en'>('mr');
  const [copiedLink, setCopiedLink] = useState(false);

  // Load language preference from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('bazar_lang') as 'mr' | 'en' | null;
      if (saved) setLanguage(saved);
    }
  }, []);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return BAZAR_PRODUCT_CATALOG.filter(p => {
      const matchesCategory = activeCategory === 'all' || p.category === activeCategory;
      if (!searchQuery.trim()) return matchesCategory;
      const q = searchQuery.toLowerCase().trim();
      return matchesCategory && (
        p.name.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        p.section.toLowerCase().includes(q) ||
        (p.descriptionMarathi && p.descriptionMarathi.includes(q))
      );
    });
  }, [searchQuery, activeCategory]);

  // Section Grouping
  const sections = useMemo(() => {
    if (searchQuery.trim() || activeCategory !== 'all') {
      return [{ 
        title: language === 'mr' ? 'सर्व उत्पादने' : 'All Matching Items', 
        items: filteredProducts 
      }];
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
  }, [filteredProducts, searchQuery, activeCategory, language]);

  const handleShare = async () => {
    const url = typeof window !== 'undefined' ? window.location.href : 'https://rentsutra.in/bazar/store/' + store.slug;
    const title = language === 'mr' ? `${store.nameMarathi} - रेंटसूत्र बझार` : `${store.name} - RentSutra Bazar`;
    const text = language === 'mr'
      ? `🛒 ${store.nameMarathi} वरून थेट घरपोच किराणा व भाजीपाला ऑर्डर करा! ⚡ १०-१५ मिनिटांत डिलिव्हरी.`
      : `🛒 Order fresh groceries directly from ${store.name} on RentSutra Bazar! ⚡ Delivered in 10-15 mins.`;

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch (err) {
        // dismissed or unsupported
      }
    }

    // Fallback: Copy to clipboard
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(`${text}\n${url}`);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const handleWhatsAppOrder = () => {
    const phone = store.phone || '919876543210';
    const text = encodeURIComponent(
      language === 'mr'
        ? `नमस्कार ${store.nameMarathi}, मला रेंटसूत्र बझारवरून ऑर्डर करायची आहे.`
        : `Hi ${store.name}, I would like to place an order from RentSutra Bazar.`
    );
    window.open(`https://wa.me/${phone}?text=${text}`, '_blank');
  };

  const handleCheckout = () => {
    setIsCartSheetOpen(false);
    router.push('/bazar/checkout');
  };

  return (
    <div className="w-full min-h-screen bg-[#F4F5F8] text-slate-900 flex justify-center pb-24 selection:bg-purple-500/20">
      {/* Mobile-First Shell (430px max on Desktop) */}
      <div className="w-full max-w-[430px] bg-white min-h-screen shadow-lg flex flex-col relative border-x border-slate-200">
        
        {/* ─────────────────────────────────────────────────────────────
            1. TOP APP BAR (Back, Store Title, Share Button)
        ───────────────────────────────────────────────────────────── */}
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md px-3.5 py-2.5 border-b border-slate-100 flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => router.push('/bazar')}
              className="h-8 w-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-800 flex items-center justify-center transition-all active:scale-95"
              aria-label="Back to Bazar"
            >
              <ArrowLeft className="h-4 w-4 stroke-[2.5]" />
            </button>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="font-extrabold text-sm text-slate-900 leading-tight line-clamp-1">
                  {language === 'mr' ? store.nameMarathi : store.name}
                </h1>
                <BadgeCheck className="h-4 w-4 text-purple-600 shrink-0" />
              </div>
              <p className="text-[10px] text-purple-700 font-extrabold flex items-center gap-1">
                <span>⚡ {store.deliveryTimeMins}</span>
                <span className="text-slate-300">•</span>
                <span className="text-slate-500 font-medium">{store.distanceKm} km</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handleShare}
              className="h-8 px-2.5 rounded-full bg-purple-50 hover:bg-purple-100 text-purple-900 flex items-center gap-1 font-bold text-xs border border-purple-200 transition-all active:scale-95 shadow-2xs"
              aria-label="Share Store"
              title="Share store with customers"
            >
              {copiedLink ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-600 stroke-[3]" />
                  <span className="text-emerald-700">{language === 'mr' ? 'कॉपी केले!' : 'Copied!'}</span>
                </>
              ) : (
                <>
                  <Share2 className="h-3.5 w-3.5 text-purple-700" />
                  <span>{language === 'mr' ? 'शेअर' : 'Share'}</span>
                </>
              )}
            </button>
          </div>
        </header>

        {/* ─────────────────────────────────────────────────────────────
            2. STORE HERO & BRANDING BANNER (High-Conversion Zepto Vibe)
        ───────────────────────────────────────────────────────────── */}
        <div className="relative bg-gradient-to-br from-[#5800FF] via-[#7B2CBF] to-[#E11D48] text-white p-4 overflow-hidden">
          {/* Subtle Ambient Glow */}
          <div className="absolute top-0 right-0 w-44 h-44 bg-white/10 rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10 flex items-start gap-3.5">
            {/* Store Logo with Speed Tag */}
            <div className="relative h-16 w-16 rounded-2xl overflow-hidden bg-white shrink-0 border-2 border-white/30 shadow-md">
              <Image
                src={store.imageUrl}
                alt={store.name}
                fill
                className="object-cover"
                priority
              />
              <div className="absolute top-0 left-0 right-0 bg-purple-950/80 backdrop-blur-xs text-[8px] font-black text-center text-white py-0.2 uppercase tracking-wider">
                {store.shortCode}
              </div>
            </div>

            {/* Store Information */}
            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1 bg-white/20 backdrop-blur-xs text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider text-yellow-300">
                  <span>⚡ 10-15 MINS</span>
                  <span className="text-white">• {language === 'mr' ? 'घरपोच' : 'DELIVERY'}</span>
                </span>

                {/* Rating Badge */}
                <div className="flex items-center gap-1 bg-white text-purple-950 px-2 py-0.5 rounded-lg shadow-2xs">
                  <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                  <span className="text-xs font-black">{store.rating}</span>
                </div>
              </div>

              <h2 className="font-extrabold text-base leading-snug">
                {language === 'mr' ? store.nameMarathi : store.name}
              </h2>

              <p className="text-[11px] text-white/80 font-medium line-clamp-1">
                {store.address}
              </p>

              <div className="flex items-center gap-2 pt-0.5 text-[11px] text-white/90">
                <span className="font-bold flex items-center gap-1 text-emerald-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  {language === 'mr' ? 'ऑर्डर स्वीकारत आहे' : 'Accepting Orders'}
                </span>
                <span className="text-white/40">•</span>
                <span>{language === 'mr' ? `किमान ₹${store.minOrder}` : `Min ₹${store.minOrder}`}</span>
              </div>
            </div>
          </div>

          {/* Customer Action Bar: WhatsApp direct order + Verified Trust */}
          <div className="mt-3 pt-2.5 border-t border-white/15 flex items-center justify-between gap-2">
            <button
              onClick={handleWhatsAppOrder}
              className="flex-1 h-8 rounded-xl bg-white/15 hover:bg-white/25 active:scale-95 border border-white/20 flex items-center justify-center gap-1.5 text-xs font-extrabold text-white transition-all"
            >
              <MessageCircle className="h-3.5 w-3.5 text-emerald-400" />
              <span>{language === 'mr' ? 'WhatsApp वर संपर्क' : 'Chat on WhatsApp'}</span>
            </button>

            <button
              onClick={handleShare}
              className="h-8 px-3 rounded-xl bg-white text-purple-900 hover:bg-purple-50 active:scale-95 flex items-center justify-center gap-1 text-xs font-extrabold shadow-sm transition-all"
            >
              <Copy className="h-3 w-3 text-purple-700" />
              <span>{language === 'mr' ? 'दुकान लिंक' : 'Copy Link'}</span>
            </button>
          </div>

          {/* Active Store Offer Pill */}
          {store.offersText && (
            <div className="mt-2.5 bg-black/20 backdrop-blur-xs border border-white/20 rounded-xl px-2.5 py-1.5 flex items-center justify-between text-[11px] font-bold text-white shadow-2xs">
              <div className="flex items-center gap-1.5">
                <Tag className="h-3.5 w-3.5 text-yellow-300 shrink-0" />
                <span className="truncate">{language === 'mr' ? store.offersTextMarathi : store.offersText}</span>
              </div>
              <span className="text-[9px] bg-rose-500 text-white font-black px-1.5 py-0.2 rounded-md uppercase tracking-tight shrink-0">
                ACTIVE
              </span>
            </div>
          )}
        </div>

        {/* ─────────────────────────────────────────────────────────────
            3. IN-STORE PRODUCT SEARCH INPUT
        ───────────────────────────────────────────────────────────── */}
        <div className="px-3.5 pt-2.5 pb-1">
          <div className="relative flex items-center">
            <Search className="absolute left-3.5 h-4 w-4 text-purple-600 stroke-[2.5]" />
            <input
              type="text"
              placeholder={language === 'mr' ? `${store.nameMarathi} मध्ये शोधा (उदा. दूध, भाजी, डाळ)...` : `Search in ${store.name} (e.g. Milk, Onion, Atta)...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-10 pr-9 rounded-xl bg-slate-100 border border-slate-200/80 text-xs text-slate-900 placeholder:text-slate-400 font-medium focus:bg-white focus:ring-2 focus:ring-purple-600 focus:outline-hidden transition-all shadow-2xs"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 p-1 rounded-full text-slate-400 hover:text-slate-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            4. STICKY CATEGORY NAVIGATION TABS (Pill Style)
        ───────────────────────────────────────────────────────────── */}
        <div className="sticky top-12 z-20 bg-white/95 backdrop-blur-md pt-2 pb-2 border-b border-slate-100 shadow-2xs">
          <div className="flex gap-2 px-3.5 overflow-x-auto scrollbar-hide scroll-smooth">
            {BAZAR_CATEGORIES.map(cat => {
              const isSelected = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold shrink-0 transition-all active:scale-95 flex items-center gap-1.5 ${
                    isSelected 
                      ? 'bg-purple-700 text-white shadow-xs scale-102' 
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {cat.id === 'all' && <LayoutGrid className="h-3.5 w-3.5" />}
                  {cat.id === 'vegetables' && <Carrot className="h-3.5 w-3.5" />}
                  {cat.id === 'fruits' && <Apple className="h-3.5 w-3.5" />}
                  {cat.id === 'dairy' && <Milk className="h-3.5 w-3.5" />}
                  {cat.id === 'snacks' && <Cookie className="h-3.5 w-3.5" />}
                  {cat.id === 'beverages' && <Coffee className="h-3.5 w-3.5" />}
                  {cat.id === 'staples' && <Wheat className="h-3.5 w-3.5" />}
                  {cat.id === 'personal' && <Smile className="h-3.5 w-3.5" />}
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            5. 2-COLUMN RESPONSIVE PRODUCT GRID
        ───────────────────────────────────────────────────────────── */}
        <main className="px-3.5 pt-3 space-y-5 flex-1">
          {sections.length === 0 ? (
            <div className="py-20 text-center space-y-2">
              <PackageSearch className="h-10 w-10 mx-auto text-slate-300" />
              <p className="font-bold text-sm text-slate-800">
                {language === 'mr' ? 'कोणतीही वस्तू सापडली नाही' : 'No products found'}
              </p>
              <p className="text-xs text-slate-400">
                {language === 'mr' ? 'दुसरे नाव शोधून पहा' : 'Try searching for Milk, Butter, Oil or Eggs'}
              </p>
            </div>
          ) : (
            sections.map(section => (
              <section key={section.title} className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h3 className="font-extrabold text-xs text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    {section.title === 'Bestsellers' && (
                      <Flame className="h-3.5 w-3.5 fill-rose-600 text-rose-600" />
                    )}
                    <span>{section.title}</span>
                  </h3>
                  <span className="text-[11px] font-bold text-purple-700 flex items-center gap-0.5">
                    {section.items.length} {language === 'mr' ? 'वस्तू' : 'items'}
                  </span>
                </div>

                {/* 2-Column Responsive Grid */}
                <div className="grid grid-cols-2 gap-2.5">
                  {section.items.map(product => (
                    <GroceryProductCard
                      key={product.id}
                      product={product}
                      storeId={store.id}
                      storeName={store.name}
                      onOpenDetails={(p) => setSelectedProduct(p)}
                      language={language}
                    />
                  ))}
                </div>
              </section>
            ))
          )}
        </main>

        {/* ─────────────────────────────────────────────────────────────
            6. NATIVE FLOATING CART BAR (Elevated above Bottom Safe Area)
        ───────────────────────────────────────────────────────────── */}
        <NativeFloatingCartBar 
          onOpenCart={() => setIsCartSheetOpen(true)} 
          language={language}
        />

        {/* ─────────────────────────────────────────────────────────────
            7. PRODUCT DETAILS BOTTOM SHEET (Swipeable Modal)
        ───────────────────────────────────────────────────────────── */}
        <ProductDetailsSheet
          product={selectedProduct}
          storeId={store.id}
          storeName={store.name}
          onClose={() => setSelectedProduct(null)}
        />

        {/* ─────────────────────────────────────────────────────────────
            8. QUICK CART BOTTOM SHEET
        ───────────────────────────────────────────────────────────── */}
        <Sheet open={isCartSheetOpen} onOpenChange={setIsCartSheetOpen}>
          <SheetContent side="bottom" className="rounded-t-[28px] max-h-[85vh] overflow-y-auto p-5 bg-white max-w-[430px] mx-auto border-t border-slate-200">
            <SheetHeader className="text-left pb-3 border-b border-slate-100">
              <SheetTitle className="text-base font-black text-slate-900 flex items-center gap-2">
                <ShoppingBag className="h-5 w-5 text-purple-700" />
                {language === 'mr' ? `माझी टोपली (${totalItems} वस्तू)` : `My Basket (${totalItems} items)`}
              </SheetTitle>
              <SheetDescription className="text-xs text-slate-500">
                {store.name} · {store.deliveryTimeMins} delivery
              </SheetDescription>
            </SheetHeader>

            <div className="space-y-4 pt-3">
              <div className="divide-y divide-slate-100 max-h-56 overflow-y-auto">
                {items.map(item => (
                  <div key={item.product.id + (item.selectedVariantId || '')} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-slate-900">{item.product.name}</p>
                      <p className="text-[11px] text-slate-400">{item.unit} · Qty: {item.quantity}</p>
                    </div>
                    <span className="font-black text-slate-900">
                      ₹{item.price * item.quantity}
                    </span>
                  </div>
                ))}
              </div>

              {/* Free Delivery Bar Upsell */}
              {subtotal < 299 && (
                <div className="p-3 bg-purple-50 rounded-2xl border border-purple-200 text-xs flex items-center gap-2 text-purple-900">
                  <Bike className="h-4 w-4 text-purple-700 shrink-0" />
                  <span>
                    {language === 'mr' 
                      ? `आणखी ₹${299 - subtotal} ची खरेदी करा आणि मोफत डिलिव्हरी मिळवा!` 
                      : `Add items worth ₹${299 - subtotal} more to get FREE Delivery!`}
                  </span>
                </div>
              )}

              {/* Bill Summary */}
              <div className="bg-slate-50 p-3 rounded-2xl space-y-1 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>{language === 'mr' ? 'वस्तूंची किंमत' : 'Item Total'}</span>
                  <span className="font-bold">₹{subtotal}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>{language === 'mr' ? 'डिलिव्हरी फी' : 'Delivery Charge'}</span>
                  <span>{deliveryFee === 0 ? <strong className="text-emerald-600">FREE</strong> : `₹${deliveryFee}`}</span>
                </div>
                <div className="border-t border-slate-200 pt-1.5 flex justify-between font-extrabold text-sm text-slate-900">
                  <span>{language === 'mr' ? 'एकूण रक्कम' : 'To Pay'}</span>
                  <span>₹{finalTotal}</span>
                </div>
              </div>

              <Button
                onClick={handleCheckout}
                className="w-full bg-gradient-to-r from-[#5800FF] via-[#7B2CBF] to-[#E11D48] hover:opacity-95 text-white font-black py-6 rounded-2xl text-base shadow-md transition-all active:scale-[0.99]"
              >
                {language === 'mr' ? 'चेकआऊट करा (Proceed to Checkout)' : 'Proceed to Checkout'}
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </SheetContent>
        </Sheet>

      </div>
    </div>
  );
}

export default function StorefrontPage() {
  return <StorefrontScreen />;
}
