'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { 
  Search, 
  X, 
  TrendingUp, 
  Clock, 
  Store, 
  ArrowRight,
  Sparkles,
  ShoppingBag
} from 'lucide-react';
import { BAZAR_PRODUCT_CATALOG } from '../data/groceryCatalog';
import { BAZAR_TOWN_STORES } from '../data/storeDirectory';

interface BazarSearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  language?: 'mr' | 'en';
}

const POPULAR_SEARCH_TERMS = [
  { term: 'दूध (Milk)', en: 'milk' },
  { term: 'साखर (Sugar)', en: 'sugar' },
  { term: 'तेल (Cooking Oil)', en: 'oil' },
  { term: 'आटा (Chakki Atta)', en: 'atta' },
  { term: 'अंडी (Eggs)', en: 'eggs' },
  { term: 'बटाटे (Potatoes)', en: 'potato' },
  { term: 'तूप (Pure Ghee)', en: 'ghee' },
  { term: 'बिस्किटे (Biscuits)', en: 'biscuit' },
];

export function BazarSearchOverlay({ isOpen, onClose, language = 'mr' }: BazarSearchOverlayProps) {
  const [query, setQuery] = useState('');

  // Live matching products
  const matchingProducts = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase().trim();
    return BAZAR_PRODUCT_CATALOG.filter((p) => {
      return (
        p.name.toLowerCase().includes(q) ||
        (p.descriptionMarathi && p.descriptionMarathi.includes(q)) ||
        p.category.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q)
      );
    }).slice(0, 8);
  }, [query]);

  // Live matching stores
  const matchingStores = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase().trim();
    return BAZAR_TOWN_STORES.filter((s) => {
      return (
        s.name.toLowerCase().includes(q) ||
        s.nameMarathi.includes(q) ||
        s.category.toLowerCase().includes(q) ||
        s.categoryMarathi.includes(q)
      );
    }).slice(0, 3);
  }, [query]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col max-w-[430px] mx-auto overflow-hidden animate-in fade-in duration-200">
      {/* Top Search Input Bar */}
      <div className="p-3 border-b border-slate-200 flex items-center gap-2 bg-white">
        <div className="relative flex-1 flex items-center">
          <Search className="absolute left-3.5 h-4 w-4 text-emerald-600" />
          <input
            type="text"
            autoFocus
            placeholder={language === 'mr' ? 'वस्तू, किराणा किंवा दुकान शोधा (उदा. दूध, तेल, तांदूळ)...' : 'Search groceries, daily needs, or shops...'}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full h-11 pl-10 pr-9 rounded-2xl bg-slate-100 border-none text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:bg-slate-50 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-3 p-1 rounded-full text-slate-400 hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <button
          onClick={onClose}
          className="text-xs font-bold text-slate-600 hover:text-slate-900 px-2 py-1"
        >
          {language === 'mr' ? 'रद्द' : 'Cancel'}
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* If no query, show popular & recent */}
        {!query.trim() && (
          <>
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5">
                <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
                <span>{language === 'mr' ? 'नेहमी शोधल्या जाणाऱ्या वस्तू (Trending)' : 'Popular Searches'}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {POPULAR_SEARCH_TERMS.map((item) => (
                  <button
                    key={item.en}
                    onClick={() => setQuery(item.en)}
                    className="text-xs px-3 py-1.5 rounded-full bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 border border-transparent font-medium text-slate-700 transition-all active:scale-95 flex items-center gap-1"
                  >
                    <span>{item.term}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Town Stores Highlight */}
            <div className="pt-2">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5">
                {language === 'mr' ? 'परिसरातील लोकप्रिय दुकाने (Nearby Shops)' : 'Nearby Popular Stores'}
              </h4>
              <div className="space-y-2">
                {BAZAR_TOWN_STORES.slice(0, 3).map((st) => (
                  <Link
                    key={st.id}
                    href={`/bazar/store/${st.slug}`}
                    onClick={onClose}
                    className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 hover:border-emerald-200 hover:bg-emerald-50/40 transition-all"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="h-9 w-9 rounded-lg bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center shrink-0">
                        {st.shortCode}
                      </div>
                      <div>
                        <p className="font-bold text-xs text-slate-900">{st.nameMarathi}</p>
                        <p className="text-[10px] text-slate-500">{st.categoryMarathi} · {st.deliveryTimeMins}</p>
                      </div>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
                  </Link>
                ))}
              </div>
            </div>
          </>
        )}

        {/* If query has matches */}
        {query.trim() && (
          <div className="space-y-4">
            {/* Matching Stores */}
            {matchingStores.length > 0 && (
              <div>
                <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                  दुकाने (Matching Stores)
                </h4>
                <div className="space-y-2">
                  {matchingStores.map((st) => (
                    <Link
                      key={st.id}
                      href={`/bazar/store/${st.slug}`}
                      onClick={onClose}
                      className="flex items-center justify-between p-2.5 rounded-2xl bg-emerald-50/60 border border-emerald-200"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="h-10 w-10 rounded-xl bg-emerald-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                          {st.shortCode}
                        </div>
                        <div>
                          <p className="font-bold text-xs text-slate-900">{st.nameMarathi}</p>
                          <p className="text-[10px] text-emerald-700 font-medium">
                            {st.categoryMarathi} · {st.deliveryTimeMins}
                          </p>
                        </div>
                      </div>
                      <span className="text-[11px] font-bold text-emerald-700 bg-white px-2.5 py-1 rounded-xl border border-emerald-200 shadow-2xs">
                        दुकान उघडा
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Matching Products */}
            <div>
              <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                वस्तू (Matching Products - {matchingProducts.length})
              </h4>
              {matchingProducts.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <ShoppingBag className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                  <p className="text-xs font-semibold text-slate-600">कोणतीही वस्तू सापडली नाही</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">वेगळे नाव किंवा इंग्रजीत टाईप करून बघा (उदा. Milk, Atta)</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {matchingProducts.map((prod) => (
                    <Link
                      key={prod.id}
                      href={`/bazar/store/fresh-mart`}
                      onClick={onClose}
                      className="py-2.5 flex items-center justify-between hover:bg-slate-50 px-1 rounded-xl transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="relative h-11 w-11 rounded-lg overflow-hidden bg-slate-100 shrink-0 border border-slate-200">
                          <Image
                            src={prod.imageUrl}
                            alt={prod.name}
                            fill
                            className="object-cover"
                          />
                        </div>
                        <div>
                          <p className="font-bold text-xs text-slate-900">{prod.name}</p>
                          <p className="text-[10px] text-slate-500 font-medium">{prod.unit} · {prod.brand}</p>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="font-extrabold text-xs text-slate-900">₹{prod.price}</span>
                        {prod.discountPercent > 0 && (
                          <p className="text-[9px] font-bold text-emerald-600">
                            {prod.discountPercent}% OFF
                          </p>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

