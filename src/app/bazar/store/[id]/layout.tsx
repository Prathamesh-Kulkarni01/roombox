import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'Fresh Mart Supermarket | Bazar Quick Commerce',
  description: '15-25 min grocery delivery from your favorite local bazar.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#16834A',
};

export default function NativeStoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="w-full min-h-screen bg-[#FFFFFF] text-[#171A18] antialiased touch-manipulation overscroll-none select-none">
      {children}
    </div>
  );
}

