'use client';

import React, { createContext, useContext, ReactNode } from 'react';

export type PgBranding = {
  subdomain: string;
  siteTitle: string;
  logoUrl?: string;
  faviconUrl?: string;
  themeColor?: string;
  contactPhone?: string;
  contactEmail?: string;
  isSubdomain: true;
};

export type BrandingContextValue =
  | PgBranding
  | { isSubdomain: false };

const BrandingContext = createContext<BrandingContextValue>({ isSubdomain: false });

export function BrandingProvider({
  children,
  value,
}: {
  children: ReactNode;
  value: BrandingContextValue;
}) {
  return (
    <BrandingContext.Provider value={value}>
      {children}
    </BrandingContext.Provider>
  );
}

export function useBranding(): BrandingContextValue {
  return useContext(BrandingContext);
}

/** Typed helper — returns branding only when on a subdomain */
export function usePgBranding(): PgBranding | null {
  const ctx = useContext(BrandingContext);
  return ctx.isSubdomain ? ctx : null;
}
