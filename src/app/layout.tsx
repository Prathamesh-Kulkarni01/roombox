
import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster"
import Header from '@/components/header';
import StoreProvider from '@/components/StoreProvider';
import { ThemeProvider } from '@/components/theme-provider';
import Script from 'next/script';
import { LanguageProvider } from '@/context/language-context';
import ConfettiProvider from '@/context/confetti-provider';
import PWAHandler from '@/components/PWAHandler';
import { Analytics } from "@vercel/analytics/next"


const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://rentsutra.vercel.app";

export const metadata: Metadata = {
  title: {
    default: "RentSutra | Modern PG & Hostel Management Software",
    template: "%s | RentSutra"
  },
  description: "Simplify your rental property management with RentSutra. Automate rent collection, track occupancy, and manage tenants with ease. The all-in-one OS for co-living, PGs, and hostels.",
  metadataBase: new URL(APP_URL),
  manifest: '/manifest.json',
  keywords: [
    "rental management software",
    "property management",
    "co-living software",
    "pg management app",
    "hostel management",
    "tenant management",
    "rent collection",
    "expense tracking",
    "occupancy management",
    "RentSutra"
  ],
  authors: [{ name: "RentSutra Team" }],
  creator: "RentSutra",
  openGraph: {
    type: "website",
    url: "/",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "A preview of the RentSutra dashboard showing occupancy and revenue.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/og-image.png"],
    creator: "@rentsutra_app",
  },
  // The manifest is now generated dynamically in /site/[subdomain]/page.tsx
  // and should not be here.
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#E2F3FD" },
    { media: "(prefers-color-scheme: dark)", color: "#0A192F" },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};



export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "RentSutra",
    "applicationCategory": "BusinessApplication",
    "operatingSystem": "Web",
    "description": "Simplify your rental property management with RentSutra. The modern OS for co-living, PGs, and hostels. Automate rent collection, track expenses, and manage tenants with ease.",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "INR"
    },
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.8",
      "reviewCount": "250"
    },
    "keywords": "rental management software, property management, pg management, tenant management, rent collection, expense tracking"
  };

  return (
    <html lang="en" className="!scroll-smooth" suppressHydrationWarning>
      <head>
        <meta name="application-name" content="RentSutra" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="RentSutra" />
        <meta name="mobile-web-app-capable" content="yes" />
        <Script id="razorpay-checkout-js" src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
        <meta name="google-site-verification" content="HLDs7KWq0n7qSkYF2Lbuziso5ekVPmQM4ez6Bu6wL1A" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />

        {/* Performance Optimizations */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="preconnect" href="https://firestore.googleapis.com" />
        <link rel="preconnect" href="https://identitytoolkit.googleapis.com" />

        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
          key="product-jsonld"
        />
      </head>
      <body>
        <StoreProvider>
          <LanguageProvider>
            <ThemeProvider
              attribute="data-theme"
              defaultTheme="rose"
              enableSystem
              disableTransitionOnChange
            >
              <ConfettiProvider>
                <PWAHandler />
                <div className="flex min-h-screen flex-col">
                  <Header />
                  <main className="flex-1">{children}</main>
                </div>
                <Toaster />
              </ConfettiProvider>
            </ThemeProvider>
          </LanguageProvider>
        </StoreProvider>
      </body>
    </html>
  );
}
