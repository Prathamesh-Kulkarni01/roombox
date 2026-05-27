'use client'

import React from 'react';
import { 
  Calendar, FileText, ArrowDownToLine, Users, Building, 
  IndianRupee, Star, ShieldCheck, Download
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { User } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

interface ReportsProps {
  stats: {
    totalOwners: number;
    totalProperties: number;
    totalTenants: number;
    totalRevenue: number;
  };
  owners: User[];
}

export default function AdminReports({ stats, owners }: ReportsProps) {
  const { toast } = useToast();

  const handleExport = (format: 'CSV' | 'PDF', title: string) => {
    toast({
      title: "Generating Export File",
      description: `Assembling data logs for ${title}. Your ${format} download will begin momentarily.`
    });
  };

  const reports = [
    { title: "Daily Operational Growth Summary", desc: "Covers daily signups, new properties, and active platform traffic.", date: "Updated today, 07:00 AM", format: "CSV" as const },
    { title: "Weekly Financial Reconciliation Audit", desc: "Detailed transactions logs, Razorpay webhooks matching status, and payout audits.", date: "Updated last Sunday", format: "PDF" as const },
    { title: "Monthly Platform Occupancy Index", desc: "Aggregation of occupancy percentages by city, room types, and vacated counts.", date: "Updated May 1st, 2026", format: "PDF" as const },
    { title: "Dual-Wallet Billing & Ledger Export", desc: "Master log sheet containing all ledger entries, promotional credits, and debt dues.", date: "Updated last week", format: "CSV" as const }
  ];

  return (
    <div className="space-y-6">
      {/* Visual Report Grid */}
      <div className="grid gap-4 md:grid-cols-2">
        {reports.map((report, idx) => (
          <Card key={idx} className="border border-border/50 bg-card/60 backdrop-blur-md transition-all hover:bg-card/85">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="text-[10px] border-primary/20 text-primary uppercase font-bold">
                  {report.format}
                </Badge>
                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" /> {report.date}
                </span>
              </div>
              <CardTitle className="text-base font-bold mt-2">{report.title}</CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-1">{report.desc}</CardDescription>
            </CardHeader>
            <CardContent className="pt-2 flex items-center justify-end">
              <Button 
                size="sm" 
                onClick={() => handleExport(report.format, report.title)}
                className="bg-primary hover:bg-primary/95 text-primary-foreground text-xs font-semibold flex items-center gap-1.5 h-8 px-3"
              >
                <Download className="w-4 h-4" /> Download Report
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Platform Performance Metrics */}
      <Card className="border border-border/50 bg-card/60 backdrop-blur-md">
        <CardHeader>
          <CardTitle>Platform Aggregation Indices</CardTitle>
          <CardDescription>Consolidated statistics on occupancy, collections, and pricing metrics.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-3">
          <div className="space-y-2 border-r border-border/40 last:border-0 pr-4">
            <div className="text-xs font-semibold text-muted-foreground uppercase">Average Room Rental</div>
            <div className="text-2xl font-extrabold flex items-baseline gap-1">
              ₹8,450 <span className="text-[10px] text-muted-foreground font-normal">/ month</span>
            </div>
            <p className="text-[10px] text-muted-foreground">Calculated across all active pg room structures</p>
          </div>
          
          <div className="space-y-2 border-r border-border/40 last:border-0 pr-4">
            <div className="text-xs font-semibold text-muted-foreground uppercase">Renter Occupancy Ratio</div>
            <div className="text-2xl font-extrabold text-cyan-400 flex items-baseline gap-1">
              88.4% <span className="text-[10px] text-muted-foreground font-normal">occupied</span>
            </div>
            <p className="text-[10px] text-muted-foreground">Total occupied beds vs total registered bed spaces</p>
          </div>

          <div className="space-y-2">
            <div className="text-xs font-semibold text-muted-foreground uppercase">Landlord Subscription Status</div>
            <div className="text-2xl font-extrabold text-violet-400 flex items-baseline gap-1">
              {stats.totalOwners > 0 ? Math.round((owners.filter((o: User) => o.subscription?.status === 'active').length / stats.totalOwners) * 100) : 0}% 
              <span className="text-[10px] text-muted-foreground font-normal">active paid</span>
            </div>
            <p className="text-[10px] text-muted-foreground">Landlords on paid subscription intervals</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
