import { NextRequest, NextResponse } from 'next/server';
import { getPWAConfigBySubdomain, getPWAConfigByOwnerId, getOwnerForTenant } from '@/lib/pwa-config';
import { auth, getAdminDb } from '@/lib/firebaseAdmin';

export const dynamic = 'force-dynamic';
export async function GET(req: NextRequest) {
  try {
    let pwaConfig = null;
    let siteConfig = null;

    const adminDb = await getAdminDb();

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

    // Generate manifest from PWA config / Site config
    const manifest = {
      name,
      short_name: shortName,
      start_url: subdomain !== 'www' && subdomain !== 'rentvastu' && subdomain !== 'roombox' ? `/site/${subdomain}` : "/dashboard",
      display: "standalone",
      background_color: backgroundColor,
      theme_color: themeColor,
      icons: logo ? [
        {
          src: logo,
          sizes: "192x192",
          type: "image/png"
        },
        {
          src: logo,
          sizes: "512x512",
          type: "image/png"
        }
      ] : [
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