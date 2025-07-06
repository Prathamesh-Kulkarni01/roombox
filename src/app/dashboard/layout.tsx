import DashboardSidebar from "@/components/dashboard-sidebar";
import DashboardBottomNav from "@/components/dashboard-bottom-nav";
import { DataProvider } from "@/context/data-provider";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <DataProvider>
      <div className="flex min-h-[calc(100vh-56px)]">
        <DashboardSidebar />
        <main className="flex-1 p-4 md:p-8 bg-muted/40 pb-20 md:pb-8">
          {children}
        </main>
        <DashboardBottomNav />
      </div>
    </DataProvider>
  )
}
