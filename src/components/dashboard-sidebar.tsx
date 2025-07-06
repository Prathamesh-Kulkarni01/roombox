'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { HomeIcon, Building, Users, Wand2, UserCircle, LogOut, UtensilsCrossed, Wallet, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Separator } from './ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Button } from './ui/button';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: HomeIcon },
  { href: '/dashboard/food', label: 'Food Management', icon: UtensilsCrossed },
  { href: '/dashboard/expense', label: 'Expense Tracking', icon: Wallet },
  { href: '/dashboard/pg-management', label: 'PG Management', icon: Building },
  { href: '/dashboard/tenant-management', label: 'Guest Management', icon: Users },
  { href: '/dashboard/seo-generator', label: 'AI SEO Generator', icon: Wand2 },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
];

export default function DashboardSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 flex-col border-r bg-background hidden md:flex">
      <div className="flex-1 flex flex-col gap-y-2">
        <div className="p-4">
            <h2 className="text-xl font-bold text-primary font-headline">Owner Dashboard</h2>
        </div>
        <nav className="flex flex-col gap-1 px-4">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary hover:bg-primary/10',
                (pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))) && 'bg-primary/10 text-primary'
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
      <div className="p-4 mt-auto">
        <Separator className="my-4" />
        <div className="flex items-center gap-3">
          <Avatar>
            <AvatarImage src="https://placehold.co/40x40.png" alt="Owner" />
            <AvatarFallback>PO</AvatarFallback>
          </Avatar>
          <div className='flex-1'>
            <p className="font-semibold text-sm">PG Owner</p>
            <p className="text-xs text-muted-foreground">owner@example.com</p>
          </div>
          <Button variant="ghost" size="icon" asChild>
            <Link href="/login">
                <LogOut className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </aside>
  );
}
