'use client'

import React, { useState } from 'react';
import { 
  TrendingUp, ShieldCheck, CreditCard, Award, 
  Settings, PenTool, CheckCircle, Percent, Zap
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { adminWalletAdjustment } from '@/lib/actions/walletActions';
import type { User } from '@/lib/types';

interface SubscriptionsProps {
  owners: User[];
  onRefresh: () => void;
}

export default function AdminSubscriptions({ owners, onRefresh }: SubscriptionsProps) {
  const [selectedOwner, setSelectedOwner] = useState('');
  const [adjustmentType, setAdjustmentType] = useState<'admin_credit' | 'admin_debit'>('admin_credit');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleWalletAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOwner || !amount || !reason) {
      toast({ variant: 'destructive', title: "Validation Error", description: "Please complete all fields before execution." });
      return;
    }

    const numericAmount = Number(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      toast({ variant: 'destructive', title: "Validation Error", description: "Amount must be a positive number." });
      return;
    }

    try {
      setLoading(true);
      const result = await adminWalletAdjustment({
        ownerId: selectedOwner,
        type: adjustmentType,
        amount: numericAmount,
        reason: reason,
        adminId: 'admin-engine-web'
      });

      if (result.success) {
        toast({ title: "Adjustment Successful", description: `Successfully executed wallet balance updates. New balance: ₹${result.newBalance}` });
        setAmount('');
        setReason('');
        onRefresh();
      } else {
        toast({ variant: 'destructive', title: "Adjustment Failed", description: result.error || "System error." });
      }
    } catch (err: any) {
      toast({ variant: 'destructive', title: "Error", description: err.message || "An unexpected error occurred." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Manual Wallet Credit/Debit Adjustment Terminal */}
      <Card className="lg:col-span-2 border border-border/50 bg-card/60 backdrop-blur-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="text-amber-500 h-5 w-5" /> 
            Administrative Adjustment Terminal
          </CardTitle>
          <CardDescription>Manually recharge balances, deduct promotional credits, or modify dues.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleWalletAdjustment} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">Target Landlord Account</label>
                <select 
                  value={selectedOwner}
                  onChange={(e) => setSelectedOwner(e.target.value)}
                  className="w-full text-sm bg-muted/40 border border-border/40 rounded-lg p-2.5 text-foreground focus:outline-none focus:border-primary/50"
                >
                  <option value="" disabled>-- Choose Landlord Owner --</option>
                  {owners.map(owner => (
                    <option key={owner.id} value={owner.id}>
                      {owner.name} (Balance: ₹{owner.wallet?.balance ?? 0})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">Adjustment Type</label>
                <select 
                  value={adjustmentType}
                  onChange={(e) => setAdjustmentType(e.target.value as any)}
                  className="w-full text-sm bg-muted/40 border border-border/40 rounded-lg p-2.5 text-foreground focus:outline-none focus:border-primary/50"
                >
                  <option value="admin_credit">Credit (+) Recharge Balance</option>
                  <option value="admin_debit">Debit (-) Recharge Balance</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">Deduction / Recharge Amount (₹)</label>
                <Input
                  type="number"
                  placeholder="e.g. 500"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="bg-muted/40 border-border/50"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">Audit Reason / Authorization Code</label>
                <Input
                  type="text"
                  placeholder="e.g. Offline cash payment received"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="bg-muted/40 border-border/50"
                />
              </div>
            </div>

            <Button 
              type="submit" 
              disabled={loading} 
              className="w-full bg-primary hover:bg-primary/95 text-primary-foreground font-semibold"
            >
              {loading ? 'Processing Wallet Transaction...' : 'Apply Wallet Adjustment'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Subscription Pricing Limits Overview */}
      <Card className="border border-border/50 bg-card/60 backdrop-blur-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="text-primary h-5 w-5" />
            Pricing Configurations
          </CardTitle>
          <CardDescription>System pricing structures.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between border-b border-border/40 pb-2">
            <div className="text-xs font-semibold">Standard Base Fee</div>
            <span className="font-bold text-sm">₹199 / month</span>
          </div>
          <div className="flex items-center justify-between border-b border-border/40 pb-2">
            <div className="text-xs font-semibold">Standard Tenant Fee</div>
            <span className="font-bold text-sm">₹20 / tenant-month</span>
          </div>
          <div className="flex items-center justify-between border-b border-border/40 pb-2">
            <div className="text-xs font-semibold">WhatsApp Automation Credits</div>
            <span className="font-bold text-sm">₹0.32 / notification</span>
          </div>
          <div className="flex items-center justify-between border-b border-border/40 pb-2">
            <div className="text-xs font-semibold">Promo Trial Credit</div>
            <span className="font-bold text-sm text-cyan-400">₹500 for 90 days</span>
          </div>
          <div className="bg-primary/5 border border-primary/20 p-3 rounded-lg text-xs text-muted-foreground flex items-start gap-2">
            <Zap className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
            Pricing edits must be handled in `/src/lib/constants.ts` or overridden per landlord using the specific `billingConfig` override fields inside **Admin Dashboard**.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
