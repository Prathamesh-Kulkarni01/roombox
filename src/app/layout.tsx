
import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster"
import Header from '@/components/header';
import StoreProvider from '@/components/StoreProvider';

const APP_NAME = "RoomBox";
const APP_DESCRIPTION = "RoomBox is the all-in-one rental management software for PGs, hostels, and co-living spaces. Automate rent collection, track expenses, manage tenants, and grow your business. Start for free today.";
const APP_URL = "https://roombox.app"; // Placeholder, replace with your actual domain

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  applicationName: APP_NAME,
  title: {
    default: "RoomBox | All-in-One Rental Management Software",
    template: `%s - ${APP_NAME}`,
  },
  description: APP_DESCRIPTION,
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: APP_NAME,
  },
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
      "RoomBox"
  ],
  authors: [{ name: "RoomBox Team" }],
  creator: "RoomBox",
  openGraph: {
    type: "website",
    url: "/",
    title: {
      default: "RoomBox | All-in-One Rental Management Software",
      template: `%s - ${APP_NAME}`,
    },
    description: APP_DESCRIPTION,
    siteName: APP_NAME,
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "A preview of the RoomBox dashboard showing occupancy and revenue.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: {
      default: "RoomBox | All-in-One Rental Management Software",
      template: `%s - ${APP_NAME}`,
    },
    description: APP_DESCRIPTION,
    images: ["/og-image.png"],
    creator: "@roombox_app",
  },
};

export const viewport: Viewport = {
  themeColor: "#E2F3FD",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jsonLd = {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      "name": "RoomBox",
      "applicationCategory": "BusinessApplication",
      "operatingSystem": "Web",
      "description": "Simplify your rental property management with RoomBox. The modern OS for co-living, PGs, and hostels. Automate rent collection, track expenses, and manage tenants with ease.",
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
    <html lang="en" className="!scroll-smooth">
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
          key="product-jsonld"
        />
      </head>
      <body className="font-body antialiased">
        <StoreProvider>
          <div className="flex min-h-screen flex-col">
            <Header />
            <main className="flex-1">{children}</main>
          </div>
          <Toaster />
        </StoreProvider>
      </body>
    </html>
  );
}
