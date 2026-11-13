'use client';

import { useBazarCart } from '../context/BazarCartContext';
import { 
  MapPin, 
  Heart, 
  Languages, 
  Share2,
  ChevronLeft
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import type { BazarStore } from '../schemas';

interface StorefrontHeaderProps {
  store: BazarStore;
  isStandalone?: boolean;
}

export function StorefrontHeader({ store, isStandalone = false }: StorefrontHeaderProps) {
  const { language, toggleLanguage, isFavoriteStore, toggleFavoriteStore } = useBazarCart();
  const isFav = isFavoriteStore(store.slug);

  const handleShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: store.name,
          text: `घरबसल्या ${store.name} मधून किराणा ऑर्डर करा!`,
          url: window.location.href,
        });
      } catch {
        // Fallback or dismissed
      }
    }
  };

  return (
    <div className="bg-card border-b border-border/60 py-3.5 px-4 mb-3">
      {/* Utility sub-bar using platform tokens */}
      <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-border/40 text-xs">
        <div className="flex items-center gap-1.5 text-muted-foreground font-medium">
          {!isStandalone && (
            <Link href="/bazar" className="flex items-center gap-1 text-primary hover:underline font-semibold mr-1">
              <ChevronLeft className="h-4 w-4" />
              <span>{language === 'mr' ? 'सर्व बझार' : 'All Bazars'}</span>
            </Link>
          )}
          <MapPin className="h-3.5 w-3.5 text-primary" />
          <span>{store.town || 'Palus'} • ३०-४५ मिनिटे</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Language Switcher Pill */}
          <button
            onClick={toggleLanguage}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary font-bold border border-primary/20 hover:bg-primary/20 transition-colors"
          >
            <Languages className="h-3 w-3" />
            <span>{language === 'mr' ? 'English' : 'मराठी'}</span>
          </button>

          {/* Favorite Heart Button */}
          <button
            onClick={() => toggleFavoriteStore(store.slug)}
            className="p-1.5 rounded-full hover:bg-muted text-muted-foreground transition-colors"
            title={isFav ? 'Remove from favorites' : 'Add to favorite bazars'}
          >
            <Heart className={`h-4 w-4 ${isFav ? 'fill-rose-500 text-rose-500' : ''}`} />
          </button>

          {/* Share Button */}
          <button
            onClick={handleShare}
            className="p-1.5 rounded-full hover:bg-muted text-muted-foreground"
          >
            <Share2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Main Store Identity Card */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg shadow-sm shrink-0">
            {store.name.charAt(0)}
          </div>
          <div>
            <h1 className="font-bold text-base md:text-lg leading-tight text-foreground">
              {language === 'mr' && store.nameMarathi ? store.nameMarathi : store.name}
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
              {store.address || 'मेन रोड, पलूस'}
            </p>
          </div>
        </div>

        <Badge variant="outline" className="shrink-0 bg-primary/10 text-primary border-primary/30 font-medium text-xs px-2.5 py-1">
          🟢 उघडे आहे
        </Badge>
      </div>
    </div>
  );
}
