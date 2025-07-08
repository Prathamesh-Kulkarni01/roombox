

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, MessageSquareWarning, UtensilsCrossed, Bot, User, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppSelector } from '@/lib/hooks';

const navItems = [
  { href: '/tenants/my-pg', label: 'My PG', icon: Home },
  { href: '/tenants/complaints', label: 'Complaints', icon: MessageSquareWarning },
  { href: '/tenants/kyc', label: 'KYC', icon: ShieldCheck },
  { href: '/tenants/food', label: 'Menu', icon: UtensilsCrossed },
  { href: '/tenants/chatbot', label: 'AI Helper', icon: Bot },
];

export default function TenantBottomNav() {
  const pathname = usePathname();
  const { currentUser } = useAppSelector((state) => state.user);

  if (!currentUser) return null;

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t z-50">
      <nav className="grid grid-cols-5 h-16 items-center">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex flex-col items-center justify-center gap-1 text-muted-foreground transition-colors h-full',
              (pathname === item.href || (item.href !== '/tenants/my-pg' && pathname.startsWith(item.href))) 
                ? 'text-primary' 
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
