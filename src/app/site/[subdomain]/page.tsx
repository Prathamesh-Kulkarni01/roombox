
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
    return (
      <GroceryCartProvider>
        <StorefrontScreen storeSlug={subdomain} />
        <SingleStoreCartConflictModal />
      </GroceryCartProvider>
    );
  }

  // Pass the server-fetched data to the client component
  return <SitePageClient initialData={siteData} subdomain={subdomain} />;
}
