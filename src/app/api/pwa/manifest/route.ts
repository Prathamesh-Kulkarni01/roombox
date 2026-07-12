import { NextRequest, NextResponse } from 'next/server';
import { getPWAConfigByOwnerId, getPWAConfigBySubdomain } from '@/lib/pwa-config';
import { resolveTenant } from '@/platform/auth/server/tenant-resolver';
import { getAdminDb } from '@/lib/firebaseAdmin';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const ownerId = searchParams.get('ownerId');
    const subdomain = searchParams.get('subdomain');

    let config = null;
    let siteConfig = null;

    try {
        const { db: adminDb } = await resolveTenant(req);
        if (ownerId) {
            config = await getPWAConfigByOwnerId(ownerId);
            const snapshot = await adminDb.collection('sites').where('ownerId', '==', ownerId).limit(1).get();
            if (!snapshot.empty) {
                siteConfig = snapshot.docs[0].data();
            }
        } else if (subdomain) {
            config = await getPWAConfigBySubdomain(subdomain);
            const siteDoc = await adminDb.collection('sites').doc(subdomain).get();
            if (siteDoc.exists) {
                siteConfig = siteDoc.data();
            }
        }
    } catch (err) {
        console.error('Failed to fetch configurations in manifest route:', err);
    }

    const name = config?.name || siteConfig?.siteTitle || 'RentSutra';
    const shortName = config?.shortName || siteConfig?.pwaShortName || siteConfig?.siteTitle?.slice(0, 12) || 'RentSutra';
    const themeColor = config?.themeColor || siteConfig?.themeColor || '#0f172a';
    const backgroundColor = config?.backgroundColor || siteConfig?.pwaBackgroundColor || '#ffffff';
    const logo = config?.logo || siteConfig?.logoUrl || siteConfig?.faviconUrl || '';

    // Helper to dynamically resize Cloudinary URLs to match specified manifest sizes
    const getTransformedImageUrl = (url: string, w: number, h: number) => {
        if (!url) return '';
        if (url.includes('res.cloudinary.com')) {
            const parts = url.split('/upload/');
            if (parts.length === 2) {
                return `${parts[0]}/upload/c_fill,g_auto,w_${w},h_${h},f_png/${parts[1]}`;
            }
        }
        return url;
    };

    const icon192 = getTransformedImageUrl(logo, 192, 192) || '/icons/icon-192x192.png';
    const icon512 = getTransformedImageUrl(logo, 512, 512) || '/icons/icon-512x512.png';

    const manifest = {
        name,
        short_name: shortName,
        description: `Welcome to ${name}. The Modern OS for Your Rental Property.`,
        id: '/',
        start_url: subdomain ? `/tenants/my-pg?utm_source=pwa` : '/dashboard?utm_source=pwa',
        scope: '/',
        display: 'standalone',
        background_color: backgroundColor,
        theme_color: themeColor,
        orientation: 'portrait',
        icons: [
            {
                src: icon192,
                sizes: '192x192',
                type: 'image/png',
                purpose: 'any'
            },
            {
                src: icon512,
                sizes: '512x512',
                type: 'image/png',
                purpose: 'any'
            },
            {
                src: icon192,
                sizes: '192x192',
                type: 'image/png',
                purpose: 'maskable'
            },
            {
                src: icon512,
                sizes: '512x512',
                type: 'image/png',
                purpose: 'maskable'
            }
        ],
        screenshots: [
            {
                src: '/images/dashboard_loaded.png',
                sizes: '1280x720',
                type: 'image/png',
                form_factor: 'wide'
            },
            {
                src: '/images/manage_rooms_mobile.png',
                sizes: '720x1280',
                type: 'image/png',
                form_factor: 'narrow'
            }
        ]
    };

    return new NextResponse(JSON.stringify(manifest), {
        headers: {
            'Content-Type': 'application/manifest+json',
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate'
        }
    });
}
