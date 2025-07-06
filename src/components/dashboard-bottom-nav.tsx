'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Building, Users, Wallet, MoreHorizontal, UtensilsCrossed, Wand2, Settings, MessageSquareWarning, Contact } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const mainNavItems = [
  { href: '/dashboard', label: 'Dashboard', icon: Home },
  { href: '/dashboard/expense', label: 'Expenses', icon: Wallet },
  { href: '/dashboard/complaints', label: 'Complaints', icon: MessageSquareWarning },
  { href: '/dashboard/food', label: 'Food', icon: UtensilsCrossed },
];

const moreNavItems = [
  { href: '/dashboard/pg-management', label: 'PG Management', icon: Building },
  { href: '/dashboard/tenant-management', label: 'Guest Management', icon: Users },
  { href: '/dashboard/staff', label: 'Staff Management', icon: Contact },
  { href: '/dashboard/seo-generator', label: 'AI SEO Generator', icon: Wand2 },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
]

export default function DashboardBottomNav() {
  const pathname = usePathname();

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-sidebar border-t border-sidebar-border z-50">
      <nav className="grid grid-cols-5 h-16 items-center">
        {mainNavItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex flex-col items-center justify-center gap-1 text-sidebar-foreground/70 transition-colors h-full',
              (pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))) 
                ? 'text-primary bg-sidebar-accent' 
                : 'hover:text-primary'
            )}
          >
            <item.icon className="h-5 w-5" />
            <span className="text-xs font-medium">{item.label}</span>
          </Link>
        ))}
        
        <Sheet>
          <SheetTrigger asChild>
            <button className="flex flex-col items-center justify-center gap-1 text-sidebar-foreground/70 transition-colors h-full hover:text-primary">
              <MoreHorizontal className="h-5 w-5" />
              <span className="text-xs font-medium">More</span>
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-auto rounded-t-lg">
             <SheetHeader className="text-left mb-4">
              <SheetTitle>More Options</SheetTitle>
              <SheetDescription>
                Navigate to other sections of your dashboard.
              </SheetDescription>
            </SheetHeader>
            <div className="flex flex-col gap-2">
              {moreNavItems.map((item) => (
                 <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                        'flex items-center gap-3 rounded-lg px-3 py-3 text-base font-medium text-muted-foreground transition-all hover:text-primary hover:bg-primary/10',
                        (pathname.startsWith(item.href)) && 'bg-primary/10 text-primary'
                    )}
                    >
                    <item.icon className="h-5 w-5" />
                    {item.label}
                </Link>
              ))}
            </div>
          </SheetContent>
        </Sheet>
      </nav>
    </div>
  );
}
