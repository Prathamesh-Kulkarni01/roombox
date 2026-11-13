'use client';

import { STORE_CATEGORIES } from '../data/groceryCatalog';
import { 
  Sparkles, 
  Carrot, 
  Milk, 
  Cookie, 
  Coffee, 
  Wheat, 
  Smile, 
  Home, 
  Snowflake 
} from 'lucide-react';

interface StoreCategoryNavProps {
  activeCategory: string;
  onSelectCategory: (id: string) => void;
}

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  Sparkles,
  Carrot,
  Milk,
  Cookie,
  Coffee,
  Wheat,
  Smile,
  Home,
  Snowflake,
};

export function StoreCategoryNav({
  activeCategory,
  onSelectCategory,
}: StoreCategoryNavProps) {
  return (
    <div className="sticky top-[125px] z-20 bg-[#FFFFFF] py-2 border-b border-[#ECEFEC]/80">
      <div className="flex gap-2 px-3.5 overflow-x-auto no-scrollbar scroll-smooth">
        {STORE_CATEGORIES.map((cat: any) => {
          const isSelected = activeCategory === cat.id;
          const Icon = CATEGORY_ICONS[cat.iconName || cat.iconUrl] || Sparkles;

          return (
            <button
              key={cat.id}
              onClick={() => onSelectCategory(cat.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-all active:scale-95 ${
                isSelected
                  ? 'bg-[#16834A] text-white shadow-xs'
                  : 'bg-[#F6F7F5] text-[#777F79] hover:bg-[#ECEFEC] hover:text-[#171A18]'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

