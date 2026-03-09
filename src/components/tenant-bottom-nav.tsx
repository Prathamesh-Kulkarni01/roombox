
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, MessageSquareWarning, UtensilsCrossed, Bot, History } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppSelector } from '@/lib/hooks'
import { usePermissionsStore } from '@/lib/stores/configStores';
import { useTranslation } from '@/context/language-context';

const navItems = [
  { href: '/tenants/my-pg', label: 'nav_tenant_home_short', icon: Home },
  { href: '/tenants/complaints', label: 'nav_tenant_complaints_short', icon: MessageSquareWarning },
  { href: '/tenants/ledger', label: 'nav_tenant_ledger_short', icon: History },
  { href: '/tenants/food', label: 'nav_tenant_food_short', icon: UtensilsCrossed },
  { href: '/tenants/chatbot', label: 'nav_tenant_chatbot_short', icon: Bot },
];

export default function TenantBottomNav() {
  const pathname = usePathname();
  const { currentUser } = useAppSelector((state) => state.user);
  const { featurePermissions } = usePermissionsStore();
  const { t } = useTranslation();

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
                ? 'text-primary bg-primary/10'
                : 'hover:text-primary'
            )}
          >
            <item.icon className="h-5 w-5" />
            <span className="text-xs font-medium">{t(item.label as any)}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
