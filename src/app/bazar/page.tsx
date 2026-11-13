'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { 
  Search, 
  Mic, 
  Store, 
  Navigation, 
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
  SlidersHorizontal,
  BadgeCheck
} from 'lucide-react';
import { NativeAppBottomNav } from '@/modules/bazar/components/NativeAppBottomNav';
import { BazarLocationHeader } from '@/modules/bazar/components/BazarLocationHeader';
import { BazarSearchOverlay } from '@/modules/bazar/components/BazarSearchOverlay';
import { BAZAR_TOWN_STORES, POPULAR_SHOP_CATEGORIES, type BazarTownStore } from '@/modules/bazar/data/storeDirectory';
import { Badge } from '@/components/ui/badge';

export default function BazarDiscoveryPage() {
  const [language, setLanguage] = useState<'mr' | 'en'>('mr');
  const [selectedTown, setSelectedTown] = useState('Palus');
  const [searchOverlayOpen, setSearchOverlayOpen] = useState(false);
  const [favoriteStoreIds, setFavoriteStoreIds] = useState<string[]>(['fresh-mart']);
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>('all');

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

  const handleToggleLanguage = () => {
    const nextLang = language === 'mr' ? 'en' : 'mr';
    setLanguage(nextLang);
    if (typeof window !== 'undefined') {
      localStorage.setItem('bazar_lang', nextLang);
    }
  };

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

  // Town stores
  const townStores = BAZAR_TOWN_STORES;
  const favoriteStores = BAZAR_TOWN_STORES.filter(s => favoriteStoreIds.includes(s.id));

  return (
    <div className="w-full min-h-screen bg-[#F6F8F7] font-sans antialiased text-slate-900 flex justify-center pb-24 selection:bg-emerald-500/20">
      {/* Mobile Shell (Fixed 430px max on Desktop) */}
      <div className="w-full max-w-[430px] bg-white min-h-screen flex flex-col shadow-lg relative border-x border-slate-200">
        
        {/* ─────────────────────────────────────────────────────────────
            1. COMPACT BLINKIT-STYLE TOP LOCATION & APP HEADER
        ───────────────────────────────────────────────────────────── */}
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md px-4 pt-3 pb-2.5 border-b border-slate-100 flex items-center justify-between shadow-2xs">
          <BazarLocationHeader
            currentTown={selectedTown}
            onSelectTown={(town) => setSelectedTown(town)}
            language={language}
          />

          {/* Right Actions: Language Switch & Merchant Portal Icon */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleToggleLanguage}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-[11px] border border-emerald-200 active:scale-95 transition-all"
              aria-label="Toggle language"
            >
              <Globe className="h-3 w-3 text-emerald-600" />
              <span>{language === 'mr' ? 'English' : 'मराठी'}</span>
            </button>

            <Link
              href="/bazar/dashboard"
              className="h-8 w-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-all active:scale-95"
              title="Merchant Portal"
            >
              <Store className="h-4 w-4" />
            </Link>
          </div>
        </header>

        {/* ─────────────────────────────────────────────────────────────
            2. PROMINENT SEARCH BAR (Opens Full Search Overlay)
        ───────────────────────────────────────────────────────────── */}
        <div className="px-4 pt-2.5 pb-1">
          <button
            onClick={() => setSearchOverlayOpen(true)}
            className="w-full h-11 px-3.5 rounded-2xl bg-slate-100 hover:bg-slate-100/80 border border-slate-200/80 flex items-center justify-between text-left text-xs text-slate-500 shadow-2xs active:scale-[0.99] transition-all"
          >
            <div className="flex items-center gap-2.5 overflow-hidden">
              <Search className="h-4 w-4 text-emerald-600 shrink-0" />
              <span className="truncate">
                {language === 'mr'
                  ? 'किराणा, दूध, तेल, भाजीपाला शोधा...'
                  : 'Search for milk, atta, oil, grocery...'}
              </span>
            </div>
            <div className="h-6 w-6 rounded-full bg-white flex items-center justify-center text-slate-400 shadow-2xs shrink-0">
              <Mic className="h-3.5 w-3.5" />
            </div>
          </button>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            3. INSTANT SHOP CATEGORIES REEL (Horizontal Carousel)
        ───────────────────────────────────────────────────────────── */}
        <div className="pt-2.5 pb-2">
          <div className="flex gap-2.5 px-4 overflow-x-auto no-scrollbar scroll-smooth">
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
            4. COMPACT HERO PROMOTIONAL BANNER
        ───────────────────────────────────────────────────────────── */}
        <div className="px-4 py-1.5">
          <Link href="/bazar/store/fresh-mart">
            <div className="relative rounded-2xl bg-gradient-to-r from-emerald-700 via-emerald-600 to-teal-700 p-3.5 overflow-hidden text-white shadow-xs active:scale-[0.99] transition-all">
              <div className="relative z-10 max-w-[65%] space-y-1">
                <div className="inline-flex items-center gap-1 bg-white/20 backdrop-blur-xs text-[9px] font-black tracking-wider uppercase px-2 py-0.5 rounded-full text-emerald-100">
                  <Sparkles className="h-2.5 w-2.5 text-amber-300 fill-amber-300" />
                  {language === 'mr' ? 'स्थानिक बाजार' : 'Super Fast Delivery'}
                </div>
                <h2 className="font-extrabold text-[15px] leading-tight">
                  {language === 'mr' ? '१५–२५ मिनिटांत थेट घरपोच' : 'Groceries to your door in 15–25 mins'}
                </h2>
                <p className="text-[11px] text-emerald-100/90 line-clamp-1">
                  {language === 'mr' ? 'पलूस व परिसरातील खात्रीशीर दुकाने' : 'Verified local shops in Palus & Sangli'}
                </p>
              </div>

              {/* Decorative Accent Graphic */}
              <div className="absolute -right-2 -bottom-3 w-32 h-28 pointer-events-none opacity-90">
                <Image
                  src="https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&auto=format&fit=crop&q=80"
                  alt="Groceries"
                  fill
                  className="object-contain"
                  loading="lazy"
                />
              </div>
            </div>
          </Link>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            5. "माझे आवडते दुकाने" (PINNED / FREQUENT STORES)
        ───────────────────────────────────────────────────────────── */}
        {favoriteStores.length > 0 && (
          <div className="px-4 pt-3 pb-1">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-extrabold text-xs text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Heart className="h-3.5 w-3.5 fill-rose-500 text-rose-500" />
                <span>{language === 'mr' ? 'माझे आवडते दुकाने' : 'Saved Kirana & Stores'}</span>
              </h3>
              <span className="text-[11px] font-bold text-emerald-700">
                {favoriteStores.length} {language === 'mr' ? 'दुकाने' : 'shops'}
              </span>
            </div>

            <div className="flex gap-2.5 overflow-x-auto no-scrollbar pb-1">
              {favoriteStores.map((store) => (
                <Link
                  key={store.id}
                  href={`/bazar/store/${store.slug}`}
                  className="shrink-0 w-[240px] bg-white rounded-2xl p-2.5 border border-slate-200/90 shadow-2xs hover:border-emerald-300 transition-all flex items-center justify-between gap-2"
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
                      <h4 className="font-bold text-xs text-slate-900 leading-tight line-clamp-1">
                        {language === 'mr' ? store.nameMarathi : store.name}
                      </h4>
                      <p className="text-[10px] text-emerald-700 font-semibold mt-0.5">
                        {store.deliveryTimeMins} · {store.distanceKm} km
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
        <main className="px-4 pt-3 space-y-3 flex-1">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-xs text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Store className="h-3.5 w-3.5 text-emerald-600" />
              <span>{language === 'mr' ? 'परिसरातील दुकाने (Nearby Stores)' : 'Nearby Verified Stores'}</span>
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
                  className="block bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:border-emerald-300 overflow-hidden active:scale-[0.99] transition-all group"
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
                          <div className="absolute top-1 left-1 bg-emerald-700 text-white text-[8px] font-black px-1 py-0.2 rounded">
                            {store.shortCode}
                          </div>
                        </div>

                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <h4 className="font-extrabold text-sm text-slate-900 group-hover:text-emerald-700 transition-colors">
                              {language === 'mr' ? store.nameMarathi : store.name}
                            </h4>
                            {store.verified && (
                              <BadgeCheck className="h-4 w-4 text-emerald-600 shrink-0" />
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

                        <div className="flex items-center gap-1 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-lg">
                          <Star className="h-3 w-3 fill-emerald-600 text-emerald-600" />
                          <span className="text-xs font-black text-emerald-900">{store.rating}</span>
                        </div>
                      </div>
                    </div>

                    {/* Offer Pill / Banner if available */}
                    {store.offersText && (
                      <div className="bg-emerald-50/70 border border-emerald-100 rounded-xl px-2.5 py-1 flex items-center gap-1.5 text-[11px] font-bold text-emerald-800">
                        <Tag className="h-3 w-3 text-emerald-600 shrink-0" />
                        <span className="truncate">
                          {language === 'mr' ? store.offersTextMarathi : store.offersText}
                        </span>
                      </div>
                    )}

                    {/* Bottom Metadata Bar */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-3 font-semibold text-slate-600">
                        <span className="flex items-center gap-1 text-emerald-700 font-bold">
                          <Bike className="h-3.5 w-3.5" />
                          {store.deliveryTimeMins}
                        </span>
                        <span className="text-slate-300">•</span>
                        <span>{language === 'mr' ? `किमान ₹${store.minOrder}` : `Min ₹${store.minOrder}`}</span>
                      </div>

                      <span className="text-xs font-bold text-emerald-700 flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
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
            8. INTERACTIVE SEARCH OVERLAY
        ───────────────────────────────────────────────────────────── */}
        <BazarSearchOverlay
          isOpen={searchOverlayOpen}
          onClose={() => setSearchOverlayOpen(false)}
          language={language}
        />

      </div>
    </div>
  );
}
