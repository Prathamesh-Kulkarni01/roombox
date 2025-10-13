
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

  // Fetch tenant-specific configuration
  // For this example, we'll use a mock. In a real app, this would come from a database.
  const siteData = await getSiteData(subdomain);
  const config = siteData?.siteConfig;

  if (!config) {
    return new NextResponse('Not Found', { status: 404 });
  }

  const manifest = {
    name: config.siteTitle || 'RentSutra Property',
    short_name: config.siteTitle || 'RentSutra',
    description: config.aboutDescription || `Welcome to ${config.siteTitle}`,
    start_url: `/site/${subdomain}`,
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#2563EB', // You could make this dynamic from config
    icons: [
        {
            "src": "/icons/icon-192x192.png",
            "sizes": "192x192",
            "type": "image/png"
        },
        {
            "src": "/icons/icon-512x512.png",
            "sizes": "512x512",
            "type": "image/png"
        }
    ],
  };

  return new NextResponse(JSON.stringify(manifest), {
    headers: {
      'Content-Type': 'application/manifest+json',
    },
  });
}
