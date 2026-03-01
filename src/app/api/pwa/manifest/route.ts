
import { NextRequest, NextResponse } from 'next/server';
import { getPWAConfigByOwnerId, getPWAConfigBySubdomain } from '@/lib/pwa-config';

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const ownerId = searchParams.get('ownerId');
    const subdomain = searchParams.get('subdomain');

    let config = null;

    if (ownerId) {
        config = await getPWAConfigByOwnerId(ownerId);
    } else if (subdomain) {
        config = await getPWAConfigBySubdomain(subdomain);
    }

    if (!config) {
        // Fallback to default manifest values
        config = {
            name: 'RentSutra',
            shortName: 'RentSutra',
            themeColor: '#0f172a',
            backgroundColor: '#ffffff',
            logo: '/icons/icon-512x512.png'
        };
    }

    const manifest = {
        name: config.name || 'RentSutra',
        short_name: config.shortName || 'RentSutra',
        description: `Welcome to ${config.name || 'our property'}`,
        start_url: subdomain ? `/site/${subdomain}` : '/dashboard',
        display: 'standalone',
        background_color: config.backgroundColor || '#ffffff',
        theme_color: config.themeColor || '#0f172a',
        icons: [
            {
                src: config.logo || '/icons/icon-192x192.png',
                sizes: '192x192',
                type: 'image/png',
                purpose: 'any maskable'
            },
            {
                src: config.logo || '/icons/icon-512x512.png',
                sizes: '512x512',
                type: 'image/png',
                purpose: 'any maskable'
            }
        ]
    };

    return new NextResponse(JSON.stringify(manifest), {
        headers: {
            'Content-Type': 'application/manifest+json',
            'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=600'
        }
    });
}
