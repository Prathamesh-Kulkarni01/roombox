'use client';

import * as React from 'react';
import { useTheme } from 'next-themes';
import { Palette, Check, Sparkles, Moon, Sun, Smartphone } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

export interface BazarThemeOption {
  id: string;
  name: string;
  nameMarathi: string;
  brand: string;
  hex: string;
  bgPreview: string;
  accentClass: string;
}

export const BAZAR_SHOP_THEMES: BazarThemeOption[] = [
  {
    id: 'violet',
    name: 'Zepto Violet',
    nameMarathi: 'झेप्टो व्हायोलेट',
    brand: '⚡ Quick-Commerce 10-Min Fast',
    hex: '#7B2CBF',
    bgPreview: 'from-[#5800FF] via-[#7B2CBF] to-[#E11D48]',
    accentClass: 'bg-purple-600 text-white',
  },
  {
    id: 'green',
    name: 'Blinkit Emerald',
    nameMarathi: 'ब्लिंकिट हिरवा',
    brand: '🌿 Fresh Produce & Kirana',
    hex: '#10B981',
    bgPreview: 'from-emerald-700 via-emerald-600 to-teal-700',
    accentClass: 'bg-emerald-600 text-white',
  },
  {
    id: 'saffron',
    name: 'Swiggy Saffron',
    nameMarathi: 'स्विगी केशरी',
    brand: '🍲 Bakery, Snacks & Food',
    hex: '#FF8C00',
    bgPreview: 'from-amber-600 via-orange-500 to-red-500',
    accentClass: 'bg-orange-500 text-white',
  },
  {
    id: 'rose',
    name: 'RentSutra Rose',
    nameMarathi: 'रेंटसूत्र रोझ',
    brand: '🌸 Modern Daily Living',
    hex: '#F43F5E',
    bgPreview: 'from-rose-600 via-pink-600 to-purple-600',
    accentClass: 'bg-rose-500 text-white',
  },
  {
    id: 'blue',
    name: 'Ocean Coastal',
    nameMarathi: 'निळा महासागर',
    brand: '💧 Dairy, Water & Beverages',
    hex: '#0070F3',
    bgPreview: 'from-blue-600 via-cyan-600 to-teal-500',
    accentClass: 'bg-blue-600 text-white',
  },
  {
    id: 'dark',
    name: 'Midnight Dark',
    nameMarathi: 'नाईट मोड',
    brand: '🌙 Dark Mode AMOLED Saver',
    hex: '#18181B',
    bgPreview: 'from-zinc-900 via-zinc-950 to-black',
    accentClass: 'bg-zinc-800 text-white',
  },
];

interface BazarThemePickerButtonProps {
  language?: 'mr' | 'en';
}

export function BazarThemePickerButton({ language = 'mr' }: BazarThemePickerButtonProps) {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const currentThemeConfig = BAZAR_SHOP_THEMES.find((t) => t.id === theme) || BAZAR_SHOP_THEMES[0];

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          className="h-8 w-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-all active:scale-95 border border-slate-200 shadow-2xs relative"
          aria-label="Change app theme"
          title="Shopping Theme Palette"
        >
          <Palette className="h-4 w-4" />
          <span 
            className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white"
            style={{ backgroundColor: currentThemeConfig.hex }}
          />
        </button>
      </SheetTrigger>

      <SheetContent
        side="bottom"
        className="rounded-t-[28px] max-h-[85vh] p-5 bg-white max-w-[430px] mx-auto border-t border-slate-200"
      >
        <SheetHeader className="text-left pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center">
              <Palette className="h-4 w-4" />
            </div>
            <div>
              <SheetTitle className="text-base font-bold text-slate-900">
                {language === 'mr' ? 'अ‍ॅप थीम निवडा' : 'Choose Shopping Theme'}
              </SheetTitle>
              <SheetDescription className="text-xs text-slate-500">
                {language === 'mr'
                  ? 'तुमच्या आवडीची थीम (झेप्टो, ब्लिंकिट, स्विगी किंवा रोझ) निवडा'
                  : 'Customize your shopping experience with Zepto, Blinkit or Swiggy styles'}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="space-y-3 pt-4 overflow-y-auto max-h-[60vh]">
          {BAZAR_SHOP_THEMES.map((item) => {
            const isSelected = theme === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setTheme(item.id);
                  setOpen(false);
                }}
                className={`w-full p-3 rounded-2xl border text-left flex items-center justify-between transition-all active:scale-[0.99] ${
                  isSelected
                    ? 'border-purple-600 bg-purple-50/40 shadow-xs ring-2 ring-purple-600/20'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`h-10 w-10 rounded-xl bg-gradient-to-br ${item.bgPreview} shadow-xs flex items-center justify-center text-white shrink-0 border border-white/20`}
                  >
                    {item.id === 'dark' ? <Moon className="h-5 w-5" /> : <Sparkles className="h-4 w-4" />}
                  </div>

                  <div>
                    <div className="flex items-center gap-1.5">
                      <h4 className="font-extrabold text-xs text-slate-900">
                        {language === 'mr' ? item.nameMarathi : item.name}
                      </h4>
                      {isSelected && (
                        <span className="text-[9px] font-black uppercase tracking-wider text-purple-700 bg-purple-100 px-1.5 py-0.2 rounded">
                          ACTIVE
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 font-medium">
                      {item.brand}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div
                    className="h-5 w-5 rounded-full border border-slate-200 shadow-2xs"
                    style={{ backgroundColor: item.hex }}
                  />
                  {isSelected && (
                    <div className="h-6 w-6 rounded-full bg-purple-700 text-white flex items-center justify-center">
                      <Check className="h-3.5 w-3.5 stroke-[3]" />
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
}
