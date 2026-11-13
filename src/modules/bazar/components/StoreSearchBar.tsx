'use client';

import { useState } from 'react';
import { Search, X, Clock, TrendingUp } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface StoreSearchBarProps {
  storeName: string;
  value: string;
  onChange: (val: string) => void;
  onSelectSuggestion?: (query: string) => void;
}

export function StoreSearchBar({
  storeName,
  value,
  onChange,
  onSelectSuggestion,
}: StoreSearchBarProps) {
  const [isFocused, setIsFocused] = useState(false);

  const trendingQueries = ['Amul Milk', 'Atta 5kg', 'Fortune Oil', 'Maggi', 'Tomatoes', 'Chips'];
  const recentQueries = ['Butter', 'Bread', 'Onion'];

  const handleSuggestionClick = (query: string) => {
    onChange(query);
    if (onSelectSuggestion) onSelectSuggestion(query);
    setIsFocused(false);
  };

  return (
    <div className="sticky top-[73px] z-30 bg-[#FFFFFF] px-3.5 py-2 border-b border-[#ECEFEC]/60">
      <div className="relative">
        <Search className="absolute left-3.5 top-3 h-4 w-4 text-[#777F79]" />
        <Input
          type="text"
          placeholder={`Search in ${storeName}...`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          className="h-10 pl-9 pr-8 bg-[#F6F7F5] border-transparent text-xs text-[#171A18] placeholder:text-[#777F79] rounded-xl focus-visible:bg-[#FFFFFF] focus-visible:border-[#16834A] focus-visible:ring-1 focus-visible:ring-[#16834A] transition-all"
        />
        {value && (
          <button
            onClick={() => onChange('')}
            className="absolute right-2.5 top-2.5 h-5 w-5 rounded-full bg-[#777F79]/20 text-[#171A18] flex items-center justify-center hover:bg-[#777F79]/30 transition-colors"
            aria-label="Clear search"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>

      {/* Instant Suggestions Dropdown on Focus */}
      {isFocused && !value && (
        <div className="mt-2 p-3 bg-[#FFFFFF] rounded-2xl border border-[#ECEFEC] shadow-lg space-y-3">
          {/* Recent Searches */}
          <div>
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#777F79] mb-1.5">
              <Clock className="h-3 w-3" />
              <span>Recent Searches</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {recentQueries.map((q, idx) => (
                <button
                  key={idx}
                  onMouseDown={() => handleSuggestionClick(q)}
                  className="px-2.5 py-1 rounded-lg bg-[#F6F7F5] text-[#171A18] text-xs font-medium hover:bg-[#ECEFEC] transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          {/* Trending Searches */}
          <div>
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#16834A] mb-1.5">
              <TrendingUp className="h-3 w-3" />
              <span>Trending in Fresh Mart</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {trendingQueries.map((q, idx) => (
                <button
                  key={idx}
                  onMouseDown={() => handleSuggestionClick(q)}
                  className="px-2.5 py-1 rounded-lg bg-[#16834A]/10 text-[#16834A] text-xs font-semibold hover:bg-[#16834A]/20 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

