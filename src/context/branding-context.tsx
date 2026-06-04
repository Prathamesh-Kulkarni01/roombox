'use client';

import React, { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { useAppSelector } from '@/lib/hooks';
import { getBrandingForOwner } from '@/lib/actions/siteActions';

export type PgBranding = {
  subdomain: string;
  siteTitle: string;
  logoUrl?: string;
  faviconUrl?: string;
  themeColor?: string;
  contactPhone?: string;
  contactEmail?: string;
  isSubdomain: boolean;
};

export type BrandingContextValue =
  | PgBranding
  | { isSubdomain: false };

const BrandingContext = createContext<BrandingContextValue>({ isSubdomain: false });

export function BrandingProvider({
  children,
  value: initialValue,
}: {
  children: ReactNode;
  value: BrandingContextValue;
}) {
  const [value, setValue] = useState<BrandingContextValue>(initialValue);
  const currentUser = useAppSelector((state) => state.user.currentUser);

  useEffect(() => {
    // If we already have subdomain branding resolved on the server, stick with it
    if (initialValue.isSubdomain) {
      setValue(initialValue);
      return;
    }

    // Dynamic resolution based on user context for root domain access
    if (currentUser?.role === 'tenant' && currentUser.ownerId) {
      getBrandingForOwner(currentUser.ownerId).then((branding) => {
        if (branding) {
          setValue({
            isSubdomain: true,
            ...branding,
          });
        } else {
          setValue({ isSubdomain: false });
        }
      });
    } else {
      setValue(initialValue);
    }
  }, [initialValue, currentUser]);

  return (
    <BrandingContext.Provider value={value}>
      {children}
    </BrandingContext.Provider>
  );
}

export function useBranding(): BrandingContextValue {
  return useContext(BrandingContext);
}

/** Typed helper — returns branding only when on a subdomain or resolved dynamically */
export function usePgBranding(): PgBranding | null {
  const ctx = useContext(BrandingContext);
  return ctx.isSubdomain ? ctx : null;
}

