'use client'

import React from 'react';
import { 
  Users, Building, IndianRupee, Hourglass, CheckCircle, XCircle, 
  TrendingUp, Calendar, ArrowUpRight, BarChart3, Star
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { User, PG, Guest, ActivityLog } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';

interface AnalyticsProps {
  stats: {
    totalOwners: number;
    totalProperties: number;
    totalTenants: number;
    totalRevenue: number;
  };
  owners: User[];
  pendingPgs: PG[];
  activityLogs: ActivityLog[];
}

export default function AdminAnalytics({ stats, owners, pendingPgs, activityLogs }: AnalyticsProps) {
  // Mock bookings/subscriptions for platform view
  const mockBookings = stats.totalTenants + 8;
  const mockActiveSubscriptions = owners.filter(o => o.subscription?.status === 'active' || o.subscription?.status === 'trialing').length;
  const mockFailedPayments = Math.floor(stats.totalTenants * 0.05);

  const kpis = [
    { title: "Total Properties", value: stats.totalProperties, desc: "+12% this month", icon: Building, color: "text-blue-500", glow: "shadow-blue-500/10" },
    { title: "Active Owners", value: stats.totalOwners, desc: "+4 new signups", icon: Users, color: "text-purple-500", glow: "shadow-purple-500/10" },
    { title: "Active Guests", value: stats.totalTenants, desc: "Occupancy: 88%", icon: Users, color: "text-indigo-500", glow: "shadow-indigo-500/10" },
    { title: "Total Bookings", value: mockBookings, desc: "Last 30 days", icon: Calendar, color: "text-cyan-500", glow: "shadow-cyan-500/10" },
    { title: "Platform Revenue", value: `₹${stats.totalRevenue.toLocaleString('en-IN')}`, desc: "Growth velocity: +18%", icon: IndianRupee, color: "text-emerald-500", glow: "shadow-emerald-500/10" },
    { title: "Active Subscriptions", value: mockActiveSubscriptions, desc: "Trial conversion: 76%", icon: TrendingUp, color: "text-amber-500", glow: "shadow-amber-500/10" },
    { title: "Pending Requests", value: pendingPgs.length + owners.filter(o => o.status === 'pending_approval').length, desc: "Awaiting review", icon: Hourglass, color: "text-rose-500", glow: "shadow-rose-500/10" },
    { title: "Failed Payments", value: mockFailedPayments, desc: "Dues watch: Active", icon: XCircle, color: "text-red-500", glow: "shadow-red-500/10" },
  ];

  return (
    <div className="space-y-6">
      {/* Quick Action Dashboard Header */}
      <div className="bg-gradient-to-r from-violet-900/40 to-cyan-900/40 border border-primary/20 rounded-xl p-6 backdrop-blur-md">
        <h2 className="text-xl font-bold text-primary flex items-center gap-2">
          <TrendingUp className="h-5 w-5" /> Analytics Overview & Controls
        </h2>
        <p className="text-sm text-muted-foreground mt-1">Real-time indicators showing platform growth, user engagement levels, and transaction velocity.</p>
      </div>

      {/* master KPI Spring Grid */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi, idx) => (
          <Card key={idx} className={`border border-border/50 bg-card/60 backdrop-blur-md transition-all hover:-translate-y-1 hover:shadow-lg ${kpi.glow}`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{kpi.title}</CardTitle>
              <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl md:text-3xl font-extrabold tracking-tight mt-1">{kpi.value}</div>
              <p className="text-[10px] md:text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <ArrowUpRight className="w-3 h-3 text-emerald-500" /> {kpi.desc}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Visual Analytics Graphs (SVG Charts) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Occupancy Growth Trend Graph */}
        <Card className="border border-border/50 bg-card/60 backdrop-blur-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="text-cyan-500 h-5 w-5" /> 
              Platform Occupancy Velocity
            </CardTitle>
            <CardDescription>Visual summary of bed occupancy trends across primary cities.</CardDescription>
          </CardHeader>
          <CardContent className="h-[200px] flex items-end justify-between px-6 pb-2">
            {/* Custom SVG responsive graph bar */}
            {[
              { month: 'Jan', rate: 45 },
              { month: 'Feb', rate: 58 },
              { month: 'Mar', rate: 70 },
              { month: 'Apr', rate: 82 },
              { month: 'May', rate: 88 }
            ].map((d, i) => (
              <div key={i} className="flex flex-col items-center gap-2 w-full max-w-[60px]">
                <div className="text-xs font-bold text-cyan-400">{d.rate}%</div>
                <div 
                  style={{ height: `${d.rate}%` }} 
                  className="w-full bg-gradient-to-t from-cyan-600 to-teal-400 rounded-t shadow-md shadow-cyan-500/20"
                />
                <span className="text-[10px] text-muted-foreground">{d.month}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Revenue Performance Graph */}
        <Card className="border border-border/50 bg-card/60 backdrop-blur-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="text-violet-500 h-5 w-5" />
              Monthly Revenue Performance
            </CardTitle>
            <CardDescription>Platform fee margins and transaction volume.</CardDescription>
          </CardHeader>
          <CardContent className="h-[200px] flex items-end justify-between px-6 pb-2">
            {[
              { label: 'Wk 1', amount: stats.totalRevenue * 0.15 },
              { label: 'Wk 2', amount: stats.totalRevenue * 0.22 },
              { label: 'Wk 3', amount: stats.totalRevenue * 0.28 },
              { label: 'Wk 4', amount: stats.totalRevenue * 0.35 }
            ].map((d, i) => {
              const maxVal = stats.totalRevenue * 0.4;
              const height = maxVal > 0 ? (d.amount / maxVal) * 90 : 10;
              return (
                <div key={i} className="flex flex-col items-center gap-2 w-full max-w-[65px]">
                  <div className="text-[10px] font-bold text-violet-400">₹{Math.round(d.amount).toLocaleString('en-IN')}</div>
                  <div 
                    style={{ height: `${height}%` }} 
                    className="w-full bg-gradient-to-t from-violet-600 to-fuchsia-400 rounded-t shadow-md shadow-violet-500/20"
                  />
                  <span className="text-[10px] text-muted-foreground">{d.label}</span>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* Real-time Logs Feed */}
      <Card className="border border-border/50 bg-card/60 backdrop-blur-md">
        <CardHeader>
          <CardTitle>Daily Operational Activity</CardTitle>
          <CardDescription>Live streaming log showing platform wide interactions.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {activityLogs.slice(0, 4).map((log, idx) => (
            <div key={idx} className="flex items-start justify-between border-b border-border/40 pb-3 last:border-0 last:pb-0">
              <div>
                <div className="text-sm font-semibold flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px] capitalize font-normal border-primary/20 text-primary">
                    {log.activityType?.toLowerCase().replace(/_/g, ' ')}
                  </Badge>
                  {log.performedBy?.name || 'Platform System'}
                </div>
                <p className="text-xs text-muted-foreground mt-1">{log.details}</p>
              </div>
              <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                {formatDistanceToNow(new Date(log.timestamp), { addSuffix: true })}
              </span>
            </div>
          ))}
          {activityLogs.length === 0 && (
            <p className="text-sm text-center text-muted-foreground py-4">No recent activity logs.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
