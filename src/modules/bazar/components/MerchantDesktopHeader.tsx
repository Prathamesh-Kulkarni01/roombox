'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Home, 
  ShoppingBag, 
  Package, 
  Receipt, 
  Menu,
  Store,
  ChevronRight,
  ExternalLink,
  Users,
  BarChart3,
  Settings,
  HelpCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const DESKTOP_NAV_ITEMS = [
  { label: 'Home', labelMarathi: 'मुख्य डॅशबोर्ड', href: '/bazar/dashboard', icon: Home },
  { label: 'Orders Queue', labelMarathi: 'ऑर्डर्स आणि पॅकिंग', href: '/bazar/queue', icon: ShoppingBag },
  { label: 'Stock & Inventory', labelMarathi: 'इन्व्हेंटरी', href: '/bazar/inventory', icon: Package },
  { label: 'POS Billing', labelMarathi: 'काउंटर बिलिंग (POS)', href: '/bazar/pos', icon: Receipt },
  { label: 'Store Settings & More', labelMarathi: 'अधिक आणि सेटिंग्ज', href: '/bazar/more', icon: Menu },
];

export default function MerchantDesktopHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 w-full bg-card/95 backdrop-blur-md border-b border-border shadow-xs">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
        {/* Brand / Logo */}
        <div className="flex items-center gap-3">
          <Link href="/bazar/dashboard" className="flex items-center gap-2.5 group">
            <div className="h-10 w-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-black shadow-xs group-hover:scale-105 transition-transform">
              <Store className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base tracking-tight text-foreground">
                  Bazar Vyapari
                </span>
                <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20 py-0 h-4">
                  Merchant OS
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground font-medium">
                बझार व्यापारी ऑपरेटिंग सिस्टीम
              </p>
            </div>
          </Link>
        </div>

        {/* Center Desktop Navigation Tabs */}
        <nav className="hidden md:flex items-center gap-1 bg-muted/50 p-1 rounded-xl border border-border/60">
          {DESKTOP_NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/bazar/dashboard' && pathname.startsWith(item.href));
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground hover:bg-background/60'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Right Quick Actions */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild className="h-9 rounded-xl border-primary/20 text-primary hover:bg-primary/10 font-semibold text-xs">
            <Link href="/bazar" target="_blank">
              <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
              Customer Store
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
