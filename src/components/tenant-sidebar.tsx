'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Home, MessageSquareWarning, UtensilsCrossed, Bot, User, LogOut, ShieldCheck, History, Building2, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppDispatch, useAppSelector } from '@/lib/hooks'
import { usePermissionsStore } from '@/lib/stores/configStores';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Button } from './ui/button';
import { Skeleton } from './ui/skeleton';
import { useMemo } from 'react';
import { logoutUser } from '@/lib/slices/userSlice';
import { canViewFeature } from '@/lib/permissions';
import { useTranslation } from '@/context/language-context';
import { usePgBranding } from '@/context/branding-context';

const navItems = [
  { href: '/tenants/my-pg', label: 'nav_tenant_home', icon: Home },
  { href: '/tenants/complaints', label: 'nav_tenant_complaints', icon: MessageSquareWarning },
  { href: '/tenants/ledger', label: 'nav_tenant_ledger', icon: History },
  { href: '/tenants/food', label: 'nav_tenant_food', icon: UtensilsCrossed },
  { href: '/tenants/kyc', label: 'nav_tenant_kyc', icon: ShieldCheck },
  { href: '/tenants/chatbot', label: 'nav_tenant_chatbot', icon: Bot },
  { href: '/tenants/profile', label: 'nav_tenant_profile', icon: User },
];

export default function TenantSidebar() {
  const pathname = usePathname();
  const dispatch = useAppDispatch();
  const { currentUser } = useAppSelector((state) => state.user);
  const { guests } = useAppSelector((state) => state.guests);
  const { featurePermissions } = usePermissionsStore();
  const { t } = useTranslation();
  const branding = usePgBranding(); // PG-specific branding (null on main domain)

  const currentGuest = useMemo(() => {
    if (!currentUser || !currentUser.guestId) return null;
    return guests.find(g => g.id === currentUser.guestId);
  }, [currentUser, guests]);


  if (!currentUser || !currentGuest) {
    return (
      <aside className="w-64 flex-col border-r bg-card hidden md:flex">
        <div className="flex-1 p-4">
          <Skeleton className="h-8 w-3/4 mb-6" />
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      </aside>
    );
  }

  return (
    <aside className="w-64 flex-col border-r bg-card hidden md:flex">
      <div className="flex-1 flex flex-col">
        <div className="p-4 border-b">
          {/* ── Branding-Aware Sidebar Header ── */}
          {branding ? (
            <div className="flex items-center gap-3">
              {branding.logoUrl ? (
                <div className="relative w-9 h-9 rounded-xl overflow-hidden border border-border/20 flex-shrink-0 shadow-sm">
                  <Image
                    src={branding.logoUrl}
                    alt={branding.siteTitle}
                    fill
                    className="object-contain p-0.5"
                  />
                </div>
              ) : (
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Building2 className="w-5 h-5 text-primary" />
                </div>
              )}
              <div className="overflow-hidden">
                <h2 className="text-sm font-bold text-foreground truncate">{branding.siteTitle}</h2>
                <p className="text-[10px] text-muted-foreground">Resident Portal</p>
              </div>
            </div>
          ) : (
            <h2 className="text-xl font-bold text-primary font-headline">{t('nav_tenant_portal')}</h2>
          )}
        </div>
        <nav className="flex flex-col gap-1 p-4">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-colors hover:text-primary',
                (pathname === item.href) && 'bg-muted text-primary'
              )}
            >
              <item.icon className="h-4 w-4" />
              {t(item.label as any)}
            </Link>
          ))}
        </nav>
      </div>
      <div className="p-4 mt-auto border-t">
        <div className="flex items-center gap-3 mb-4">
          <Avatar className="h-10 w-10">
            <AvatarImage src={currentUser.avatarUrl} alt={currentUser.name} />
            <AvatarFallback>{(currentUser.name || 'User').slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-semibold text-sm truncate">{currentUser.name}</p>
            <p className="text-xs text-muted-foreground">{currentGuest.pgName}</p>
          </div>
        </div>
        <Button variant="outline" className="w-full" onClick={() => dispatch(logoutUser())}>
          <LogOut className="mr-2 h-4 w-4" />
          {t('logout')}
        </Button>
        {/* Powered-by link — shown only on branded subdomains */}
        {branding && (
          <p className="text-[10px] text-muted-foreground/40 text-center mt-3">
            Powered by{' '}
            <Link href="https://rentsutra.in" target="_blank" className="hover:text-primary transition-colors">
              RentSutra
            </Link>
          </p>
        )}
      </div>
    </aside>
  );
}
