'use client'

import React, { useState } from 'react';
import { 
  CreditCard, IndianRupee, Wallet, Calendar, Search, Filter, 
  ArrowUpRight, ArrowDownRight, AlertTriangle, CheckCircle, Info
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import type { User } from '@/lib/types';

interface FinanceProps {
  owners: User[];
  stats: {
    totalRevenue: number;
  };
}

export default function AdminFinance({ owners, stats }: FinanceProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'restricted' | 'trial' | 'dues'>('all');

  // Compute landlord financial profiles
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

  return (
    <div className="space-y-6">
      {/* Platform-wide Wallets Dashboard */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border border-border/50 bg-card/60 backdrop-blur-md shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground">Total Paid Credit</CardTitle>
            <Wallet className="h-5 w-5 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-emerald-500">₹{totalRechargeCred.toLocaleString('en-IN')}</div>
            <p className="text-xs text-muted-foreground mt-1">Refills currently active in system wallets</p>
          </CardContent>
        </Card>
        
        <Card className="border border-border/50 bg-card/60 backdrop-blur-md shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground">Active Promotional Credit</CardTitle>
            <Info className="h-5 w-5 text-cyan-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-cyan-500">₹{totalTrialCred.toLocaleString('en-IN')}</div>
            <p className="text-xs text-muted-foreground mt-1">Trial credits valid for 90-day pipeline</p>
          </CardContent>
        </Card>

        <Card className="border border-border/50 bg-card/60 backdrop-blur-md shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground">Accumulated Platform Dues</CardTitle>
            <AlertTriangle className="h-5 w-5 text-rose-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-rose-500">₹{totalDuesDebt.toLocaleString('en-IN')}</div>
            <p className="text-xs text-muted-foreground mt-1">Dues generated from zero wallet levels</p>
          </CardContent>
        </Card>
      </div>

      {/* Payment Search & Filter tools */}
      <Card className="border border-border/50 bg-card/60 backdrop-blur-md">
        <CardHeader className="pb-3">
          <CardTitle>Financial Registry: Landlord Wallet Audits</CardTitle>
          <CardDescription>Search, filter, and audit active client wallets, monthly billing configs, and due status.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search landlord by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-muted/40 border-border/50 focus:border-primary/50"
              />
            </div>
            
            <div className="flex flex-wrap gap-2">
              <Button 
                variant={filterType === 'all' ? 'default' : 'outline'} 
                size="sm" 
                onClick={() => setFilterType('all')}
                className="text-xs font-semibold"
              >
                All Accounts
              </Button>
              <Button 
                variant={filterType === 'restricted' ? 'default' : 'outline'} 
                size="sm" 
                onClick={() => setFilterType('restricted')}
                className="text-xs font-semibold"
              >
                Restricted
              </Button>
              <Button 
                variant={filterType === 'trial' ? 'default' : 'outline'} 
                size="sm" 
                onClick={() => setFilterType('trial')}
                className="text-xs font-semibold"
              >
                With Trial Balance
              </Button>
              <Button 
                variant={filterType === 'dues' ? 'default' : 'outline'} 
                size="sm" 
                onClick={() => setFilterType('dues')}
                className="text-xs font-semibold text-rose-500 hover:text-rose-600 border-rose-500/20 hover:bg-rose-500/10"
              >
                With Debt/Dues
              </Button>
            </div>
          </div>

          <div className="rounded-md border border-border/40 overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead className="font-semibold text-xs">Landlord Name</TableHead>
                  <TableHead className="font-semibold text-xs text-center">Billing Plan</TableHead>
                  <TableHead className="font-semibold text-xs text-right">Trial Balance</TableHead>
                  <TableHead className="font-semibold text-xs text-right">Recharge Balance</TableHead>
                  <TableHead className="font-semibold text-xs text-right text-rose-500">Dues (Debt)</TableHead>
                  <TableHead className="font-semibold text-xs text-center">Wallet Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProfiles.map((p) => (
                  <TableRow key={p.id} className="hover:bg-muted/40 transition-colors">
                    <TableCell className="py-3">
                      <div className="font-semibold">{p.name}</div>
                      <div className="text-[10px] text-muted-foreground">{p.email}</div>
                    </TableCell>
                    <TableCell className="text-center py-3">
                      <Badge variant="outline" className="capitalize border-primary/20 text-primary text-[10px]">
                        {p.billing.planType}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium py-3">₹{p.wallet.trialBalance?.toLocaleString('en-IN') ?? 0}</TableCell>
                    <TableCell className="text-right font-medium py-3">₹{p.wallet.rechargeBalance?.toLocaleString('en-IN') ?? 0}</TableCell>
                    <TableCell className="text-right font-bold py-3 text-rose-500">₹{p.wallet.dues?.toLocaleString('en-IN') ?? 0}</TableCell>
                    <TableCell className="text-center py-3">
                      <Badge 
                        variant={p.subscriptionStatus === 'restricted' ? 'destructive' : 'default'}
                        className="text-[10px] font-semibold tracking-wider capitalize"
                      >
                        {p.subscriptionStatus}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredProfiles.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">
                      No matching landlord financial records found.
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
