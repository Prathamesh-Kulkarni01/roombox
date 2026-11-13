'use client';

import { useState } from 'react';
import { MapPin, ChevronDown, Check, Sparkles } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';

export interface LocationInfo {
  town: string;
  area: string;
  pincode: string;
}

const AVAILABLE_TOWNS = [
  {
    town: 'Palus',
    townMarathi: 'पलूस',
    areas: ['Shivaji Chowk (Main Market)', 'ST Stand Road', 'Patel Stand', 'Bhilawadi Road'],
    estDeliveryTime: '15–25 mins',
  },
  {
    town: 'Tasgaon',
    townMarathi: 'तासगाव',
    areas: ['Ganapati Mandir Chowk', 'Bus Stand', 'College Road'],
    estDeliveryTime: '20–30 mins',
  },
  {
    town: 'Islampur',
    townMarathi: 'इस्लामपूर',
    areas: ['Gandhi Chowk', 'Peth Naka', 'Kacheri Road'],
    estDeliveryTime: '25–35 mins',
  },
  {
    town: 'Sangli',
    townMarathi: 'सांगली',
    areas: ['Harbhat Road Market', 'Vishrambag', 'ST Colony'],
    estDeliveryTime: '30–45 mins',
  },
];

interface BazarLocationHeaderProps {
  currentTown?: string;
  onSelectTown?: (town: string, area: string) => void;
  language?: 'mr' | 'en';
}

export function BazarLocationHeader({
  currentTown = 'Palus',
  onSelectTown,
  language = 'mr',
}: BazarLocationHeaderProps) {
  const [open, setOpen] = useState(false);
  const [selectedTown, setSelectedTown] = useState(currentTown);
  const [selectedArea, setSelectedArea] = useState('Shivaji Chowk');

  const activeTownConfig =
    AVAILABLE_TOWNS.find((t) => t.town.toLowerCase() === selectedTown.toLowerCase()) ||
    AVAILABLE_TOWNS[0];

  const handleAreaPick = (town: string, area: string) => {
    setSelectedTown(town);
    setSelectedArea(area);
    if (typeof window !== 'undefined') {
      localStorage.setItem('bazar_selected_town', town);
      localStorage.setItem('bazar_selected_area', area);
    }
    if (onSelectTown) onSelectTown(town, area);
    setOpen(false);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          className="flex items-center gap-2 text-left group p-1 -ml-1 rounded-xl hover:bg-slate-50 active:scale-[0.98] transition-all"
          aria-label="Change delivery location"
        >
          {/* Green Map Pin Badge with Pulse */}
          <div className="h-9 w-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs shadow-emerald-600/30">
            <MapPin className="h-5 w-5 fill-white stroke-emerald-600" />
          </div>

          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                {language === 'mr' ? 'घरपोच डिलिव्हरी' : 'Delivery In'} {activeTownConfig.estDeliveryTime}
              </span>
            </div>

            <div className="flex items-center gap-1 pt-0.5">
              <span className="font-extrabold text-[13px] text-slate-900 leading-tight group-hover:text-emerald-700 transition-colors">
                {language === 'mr' ? activeTownConfig.townMarathi : activeTownConfig.town} ·{' '}
                <span className="font-normal text-slate-500 text-xs">{selectedArea}</span>
              </span>
              <ChevronDown className="h-3.5 w-3.5 text-slate-400 group-hover:text-emerald-700 transition-colors shrink-0" />
            </div>
          </div>
        </button>
      </SheetTrigger>

      <SheetContent
        side="bottom"
        className="rounded-t-[28px] max-h-[85vh] p-5 bg-white max-w-[430px] mx-auto border-t border-slate-200"
      >
        <SheetHeader className="text-left pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <MapPin className="h-4 w-4 fill-emerald-600" />
            </div>
            <div>
              <SheetTitle className="text-base font-bold text-slate-900">
                {language === 'mr' ? 'डिलिव्हरी परिसर निवडा' : 'Select Delivery Location'}
              </SheetTitle>
              <SheetDescription className="text-xs text-slate-500">
                {language === 'mr'
                  ? 'तुमच्या परिसरातील स्थानिक दुकाने आणि किराणा पाहण्यासाठी परिसर निवडा'
                  : 'Choose your town or area to see stores delivering to your doorstep'}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="space-y-4 pt-3 overflow-y-auto max-h-[60vh]">
          {AVAILABLE_TOWNS.map((t) => {
            const isTownSelected = selectedTown.toLowerCase() === t.town.toLowerCase();
            return (
              <div
                key={t.town}
                className={`p-3.5 rounded-2xl border transition-all ${
                  isTownSelected
                    ? 'border-emerald-500 bg-emerald-50/50 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-900">
                      {t.townMarathi} ({t.town})
                    </span>
                    <Badge variant="outline" className="text-[10px] bg-white text-emerald-700 border-emerald-300">
                      {t.estDeliveryTime}
                    </Badge>
                  </div>
                  {isTownSelected && (
                    <span className="h-5 w-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs">
                      <Check className="h-3 w-3 stroke-[3]" />
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {t.areas.map((area) => {
                    const isAreaActive = isTownSelected && selectedArea === area;
                    return (
                      <button
                        key={area}
                        onClick={() => handleAreaPick(t.town, area)}
                        className={`text-xs px-2.5 py-1 rounded-xl font-medium transition-all ${
                          isAreaActive
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        {area}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
}

