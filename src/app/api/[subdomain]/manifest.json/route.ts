import { NextRequest, NextResponse } from 'next/server';
import { getPWAConfigBySubdomain, getPWAConfigByOwnerId, getOwnerForTenant } from '@/lib/pwa-config';
import { resolveTenant } from '@/platform/auth/server/tenant-resolver';
import { auth, getAdminDb } from '@/lib/firebaseAdmin';

export const dynamic = 'force-dynamic';
export async function GET(req: NextRequest) {
  try {
    let pwaConfig = null;
    let siteConfig = null;

    const { db: adminDb } = await resolveTenant(req);

    // First try to get config from subdomain
    const hostname = req.headers.get('host') || '';
    const subdomain = hostname.split('.')[0];

    if (subdomain !== 'www' && subdomain !== 'rentvastu' && subdomain !== 'roombox') {
      pwaConfig = await getPWAConfigBySubdomain(subdomain);
      const siteDoc = await adminDb.collection('sites').doc(subdomain).get();
      if (siteDoc.exists) {
        siteConfig = siteDoc.data();
      }
    }

    // If no subdomain config, try to get from auth token
    if (!pwaConfig) {
      const authHeader = req.headers.get('Authorization');
      if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.split('Bearer ')[1];
        try {
          const decodedToken = await auth.verifyIdToken(token);
          const userId = decodedToken.uid;

          // Check if user is a tenant
          const ownerId = await getOwnerForTenant(userId);
          const targetOwnerId = ownerId || userId;
          
          pwaConfig = await getPWAConfigByOwnerId(targetOwnerId);
          const snapshot = await adminDb.collection('sites').where('ownerId', '==', targetOwnerId).limit(1).get();
          if (!snapshot.empty) {
            siteConfig = snapshot.docs[0].data();
          }
        } catch (error) {
          console.error('Token verification failed:', error);
        }
      }
    }

    const name = pwaConfig?.name || siteConfig?.siteTitle || "RentVastu";
    const shortName = pwaConfig?.shortName || siteConfig?.pwaShortName || siteConfig?.siteTitle?.slice(0, 12) || "RentVastu";
    const backgroundColor = pwaConfig?.backgroundColor || siteConfig?.pwaBackgroundColor || "#ffffff";
    const themeColor = pwaConfig?.themeColor || siteConfig?.themeColor || "#000000";
    const logo = pwaConfig?.logo || siteConfig?.logoUrl || siteConfig?.faviconUrl || "";

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

    // Generate manifest from PWA config / Site config
    const manifest = {
      name,
      short_name: shortName,
      start_url: subdomain !== 'www' && subdomain !== 'rentvastu' && subdomain !== 'roombox' ? "/tenants/my-pg?utm_source=pwa" : "/dashboard",
      display: "standalone",
      background_color: backgroundColor,
      theme_color: themeColor,
      icons: [
        {
          src: icon192,
          sizes: "192x192",
          type: "image/png",
          purpose: "any"
        },
        {
          src: icon512,
          sizes: "512x512",
          type: "image/png",
          purpose: "any"
        },
        {
          src: icon192,
          sizes: "192x192",
          type: "image/png",
          purpose: "maskable"
        },
        {
          src: icon512,
          sizes: "512x512",
          type: "image/png",
          purpose: "maskable"
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

    return NextResponse.json(manifest, {
      headers: {
        'Content-Type': 'application/manifest+json',
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      },
    });
  } catch (error) {
    console.error('Failed to serve manifest:', error);

    // Return default manifest if custom one not found
    return NextResponse.json({
      name: "RentVastu",
      short_name: "RentVastu",
      start_url: "/dashboard",
      display: "standalone",
      background_color: "#ffffff",
      theme_color: "#000000",
      icons: [
        {
          "src": "icons/icon-48x48.png",
          "sizes": "48x48",
          "type": "image/png"
        },
        // ... other icon sizes
      ]
    }, {
      headers: {
        'Content-Type': 'application/manifest+json',
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      },
    });
  }
}

async function getManifest(subdomain: string) {
  // Implement your storage solution here
  // This should fetch the stored manifest for the given subdomain
  // For now, returning default
  return {
    name: "RentVastu",
    short_name: "RentVastu",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#000000",
    icons: [
      {
        "src": "icons/icon-48x48.png",
        "sizes": "48x48",
        "type": "image/png"
      },
      // ... other icon sizes
    ]
  };
}