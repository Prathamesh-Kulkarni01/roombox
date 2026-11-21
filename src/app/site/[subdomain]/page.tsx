
import React from 'react';
import { notFound } from 'next/navigation';
import type { Metadata, ResolvingMetadata, Viewport } from 'next';
import { getSiteData } from '@/lib/actions/siteActions';
import SitePageClient from '@/components/site-page-client';
import { StorefrontScreen } from '@/modules/bazar/components/StorefrontScreen';
import { GroceryCartProvider } from '@/modules/bazar/context/GroceryCartContext';
import { SingleStoreCartConflictModal } from '@/modules/bazar/components/SingleStoreCartConflictModal';

type Props = {
  params: Promise<{ subdomain: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export async function generateViewport(
  { params }: Props
): Promise<Viewport> {
  const { subdomain } = await params;
  if (!subdomain) {
    return {};
  }

  const siteData = await getSiteData(subdomain, false);
  const config = siteData?.siteConfig;

  return {
    themeColor: config?.themeColor || '#2563EB',
  };
}

export async function generateMetadata(
  { params }: Props,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const { subdomain } = await params;
  if (!subdomain) {
    return {};
  }

  const siteData = await getSiteData(subdomain, false); // Fetch public data for metadata
  const config = siteData?.siteConfig;

  if (!config) {
    return {
      title: 'Property Not Found',
    };
  }

  const NEXT_PUBLIC_APP_URL = process.env.NEXT_PUBLIC_APP_URL || '';

  return {
    title: config.siteTitle || "Our Properties",
    description: config.aboutDescription || `Welcome to ${config.siteTitle}`,
    manifest: `${NEXT_PUBLIC_APP_URL}/api/pwa/manifest?subdomain=${subdomain}`,
    icons: {
      icon: config.faviconUrl || '/favicon.ico',
      apple: config.logoUrl || '/apple-touch-icon.png',
    },
  };
}

export default async function SitePage({ params, searchParams }: Props) {
  const { subdomain } = await params;
  const resolvedSearchParams = await searchParams;
  const isPreview = resolvedSearchParams?.preview === 'true';
  const siteData = await getSiteData(subdomain, isPreview);

  if (!siteData || !siteData.siteConfig) {
    notFound();
  }

  // If this subdomain is configured as a Bazar store (e.g. samarth.rentsutra.in)
  if (siteData.siteConfig.type === 'bazar') {
    const initialStore = (siteData as any).bazarStore ? {
      id: (siteData as any).bazarStore.id,
      name: (siteData as any).bazarStore.name,
      nameMarathi: (siteData as any).bazarStore.nameMarathi || (siteData as any).bazarStore.name,
      slug: (siteData as any).bazarStore.slug || subdomain,
      address: (siteData as any).bazarStore.address || 'Palus, Sangli',
      category: (siteData as any).bazarStore.category || 'grocery',
      categoryMarathi: (siteData as any).bazarStore.category === 'dairy' ? 'दूध व डेअरी' : 'किराणा व धान्य',
      town: (siteData as any).bazarStore.town || 'Palus',
      isOpen: (siteData as any).bazarStore.isOpen !== undefined ? (siteData as any).bazarStore.isOpen : true,
      distanceKm: (siteData as any).bazarStore.distanceKm || 0.8,
      deliveryTimeMins: (siteData as any).bazarStore.deliveryTimeMins || '15-25 min',
      minOrder: (siteData as any).bazarStore.minOrderValue || 50,
      rating: 4.8,
      ratingCount: 120,
      ratingCountText: '120+ ratings',
      imageUrl: (siteData as any).bazarStore.branding?.bannerUrl || (siteData as any).bazarStore.branding?.logoUrl || (siteData as any).bazarStore.imageUrl || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=500&auto=format&fit=crop&q=80',
      shortCode: ((siteData as any).bazarStore.name?.slice(0, 2) || 'BZ').toUpperCase(),
      verified: true,
      offersText: 'स्थानिक खात्रीशीर दुकान',
      offersTextMarathi: 'स्थानिक खात्रीशीर दुकान',
      brandTheme: 'green' as const,
      phone: (siteData as any).bazarStore.phone,
    } : undefined;

    return (
      <GroceryCartProvider>
        <StorefrontScreen storeSlug={subdomain} initialStoreData={initialStore} />
        <SingleStoreCartConflictModal />
      </GroceryCartProvider>
    );
  }

  // Pass the server-fetched data to the client component
  return <SitePageClient initialData={siteData} subdomain={subdomain} />;
}
