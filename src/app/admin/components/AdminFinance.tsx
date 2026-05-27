'use client'

import React, { useState } from 'react';
import { 
  CreditCard, IndianRupee, Wallet, Calendar, Search, Filter, 
  ArrowUpRight, ArrowDownRight, AlertTriangle, CheckCircle, Info, Landmark, TrendingUp, Star
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import type { User, Guest } from '@/lib/types';

interface FinanceProps {
  owners: User[];
  stats: {
    totalRevenue: number;
    totalTenants: number;
  };
  allPayments?: any[];
  allGuests?: Guest[];
}

export default function AdminFinance({ owners, stats, allPayments = [], allGuests = [] }: FinanceProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'restricted' | 'trial' | 'dues'>('all');

  // 1. Dynamic MRR & ARR Calculations
  // MRR = Active Owners * baseFee (₹199) + Active Tenants * usageFee (₹20)
  const baseFeeRunRate = owners.filter(o => o.status === 'active').length * 199;
  const tenantFeeRunRate = stats.totalTenants * 20;
  const mrr = baseFeeRunRate + tenantFeeRunRate;
  const arr = mrr * 12;

  // 2. Compute landlord financial profiles
  const financialProfiles = owners.map(owner => {
    const wallet = owner.wallet ?? { balance: 0, trialBalance: 0, rechargeBalance: 0, dues: 0 };
    const billing = owner.billingConfig ?? { planType: 'monthly', baseFee: 0, perTenantFee: 0 };
    return {
      id: owner.id,
      name: owner.name,
      email: owner.email || 'N/A',
      phone: owner.phone || 'N/A',
      wallet,
      billing,
      subscriptionStatus: owner.subscription?.status || 'N/A'
    };
  });

  const filteredProfiles = financialProfiles.filter(profile => {
    const matchesSearch = profile.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          profile.email.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (filterType === 'all') return matchesSearch;
    if (filterType === 'restricted') return matchesSearch && profile.subscriptionStatus === 'restricted';
    if (filterType === 'trial') return matchesSearch && profile.wallet.trialBalance > 0;
    if (filterType === 'dues') return matchesSearch && profile.wallet.dues > 0;
    return matchesSearch;
  });

  // Calculate platform aggregate financial indicators
  const totalTrialCred = financialProfiles.reduce((acc, p) => acc + (p.wallet.trialBalance || 0), 0);
  const totalRechargeCred = financialProfiles.reduce((acc, p) => acc + (p.wallet.rechargeBalance || 0), 0);
  const totalDuesDebt = financialProfiles.reduce((acc, p) => acc + (p.wallet.dues || 0), 0);

  // 3. Dues Recovery Queue: Sort landlords with dues > 0 desc
  const duesRecoveryQueue = financialProfiles
    .filter(p => p.wallet.dues > 0)
    .sort((a, b) => b.wallet.dues - a.wallet.dues);

  // 4. Top Paying Landlords: Sum paymentHistory inside allPayments grouped by owner
  const topPayingLandlords = React.useMemo(() => {
    const paymentsMap: Record<string, number> = {};
    allPayments.forEach(p => {
      if (p.ownerId) {
        paymentsMap[p.ownerId] = (paymentsMap[p.ownerId] || 0) + (p.amount || 0);
      }
    });

    return owners
      .map(o => ({
        id: o.id,
        name: o.name,
        email: o.email || 'N/A',
        totalPaid: paymentsMap[o.id] || 0
      }))
      .filter(o => o.totalPaid > 0)
      .sort((a, b) => b.totalPaid - a.totalPaid)
      .slice(0, 5);
  }, [owners, allPayments]);

  return (
    <div className="space-y-6">
      {/* Platform-wide Corporate Run Rate (MRR/ARR Console) */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border border-slate-800 bg-slate-950/40 backdrop-blur-md shadow-md rounded-2xl overflow-hidden shadow-violet-500/[0.02]">
          <CardHeader className="flex flex-row items-center justify-between pb-2 px-4 pt-4">
            <CardTitle className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Monthly Run Rate (MRR)</CardTitle>
            <div className="p-1.5 rounded-lg bg-violet-500/10 border border-violet-500/25">
              <TrendingUp className="h-4 w-4 text-violet-400" />
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-black text-violet-400">₹{mrr.toLocaleString('en-IN')}</div>
            <p className="text-[10px] text-slate-500 mt-1 font-semibold">Active baseFee + tenant occupant runoff fees</p>
          </CardContent>
        </Card>

        <Card className="border border-slate-800 bg-slate-950/40 backdrop-blur-md shadow-md rounded-2xl overflow-hidden shadow-indigo-500/[0.02]">
          <CardHeader className="flex flex-row items-center justify-between pb-2 px-4 pt-4">
            <CardTitle className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Annual Run Rate (ARR)</CardTitle>
            <div className="p-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/25">
              <Landmark className="h-4 w-4 text-indigo-400" />
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-black text-indigo-400">₹{arr.toLocaleString('en-IN')}</div>
            <p className="text-[10px] text-slate-500 mt-1 font-semibold">Annualized run rate trajectory based on MRR</p>
          </CardContent>
        </Card>

        <Card className="border border-slate-800 bg-slate-950/40 backdrop-blur-md shadow-md rounded-2xl overflow-hidden shadow-emerald-500/[0.02]">
          <CardHeader className="flex flex-row items-center justify-between pb-2 px-4 pt-4">
            <CardTitle className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Prepaid Client Funds</CardTitle>
            <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/25">
              <Wallet className="h-4 w-4 text-emerald-400" />
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-black text-emerald-400">₹{totalRechargeCred.toLocaleString('en-IN')}</div>
            <p className="text-[10px] text-slate-500 mt-1 font-semibold">Active landlord prepaid balance pools in system</p>
          </CardContent>
        </Card>

        <Card className="border border-slate-800 bg-slate-950/40 backdrop-blur-md shadow-md rounded-2xl overflow-hidden shadow-rose-500/[0.02]">
          <CardHeader className="flex flex-row items-center justify-between pb-2 px-4 pt-4">
            <CardTitle className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Ecosystem Dues & Debt</CardTitle>
            <div className="p-1.5 rounded-lg bg-rose-500/10 border border-rose-500/25">
              <AlertTriangle className="h-4 w-4 text-rose-400 animate-pulse" />
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-black text-rose-400">₹{totalDuesDebt.toLocaleString('en-IN')}</div>
            <p className="text-[10px] text-slate-500 mt-1 font-semibold">Accumulated deficit dues from low wallets</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Dues Recovery Queue */}
        <Card className="lg:col-span-2 border border-slate-800 bg-slate-950/40 backdrop-blur-md rounded-2xl overflow-hidden">
          <CardHeader className="pb-3 border-b border-slate-900/60">
            <CardTitle className="text-sm font-extrabold text-slate-200 flex items-center gap-2">
              <AlertTriangle className="w-4.5 h-4.5 text-rose-400 animate-pulse" />
              Prepaid Dues Recovery Queue
            </CardTitle>
            <CardDescription className="text-xs text-slate-400 font-medium">Prioritized ledger ranking landlords currently in balance deficit. Resolve to bypass automated service lockouts.</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="rounded-xl border border-slate-900 overflow-hidden bg-slate-950/20">
              <Table>
                <TableHeader className="bg-slate-950/80 border-b border-slate-900">
                  <TableRow className="hover:bg-transparent border-slate-900">
                    <TableHead className="font-extrabold text-[10px] uppercase text-slate-400 tracking-wider h-11">Landlord</TableHead>
                    <TableHead className="font-extrabold text-[10px] uppercase text-slate-400 tracking-wider h-11 text-right text-rose-400">Dues (Debt)</TableHead>
                    <TableHead className="font-extrabold text-[10px] uppercase text-slate-400 tracking-wider h-11 text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {duesRecoveryQueue.map(p => (
                    <TableRow key={p.id} className="border-slate-900 hover:bg-slate-900/20 transition-colors">
                      <TableCell className="py-3">
                        <div className="font-extrabold text-xs text-slate-200">{p.name}</div>
                        <div className="text-[9px] text-slate-500 font-semibold mt-0.5">{p.email}</div>
                      </TableCell>
                      <TableCell className="text-right font-black text-rose-400 text-xs py-3">₹{p.wallet.dues?.toLocaleString('en-IN')}</TableCell>
                      <TableCell className="text-center py-3">
                        <Badge variant="outline" className="text-[8px] font-black uppercase px-2 py-0.5 border-rose-500/30 text-rose-400 bg-rose-500/10">RESTRICTED</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {duesRecoveryQueue.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-xs font-bold text-slate-500 py-8">
                        Optimal balance levels! 0 landlords are currently in debt default.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Top Paying Landlords */}
        <Card className="border border-slate-800 bg-slate-950/40 backdrop-blur-md rounded-2xl overflow-hidden">
          <CardHeader className="pb-3 border-b border-slate-900/60">
            <CardTitle className="text-sm font-extrabold text-slate-200 flex items-center gap-2">
              <Star className="w-4.5 h-4.5 text-amber-400" />
              Top Billing Landlords
            </CardTitle>
            <CardDescription className="text-xs text-slate-400 font-medium">Top paying subscribers ranked by accumulated transaction volumes.</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {topPayingLandlords.map((l, index) => (
                <div key={l.id} className="flex items-center justify-between border-b border-slate-900 pb-3 last:border-none last:pb-0">
                  <div className="space-y-0.5">
                    <div className="text-xs font-black text-slate-200 flex items-center gap-1.5">
                      <span className="text-[10px] text-slate-500">#{index + 1}</span>
                      {l.name}
                    </div>
                    <div className="text-[9px] text-slate-500 font-semibold">{l.email}</div>
                  </div>
                  <div className="text-xs font-black text-emerald-400">
                    ₹{l.totalPaid.toLocaleString('en-IN')}
                  </div>
                </div>
              ))}
              {topPayingLandlords.length === 0 && (
                <div className="text-center text-xs font-bold text-slate-500 py-8">
                  No payment histories accumulated in this sync interval.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Landlord Account Balances Ledger */}
      <Card className="border border-slate-800 bg-slate-950/40 backdrop-blur-md rounded-2xl overflow-hidden">
        <CardHeader className="pb-3 border-b border-slate-900/60">
          <CardTitle className="text-sm font-extrabold text-slate-200">Prepaid Wallets & Refill Registries</CardTitle>
          <CardDescription className="text-xs text-slate-400 font-medium">Search, filter, and audit active landlord client wallets, monthly billing anchors, and due status.</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
              <Input
                placeholder="Search landlord by profile name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-slate-950/80 border-slate-800/80 focus:border-violet-500/50 rounded-xl h-10 text-xs font-semibold text-slate-200 placeholder:text-slate-500"
              />
            </div>
            
            <div className="flex flex-wrap gap-1.5 bg-slate-900/60 border border-slate-800 p-1 rounded-xl">
              <Button 
                variant={filterType === 'all' ? 'default' : 'ghost'} 
                size="sm" 
                onClick={() => setFilterType('all')}
                className="text-[10px] font-extrabold h-7 px-3 rounded-lg text-slate-300"
              >
                All Accounts
              </Button>
              <Button 
                variant={filterType === 'restricted' ? 'default' : 'ghost'} 
                size="sm" 
                onClick={() => setFilterType('restricted')}
                className="text-[10px] font-extrabold h-7 px-3 rounded-lg text-slate-300"
              >
                Restricted
              </Button>
              <Button 
                variant={filterType === 'trial' ? 'default' : 'ghost'} 
                size="sm" 
                onClick={() => setFilterType('trial')}
                className="text-[10px] font-extrabold h-7 px-3 rounded-lg text-slate-300"
              >
                With Trial Balance
              </Button>
              <Button 
                variant={filterType === 'dues' ? 'default' : 'ghost'} 
                size="sm" 
                onClick={() => setFilterType('dues')}
                className="text-[10px] font-extrabold h-7 px-3 rounded-lg text-rose-400 hover:bg-rose-500/5"
              >
                With Debt/Dues
              </Button>
            </div>
          </div>

          <div className="rounded-xl border border-slate-900 overflow-hidden bg-slate-950/20">
            <Table>
              <TableHeader className="bg-slate-950/80 border-b border-slate-900">
                <TableRow className="hover:bg-transparent border-slate-900">
                  <TableHead className="font-extrabold text-[10px] uppercase text-slate-400 tracking-wider h-11">Landlord Name</TableHead>
                  <TableHead className="font-extrabold text-[10px] uppercase text-slate-400 tracking-wider h-11 text-center">Billing Plan</TableHead>
                  <TableHead className="font-extrabold text-[10px] uppercase text-slate-400 tracking-wider h-11 text-right">Trial Balance</TableHead>
                  <TableHead className="font-extrabold text-[10px] uppercase text-slate-400 tracking-wider h-11 text-right">Recharge Balance</TableHead>
                  <TableHead className="font-extrabold text-[10px] uppercase text-slate-400 tracking-wider h-11 text-right text-rose-400">Dues (Debt)</TableHead>
                  <TableHead className="font-extrabold text-[10px] uppercase text-slate-400 tracking-wider h-11 text-center">Wallet Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProfiles.map((p) => {
                  const isRestricted = p.subscriptionStatus === 'restricted';
                  return (
                    <TableRow key={p.id} className="border-slate-900 hover:bg-slate-900/20 transition-colors">
                      <TableCell className="py-3">
                        <div className="font-extrabold text-xs text-slate-200">{p.name}</div>
                        <div className="text-[9px] text-slate-500 font-semibold mt-0.5">{p.email}</div>
                      </TableCell>
                      <TableCell className="text-center py-3">
                        <Badge variant="outline" className="capitalize border-slate-800 text-violet-400 font-extrabold text-[9px] px-2 py-0.5">
                          {p.billing.planType}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-extrabold text-slate-300 text-xs py-3">₹{p.wallet.trialBalance?.toLocaleString('en-IN') ?? 0}</TableCell>
                      <TableCell className="text-right font-extrabold text-slate-300 text-xs py-3">₹{p.wallet.rechargeBalance?.toLocaleString('en-IN') ?? 0}</TableCell>
                      <TableCell className="text-right font-black text-rose-400 text-xs py-3">₹{p.wallet.dues?.toLocaleString('en-IN') ?? 0}</TableCell>
                      <TableCell className="text-center py-3">
                        <Badge 
                          variant="outline"
                          className={`text-[9px] font-black uppercase px-2 py-0.5 border ${
                            isRestricted 
                              ? 'border-rose-500/25 text-rose-400 bg-rose-500/5' 
                              : 'border-emerald-500/25 text-emerald-400 bg-emerald-500/5'
                          }`}
                        >
                          {p.subscriptionStatus}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filteredProfiles.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-xs font-bold text-slate-500 py-8">
                      No matching landlord financial audit records registered.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
