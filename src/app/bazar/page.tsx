'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { 
  Search, 
  Mic, 
  Store, 
  Share2, 
  Zap, 
  Tag, 
  Heart, 
  ChevronRight, 
  Bike, 
  ShoppingBag, 
  Star,
  Globe,
  ShoppingBasket,
  Milk,
  Carrot,
  Apple,
  Cookie,
  Flame,
  Coffee,
  Home,
  CheckCircle2,
  Sparkles,
  BadgeCheck,
  ShieldCheck,
  Clock,
  ArrowRight,
  TrendingUp,
  Percent,
  Check
} from 'lucide-react';
import { NativeAppBottomNav } from '@/modules/bazar/components/NativeAppBottomNav';
import { BazarSearchOverlay } from '@/modules/bazar/components/BazarSearchOverlay';
import { GroceryProductCard } from '@/modules/bazar/components/GroceryProductCard';
import { NativeFloatingCartBar } from '@/modules/bazar/components/NativeFloatingCartBar';
import { ProductDetailsSheet } from '@/modules/bazar/components/ProductDetailsSheet';
import { BAZAR_TOWN_STORES, POPULAR_SHOP_CATEGORIES, type BazarTownStore } from '@/modules/bazar/data/storeDirectory';
import { BAZAR_PRODUCT_CATALOG, type GroceryProduct } from '@/modules/bazar/data/groceryCatalog';
import { Badge } from '@/components/ui/badge';

export default function BazarDiscoveryPage() {
  const [language, setLanguage] = useState<'mr' | 'en'>('mr');
  const [selectedTown, setSelectedTown] = useState('Palus');
  const [searchOverlayOpen, setSearchOverlayOpen] = useState(false);
  const [favoriteStoreIds, setFavoriteStoreIds] = useState<string[]>(['fresh-mart']);
  const [selectedProduct, setSelectedProduct] = useState<GroceryProduct | null>(null);
  const [copiedShare, setCopiedShare] = useState(false);

  // Load preferences from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedLang = localStorage.getItem('bazar_lang') as 'mr' | 'en' | null;
      if (savedLang) setLanguage(savedLang);

      const savedTown = localStorage.getItem('bazar_selected_town');
      if (savedTown) setSelectedTown(savedTown);

      try {
        const savedFavs = localStorage.getItem('bazar_fav_stores');
        if (savedFavs) setFavoriteStoreIds(JSON.parse(savedFavs));
      } catch (e) {
        // ignore
      }
    }
  }, []);

  const handleToggleFavorite = (storeId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const nextFavs = favoriteStoreIds.includes(storeId)
      ? favoriteStoreIds.filter(id => id !== storeId)
      : [...favoriteStoreIds, storeId];
    setFavoriteStoreIds(nextFavs);
    if (typeof window !== 'undefined') {
      localStorage.setItem('bazar_fav_stores', JSON.stringify(nextFavs));
    }
  };

  const handleShareBazar = async () => {
    const shareData = {
      title: 'RentSutra Bazar | स्थानिक बाजार थेट घरपोच',
      text: 'Order groceries, fresh milk, vegetables & daily essentials from local trusted shops in Palus & Sangli in 10-15 mins!',
      url: typeof window !== 'undefined' ? window.location.href : 'https://rentsutra.in/bazar',
    };

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch (e) {
        // user dismissed
      }
    }

    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(shareData.url);
        setCopiedShare(true);
        setTimeout(() => setCopiedShare(false), 2500);
      } catch (e) {
        // fallback
      }
    }
  };

  // Town stores & Bestsellers
  const townStores = BAZAR_TOWN_STORES;
  const favoriteStores = BAZAR_TOWN_STORES.filter(s => favoriteStoreIds.includes(s.id));
  const trendingBestsellers = useMemo(() => {
    return BAZAR_PRODUCT_CATALOG.slice(0, 6);
  }, []);

  return (
    <div className="w-full min-h-screen bg-background font-sans antialiased text-foreground flex justify-center pb-24 selection:bg-primary/20">
      {/* Mobile Shell (Fixed 430px max on Desktop) */}
      <div className="w-full max-w-[430px] bg-card text-card-foreground min-h-screen flex flex-col shadow-lg relative border-x border-border">
        
        {/* Top bar rendered uniformly by platform root <Header /> */}

        {/* ─────────────────────────────────────────────────────────────
            1. BRANDED HERO BANNER & CUSTOMER SHARE ACTION
        ───────────────────────────────────────────────────────────── */}
        <div className="px-3.5 pt-2.5 pb-1">
          <div className="relative rounded-3xl bg-gradient-to-br from-primary via-primary/90 to-primary/80 p-4 text-primary-foreground shadow-xl shadow-primary/20 overflow-hidden">
            {/* Background Glows & Speed Lines */}
            <div className="absolute top-0 right-0 w-44 h-44 bg-white/10 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-yellow-400/20 rounded-full blur-xl pointer-events-none" />

            <div className="relative z-10 space-y-2">
              <div className="flex items-center justify-between">
                <div className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] font-black tracking-wider uppercase text-yellow-300 border border-white/20 shadow-xs">
                  <span>⚡ 10-15 MINS</span>
                  <span className="text-white/70">•</span>
                  <span className="text-white">{language === 'mr' ? 'थेट घरपोच' : 'SUPERFAST'}</span>
                </div>

                {/* Share Button Pill */}
                <button
                  onClick={handleShareBazar}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-card text-card-foreground font-extrabold text-[11px] hover:bg-primary-foreground/20 active:scale-90 transition-all shadow-md"
                  title="Share Bazar with friends & family"
                >
                  {copiedShare ? (
                    <>
                      <Check className="h-3 w-3 stroke-[3] text-emerald-600" />
                      <span className="text-emerald-700">{language === 'mr' ? 'कॉपी झाले!' : 'Copied!'}</span>
                    </>
                  ) : (
                    <>
                      <Share2 className="h-3 w-3 stroke-[2.5]" />
                      <span>{language === 'mr' ? 'शेअर करा' : 'Share'}</span>
                    </>
                  )}
                </button>
              </div>

              <div>
                <h1 className="text-xl font-black leading-tight tracking-tight">
                  {language === 'mr' ? 'RentSutra बाजार' : 'RentSutra Bazar'}
                </h1>
                <p className="text-xs text-purple-100 font-medium leading-snug pt-0.5 max-w-[85%]">
                  {language === 'mr' 
                    ? 'तुमच्या शहरातील खात्रीशीर दुकाने आणि किराणा आता एकाच ठिकाणी.' 
                    : 'Your town’s trusted kirana & daily essentials delivered fast.'}
                </p>
              </div>

              {/* Trust Badges Bar */}
              <div className="pt-1 flex items-center gap-3 text-[10px] font-bold text-white/95">
                <div className="flex items-center gap-1">
                  <ShieldCheck className="h-3.5 w-3.5 text-yellow-300" />
                  <span>{language === 'mr' ? '१००% अस्सल माल' : '100% Genuine'}</span>
                </div>
                <span className="text-white/40">•</span>
                <div className="flex items-center gap-1">
                  <Bike className="h-3.5 w-3.5 text-emerald-300" />
                  <span>{language === 'mr' ? 'स्थानिक डिलिव्हरी' : 'Local Delivery'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            2. PROMINENT SEARCH BAR (Interactive Trigger)
        ───────────────────────────────────────────────────────────── */}
        <div className="px-3.5 pt-2 pb-1">
          <button
            onClick={() => setSearchOverlayOpen(true)}
            className="w-full h-11 px-3.5 rounded-2xl bg-muted/60 hover:bg-muted border border-border flex items-center justify-between text-left text-xs text-muted-foreground shadow-2xs active:scale-[0.99] transition-all"
          >
            <div className="flex items-center gap-2.5 overflow-hidden">
              <Search className="h-4 w-4 text-primary shrink-0 stroke-[2.5]" />
              <span className="truncate">
                {language === 'mr'
                  ? 'किराणा, दूध, तेल, भाजीपाला शोधा...'
                  : 'Search for milk, atta, oil, grocery...'}
              </span>
            </div>
            <div className="h-6 w-6 rounded-full bg-card flex items-center justify-center text-muted-foreground shadow-2xs shrink-0">
              <Mic className="h-3.5 w-3.5" />
            </div>
          </button>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            3. INSTANT SHOP CATEGORIES REEL (Horizontal Carousel)
        ───────────────────────────────────────────────────────────── */}
        <div className="pt-2 pb-1">
          <div className="flex gap-2.5 px-3.5 overflow-x-auto scrollbar-hide scroll-smooth">
            {POPULAR_SHOP_CATEGORIES.map((cat) => {
              const IconComp = 
                cat.iconName === 'ShoppingBasket' ? ShoppingBasket :
                cat.iconName === 'Milk' ? Milk :
                cat.iconName === 'Carrot' ? Carrot :
                cat.iconName === 'Apple' ? Apple :
                cat.iconName === 'Cookie' ? Cookie :
                cat.iconName === 'Flame' ? Flame :
                cat.iconName === 'Coffee' ? Coffee : Home;

              return (
                <Link
                  key={cat.id}
                  href={`/bazar/categories?cat=${cat.id}`}
                  className="flex flex-col items-center gap-1.5 shrink-0 group active:scale-95 transition-all"
                >
                  <div className={`h-14 w-14 rounded-2xl bg-gradient-to-br ${cat.bgGradient} border border-slate-100 flex flex-col items-center justify-center shadow-2xs group-hover:shadow-xs group-hover:scale-105 transition-all`}>
                    <IconComp className={`h-6 w-6 ${cat.textColor}`} />
                  </div>
                  <span className="text-[11px] font-bold text-slate-800 tracking-tight text-center max-w-[64px] leading-tight line-clamp-1">
                    {language === 'mr' ? cat.nameMarathi : cat.name}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            4. TRENDING BESTSELLERS SHELF (Direct Add-to-Cart)
        ───────────────────────────────────────────────────────────── */}
        <div className="px-3.5 pt-3 pb-1">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-1.5">
              <div className="h-5 w-5 rounded-md bg-rose-500/10 flex items-center justify-center text-rose-600">
                <Flame className="h-3.5 w-3.5 stroke-[2.5]" />
              </div>
              <h2 className="font-extrabold text-sm text-foreground tracking-tight">
                {language === 'mr' ? 'सर्वाधिक मागणी असलेले पदार्थ' : 'Trending Bestsellers'}
              </h2>
            </div>
            <Link 
              href="/bazar/categories?cat=dairy" 
              className="text-xs font-bold text-primary flex items-center gap-0.5 hover:underline"
            >
              <span>{language === 'mr' ? 'सर्व पाहा' : 'See All'}</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {trendingBestsellers.map((product) => (
              <GroceryProductCard
                key={product.id}
                product={product}
                storeId="fresh-mart"
                storeName="Fresh Mart Supermarket"
                onOpenDetails={(p) => setSelectedProduct(p)}
                language={language}
              />
            ))}
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            5. "माझे आवडते दुकाने" (PINNED / FREQUENT STORES)
        ───────────────────────────────────────────────────────────── */}
        {favoriteStores.length > 0 && (
          <div className="px-3.5 pt-4 pb-1">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-extrabold text-xs text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Heart className="h-3.5 w-3.5 fill-rose-500 text-rose-500" />
                <span>{language === 'mr' ? 'माझे आवडते दुकाने' : 'Saved Kirana & Stores'}</span>
              </h3>
              <span className="text-[11px] font-bold text-primary">
                {favoriteStores.length} {language === 'mr' ? 'दुकाने' : 'shops'}
              </span>
            </div>

            <div className="flex gap-2.5 overflow-x-auto scrollbar-hide pb-1">
              {favoriteStores.map((store) => (
                <Link
                  key={store.id}
                  href={`/bazar/store/${store.slug}`}
                  className="shrink-0 w-[240px] bg-card rounded-2xl p-2.5 border border-border shadow-2xs hover:border-primary/50 transition-all flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="relative h-11 w-11 rounded-xl overflow-hidden bg-slate-100 shrink-0 border border-slate-200">
                      <Image
                        src={store.imageUrl}
                        alt={store.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-foreground leading-tight line-clamp-1">
                        {language === 'mr' ? store.nameMarathi : store.name}
                      </h4>
                      <p className="text-[10px] text-primary font-semibold mt-0.5">
                        ⚡ {store.deliveryTimeMins} · {store.distanceKm} km
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={(e) => handleToggleFavorite(store.id, e)}
                    className="p-1 rounded-full text-rose-500 hover:bg-rose-50 shrink-0"
                    aria-label="Remove favorite"
                  >
                    <Heart className="h-3.5 w-3.5 fill-rose-500 text-rose-500" />
                  </button>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            6. NEARBY VERIFIED STORES (HIGH-CONVERSION MOBILE CARDS)
        ───────────────────────────────────────────────────────────── */}
        <main className="px-3.5 pt-4 space-y-3 flex-1">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-xs text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Store className="h-3.5 w-3.5 text-purple-700" />
              <span>{language === 'mr' ? 'परिसरातील खात्रीशीर दुकाने' : 'Nearby Verified Stores'}</span>
            </h3>
            <span className="text-[11px] font-semibold text-slate-500">
              {townStores.length} {language === 'mr' ? 'उपलब्ध' : 'available'}
            </span>
          </div>

          <div className="space-y-3 pb-4">
            {townStores.map((store) => {
              const isFav = favoriteStoreIds.includes(store.id);
              return (
                <Link
                  key={store.id}
                  href={`/bazar/store/${store.slug}`}
                  className="block bg-card rounded-2xl border border-border shadow-2xs hover:shadow-md hover:border-primary/50 overflow-hidden active:scale-[0.99] transition-all group"
                >
                  <div className="p-3.5 space-y-2.5">
                    {/* Top Row: Logo/Photo + Name + Rating */}
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="flex items-start gap-3">
                        <div className="relative h-13 w-13 rounded-xl overflow-hidden bg-slate-100 shrink-0 border border-slate-200 shadow-2xs">
                          <Image
                            src={store.imageUrl}
                            alt={store.name}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          <div className="absolute top-1 left-1 bg-primary text-primary-foreground text-[8px] font-black px-1 py-0.2 rounded">
                            {store.shortCode}
                          </div>
                        </div>

                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <h4 className="font-extrabold text-sm text-foreground group-hover:text-primary transition-colors">
                              {language === 'mr' ? store.nameMarathi : store.name}
                            </h4>
                            {store.verified && (
                              <BadgeCheck className="h-4 w-4 text-primary shrink-0" />
                            )}
                          </div>

                          <p className="text-[11px] text-slate-500 font-medium line-clamp-1">
                            {language === 'mr' ? store.categoryMarathi : store.category}
                          </p>

                          <div className="flex items-center gap-2 pt-0.5 text-[11px]">
                            <span className="font-bold text-emerald-600 flex items-center gap-1">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                              {language === 'mr' ? 'उघडे आहे' : 'Open Now'}
                            </span>
                            <span className="text-slate-300">•</span>
                            <span className="text-slate-500 font-medium">{store.distanceKm} km</span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Heart + Rating */}
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <button
                          onClick={(e) => handleToggleFavorite(store.id, e)}
                          className="p-1 rounded-full text-slate-300 hover:text-rose-500 active:scale-90 transition-all"
                          aria-label="Favorite store"
                        >
                          <Heart className={`h-4 w-4 ${isFav ? 'fill-rose-500 text-rose-500' : ''}`} />
                        </button>

                        <div className="flex items-center gap-1 bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-lg">
                          <Star className="h-3 w-3 fill-primary text-primary" />
                          <span className="text-xs font-black text-primary">{store.rating}</span>
                        </div>
                      </div>
                    </div>

                    {/* Offer Pill / Banner if available */}
                    {store.offersText && (
                      <div className="bg-rose-50/70 border border-rose-100 rounded-xl px-2.5 py-1 flex items-center gap-1.5 text-[11px] font-bold text-rose-800">
                        <Tag className="h-3 w-3 text-rose-600 shrink-0" />
                        <span className="truncate">
                          {language === 'mr' ? store.offersTextMarathi : store.offersText}
                        </span>
                      </div>
                    )}

                    {/* Bottom Metadata Bar */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-3 font-semibold text-slate-600">
                        <span className="flex items-center gap-1 text-primary font-extrabold">
                          ⚡ {store.deliveryTimeMins}
                        </span>
                        <span className="text-slate-300">•</span>
                        <span>{language === 'mr' ? `किमान ₹${store.minOrder}` : `Min ₹${store.minOrder}`}</span>
                      </div>

                      <span className="text-xs font-bold text-primary flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                        <span>{language === 'mr' ? 'दुकान पाहा' : 'Shop'}</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </main>

        {/* ─────────────────────────────────────────────────────────────
            7. NATIVE BOTTOM NAVIGATION BAR
        ───────────────────────────────────────────────────────────── */}
        <NativeAppBottomNav />

        {/* ─────────────────────────────────────────────────────────────
            8. FLOATING CART BAR (IF ITEMS IN CART)
        ───────────────────────────────────────────────────────────── */}
        <NativeFloatingCartBar
          onOpenCart={() => {
            if (typeof window !== 'undefined') {
              window.location.href = '/bazar/checkout';
            }
          }}
          language={language}
        />

        {/* ─────────────────────────────────────────────────────────────
            9. INTERACTIVE SEARCH OVERLAY
        ───────────────────────────────────────────────────────────── */}
        <BazarSearchOverlay
          isOpen={searchOverlayOpen}
          onClose={() => setSearchOverlayOpen(false)}
          language={language}
        />

        {/* ─────────────────────────────────────────────────────────────
            10. PRODUCT DETAILS SHEET (ON PRODUCT TAP)
        ───────────────────────────────────────────────────────────── */}
        {selectedProduct && (
          <ProductDetailsSheet
            product={selectedProduct}
            isOpen={!!selectedProduct}
            onClose={() => setSelectedProduct(null)}
            storeId="fresh-mart"
            storeName="Fresh Mart Supermarket"
            language={language}
          />
        )}

      </div>
    </div>
  );
}
