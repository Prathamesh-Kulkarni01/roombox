'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { 
  Menu, 
  MapPin, 
  ChevronDown, 
  Globe, 
  Search, 
  Mic, 
  Store, 
  Leaf, 
  Landmark, 
  Building2, 
  Navigation, 
  Zap, 
  Tag, 
  Heart, 
  ChevronRight, 
  Bike, 
  ShoppingBag, 
  Star
} from 'lucide-react';
import { NativeAppBottomNav } from '@/modules/bazar/components/NativeAppBottomNav';

interface TownStore {
  id: string;
  name: string;
  nameMarathi: string;
  slug: string;
  address: string;
  category: string;
  town: 'Palus' | 'Tasgaon' | 'Islampur' | 'Sangli';
  isOpen: boolean;
  distanceKm: number;
  deliveryTimeMins: string;
  minOrder: number;
  rating: number;
  imageUrl: string;
  shortCode: string;
}

const STORES: TownStore[] = [
  {
    id: 'store_1',
    name: 'Fresh Mart Supermarket',
    nameMarathi: 'फ्रेश मार्ट सुपरमार्केट',
    slug: 'fresh-mart',
    address: 'एसटी स्टँडसमोर, मेन रोड, पलूस • किराणा व धान्य',
    category: 'किराणा व धान्य',
    town: 'Palus',
    isOpen: true,
    distanceKm: 0.8,
    deliveryTimeMins: '15-25 मिनिटे',
    minOrder: 99,
    rating: 4.8,
    shortCode: 'FM',
    imageUrl: 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=500&auto=format&fit=crop&q=80',
  },
  {
    id: 'store_2',
    name: 'Shree Mahalaxmi Super Bazar',
    nameMarathi: 'श्री महालक्ष्मी सुपर बाजार',
    slug: 'shree-super-bazar',
    address: 'पटेल स्टँडसमोर, पलूस • किराणा व धान्य',
    category: 'किराणा व धान्य',
    town: 'Palus',
    isOpen: true,
    distanceKm: 0.8,
    deliveryTimeMins: '35 मिनिटे',
    minOrder: 200,
    rating: 4.8,
    shortCode: 'श्री',
    imageUrl: 'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=500&auto=format&fit=crop&q=80',
  },
  {
    id: 'store_3',
    name: 'Ganesh Dairy & Bakery',
    nameMarathi: 'गणेश डेअरी आणि बेकरी',
    slug: 'ganesh-dairy-palus',
    address: 'शिवाजी चौक, पलूस • दूध, डेअरी, बेकरी',
    category: 'दूध, डेअरी, बेकरी',
    town: 'Palus',
    isOpen: true,
    distanceKm: 0.5,
    deliveryTimeMins: '20 मिनिटे',
    minOrder: 100,
    rating: 4.9,
    shortCode: 'गणेश',
    imageUrl: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=500&auto=format&fit=crop&q=80',
  },
  {
    id: 'store_4',
    name: 'Tasgaon Fresh Krishi Bazar',
    nameMarathi: 'तासगाव ताजी शेतमाल भाजीपाला',
    slug: 'tasgaon-krishi-bazar',
    address: 'गणपती मंदिराशेजारी, तासगाव',
    category: 'ताजी फळे व शेतकरी भाजीपाला',
    town: 'Tasgaon',
    isOpen: true,
    distanceKm: 1.4,
    deliveryTimeMins: '30 मिनिटे',
    minOrder: 150,
    rating: 4.7,
    shortCode: 'तासगाव',
    imageUrl: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=500&auto=format&fit=crop&q=80',
  },
];

export default function BazarDiscoveryPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [language, setLanguage] = useState<'mr' | 'en'>('mr');

  // Filter stores within delivery range matching search
  const filteredStores = STORES.filter(s => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      s.name.toLowerCase().includes(q) ||
      s.nameMarathi.includes(q) ||
      s.address.includes(q)
    );
  });

  return (
    <div className="w-full min-h-screen bg-[#F8FAF9] font-sans antialiased text-[#0F1713] flex justify-center pb-24 selection:bg-[#0D7C4D]/20">
      {/* Mobile Shell (Centered 430px max on Desktop) */}
      <div className="w-full max-w-[430px] bg-[#FFFFFF] min-h-screen flex flex-col shadow-md relative border-x border-[#E5E9E6]">
        
        {/* ─────────────────────────────────────────────────────────────
            1. TOP APP HEADER (Unified Brand Green Accent)
        ───────────────────────────────────────────────────────────── */}
        <header className="px-4 pt-3 pb-2 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button className="text-[#0F1713] p-1 active:scale-95 transition-transform" aria-label="Menu">
              <Menu className="h-6 w-6 stroke-[2.2]" />
            </button>

            {/* Brand Green Store Squircle & Location Label */}
            <div className="flex items-center gap-2">
              <div className="h-11 w-11 rounded-2xl bg-[#0D7C4D] text-white flex items-center justify-center shadow-sm shadow-[#0D7C4D]/25">
                <Store className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-1 cursor-pointer">
                  <span className="font-black text-[15px] text-[#0F1713] tracking-tight">
                    आपला परिसर (Nearby Stores)
                  </span>
                </div>
                <div className="flex items-center gap-1 text-[12px] font-semibold text-[#0D7C4D] mt-0.5">
                  <MapPin className="h-3 w-3 fill-[#0D7C4D]" />
                  <span>वितरण उपलब्ध (Within 5 km Range)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Language Switch Button */}
          <button 
            onClick={() => setLanguage(l => l === 'mr' ? 'en' : 'mr')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#E8F5EE] text-[#0D7C4D] font-bold text-xs border border-[#CDEBD8] active:scale-95 transition-all"
          >
            <Globe className="h-3.5 w-3.5" />
            <span>English</span>
          </button>
        </header>

        {/* ─────────────────────────────────────────────────────────────
            2. SEARCH BAR
        ───────────────────────────────────────────────────────────── */}
        <div className="px-4 py-2">
          <div className="relative flex items-center">
            <Search className="absolute left-3.5 h-4 w-4 text-[#8A948D] stroke-[2.2]" />
            <input
              type="text"
              placeholder="दुकान किंवा किराणा शोधा (उदा. तांदूळ, तेल, डेअरी)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-11 pl-10 pr-10 rounded-2xl bg-[#F2F4F3] border border-transparent text-xs font-medium text-[#0F1713] placeholder:text-[#8A948D] focus:bg-[#FFFFFF] focus:border-[#0D7C4D] focus:outline-hidden transition-all"
            />
            <Mic className="absolute right-3.5 h-4 w-4 text-[#8A948D] cursor-pointer hover:text-[#0D7C4D] transition-colors" />
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            3. NEARBY LOCATION BADGE STRIP (Automatic Range)
        ───────────────────────────────────────────────────────────── */}
        <div className="px-4 py-1.5 flex items-center justify-between text-xs bg-emerald-50/60 border-y border-emerald-100">
          <div className="flex items-center gap-1.5 text-emerald-800 font-semibold">
            <Navigation className="h-3.5 w-3.5 text-emerald-600 animate-pulse" />
            <span>Showing verified shops delivering to your location</span>
          </div>
          <span className="text-[11px] font-bold text-emerald-700 bg-white px-2 py-0.5 rounded-full border border-emerald-200">
            &lt; 5 km
          </span>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            4. HERO BANNER (Unified Green Tone)
        ───────────────────────────────────────────────────────────── */}
        <div className="px-4 py-2">
          <Link href="/bazar/store/fresh-mart">
            <div className="relative rounded-[22px] bg-gradient-to-r from-[#E8F5EE] via-[#F0FDF4] to-[#E0F2E9] p-4 overflow-hidden border border-[#CDEBD8] shadow-xs active:scale-[0.99] transition-all">
              <div className="relative z-10 max-w-[62%] space-y-1">
                <h2 className="font-black text-[17px] text-[#0F1713] leading-snug">
                  आपल्या परिसरातील<br />
                  <span className="text-[#0D7C4D]">सर्व दुकाने एकाच ठिकाणी</span>
                </h2>
                <p className="text-[10px] font-medium text-[#525C56] pt-0.5">
                  किराणा, डेअरी, भाजीपाला, मेडिकल आणि बरेच काही
                </p>

                {/* 3 Pill Badges */}
                <div className="pt-3 flex flex-wrap gap-1.5">
                  <span className="inline-flex items-center gap-1 bg-[#FFFFFF]/90 backdrop-blur-xs text-[9px] font-bold text-[#0D7C4D] px-2 py-0.5 rounded-full shadow-2xs">
                    <Zap className="h-2.5 w-2.5 fill-[#0D7C4D]" />
                    जलद शोधा
                  </span>
                  <span className="inline-flex items-center gap-1 bg-[#FFFFFF]/90 backdrop-blur-xs text-[9px] font-bold text-[#0D7C4D] px-2 py-0.5 rounded-full shadow-2xs">
                    <MapPin className="h-2.5 w-2.5 text-[#0D7C4D]" />
                    जवळची दुकाने
                  </span>
                  <span className="inline-flex items-center gap-1 bg-[#FFFFFF]/90 backdrop-blur-xs text-[9px] font-bold text-[#0D7C4D] px-2 py-0.5 rounded-full shadow-2xs">
                    <Tag className="h-2.5 w-2.5 text-[#0D7C4D]" />
                    चांगले दर
                  </span>
                </div>
              </div>

              {/* Basket image on right side */}
              <div className="absolute -right-3 -bottom-2 w-44 h-40 pointer-events-none">
                <Image
                  src="https://images.unsplash.com/photo-1542838132-92c53300491e?w=500&auto=format&fit=crop&q=80"
                  alt="Grocery Basket"
                  fill
                  className="object-contain"
                  loading="lazy"
                />
              </div>
            </div>
          </Link>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            5. "माझे आवडते दुकाने" (FAVORITE PINNED STORE CARD)
        ───────────────────────────────────────────────────────────── */}
        <div className="px-4 pt-3 pb-1">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-black text-sm text-[#0F1713] flex items-center gap-1.5">
              <Heart className="h-4 w-4 fill-[#EF4444] text-[#EF4444]" />
              <span>माझे आवडते दुकाने</span>
            </h3>
            <span className="text-xs font-bold text-[#0D7C4D] flex items-center gap-0.5 cursor-pointer">
              नेहमीची दुकाने <ChevronRight className="h-3.5 w-3.5" />
            </span>
          </div>

          <Link href="/bazar/store/fresh-mart">
            <div className="bg-[#FFFFFF] rounded-2xl p-3 border border-[#E5E9E6] shadow-2xs relative flex items-center justify-between gap-3 active:scale-[0.99] transition-all">
              <div className="flex items-center gap-3">
                {/* Store Thumbnail */}
                <div className="relative h-14 w-14 rounded-xl overflow-hidden bg-[#E8F5EE] shrink-0 border border-[#CDEBD8]">
                  <Image
                    src="https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=500&auto=format&fit=crop&q=80"
                    alt="Store"
                    fill
                    className="object-cover"
                  />
                  <div className="absolute bottom-1 left-1 bg-[#0D7C4D] text-white text-[9px] font-black px-1.5 py-0.2 rounded">
                    FM
                  </div>
                </div>

                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <h4 className="font-extrabold text-[13px] text-[#0F1713]">
                      फ्रेश मार्ट सुपरमार्केट
                    </h4>
                    <span className="text-[10px] font-bold text-[#10B981] flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#10B981]" />
                      उघडे आहे
                    </span>
                  </div>

                  <p className="text-[11px] text-[#525C56]">
                    एसटी स्टँडसमोर, पलूस • किराणा व धान्य
                  </p>

                  <div className="flex items-center gap-1 text-[11px] font-bold text-[#0D7C4D] pt-0.5">
                    <Bike className="h-3.5 w-3.5" />
                    <span>15–25 मिनिटात घरपोच</span>
                  </div>
                </div>
              </div>

              {/* Heart & Arrow */}
              <div className="flex flex-col items-end justify-between h-full py-1">
                <Heart className="h-3.5 w-3.5 fill-[#EF4444] text-[#EF4444]" />
                <ChevronRight className="h-4 w-4 text-[#8A948D] mt-3" />
              </div>
            </div>
          </Link>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            6. NEARBY VERIFIED STORES LIST
        ───────────────────────────────────────────────────────────── */}
        <main className="px-4 pt-4 space-y-3 flex-1">
          <div className="flex items-center justify-between">
            <h3 className="font-black text-sm text-[#0F1713] flex items-center gap-1.5">
              <Store className="h-4 w-4 text-[#0D7C4D]" />
              <span>आपल्या परिसरातील दुकाने (Nearby Stores)</span>
            </h3>
            <span className="text-xs font-semibold text-[#525C56]">
              {filteredStores.length} दुकाने उपलब्ध
            </span>
          </div>

          <div className="space-y-3">
            {filteredStores.map(store => (
              <div 
                key={store.id}
                className="bg-[#FFFFFF] rounded-2xl p-3.5 border border-[#E5E9E6] shadow-2xs space-y-3 group hover:border-[#0D7C4D]/40 transition-all"
              >
                {/* Store Top Row: Image + Title + Status + Rating */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="relative h-14 w-14 rounded-xl overflow-hidden bg-[#F2F4F3] shrink-0 border border-[#E5E9E6]">
                      <Image
                        src={store.imageUrl}
                        alt={store.name}
                        fill
                        className="object-cover"
                      />
                      <div className="absolute top-1 left-1 bg-[#0D7C4D] text-white text-[8px] font-black px-1 rounded">
                        {store.shortCode}
                      </div>
                    </div>

                    <div className="space-y-0.5">
                      <h4 className="font-extrabold text-[13px] text-[#0F1713]">
                        {store.nameMarathi}
                      </h4>
                      <p className="text-[11px] text-[#525C56] line-clamp-1">
                        {store.address}
                      </p>

                      <div className="flex items-center gap-2 pt-0.5">
                        <span className="text-[10px] font-bold text-[#10B981] flex items-center gap-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-[#10B981]" />
                          उघडे आहे
                        </span>
                        <span className="text-[10px] font-semibold text-[#8A948D] bg-[#F2F4F3] px-1.5 py-0.2 rounded border border-[#E5E9E6]">
                          {store.distanceKm} km
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Rating Tag */}
                  <div className="flex items-center gap-1 bg-[#F2F4F3] border border-[#E5E9E6] px-2 py-0.5 rounded-lg shrink-0">
                    <Star className="h-3 w-3 fill-[#0D7C4D] text-[#0D7C4D]" />
                    <span className="text-xs font-black text-[#0F1713]">{store.rating}</span>
                  </div>
                </div>

                {/* Bottom Row: Delivery Time + Min Order + 'दुकान पाहा' Button */}
                <div className="pt-2 border-t border-[#F2F4F3] flex items-center justify-between">
                  <div className="flex items-center gap-3 text-[11px] font-bold text-[#525C56]">
                    <span className="flex items-center gap-1 text-[#0D7C4D]">
                      <Bike className="h-3.5 w-3.5" />
                      {store.deliveryTimeMins}
                    </span>
                    <span>|</span>
                    <span className="flex items-center gap-1 text-[#525C56]">
                      <ShoppingBag className="h-3.5 w-3.5" />
                      किमान ₹{store.minOrder}
                    </span>
                  </div>

                  <Link href={`/bazar/store/${store.slug}`}>
                    <button className="h-8 px-3.5 rounded-xl bg-[#E8F5EE] text-[#0D7C4D] hover:bg-[#0D7C4D] hover:text-white font-extrabold text-xs flex items-center gap-1 transition-all active:scale-95">
                      <span>दुकान पाहा</span>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </main>

        {/* ─────────────────────────────────────────────────────────────
            7. NATIVE BOTTOM NAVIGATION BAR (Unified Brand Green)
        ───────────────────────────────────────────────────────────── */}
        <NativeAppBottomNav />

      </div>
    </div>
  );
}
