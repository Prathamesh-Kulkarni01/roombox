import { NextRequest, NextResponse } from 'next/server';
import { getPWAConfigBySubdomain, getPWAConfigByOwnerId, getOwnerForTenant } from '@/lib/pwa-config';
import { auth } from '@/lib/firebaseAdmin';

export async function GET(req: NextRequest) {
  try {
    let pwaConfig = null;
    
    // First try to get config from subdomain
    const hostname = req.headers.get('host') || '';
    const subdomain = hostname.split('.')[0];
    
    if (subdomain !== 'www' && subdomain !== 'rentvastu') {
      pwaConfig = await getPWAConfigBySubdomain(subdomain);
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
          if (ownerId) {
            // Get owner's PWA config
            pwaConfig = await getPWAConfigByOwnerId(ownerId);
          } else {
            // User might be an owner
            pwaConfig = await getPWAConfigByOwnerId(userId);
          }
        } catch (error) {
          console.error('Token verification failed:', error);
        }
      }
    }

    // Generate manifest from PWA config
    const manifest = pwaConfig ? {
      name: pwaConfig.name,
      short_name: pwaConfig.shortName,
      start_url: pwaConfig.subdomain ? `/${pwaConfig.subdomain}` : '/',
      display: "standalone",
      background_color: pwaConfig.backgroundColor,
      theme_color: pwaConfig.themeColor,
      icons: pwaConfig.logo ? [
        {
          src: pwaConfig.logo,
          sizes: "512x512",
          type: "image/png"
        }
      ] : [
        {
          "src": "icons/icon-48x48.png",
          "sizes": "48x48",
          "type": "image/png"
        }
        // Add other default icons
      ]
    } : {
      name: "RentVastu",
      short_name: "RentVastu",
      start_url: "/",
      display: "standalone",
      background_color: "#ffffff",
      theme_color: "#000000",
      icons: [
        {
          "src": "icons/icon-48x48.png",
          "sizes": "48x48",
          "type": "image/png"
        }
        // Add other default icons
      ]
    };

    return NextResponse.json(manifest, {
      headers: {
        'Content-Type': 'application/manifest+json',
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      },
    });
  } catch (error) {
    console.error('Failed to serve manifest:', error);
    
    // Return default manifest if custom one not found
    return NextResponse.json({
      name: "RentVastu",
      short_name: "RentVastu",
      start_url: "/",
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
        'Cache-Control': 'public, max-age=3600',
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
    start_url: "/",
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