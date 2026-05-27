'use client'

import React, { useState } from 'react';
import { 
  TrendingUp, ShieldCheck, CreditCard, Award, 
  Settings, PenTool, CheckCircle, Percent, Zap, MessageSquare, Info
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { adminWalletAdjustment } from '@/lib/actions/walletActions';
import type { User } from '@/lib/types';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { AdminDataIntegrityShield } from '@/lib/admin-integrity-shield';

interface SubscriptionsProps {
  owners: User[];
  onRefresh: () => void;
  preselectedOwnerId?: string;
}

export default function AdminSubscriptions({ owners, onRefresh, preselectedOwnerId }: SubscriptionsProps) {
  // Adjustment form states
  const [selectedOwner, setSelectedOwner] = useState(preselectedOwnerId || '');
  const [adjustmentType, setAdjustmentType] = useState<'admin_credit' | 'admin_debit'>('admin_credit');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Platform pricing & WhatsApp overrides states
  const [selectedBillingOwner, setSelectedBillingOwner] = useState(preselectedOwnerId || '');

  React.useEffect(() => {
    if (preselectedOwnerId) {
      setSelectedOwner(preselectedOwnerId);
      setSelectedBillingOwner(preselectedOwnerId);
    }
  }, [preselectedOwnerId]);
  const [whatsappCredits, setWhatsappCredits] = useState('');
  const [planType, setPlanType] = useState('monthly');
  const [customBaseFee, setCustomBaseFee] = useState('');
  const [customPerTenantFee, setCustomPerTenantFee] = useState('');
  const [discountType, setDiscountType] = useState('none');
  const [discountVal, setDiscountVal] = useState('');
  const [discountReason, setDiscountReason] = useState('');
  const [billingLoading, setBillingLoading] = useState(false);

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

  const handleBillingConfigOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBillingOwner) {
      toast({ variant: 'destructive', title: "Validation Error", description: "Please select a target landlord account." });
      return;
    }

    try {
      setBillingLoading(true);
      if (!db) return;
      
      const userRef = doc(db, 'users', selectedBillingOwner);
      const updates: Record<string, any> = {
        'billingConfig.planType': planType,
      };

      if (whatsappCredits !== '') {
        updates['subscription.whatsappCredits'] = Number(whatsappCredits);
      }
      if (customBaseFee !== '') {
        updates['billingConfig.baseFee'] = Number(customBaseFee);
      }
      if (customPerTenantFee !== '') {
        updates['billingConfig.perTenantFee'] = Number(customPerTenantFee);
      }

      if (discountType === 'none') {
        updates['billingConfig.discount'] = null;
      } else {
        updates['billingConfig.discount'] = {
          type: discountType,
          value: Number(discountVal || 0),
          reason: discountReason || 'Administrative override',
          appliedAt: new Date().toISOString(),
          appliedBy: 'admin-console'
        };
      }

      // Execute integrity checks before mutation (USER_GLOBAL DATABASE rules)
      AdminDataIntegrityShield.validateMutation('users', updates);
      await updateDoc(userRef, updates);
      
      toast({ title: "Configuration Updated", description: "Successfully updated platform overrides and credits in Firestore." });
      
      // Clear forms
      setWhatsappCredits('');
      setCustomBaseFee('');
      setCustomPerTenantFee('');
      setDiscountVal('');
      setDiscountReason('');
      onRefresh();
    } catch (err: any) {
      toast({ variant: 'destructive', title: "Update Failed", description: err.message || "Failed to save billing configurations." });
    } finally {
      setBillingLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Manual Wallet Credit/Debit Adjustment Terminal */}
      <Card className="lg:col-span-2 border border-slate-800 bg-slate-950/40 backdrop-blur-md rounded-2xl overflow-hidden">
        <CardHeader className="pb-3 border-b border-slate-900/60">
          <CardTitle className="flex items-center gap-2 text-sm font-extrabold text-slate-200">
            <Zap className="text-amber-400 h-4.5 w-4.5 animate-pulse" /> 
            Administrative Adjustment Terminal
          </CardTitle>
          <CardDescription className="text-xs text-slate-400 font-medium">Manually recharge balances, deduct promotional credits, or modify platform dues.</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleWalletAdjustment} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block mb-1.5">Target Landlord Account</label>
                <select 
                  value={selectedOwner}
                  onChange={(e) => setSelectedOwner(e.target.value)}
                  className="w-full text-xs font-semibold bg-slate-950 border border-slate-800 focus:border-violet-500/50 rounded-xl p-3 text-slate-200 focus:outline-none cursor-pointer"
                >
                  <option value="" className="bg-slate-950 text-slate-500" disabled>-- Choose Landlord Owner --</option>
                  {owners.map(owner => (
                    <option key={owner.id} value={owner.id} className="bg-slate-950 text-slate-300">
                      {owner.name} (Wallet Balance: ₹{owner.wallet?.balance ?? 0})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block mb-1.5">Adjustment Type</label>
                <select 
                  value={adjustmentType}
                  onChange={(e) => setAdjustmentType(e.target.value as any)}
                  className="w-full text-xs font-semibold bg-slate-950 border border-slate-800 focus:border-violet-500/50 rounded-xl p-3 text-slate-200 focus:outline-none cursor-pointer"
                >
                  <option value="admin_credit" className="bg-slate-950 text-slate-300">Credit (+) Recharge Balance</option>
                  <option value="admin_debit" className="bg-slate-950 text-slate-300">Debit (-) Recharge Balance</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block mb-1.5">Deduction / Recharge Amount (₹)</label>
                <Input
                  type="number"
                  placeholder="e.g. 500"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="bg-slate-950 border border-slate-800 focus:border-violet-500/50 rounded-xl h-10 text-xs font-semibold text-slate-200 placeholder:text-slate-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block mb-1.5">Audit Reason / Authorization Code</label>
                <Input
                  type="text"
                  placeholder="e.g. Offline cash payment received"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="bg-slate-950 border border-slate-800 focus:border-violet-500/50 rounded-xl h-10 text-xs font-semibold text-slate-200 placeholder:text-slate-500"
                />
              </div>
            </div>

            <Button 
              type="submit" 
              disabled={loading} 
              className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-extrabold text-xs h-10 rounded-xl shadow-lg shadow-violet-500/10 border border-violet-500/20"
            >
              {loading ? 'Processing Wallet Transaction...' : 'Apply Wallet Adjustment'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Subscription Pricing Limits Overview */}
      <Card className="border border-slate-800 bg-slate-950/40 backdrop-blur-md rounded-2xl overflow-hidden">
        <CardHeader className="pb-3 border-b border-slate-900/60">
          <CardTitle className="flex items-center gap-2 text-sm font-extrabold text-slate-200">
            <Settings className="text-violet-400 h-4.5 w-4.5" />
            Pricing Configurations
          </CardTitle>
          <CardDescription className="text-xs text-slate-400 font-medium">Standard system billing algorithms.</CardDescription>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-900 pb-2.5">
            <div className="text-xs font-bold text-slate-400">Standard Base Fee</div>
            <span className="font-extrabold text-slate-200 text-xs">₹199 / month</span>
          </div>
          <div className="flex items-center justify-between border-b border-slate-900 pb-2.5">
            <div className="text-xs font-bold text-slate-400">Standard Tenant Fee</div>
            <span className="font-extrabold text-slate-200 text-xs">₹20 / tenant-month</span>
          </div>
          <div className="flex items-center justify-between border-b border-slate-900 pb-2.5">
            <div className="text-xs font-bold text-slate-400">WhatsApp Automation Credits</div>
            <span className="font-extrabold text-slate-200 text-xs">₹0.32 / notification</span>
          </div>
          <div className="flex items-center justify-between border-b border-slate-900 pb-2.5">
            <div className="text-xs font-bold text-slate-400">Promo Trial Credit</div>
            <span className="font-extrabold text-cyan-400 text-xs">₹500 for 90 days</span>
          </div>
          <div className="bg-slate-900/50 border border-slate-800 p-3.5 rounded-xl text-[10px] font-semibold text-slate-400 leading-relaxed flex items-start gap-2.5 mt-4">
            <Zap className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
            Pricing edits must be handled in `/src/lib/constants.ts` or overridden per landlord using specific `billingConfig` override fields in Firestore.
          </div>
        </CardContent>
      </Card>

      {/* Platform Rates & WhatsApp Credits Override Controller */}
      <Card className="lg:col-span-3 border border-slate-800 bg-slate-950/40 backdrop-blur-md rounded-2xl overflow-hidden">
        <CardHeader className="pb-3 border-b border-slate-900/60">
          <CardTitle className="flex items-center gap-2 text-sm font-extrabold text-slate-200">
            <Settings className="text-violet-400 h-4.5 w-4.5" /> 
            Platform Billing & WhatsApp Overrides
          </CardTitle>
          <CardDescription className="text-xs text-slate-400 font-medium">Override standard rates, allocate prepaid WhatsApp automation credit, or set custom landlord discounts.</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleBillingConfigOverride} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block mb-1.5">Target Landlord Account</label>
                <select 
                  value={selectedBillingOwner}
                  onChange={(e) => setSelectedBillingOwner(e.target.value)}
                  className="w-full text-xs font-semibold bg-slate-950 border border-slate-800 focus:border-violet-500/50 rounded-xl p-3 text-slate-200 focus:outline-none cursor-pointer"
                >
                  <option value="" className="bg-slate-950 text-slate-500" disabled>-- Choose Landlord Owner --</option>
                  {owners.map(owner => (
                    <option key={owner.id} value={owner.id} className="bg-slate-950 text-slate-300">
                      {owner.name} (Plan: {owner.billingConfig?.planType || 'monthly'}, WA: {owner.subscription?.whatsappCredits ?? 0})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block mb-1.5">Set Plan Commitment Tier</label>
                <select 
                  value={planType}
                  onChange={(e) => setPlanType(e.target.value)}
                  className="w-full text-xs font-semibold bg-slate-950 border border-slate-800 focus:border-violet-500/50 rounded-xl p-3 text-slate-200 focus:outline-none cursor-pointer"
                >
                  <option value="trial" className="bg-slate-950 text-slate-300">Trial Plan</option>
                  <option value="monthly" className="bg-slate-950 text-slate-300">Flex (Monthly)</option>
                  <option value="sixMonth" className="bg-slate-950 text-slate-300">Saver (6-Month)</option>
                  <option value="yearly" className="bg-slate-950 text-slate-300">Elite (Yearly)</option>
                  <option value="enterprise" className="bg-slate-950 text-slate-300">Enterprise Plan</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block mb-1.5">Set WhatsApp Credits Balance</label>
                <Input
                  type="number"
                  placeholder="e.g. 500"
                  value={whatsappCredits}
                  onChange={(e) => setWhatsappCredits(e.target.value)}
                  className="bg-slate-950 border border-slate-800 focus:border-violet-500/50 rounded-xl h-10 text-xs font-semibold text-slate-200 placeholder:text-slate-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block mb-1.5">Override Platform Base Fee (₹)</label>
                <Input
                  type="number"
                  placeholder="e.g. 199 (Override monthly flat charge)"
                  value={customBaseFee}
                  onChange={(e) => setCustomBaseFee(e.target.value)}
                  className="bg-slate-950 border border-slate-800 focus:border-violet-500/50 rounded-xl h-10 text-xs font-semibold text-slate-200 placeholder:text-slate-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block mb-1.5">Override Usage Fee Per-Tenant (₹)</label>
                <Input
                  type="number"
                  placeholder="e.g. 20 (Override charge per occupant)"
                  value={customPerTenantFee}
                  onChange={(e) => setCustomPerTenantFee(e.target.value)}
                  className="bg-slate-950 border border-slate-800 focus:border-violet-500/50 rounded-xl h-10 text-xs font-semibold text-slate-200 placeholder:text-slate-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-slate-900 pt-4">
              <div>
                <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block mb-1.5">Apply Custom Discount</label>
                <select 
                  value={discountType}
                  onChange={(e) => setDiscountType(e.target.value)}
                  className="w-full text-xs font-semibold bg-slate-950 border border-slate-800 focus:border-violet-500/50 rounded-xl p-3 text-slate-200 focus:outline-none cursor-pointer"
                >
                  <option value="none" className="bg-slate-950 text-slate-300">No Discount</option>
                  <option value="flat" className="bg-slate-950 text-slate-300">Flat Rupee Discount (₹)</option>
                  <option value="percentage" className="bg-slate-950 text-slate-300">Percentage Discount (%)</option>
                  <option value="free_base" className="bg-slate-950 text-slate-300">Waive baseFee (Free Base)</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block mb-1.5">Discount Value (₹ or %)</label>
                <Input
                  type="number"
                  placeholder="e.g. 15"
                  value={discountVal}
                  disabled={discountType === 'none' || discountType === 'free_base'}
                  onChange={(e) => setDiscountVal(e.target.value)}
                  className="bg-slate-950 border border-slate-800 focus:border-violet-500/50 rounded-xl h-10 text-xs font-semibold text-slate-200 placeholder:text-slate-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block mb-1.5">Discount Audit Notes</label>
                <Input
                  type="text"
                  placeholder="e.g. Promotion waiver"
                  disabled={discountType === 'none'}
                  value={discountReason}
                  onChange={(e) => setDiscountReason(e.target.value)}
                  className="bg-slate-950 border border-slate-800 focus:border-violet-500/50 rounded-xl h-10 text-xs font-semibold text-slate-200 placeholder:text-slate-500"
                />
              </div>
            </div>

            <Button 
              type="submit" 
              disabled={billingLoading} 
              className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-extrabold text-xs h-10 rounded-xl shadow-lg shadow-violet-500/10 border border-violet-500/20"
            >
              {billingLoading ? 'Applying Billing Overrides...' : 'Apply Overrides & Refill Credits'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
