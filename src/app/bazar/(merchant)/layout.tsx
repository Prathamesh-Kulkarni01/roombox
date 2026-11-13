import { SidebarProvider } from '@/components/ui/sidebar';
import DashboardSidebar from '@/components/dashboard-sidebar';
import DashboardBottomNav from '@/components/dashboard-bottom-nav';
import { BazarMerchantGuard } from '@/modules/bazar/components/BazarMerchantGuard';

export default function BazarMerchantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <BazarMerchantGuard>
      <SidebarProvider>
        <div className="flex min-h-[calc(100vh-56px)] w-full bg-background">
          {/* Framework Universal Collapsible Desktop Sidebar */}
          <DashboardSidebar />

          {/* Unified Content Canvas */}
          <div className="flex flex-1 flex-col overflow-auto">
            <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-7xl mx-auto w-full pb-20 md:pb-6 overflow-x-hidden">
              {children}
            </main>
          </div>

          {/* Framework Universal Mobile Bottom Navigation */}
          <DashboardBottomNav />
        </div>
      </SidebarProvider>
    </BazarMerchantGuard>
  );
}
