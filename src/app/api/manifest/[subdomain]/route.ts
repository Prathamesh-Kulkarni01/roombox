
import { NextResponse } from 'next/server';
import type { SiteConfig } from '@/lib/types';
import { getSiteData } from '@/lib/actions/siteActions';

export async function GET(
  request: Request,
  { params }: { params: { subdomain: string } }
) {
  const subdomain = params.subdomain;
  
  if (!subdomain) {
    return new NextResponse('Not Found', { status: 404 });
  }

  const siteData = await getSiteData(subdomain);
  const config = siteData?.siteConfig;

  if (!config) {
    return new NextResponse('Not Found', { status: 404 });
  }

  // Define default icons, but allow them to be overridden by config
  const defaultIconUrl = '/icons/icon-192x192.png';
  const defaultLargeIconUrl = '/icons/icon-512x512.png';

  const getIcon = (url: string | undefined, defaultUrl: string, size: string) => ({
      src: url || defaultUrl,
      sizes: size,
      type: 'image/png',
  });

  const manifest = {
    name: config.siteTitle || 'RentSutra Property',
    short_name: config.siteTitle || 'RentSutra',
    description: config.aboutDescription || `Welcome to ${config.siteTitle}`,
    start_url: `/site/${subdomain}`,
    display: 'standalone',
    background_color: config.themeColor || '#ffffff',
    theme_color: config.themeColor || '#2563EB',
    icons: [
        getIcon(config.faviconUrl, defaultIconUrl, '192x192'),
        getIcon(config.logoUrl || config.faviconUrl, defaultLargeIconUrl, '512x512')
    ],
  };

  return new NextResponse(JSON.stringify(manifest), {
    headers: {
      'Content-Type': 'application/manifest+json',
    },
  });
}
