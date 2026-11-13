'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Home, 
  ShoppingBag, 
  Package, 
  Receipt, 
  Menu
} from 'lucide-react';

interface NavItem {
  label: string;
  labelMarathi: string;
  href: string;
  icon: typeof Home;
  matchPrefixes: string[];
}

const MERCHANT_NAV_ITEMS: NavItem[] = [
  {
    label: 'Home',
    labelMarathi: 'मुख्य',
    href: '/bazar/dashboard',
    icon: Home,
    matchPrefixes: ['/bazar/dashboard'],
  },
  {
    label: 'Orders',
    labelMarathi: 'ऑर्डर्स',
    href: '/bazar/queue',
    icon: ShoppingBag,
    matchPrefixes: ['/bazar/queue'],
  },
  {
    label: 'Stock',
    labelMarathi: 'इन्व्हेंटरी',
    href: '/bazar/inventory',
    icon: Package,
    matchPrefixes: ['/bazar/inventory', '/bazar/sheets-sync'],
  },
  {
    label: 'Billing',
    labelMarathi: 'बिलिंग (POS)',
    href: '/bazar/pos',
    icon: Receipt,
    matchPrefixes: ['/bazar/pos'],
  },
  {
    label: 'More',
    labelMarathi: 'अधिक',
    href: '/bazar/more',
    icon: Menu,
    matchPrefixes: ['/bazar/more'],
  },
];

export default function MerchantBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-md border-t border-border shadow-lg md:hidden">
      <div className="grid grid-cols-5 h-16 max-w-lg mx-auto px-1">
        {MERCHANT_NAV_ITEMS.map((item) => {
          const isActive = item.matchPrefixes.some(prefix => 
            pathname === prefix || pathname.startsWith(`${prefix}/`)
          );
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center py-1 transition-colors select-none relative ${
                isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {/* Active top indicator pill */}
              {isActive && (
                <span className="absolute top-0 w-8 h-1 bg-primary rounded-full" />
              )}
              
              <div className={`p-1 rounded-xl transition-all ${isActive ? 'bg-primary/10 text-primary' : ''}`}>
                <Icon className={`h-5 w-5 ${isActive ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
              </div>
              
              <span className={`text-[11px] font-bold tracking-tight leading-tight mt-0.5 ${isActive ? 'text-primary' : ''}`}>
                {item.label}
              </span>
              <span className="text-[9px] text-muted-foreground/70 -mt-0.5 hidden xs:inline">
                {item.labelMarathi}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
