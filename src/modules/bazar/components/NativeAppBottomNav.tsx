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
    <nav className="fixed bottom-0 left-0 right-0 z-30 bg-[#FFFFFF] border-t border-[#E5E9E6] py-1.5 px-6 max-w-[430px] mx-auto flex items-center justify-between shadow-lg">
      {/* 1. Home */}
      <Link 
        href="/bazar" 
        className={`flex flex-col items-center gap-0.5 transition-colors ${
          isHome ? 'text-[#7B2CBF]' : 'text-slate-400 hover:text-slate-600'
        }`}
      >
        <div className="h-6 w-6 flex items-center justify-center">
          <Home className={`h-5 w-5 ${isHome ? 'stroke-[2.5] text-[#7B2CBF]' : 'stroke-[1.8]'}`} />
        </div>
        <span className={`text-[10px] ${isHome ? 'font-black text-[#7B2CBF]' : 'font-medium'}`}>
          Home
        </span>
      </Link>

      {/* 2. Explore */}
      <Link 
        href="/bazar/categories" 
        className={`flex flex-col items-center gap-0.5 transition-colors ${
          isExplore ? 'text-[#7B2CBF]' : 'text-slate-400 hover:text-slate-600'
        }`}
      >
        <div className="h-6 w-6 flex items-center justify-center">
          <Compass className={`h-5 w-5 ${isExplore ? 'stroke-[2.5] text-[#7B2CBF]' : 'stroke-[1.8]'}`} />
        </div>
        <span className={`text-[10px] ${isExplore ? 'font-black text-[#7B2CBF]' : 'font-medium'}`}>
          Categories
        </span>
      </Link>

      {/* 3. Orders */}
      <Link 
        href="/bazar/orders" 
        className={`flex flex-col items-center gap-0.5 transition-colors ${
          isOrders ? 'text-[#7B2CBF]' : 'text-slate-400 hover:text-slate-600'
        }`}
      >
        <div className="h-6 w-6 flex items-center justify-center">
          <ClipboardList className={`h-5 w-5 ${isOrders ? 'stroke-[2.5] text-[#7B2CBF]' : 'stroke-[1.8]'}`} />
        </div>
        <span className={`text-[10px] ${isOrders ? 'font-black text-[#7B2CBF]' : 'font-medium'}`}>
          Orders
        </span>
      </Link>

      {/* 4. Account */}
      <Link 
        href="/bazar/account" 
        className={`flex flex-col items-center gap-0.5 transition-colors ${
          isAccount ? 'text-[#7B2CBF]' : 'text-slate-400 hover:text-slate-600'
        }`}
      >
        <div className="h-6 w-6 flex items-center justify-center">
          <User className={`h-5 w-5 ${isAccount ? 'stroke-[2.5] text-[#7B2CBF]' : 'stroke-[1.8]'}`} />
        </div>
        <span className={`text-[10px] ${isAccount ? 'font-black text-[#7B2CBF]' : 'font-medium'}`}>
          Account
        </span>
      </Link>
    </nav>
  );
}
