'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAppSelector } from '@/lib/hooks';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { Store, Loader2, Lock, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export function BazarMerchantGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { currentUser } = useAppSelector((state) => state.user);

  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Check Redux or Firebase direct auth
    if (currentUser?.uid) {
      setIsAuthenticated(true);
      setAuthChecked(true);
      return;
    }

    if (!auth) {
      setAuthChecked(true);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
      }
      setAuthChecked(true);
    });

    return () => unsubscribe();
  }, [currentUser]);

  if (!authChecked) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-muted-foreground">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
        <p className="text-sm font-medium">Checking Merchant Credentials...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] px-4 max-w-md mx-auto text-center">
        <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-5 shadow-sm">
          <Store className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 mb-2">
          व्यापारी लॉगिन आवश्यक आहे
        </h1>
        <p className="text-sm text-slate-600 mb-6 leading-relaxed">
          Palus Local Bazar व्यापारी डॅशबोर्ड, POS बिलिंग आणि इन्व्हेंटरी व्यवस्थापनासाठी कृपया आपल्या मोबाईल नंबरने लॉगिन करा.
        </p>

        <div className="flex flex-col w-full gap-3">
          <Button 
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-6 rounded-xl text-base shadow-sm"
            onClick={() => router.push(`/bazar/login?redirect=${encodeURIComponent(pathname)}`)}
          >
            मोबाईल नंबरने लॉगिन करा (Sign In)
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>

          <Link href="/bazar" className="text-xs text-slate-500 hover:text-slate-800 pt-2">
            ← परत मुख्य बाजारात जा (Back to Bazar)
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
