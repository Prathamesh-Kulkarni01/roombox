'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Building, Users, UtensilsCrossed, Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: Home },
  { href: '/dashboard/pg-management', label: 'PGs', icon: Building },
  { href: '/dashboard/tenant-management', label: 'Tenants', icon: Users },
  { href: '/dashboard/food', label: 'Food', icon: UtensilsCrossed },
  { href: '/dashboard/expense', label: 'Expenses', icon: Wallet },
];

export default function DashboardBottomNav() {
  const pathname = usePathname();

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-background border-t z-50">
      <nav className="grid grid-cols-5 h-16 items-center">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex flex-col items-center justify-center gap-1 text-muted-foreground transition-colors h-full',
              (pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))) 
                ? 'text-primary bg-primary/10' 
                : 'hover:text-primary'
            )}
          >
            <item.icon className="h-5 w-5" />
            <span className="text-xs font-medium">{item.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
