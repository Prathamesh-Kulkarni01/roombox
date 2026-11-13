'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { 
  ArrowLeft, 
  Search, 
  X, 
  Mic, 
  Store, 
  Bike, 
  Star, 
  ChevronRight, 
  Clock, 
  Plus, 
  Minus,
  PackageSearch
} from 'lucide-react';
import { GroceryCartProvider, useGroceryCart } from '@/modules/bazar/context/GroceryCartContext';
import { BAZAR_PRODUCT_CATALOG, type GroceryProduct } from '@/modules/bazar/data/groceryCatalog';
import { GroceryProductCard } from '@/modules/bazar/components/GroceryProductCard';
import { NativeFloatingCartBar } from '@/modules/bazar/components/NativeFloatingCartBar';
import { ProductDetailsSheet } from '@/modules/bazar/components/ProductDetailsSheet';

interface StoreResult {
  id: string;
  name: string;
  nameMarathi: string;
  slug: string;
  address: string;
  category: string;
  rating: number;
  deliveryTimeMins: string;
  imageUrl: string;
  shortCode: string;
}

const DEMO_STORES: StoreResult[] = [
  {
    id: 'store_1',
    name: 'Fresh Mart Supermarket',
    nameMarathi: 'फ्रेश मार्ट सुपरमार्केट',
    slug: 'fresh-mart',
    address: 'एसटी स्टँडसमोर, मेन रोड, पलूस',
    category: 'किराणा, फळे व भाजीपाला',
    rating: 4.8,
    deliveryTimeMins: '15–25 min',
    imageUrl: 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=500&auto=format&fit=crop&q=80',
    shortCode: 'FM'
  },
  {
    id: 'store_2',
    name: 'Shree Mahalaxmi Super Bazar',
    nameMarathi: 'श्री महालक्ष्मी सुपर बाजार',
    slug: 'shree-super-bazar',
    address: 'पटेल स्टँडसमोर, पलूस',
    category: 'किराणा व धान्य',
    rating: 4.8,
    deliveryTimeMins: '25–35 min',
    imageUrl: 'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=500&auto=format&fit=crop&q=80',
    shortCode: 'श्री'
  },
  {
    id: 'store_3',
    name: 'Ganesh Dairy & Bakery',
    nameMarathi: 'गणेश डेअरी आणि बेकरी',
    slug: 'ganesh-dairy-palus',
    address: 'शिवाजी चौक, पलूस',
    category: 'दूध, डेअरी, बेकरी',
    rating: 4.9,
    deliveryTimeMins: '15–20 min',
    imageUrl: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=500&auto=format&fit=crop&q=80',
    shortCode: 'गणेश'
  }
];

function SearchContent() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('milk');
  const [activeTab, setActiveTab] = useState<'products' | 'stores'>('products');
  const [selectedProduct, setSelectedProduct] = useState<GroceryProduct | null>(null);

  const { totalItems } = useGroceryCart();

  // Search filter for products
  const matchingProducts = useMemo(() => {
    if (!searchQuery.trim()) return BAZAR_PRODUCT_CATALOG;
    const q = searchQuery.toLowerCase().trim();
    return BAZAR_PRODUCT_CATALOG.filter(p => 
      p.name.toLowerCase().includes(q) ||
      p.brand.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  // Search filter for stores
  const matchingStores = useMemo(() => {
    if (!searchQuery.trim()) return DEMO_STORES;
    const q = searchQuery.toLowerCase().trim();
    return DEMO_STORES.filter(s => 
      s.name.toLowerCase().includes(q) ||
      s.nameMarathi.includes(q) ||
      s.category.includes(q)
    );
  }, [searchQuery]);

  return (
    <div className="w-full min-h-screen bg-[#F8FAF9] text-[#0F1713] flex justify-center pb-20 selection:bg-[#0D7C4D]/20">
      {/* Mobile-First Screen Shell (430px max width on desktop) */}
      <div className="w-full max-w-[430px] bg-[#FFFFFF] min-h-screen shadow-md flex flex-col relative border-x border-[#E5E9E6]">
        
        {/* ─────────────────────────────────────────────────────────────
            1. TOP APP SEARCH BAR (Matches Row 2, Screen 3)
        ───────────────────────────────────────────────────────────── */}
        <header className="sticky top-0 z-30 bg-[#FFFFFF] border-b border-[#E5E9E6] px-3.5 pt-3 pb-2.5 space-y-2.5">
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.back()}
              className="h-8 w-8 rounded-full flex items-center justify-center hover:bg-[#F2F4F3] active:scale-90 transition-all text-[#0F1713]"
              aria-label="Back"
            >
              <ArrowLeft className="h-5 w-5 stroke-[2.2]" />
            </button>

            {/* Input with live clear button */}
            <div className="relative flex-1 flex items-center">
              <Search className="absolute left-3.5 h-4 w-4 text-[#8A948D]" />
              <input
                type="text"
                autoFocus
                placeholder="Search products or stores..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-10 pl-10 pr-9 rounded-xl bg-[#F2F4F3] text-xs text-[#0F1713] placeholder:text-[#8A948D] font-medium border-transparent focus:bg-[#FFFFFF] focus:border-[#0D7C4D] focus:outline-hidden transition-all"
              />
              {searchQuery ? (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 text-[#8A948D] hover:text-[#0F1713]"
                >
                  <X className="h-4 w-4" />
                </button>
              ) : (
                <Mic className="absolute right-3.5 h-4 w-4 text-[#8A948D]" />
              )}
            </div>

            <button
              onClick={() => router.back()}
              className="text-xs font-bold text-[#0D7C4D] px-1 hover:underline"
            >
              Cancel
            </button>
          </div>

          {/* ─────────────────────────────────────────────────────────────
              2. SEARCH RESULT TABS: [Products] vs [Stores]
          ───────────────────────────────────────────────────────────── */}
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={() => setActiveTab('products')}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all active:scale-95 ${
                activeTab === 'products'
                  ? 'bg-[#0D7C4D] text-white shadow-2xs'
                  : 'bg-[#F2F4F3] text-[#525C56] hover:bg-[#E5E9E6]'
              }`}
            >
              Products ({matchingProducts.length})
            </button>

            <button
              onClick={() => setActiveTab('stores')}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all active:scale-95 ${
                activeTab === 'stores'
                  ? 'bg-[#0D7C4D] text-white shadow-2xs'
                  : 'bg-[#F2F4F3] text-[#525C56] hover:bg-[#E5E9E6]'
              }`}
            >
              Stores ({matchingStores.length})
            </button>
          </div>
        </header>

        {/* ─────────────────────────────────────────────────────────────
            3. SEARCH RESULTS LIST
        ───────────────────────────────────────────────────────────── */}
        <main className="p-3.5 flex-1 space-y-3">
          {activeTab === 'products' ? (
            /* Products 2-Column Grid */
            matchingProducts.length === 0 ? (
              <div className="py-20 text-center space-y-2">
                <PackageSearch className="h-10 w-10 mx-auto text-[#8A948D]" />
                <p className="font-bold text-sm text-[#0F1713]">No matching products</p>
                <p className="text-xs text-[#8A948D]">Try searching for Milk, Butter, Oil or Eggs</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2.5">
                {matchingProducts.map(product => (
                  <GroceryProductCard
                    key={product.id}
                    product={product}
                    onOpenDetails={(p) => setSelectedProduct(p)}
                  />
                ))}
              </div>
            )
          ) : (
            /* Stores List */
            matchingStores.length === 0 ? (
              <div className="py-20 text-center space-y-2">
                <Store className="h-10 w-10 mx-auto text-[#8A948D]" />
                <p className="font-bold text-sm text-[#0F1713]">No stores found</p>
                <p className="text-xs text-[#8A948D]">Try searching for Fresh Mart or Super Bazar</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {matchingStores.map(store => (
                  <Link key={store.id} href={`/bazar/store/${store.slug}`}>
                    <div className="bg-[#FFFFFF] rounded-2xl p-3 border border-[#E5E9E6] shadow-2xs hover:border-[#0D7C4D]/40 transition-all flex items-center justify-between gap-3 active:scale-[0.99]">
                      <div className="flex items-center gap-3">
                        <div className="relative h-12 w-12 rounded-xl bg-[#F2F4F3] border border-[#E5E9E6] overflow-hidden shrink-0">
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

                        <div>
                          <h4 className="font-extrabold text-xs text-[#0F1713]">
                            {store.nameMarathi}
                          </h4>
                          <p className="text-[11px] text-[#525C56] line-clamp-1 mt-0.5">
                            {store.category}
                          </p>
                          <div className="flex items-center gap-2 pt-0.5 text-[10px] text-[#8A948D]">
                            <span className="flex items-center gap-0.5 text-[#0D7C4D] font-bold">
                              <Bike className="h-3 w-3" />
                              {store.deliveryTimeMins}
                            </span>
                            <span>·</span>
                            <span>★ {store.rating}</span>
                          </div>
                        </div>
                      </div>

                      <ChevronRight className="h-4 w-4 text-[#8A948D] shrink-0" />
                    </div>
                  </Link>
                ))}
              </div>
            )
          )}
        </main>

        {/* ─────────────────────────────────────────────────────────────
            4. FLOATING CART BAR & DETAILS SHEET
        ───────────────────────────────────────────────────────────── */}
        <NativeFloatingCartBar onOpenCart={() => router.push('/bazar/checkout')} />

        <ProductDetailsSheet
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
        />

      </div>
    </div>
  );
}

export default function BazarSearchPage() {
  return <SearchContent />;
}

