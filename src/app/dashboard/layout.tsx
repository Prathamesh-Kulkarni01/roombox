import DashboardSidebar from "@/components/dashboard-sidebar";
import DashboardBottomNav from "@/components/dashboard-bottom-nav";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
      <div className="flex min-h-[calc(100vh-56px)]">
        <DashboardSidebar />
        <div className="flex flex-1 flex-col overflow-auto">
          <main className="flex-1 p-4 bg-muted/40 pb-20 md:pb-4">
            {children}
          </main>
        </div>
        <DashboardBottomNav />
      </div>
  )
}
