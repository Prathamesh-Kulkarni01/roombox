
'use client';

import * as React from 'react';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';
import { Sun, Moon, Monitor, Check } from 'lucide-react';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

const themes = [
  { id: 'light', name: 'Light', icon: Sun, color: 'bg-white border-border' },
  { id: 'dark', name: 'Dark', icon: Moon, color: 'bg-zinc-950 border-zinc-800' },
  { id: 'system', name: 'System', icon: Monitor, color: 'bg-gradient-to-br from-white to-zinc-950 border-border' },
  { id: 'saffron', name: 'Saffron', color: 'bg-[#F4C430]' },
  { id: 'orange', name: 'Orange', color: 'bg-[#FF8C00]' },
  { id: 'tomato', name: 'Tomato', color: 'bg-[#FF6347]' },
  { id: 'blue', name: 'Blue', color: 'bg-[#0070f3]' },
  { id: 'green', name: 'Green', color: 'bg-[#10b981]' },
  { id: 'lime', name: 'Lime', color: 'bg-[#84cc16]' },
  { id: 'violet', name: 'Violet', color: 'bg-[#8b5cf6]' },
  { id: 'rose', name: 'Rose', color: 'bg-[#f43f5e]' },
];

export function ThemePicker() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide px-1">
        {themes.map((t) => (
          <button
            key={t.id}
            onClick={() => setTheme(t.id)}
            className={cn(
              "relative flex-shrink-0 group flex flex-col items-center gap-1.5 transition-all active:scale-95",
            )}
          >
            <div className={cn(
              "w-12 h-12 rounded-2xl border-2 flex items-center justify-center shadow-sm transition-all",
              t.color,
              theme === t.id ? "border-primary scale-110 shadow-lg shadow-primary/20" : "border-transparent opacity-80"
            )}>
              {t.icon ? (
                <t.icon className={cn(
                  "h-5 w-5",
                  t.id === 'light' ? "text-zinc-950" : "text-white"
                )} />
              ) : (
                theme === t.id && <Check className="h-5 w-5 text-white drop-shadow-md" />
              )}
            </div>
            <span className={cn(
              "text-[10px] font-bold uppercase tracking-tight transition-colors",
              theme === t.id ? "text-primary" : "text-muted-foreground"
            )}>
              {t.name || t.id}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
