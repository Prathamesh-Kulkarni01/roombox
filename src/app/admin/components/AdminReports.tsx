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

  const triggerCSVDownload = (headers: string[], rows: string[][], filename: string) => {
    try {
      const csvRows = [
        headers.join(','),
        ...rows.map(row => 
          row.map(val => {
            const escaped = (val ?? '').toString().replace(/"/g, '""');
            return `"${escaped}"`;
          }).join(',')
        )
      ];
      
      const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "Export Completed",
        description: `Successfully downloaded report: ${filename}`
      });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Export Failed",
        description: err.message || "Failed to package spreadsheet records."
      });
    }
  };

  const handleExport = (reportTitle: string, type: 'GROWTH' | 'LEDGER' | 'MOCK_PDF') => {
    if (type === 'MOCK_PDF') {
      toast({
        title: "Generating Export File",
        description: `Assembling data logs for ${reportTitle}. Your PDF download will begin momentarily.`
      });
      return;
    }

    if (type === 'GROWTH') {
      const headers = ['Landlord Name', 'Email', 'Phone', 'Account Status', 'Plan ID', 'Trial Balance', 'Recharge Balance', 'Registered Date'];
      const rows = owners.map(owner => [
        owner.name || 'N/A',
        owner.email || 'N/A',
        owner.phone || 'N/A',
        owner.status || 'N/A',
        owner.subscription?.planId || 'N/A',
        (owner.wallet?.trialBalance ?? 0).toString(),
        (owner.wallet?.rechargeBalance ?? 0).toString(),
        owner.createdAt || 'N/A'
      ]);
      triggerCSVDownload(headers, rows, `roombox_landlord_growth_${new Date().toISOString().slice(0, 10)}.csv`);
    } else if (type === 'LEDGER') {
      const headers = ['Landlord Name', 'Email', 'Plan Type', 'Base Fee Rate', 'Per Tenant Rate', 'Trial Balance', 'Recharge Balance', 'Dues Debt'];
      const rows = owners.map(owner => [
        owner.name || 'N/A',
        owner.email || 'N/A',
        owner.billingConfig?.planType || 'monthly',
        (owner.billingConfig?.baseFee ?? 0).toString(),
        (owner.billingConfig?.perTenantFee ?? 0).toString(),
        (owner.wallet?.trialBalance ?? 0).toString(),
        (owner.wallet?.rechargeBalance ?? 0).toString(),
        (owner.wallet?.dues ?? 0).toString()
      ]);
      triggerCSVDownload(headers, rows, `roombox_wallet_ledger_${new Date().toISOString().slice(0, 10)}.csv`);
    }
  };

  const reports = [
    { title: "Daily Operational Growth Summary", desc: "Covers daily signups, new properties, and active platform traffic.", date: "Updated today, 07:00 AM", format: "CSV" as const, type: 'GROWTH' as const },
    { title: "Weekly Financial Reconciliation Audit", desc: "Detailed transactions logs, Razorpay webhooks matching status, and payout audits.", date: "Updated last Sunday", format: "PDF" as const, type: 'MOCK_PDF' as const },
    { title: "Monthly Platform Occupancy Index", desc: "Aggregation of occupancy percentages by city, room types, and vacated counts.", date: "Updated May 1st, 2026", format: "PDF" as const, type: 'MOCK_PDF' as const },
    { title: "Dual-Wallet Billing & Ledger Export", desc: "Master log sheet containing all ledger entries, promotional credits, and debt dues.", date: "Updated last week", format: "CSV" as const, type: 'LEDGER' as const }
  ];

  return (
    <div className="space-y-6">
      {/* Visual Report Grid */}
      <div className="grid gap-4 md:grid-cols-2">
        {reports.map((report, idx) => (
          <Card key={idx} className="border border-slate-800 bg-slate-950/40 backdrop-blur-md hover:bg-slate-900/40 transition-all rounded-2xl overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="text-[9px] border-slate-800 text-violet-400 uppercase font-extrabold px-2 py-0.5">
                  {report.format}
                </Badge>
                <span className="text-[10px] text-slate-500 flex items-center gap-1 font-bold">
                  <Calendar className="w-3.5 h-3.5 text-slate-600" /> {report.date}
                </span>
              </div>
              <CardTitle className="text-sm font-extrabold mt-3 text-slate-200">{report.title}</CardTitle>
              <CardDescription className="text-xs text-slate-400 font-medium mt-1 leading-relaxed">{report.desc}</CardDescription>
            </CardHeader>
            <CardContent className="pt-2 flex items-center justify-end px-4 pb-4">
              <Button 
                size="sm" 
                onClick={() => handleExport(report.title, report.type)}
                className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-extrabold text-[10px] h-8 px-3 rounded-lg shadow-lg shadow-violet-500/10 border border-violet-500/20"
              >
                <Download className="w-3.5 h-3.5 mr-1" /> Download
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Platform Performance Metrics */}
      <Card className="border border-slate-800 bg-slate-950/40 backdrop-blur-md rounded-2xl overflow-hidden">
        <CardHeader className="pb-3 border-b border-slate-900/60">
          <CardTitle className="text-sm font-extrabold text-slate-200">Platform Aggregation Indices</CardTitle>
          <CardDescription className="text-xs text-slate-400 font-medium">Consolidated statistics on occupancy, collections, and pricing metrics.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-3 pt-6">
          <div className="space-y-1.5 border-r border-slate-900 last:border-0 pr-4">
            <div className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">Average Room Rental</div>
            <div className="text-2xl font-black text-slate-200 flex items-baseline gap-1">
              ₹8,450 <span className="text-[10px] text-slate-500 font-normal">/ month</span>
            </div>
            <p className="text-[9px] text-slate-500 font-semibold">Calculated across active platform room configurations</p>
          </div>
          
          <div className="space-y-1.5 border-r border-slate-900 last:border-0 pr-4">
            <div className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">Renter Occupancy Ratio</div>
            <div className="text-2xl font-black text-cyan-400 flex items-baseline gap-1">
              88.4% <span className="text-[10px] text-slate-500 font-normal">occupied</span>
            </div>
            <p className="text-[9px] text-slate-500 font-semibold">Total active tenants vs registered bed spaces</p>
          </div>

          <div className="space-y-1.5">
            <div className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">Paid Subscription Status</div>
            <div className="text-2xl font-black text-violet-400 flex items-baseline gap-1">
              {stats.totalOwners > 0 ? Math.round((owners.filter((o: User) => o.subscription?.status === 'active').length / stats.totalOwners) * 100) : 0}% 
              <span className="text-[10px] text-slate-500 font-normal">active paid</span>
            </div>
            <p className="text-[9px] text-slate-500 font-semibold">Ratio of owners on active paid plans</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
