import { GroceryCartProvider } from '@/modules/bazar/context/GroceryCartContext';
import { SingleStoreCartConflictModal } from '@/modules/bazar/components/SingleStoreCartConflictModal';

/**
 * Unified Root Bazar Layout
 * Automatically synchronizes with the Roombox Platform Theme Engine (Rose, Saffron, Blue, Green, Violet, Dark/Light).
 */
export default function BazarRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <GroceryCartProvider>
      <div className="min-h-screen bg-background text-foreground antialiased">
        {children}
        <SingleStoreCartConflictModal />
      </div>
    </GroceryCartProvider>
  );
}
