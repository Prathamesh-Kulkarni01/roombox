import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import Access from "@/components/ui/PermissionWrapper";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  BedDouble,
  ShieldAlert,
  Wallet,
  Clock,
  IndianRupee,
  Users,
} from "lucide-react";

export interface DashboardStats {
  occupancy: { total: number; occupied: number; newThisMonth: number };
  complaints: { active: number; severity: "High" | "Normal" };
  revenue: {
    collected: number;
    expected: number;
    collectedToday: number;
    symbolicBalance?: string | null;
    symbolicCollected?: number;
    symbolicCollectedToday?: number;
  };
  pendingDues: { amount: number; symbolicBalance?: string | null };
  walletBalance?: number;
}

interface StatsCardsProps {
  stats: DashboardStats;
}

export function PendingDuesCard({
  amount,
  symbolicBalance,
  onSendReminders,
}: {
  amount: number;
  symbolicBalance?: string | null;
  onSendReminders: () => void;
}) {
  return (
    <Access feature="finances" action="view">
      <div className="bg-red-50 dark:bg-red-500/10 border-red-100 dark:border-red-500/20 border shadow-sm rounded-2xl p-3 sm:p-4 flex flex-col sm:flex-row gap-2 sm:gap-3 sm:items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-red-500/20 text-red-600 dark:text-red-400 rounded-full shrink-0">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-red-600/80 dark:text-red-400/80 uppercase tracking-wider mb-0">
              Pending Dues
            </p>
            <h3 className="text-lg sm:text-2xl font-black text-red-600 dark:text-red-400">
              {amount > 0 ? `₹${amount.toLocaleString("en-IN")}` : ""}
              {amount > 0 && symbolicBalance ? " + " : ""}
              {symbolicBalance || (amount === 0 ? "₹0" : "")}
            </h3>
          </div>
        </div>
        <Button
          variant="outline"
          onClick={onSendReminders}
          size="sm"
          className="w-full sm:w-auto border-red-600/20 text-red-600 hover:bg-red-600 hover:text-white dark:border-red-400/30 dark:text-red-400 dark:hover:bg-red-500/20 dark:hover:text-red-400 font-bold tracking-tight rounded-xl text-[10px] h-8"
        >
          SEND ALERTS
        </Button>
      </div>
    </Access>
  );
}

export default function StatsCards({ stats }: StatsCardsProps) {
  const occPercentage =
    stats.occupancy.total > 0
      ? Math.round((stats.occupancy.occupied / stats.occupancy.total) * 100)
      : 0;
  let revPercentage =
    stats.revenue.expected > 0
      ? Math.round((stats.revenue.collected / stats.revenue.expected) * 100)
      : 0;
  if (isNaN(revPercentage)) revPercentage = 0;

  return (
    <div className="flex flex-col gap-4">
      {/* Mobile-only Balance & Beds Row */}
      {/* <div className="grid grid-cols-2 gap-4 lg:hidden">
        <Card className="glass border-emerald-500/20 bg-emerald-500/5 overflow-hidden">
          <CardContent className="p-4 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between mb-2">
              <div className="p-1.5 bg-emerald-500/10 text-emerald-600 rounded-lg">
                <Wallet className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600/70">Wallet</span>
            </div>
            <div>
              <p className="text-xl font-black tracking-tight text-emerald-600">₹{(stats.walletBalance || 0).toLocaleString('en-IN')}</p>
              <p className="text-[10px] font-bold text-muted-foreground mt-0.5">Balance</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass border-violet-500/20 bg-violet-500/5 overflow-hidden">
          <CardContent className="p-4 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between mb-2">
              <div className="p-1.5 bg-violet-500/10 text-violet-600 rounded-lg">
                <Users className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-violet-600/70">Beds</span>
            </div>
            <div>
              <p className="text-xl font-black tracking-tight text-violet-600">
                {stats.occupancy.occupied}
                <span className="text-xs text-muted-foreground/50 ml-1">/ {stats.occupancy.total}</span>
              </p>
              <p className="text-[10px] font-bold text-muted-foreground mt-0.5">Occupancy</p>
            </div>
          </CardContent>
        </Card>
      </div> */}

      {/* Top Row: Occupancy & Complaints */}
      <div className="grid grid-cols-2 gap-4">
        {/* Occupancy Card */}
        <Access feature="properties" action="view">
          <Card className="glass shadow-native transition-all duration-300 hover:shadow-native-lg border-border/40 overflow-hidden relative group">
            <CardHeader className="p-3 sm:p-4 pb-1 sm:pb-2 flex flex-row items-center justify-between">
              <div className="p-1.5 bg-primary/10 text-primary rounded-xl">
                <BedDouble className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              {stats.occupancy.newThisMonth > 0 && (
                <Badge
                  variant="secondary"
                  className="text-primary bg-primary/10 border-none font-bold text-[9px] sm:text-xs px-1.5"
                >{`+${stats.occupancy.newThisMonth} New`}</Badge>
              )}
            </CardHeader>
            <CardContent className="p-3 sm:p-4 pt-0 sm:pt-1 space-y-2 sm:space-y-3">
              <div>
                <div className="flex items-baseline gap-1">
                  <h2 className="text-xl sm:text-3xl font-extrabold">
                    {stats.occupancy.occupied}
                  </h2>
                  <span className="text-[10px] sm:text-base text-muted-foreground font-semibold">
                    / {stats.occupancy.total}
                  </span>
                </div>
                <p className="text-[10px] sm:text-sm font-medium text-muted-foreground">
                  Occupancy ({occPercentage}%)
                </p>
              </div>
              <Progress value={occPercentage} className="h-1 bg-primary/10" />
            </CardContent>
          </Card>
        </Access>

        {/* Complaints Card */}
        <Access feature="complaints" action="view">
          <Card className="glass shadow-native transition-all duration-300 hover:shadow-native-lg border-border/40 overflow-hidden relative group">
            <CardHeader className="p-3 sm:p-4 pb-1 sm:pb-2 flex flex-row items-center justify-between">
              <div className="p-1.5 bg-orange-500/10 text-orange-500 rounded-xl">
                <ShieldAlert className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              {stats.complaints.active > 0 && (
                <Badge
                  variant="outline"
                  className="text-orange-500 border-orange-500/30 font-bold text-[9px] sm:text-xs px-1.5"
                >
                  {stats.complaints.severity}
                </Badge>
              )}
            </CardHeader>
            <CardContent className="p-3 sm:p-4 pt-0 sm:pt-1">
              <h2 className="text-xl sm:text-3xl font-extrabold">
                {stats.complaints.active.toString().padStart(2, "0")}
              </h2>
              <p className="text-[10px] sm:text-sm font-medium text-muted-foreground">
                Active Complaints
              </p>
            </CardContent>
          </Card>
        </Access>
      </div>

      {/* Middle Row: Revenue (Merged) */}
      <Access feature="finances" action="view">
        <Card className="glass shadow-native transition-all duration-300 hover:shadow-native-lg border-border/40 overflow-hidden relative group bg-gradient-to-br from-background to-emerald-50/20 dark:to-emerald-500/5">
          <CardHeader className="p-3 sm:p-4 pb-1 sm:pb-2 flex flex-row items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5 sm:gap-2 mb-1">
                <div className="w-6 h-6 sm:w-8 sm:h-8 bg-emerald-500/10 text-emerald-600 rounded-lg flex items-center justify-center">
                  <IndianRupee className="w-3 h-3 sm:w-4 sm:h-4" />
                </div>
                <p className="text-[9px] sm:text-xs font-bold text-muted-foreground uppercase tracking-widest">
                  Monthly Collection
                </p>
              </div>
              <h2 className="text-xl sm:text-3xl font-black text-foreground">
                {stats.revenue.expected >= 100000 ? (
                  <>
                    {stats.revenue.collected > 0
                      ? `₹${(stats.revenue.collected / 100000).toFixed(2)}L`
                      : ""}
                    {stats.revenue.collected > 0 &&
                    stats.revenue.symbolicCollected
                      ? " + "
                      : ""}
                    {stats.revenue.symbolicCollected
                      ? stats.revenue.symbolicCollected === 1
                        ? "XXX"
                        : stats.revenue.symbolicCollected + "XXX"
                      : stats.revenue.collected === 0
                        ? "₹0"
                        : ""}
                    <span className="text-sm sm:text-lg font-medium text-muted-foreground ml-1">
                      / {(stats.revenue.expected / 100000).toFixed(2)}L{" "}
                      {stats.revenue.symbolicBalance
                        ? `+ ${stats.revenue.symbolicBalance}`
                        : ""}
                    </span>
                  </>
                ) : (
                  <>
                    {stats.revenue.collected > 0
                      ? `₹${stats.revenue.collected.toLocaleString("en-IN")}`
                      : ""}
                    {stats.revenue.collected > 0 &&
                    stats.revenue.symbolicCollected
                      ? " + "
                      : ""}
                    {stats.revenue.symbolicCollected
                      ? stats.revenue.symbolicCollected === 1
                        ? "XXX"
                        : stats.revenue.symbolicCollected + "XXX"
                      : stats.revenue.collected === 0
                        ? "₹0"
                        : ""}
                    <span className="text-sm sm:text-lg font-medium text-muted-foreground ml-1">
                      / {stats.revenue.expected.toLocaleString("en-IN")}
                      {stats.revenue.symbolicBalance
                        ? ` + ${stats.revenue.symbolicBalance}`
                        : ""}
                    </span>
                  </>
                )}
              </h2>
            </div>
            <div className="text-right flex flex-col items-end">
              <Badge
                variant="outline"
                className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-black px-2 py-1 mb-1"
              >
                {stats.revenue.collectedToday > 0
                  ? `+ ₹${(stats.revenue.collectedToday || 0).toLocaleString("en-IN")}`
                  : ""}
                {stats.revenue.collectedToday > 0 &&
                stats.revenue.symbolicCollectedToday
                  ? " + "
                  : ""}
                {stats.revenue.symbolicCollectedToday
                  ? stats.revenue.symbolicCollectedToday === 1
                    ? "XXX"
                    : stats.revenue.symbolicCollectedToday + "XXX"
                  : stats.revenue.collectedToday === 0
                    ? "₹0"
                    : ""}
              </Badge>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-tighter">
                Collected Today
              </p>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                {revPercentage}% Efficiency
              </span>
              <span className="text-xs font-bold text-muted-foreground">
                {stats.revenue.collected > 0
                  ? `₹${(stats.revenue.collected || 0).toLocaleString("en-IN")}`
                  : ""}
                {stats.revenue.collected > 0 && stats.revenue.symbolicCollected
                  ? " + "
                  : ""}
                {stats.revenue.symbolicCollected
                  ? stats.revenue.symbolicCollected === 1
                    ? "XXX"
                    : stats.revenue.symbolicCollected + "XXX"
                  : stats.revenue.collected === 0
                    ? "₹0"
                    : ""}{" "}
                collected
              </span>
            </div>
            <Progress
              value={revPercentage}
              className="h-2 rounded-full bg-emerald-100 dark:bg-emerald-950/20"
            />
          </CardContent>
        </Card>
      </Access>
    </div>
  );
}
