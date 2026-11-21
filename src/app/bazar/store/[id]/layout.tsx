import type { Metadata, Viewport } from 'next';
import { bazarService } from '@/modules/bazar/services';

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  try {
    const store = await bazarService.getStoreById(id) || await bazarService.getStoreBySlug(id);
    if (store) {
      const name = store.nameMarathi ? `${store.name} (${store.nameMarathi})` : store.name;
      return {
        title: `${name} | Bazar Quick Commerce`,
        description: `Order groceries, daily essentials from ${store.name} in ${store.town || 'your area'}. 15-25 min delivery.`,
      };
    }
  } catch {
    // fallback
  }

  return {
    title: 'Bazar Store | Quick Commerce Delivery',
    description: '15-25 min grocery delivery from your favorite local bazar.',
  };
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
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

