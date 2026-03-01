import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import Access from "@/components/ui/PermissionWrapper";
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { BedDouble, ShieldAlert, Wallet, Clock, IndianRupee } from "lucide-react"

export interface DashboardStats {
  occupancy: { total: number, occupied: number, newThisMonth: number };
  complaints: { active: number, severity: 'High' | 'Normal' };
  revenue: { collected: number, expected: number };
  pendingDues: { amount: number };
}

interface StatsCardsProps {
  stats: DashboardStats;
  onSendReminders: () => void;
}

export default function StatsCards({ stats, onSendReminders }: StatsCardsProps) {
  const occPercentage = stats.occupancy.total > 0 ? Math.round((stats.occupancy.occupied / stats.occupancy.total) * 100) : 0;
  const revPercentage = stats.revenue.expected > 0 ? Math.round((stats.revenue.collected / stats.revenue.expected) * 100) : 0;

  return (
    <div className="flex flex-col gap-4">
      {/* Top Row: Occupancy & Complaints */}
      <div className="grid grid-cols-2 gap-4">
        {/* Occupancy Card */}
        <Access feature="properties" action="view">
          <Card className="glass shadow-native transition-all duration-300 hover:shadow-native-lg border-border/40 overflow-hidden relative group">
            <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
              <div className="p-2 bg-primary/10 text-primary rounded-xl">
                <BedDouble className="w-5 h-5" />
              </div>
              {stats.occupancy.newThisMonth > 0 && <Badge variant="secondary" className="text-primary bg-primary/10 border-none font-bold text-xs">{`+${stats.occupancy.newThisMonth} New`}</Badge>}
            </CardHeader>
            <CardContent className="p-4 pt-1">
              <div className="flex items-baseline gap-1">
                <h2 className="text-3xl font-extrabold">{stats.occupancy.occupied}</h2>
                <span className="text-muted-foreground font-semibold">/ {stats.occupancy.total}</span>
              </div>
              <p className="text-sm font-medium text-muted-foreground mt-1">Occupancy ({occPercentage}%)</p>
            </CardContent>
          </Card>
        </Access>

        {/* Complaints Card */}
        <Access feature="complaints" action="view">
          <Card className="glass shadow-native transition-all duration-300 hover:shadow-native-lg border-border/40 overflow-hidden relative group">
            <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
              <div className="p-2 bg-orange-500/10 text-orange-500 rounded-xl">
                <ShieldAlert className="w-5 h-5" />
              </div>
              {stats.complaints.active > 0 && <Badge variant="outline" className="text-orange-500 border-orange-500/30 font-bold text-xs">{stats.complaints.severity}</Badge>}
            </CardHeader>
            <CardContent className="p-4 pt-1">
              <h2 className="text-3xl font-extrabold">{stats.complaints.active.toString().padStart(2, '0')}</h2>
              <p className="text-sm font-medium text-muted-foreground mt-1">Active Complaints</p>
            </CardContent>
          </Card>
        </Access>
      </div>

      {/* Middle Row: Revenue */}
      <Access feature="finances" action="view">
        <Card className="glass shadow-native transition-all duration-300 hover:shadow-native-lg border-border/40 overflow-hidden relative group">
          <CardHeader className="p-4 pb-2">
            <div className="w-10 h-10 bg-green-500/10 text-green-500 rounded-xl flex items-center justify-center mb-2">
              <IndianRupee className="w-5 h-5" />
            </div>
            <p className="text-sm font-semibold text-muted-foreground">Rent Collected</p>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="flex flex-wrap lg:flex-nowrap items-baseline gap-1.5 mb-3">
              <h2 className="text-3xl font-extrabold text-foreground">{(stats.revenue.collected / 100000).toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 1 }).replace('₹', '₹ ')}L</h2>
              <span className="text-muted-foreground font-semibold">/ {(stats.revenue.expected / 100000).toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 1 }).replace('₹', '₹ ')}L</span>
              <span className="ml-auto text-primary font-bold">{revPercentage}%</span>
            </div>
            <Progress value={revPercentage} className="h-2 rounded-full" />
          </CardContent>
        </Card>
      </Access>

      {/* Bottom Row: Pending Dues */}
      <Access feature="finances" action="view">
        <div className="bg-red-50 dark:bg-red-500/10 border-red-100 dark:border-red-500/20 border shadow-sm rounded-2xl p-4 flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-500/20 text-red-600 dark:text-red-400 rounded-full shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-red-600/80 dark:text-red-400/80 uppercase tracking-wider mb-0.5">Pending Dues</p>
              <h3 className="text-2xl font-black text-red-600 dark:text-red-400">₹{stats.pendingDues.amount.toLocaleString('en-IN')}</h3>
            </div>
          </div>
          <Button variant="outline" onClick={onSendReminders} className="border-red-600/20 text-red-600 hover:bg-red-600 hover:text-white dark:border-red-400/30 dark:text-red-400 dark:hover:bg-red-500/20 dark:hover:text-red-400 font-bold tracking-tight rounded-xl">SEND ALERTS</Button>
        </div>
      </Access>
    </div>
  )
}
