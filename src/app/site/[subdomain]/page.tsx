import React from 'react';
import { notFound } from 'next/navigation';
import type { Metadata, ResolvingMetadata } from 'next';
import { getSiteData } from '@/lib/actions/siteActions';
import SitePageClient from '@/components/site-page-client';

type Props = {
  params: { subdomain: string };
  searchParams: { [key: string]: string | string[] | undefined };
};

export async function generateMetadata(
  { params }: Props,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const subdomain = params.subdomain;
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

  return {
    title: config.siteTitle || "Our Properties",
    description: config.aboutDescription || `Welcome to ${config.siteTitle}`,
    manifest: `/api/manifest/${subdomain}`,
    icons: {
      icon: config.faviconUrl || '/favicon.ico',
      apple: config.logoUrl || '/apple-touch-icon.png',
    },
    themeColor: config.themeColor || '#2563EB',
  };
}

export default async function SitePage({ params, searchParams }: Props) {
  const isPreview = searchParams?.preview === 'true';
  const siteData = await getSiteData(params.subdomain, isPreview);

  if (!siteData || !siteData.siteConfig) {
    notFound();
  }
  
  // Pass the server-fetched data to the client component
  return <SitePageClient initialData={siteData} subdomain={params.subdomain} />;
}
