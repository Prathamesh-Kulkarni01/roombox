
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, MessageSquareWarning, UtensilsCrossed, Bot, User, LogOut, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppDispatch, useAppSelector } from '@/lib/hooks';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Button } from './ui/button';
import { Skeleton } from './ui/skeleton';
import { useMemo } from 'react';
import { logoutUser } from '@/lib/slices/userSlice';
import { canViewFeature } from '@/lib/permissions';

const navItems = [
  { href: '/tenants/my-pg', label: 'My Property', icon: Home },
  { href: '/tenants/complaints', label: 'Complaints', icon: MessageSquareWarning },
  { href: '/tenants/food', label: 'Food Menu', icon: UtensilsCrossed },
  { href: '/tenants/kyc', label: 'KYC Verification', icon: ShieldCheck },
  { href: '/tenants/chatbot', label: 'AI Helper', icon: Bot },
  { href: '/tenants/profile', label: 'Profile', icon: User },
];

export default function TenantSidebar() {
  const pathname = usePathname();
  const dispatch = useAppDispatch();
  const { currentUser } = useAppSelector((state) => state.user);
  const { guests } = useAppSelector((state) => state.guests);
  const { featurePermissions } = useAppSelector((state) => state.permissions);

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
            <h2 className="text-xl font-bold text-primary font-headline">Guest Portal</h2>
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
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
      <div className="p-4 mt-auto border-t">
        <div className="flex items-center gap-3 mb-4">
            <Avatar className="h-10 w-10">
                <AvatarImage src={currentUser.avatarUrl} alt={currentUser.name} />
                <AvatarFallback>{currentUser.name.slice(0,2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div>
                <p className="font-semibold text-sm truncate">{currentUser.name}</p>
                <p className="text-xs text-muted-foreground">{currentGuest.pgName}</p>
            </div>
        </div>
        <Button variant="outline" className="w-full" onClick={() => dispatch(logoutUser())}>
            <LogOut className="mr-2 h-4 w-4" />
            Logout
        </Button>
      </div>
    </aside>
  );
}
