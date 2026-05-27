import { withSentryConfig } from '@sentry/nextjs';
// Purge emulator variables before starting dev server with production config
const fbProjectIdForPurge = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const isEmulatorForPurge = (process.env.FIRESTORE_EMULATOR_HOST || process.env.FIREBASE_AUTH_EMULATOR_HOST) && 
                           (fbProjectIdForPurge === 'roombox-test' || process.env.NEXT_PUBLIC_USE_EMULATOR === 'true');

if (!isEmulatorForPurge && (process.env.FIRESTORE_EMULATOR_HOST || process.env.FIREBASE_AUTH_EMULATOR_HOST)) {
  delete process.env.FIRESTORE_EMULATOR_HOST;
  delete process.env.FIREBASE_AUTH_EMULATOR_HOST;
  delete process.env.NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST;
  delete process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST;
}

import type { NextConfig } from 'next';
import withPWAInit from '@ducanh2912/next-pwa';

const isDev = process.env.NODE_ENV === 'development';

const withPWA = withPWAInit({
  dest: 'public',
  disable: isDev,
  register: true,
  sw: 'sw.js', // This is the main PWA service worker
  extendDefaultRuntimeCaching: true,
  workboxOptions: {
    runtimeCaching: [
      {
        urlPattern: /manifest\.json$/i,
        handler: 'NetworkFirst',
        options: {
          cacheName: 'manifest',
          expiration: {
            maxAgeSeconds: 60 * 60, // 1 hour
          },
        },
      },
      {
        urlPattern: /^https:\/\/fonts\.(?:googleapis|gstatic)\.com\/.*/i,
        handler: 'CacheFirst',
        options: {
          cacheName: 'google-fonts',
          expiration: {
            maxEntries: 4,
            maxAgeSeconds: 365 * 24 * 60 * 60, // 365 days
          },
        },
      },
      {
        urlPattern: /\.(?:eot|otf|ttc|ttf|woff|woff2|font.css)$/i,
        handler: 'StaleWhileRevalidate',
        options: {
          cacheName: 'static-font-assets',
          expiration: {
            maxEntries: 10,
            maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
          },
        },
      },
      {
        urlPattern: /\.(?:jpg|jpeg|gif|png|svg|ico|webp)$/i,
        handler: 'StaleWhileRevalidate',
        options: {
          cacheName: 'static-image-assets',
          expiration: {
            maxEntries: 64,
            maxAgeSeconds: 24 * 60 * 60, // 24 hours
          },
        },
      },
      {
        urlPattern: /\.(?:js|css)$/i,
        handler: 'StaleWhileRevalidate',
        options: {
          cacheName: 'static-script-assets',
          expiration: {
            maxEntries: 32,
            maxAgeSeconds: 24 * 60 * 60, // 24 hours
          },
        },
      },
      {
        urlPattern: /\/(?:dashboard|login)(?:\/.*)?$/i,
        handler: 'NetworkFirst',
        options: {
          cacheName: 'auth-pages',
          expiration: {
            maxEntries: 16,
            maxAgeSeconds: 24 * 60 * 60, // 24 hours
          },
          networkTimeoutSeconds: 5, // Faster timeout for auth-sensitive pages
        },
      },
      {
        urlPattern: ({ request }: { request: any }) => request.mode === 'navigate',
        handler: 'NetworkFirst',
        options: {
          cacheName: 'pages',
          expiration: {
            maxEntries: 32,
            maxAgeSeconds: 24 * 60 * 60, // 24 hours
          },
          networkTimeoutSeconds: 10,
        },
      },
    ],
    skipWaiting: true,
    clientsClaim: true,
  },
  fallbacks: {
    document: '/offline',
  },
});

const nextConfig: NextConfig = {
  /* config options here */
  distDir: process.env.NEXT_DIST_DIR || '.next',
  typescript: {
    ignoreBuildErrors: true,
  },
  output: 'standalone',
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
      },
      {
        protocol: 'https',
        hostname: 'api.qrserver.com',
      },
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
      },
      {
        protocol: 'https',
        hostname: 'storage.googleapis.com',
      }
    ],
  },
  turbopack: {},
  webpack: (config, { dev, isServer }) => {
    // This is required to make next-pwa work with turbopack
    if (dev && !isServer) {
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300
      }
    }
    return config;
  }
};

export default withSentryConfig(withPWA(nextConfig), {
  // For all available options, see:
  // https://www.npmjs.com/package/@sentry/webpack-plugin#options

  org: "goashta",

  project: "rentsutra",

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Uncomment to route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  // This can increase your server load as well as your hosting bill.
  // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
  // side errors will fail.
  // tunnelRoute: "/monitoring",

  webpack: {
    // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
    // See the following for more information:
    // https://docs.sentry.io/product/crons/
    // https://vercel.com/docs/cron-jobs
    automaticVercelMonitors: true,

    // Tree-shaking options for reducing bundle size
    treeshake: {
      // Automatically tree-shake Sentry logger statements to reduce bundle size
      removeDebugLogging: true,
    },
  }
});
