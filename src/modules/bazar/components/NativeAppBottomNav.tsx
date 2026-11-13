'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Compass, ClipboardList, User } from 'lucide-react';

export function NativeAppBottomNav() {
  const pathname = usePathname();

  const isHome = pathname === '/bazar' || pathname.startsWith('/bazar/store');
  const isExplore = pathname === '/bazar/categories';
  const isOrders = pathname === '/bazar/orders';
  const isAccount = pathname === '/bazar/account';

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 bg-card/95 backdrop-blur-md border-t border-border py-1.5 px-6 max-w-[430px] mx-auto flex items-center justify-between shadow-lg">
      {/* 1. Home */}
      <Link 
        href="/bazar" 
        className={`flex flex-col items-center gap-0.5 transition-colors ${
          isHome ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        <div className="h-6 w-6 flex items-center justify-center">
          <Home className={`h-5 w-5 ${isHome ? 'stroke-[2.5] text-primary' : 'stroke-[1.8]'}`} />
        </div>
        <span className={`text-[10px] ${isHome ? 'font-black text-primary' : 'font-medium'}`}>
          Home
        </span>
      </Link>

      {/* 2. Explore */}
      <Link 
        href="/bazar/categories" 
        className={`flex flex-col items-center gap-0.5 transition-colors ${
          isExplore ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        <div className="h-6 w-6 flex items-center justify-center">
          <Compass className={`h-5 w-5 ${isExplore ? 'stroke-[2.5] text-primary' : 'stroke-[1.8]'}`} />
        </div>
        <span className={`text-[10px] ${isExplore ? 'font-black text-primary' : 'font-medium'}`}>
          Categories
        </span>
      </Link>

      {/* 3. Orders */}
      <Link 
        href="/bazar/orders" 
        className={`flex flex-col items-center gap-0.5 transition-colors ${
          isOrders ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        <div className="h-6 w-6 flex items-center justify-center">
          <ClipboardList className={`h-5 w-5 ${isOrders ? 'stroke-[2.5] text-primary' : 'stroke-[1.8]'}`} />
        </div>
        <span className={`text-[10px] ${isOrders ? 'font-black text-primary' : 'font-medium'}`}>
          Orders
        </span>
      </Link>

      {/* 4. Account */}
      <Link 
        href="/bazar/account" 
        className={`flex flex-col items-center gap-0.5 transition-colors ${
          isAccount ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        <div className="h-6 w-6 flex items-center justify-center">
          <User className={`h-5 w-5 ${isAccount ? 'stroke-[2.5] text-primary' : 'stroke-[1.8]'}`} />
        </div>
        <span className={`text-[10px] ${isAccount ? 'font-black text-primary' : 'font-medium'}`}>
          Account
        </span>
      </Link>
    </nav>
  );
}
