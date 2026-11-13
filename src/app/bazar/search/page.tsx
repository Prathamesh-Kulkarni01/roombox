'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { 
  ArrowLeft, 
  Search, 
  X, 
  Store, 
  Bike, 
  ChevronRight, 
  PackageSearch
} from 'lucide-react';
import { useGroceryCart } from '@/modules/bazar/context/GroceryCartContext';
import { BAZAR_PRODUCT_CATALOG, type GroceryProduct } from '@/modules/bazar/data/groceryCatalog';
import { BAZAR_TOWN_STORES, type BazarTownStore } from '@/modules/bazar/data/storeDirectory';
import { GroceryProductCard } from '@/modules/bazar/components/GroceryProductCard';
import { NativeFloatingCartBar } from '@/modules/bazar/components/NativeFloatingCartBar';
import { ProductDetailsSheet } from '@/modules/bazar/components/ProductDetailsSheet';

function SearchContent() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'products' | 'stores'>('products');
  const [selectedProduct, setSelectedProduct] = useState<GroceryProduct | null>(null);

  // Search filter for products
  const matchingProducts = useMemo(() => {
    if (!searchQuery.trim()) return BAZAR_PRODUCT_CATALOG;
    const q = searchQuery.toLowerCase().trim();
    return BAZAR_PRODUCT_CATALOG.filter(p => 
      p.name.toLowerCase().includes(q) ||
      (p.nameMarathi && p.nameMarathi.includes(q)) ||
      p.brand.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  // Search filter for stores
  const matchingStores = useMemo(() => {
    if (!searchQuery.trim()) return BAZAR_TOWN_STORES;
    const q = searchQuery.toLowerCase().trim();
    return BAZAR_TOWN_STORES.filter(s => 
      s.name.toLowerCase().includes(q) ||
      (s.nameMarathi && s.nameMarathi.includes(q)) ||
      s.category.toLowerCase().includes(q) ||
      (s.categoryMarathi && s.categoryMarathi.includes(q)) ||
      (s.address && s.address.toLowerCase().includes(q))
    );
  }, [searchQuery]);

  return (
    <div className="w-full min-h-screen bg-background text-foreground flex justify-center pb-20">
      {/* Mobile-First Screen Shell (430px max width on desktop) */}
      <div className="w-full max-w-[430px] bg-card min-h-screen shadow-md flex flex-col relative border-x border-border">
        
        {/* ─────────────────────────────────────────────────────────────
            1. TOP APP SEARCH BAR
        ───────────────────────────────────────────────────────────── */}
        <header className="sticky top-0 z-30 bg-card/95 backdrop-blur-md border-b border-border px-3.5 pt-3 pb-2.5 space-y-2.5">
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.back()}
              className="h-8 w-8 rounded-full flex items-center justify-center hover:bg-muted active:scale-90 transition-all text-foreground"
              aria-label="Back"
            >
              <ArrowLeft className="h-5 w-5 stroke-[2.2]" />
            </button>

            {/* Input with live clear button */}
            <div className="relative flex-1 flex items-center">
              <Search className="absolute left-3.5 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                autoFocus
                placeholder="उदा. Milk, Kanda, Butter किंवा Store नाव..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-10 pl-10 pr-9 rounded-xl bg-muted text-xs text-foreground placeholder:text-muted-foreground font-medium border-transparent focus:bg-background focus:border-primary focus:outline-hidden transition-all"
              />
              {searchQuery ? (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              ) : null}
            </div>
          </div>

          {/* Tab Selector: Products vs Stores */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('products')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'products'
                  ? 'bg-primary text-primary-foreground shadow-2xs'
                  : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              वस्तू (Products) ({matchingProducts.length})
            </button>

            <button
              onClick={() => setActiveTab('stores')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'stores'
                  ? 'bg-primary text-primary-foreground shadow-2xs'
                  : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              दुकाने (Stores) ({matchingStores.length})
            </button>
          </div>
        </header>

        {/* ─────────────────────────────────────────────────────────────
            2. SEARCH RESULTS LIST
        ───────────────────────────────────────────────────────────── */}
        <main className="px-3.5 pt-3.5 flex-1">
          {activeTab === 'products' ? (
            matchingProducts.length === 0 ? (
              <div className="py-20 text-center space-y-2">
                <PackageSearch className="h-10 w-10 mx-auto text-muted-foreground/60" />
                <p className="font-bold text-sm text-foreground">कोणतीही वस्तू आढळली नाही</p>
                <p className="text-xs text-muted-foreground">दूध, तेल, अंडी, किंवा ताजी भाजीपाला शोधून पहा</p>
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
            matchingStores.length === 0 ? (
              <div className="py-20 text-center space-y-2">
                <Store className="h-10 w-10 mx-auto text-muted-foreground/60" />
                <p className="font-bold text-sm text-foreground">कोणतेही दुकान आढळले नाही</p>
                <p className="text-xs text-muted-foreground">Fresh Mart, सुपर बाजार किंवा इतर दुकान नाव शोधून पहा</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {matchingStores.map(store => (
                  <Link key={store.id} href={`/bazar/store/${store.slug}`}>
                    <div className="bg-card rounded-2xl p-3 border border-border shadow-2xs hover:border-primary/40 transition-all flex items-center justify-between gap-3 active:scale-[0.99]">
                      <div className="flex items-center gap-3">
                        <div className="relative h-12 w-12 rounded-xl bg-muted border border-border overflow-hidden shrink-0">
                          <Image
                            src={store.imageUrl}
                            alt={store.name}
                            fill
                            className="object-cover"
                          />
                          <div className="absolute top-1 left-1 bg-primary text-primary-foreground text-[8px] font-black px-1 rounded">
                            {store.shortCode}
                          </div>
                        </div>

                        <div>
                          <h4 className="font-extrabold text-xs text-foreground">
                            {store.nameMarathi || store.name}
                          </h4>
                          <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                            {store.categoryMarathi || store.category}
                          </p>
                          <div className="flex items-center gap-2 pt-0.5 text-[10px] text-muted-foreground">
                            <span className="flex items-center gap-0.5 text-primary font-bold">
                              <Bike className="h-3 w-3" />
                              {store.deliveryTimeMins}
                            </span>
                            <span>·</span>
                            <span>★ {store.rating}</span>
                          </div>
                        </div>
                      </div>

                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    </div>
                  </Link>
                ))}
              </div>
            )
          )}
        </main>

        {/* ─────────────────────────────────────────────────────────────
            3. FLOATING CART BAR & DETAILS SHEET
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
