
'use client'

import React, { useState, useTransition, useEffect } from "react"
import { useAppSelector, useAppDispatch } from "@/lib/hooks"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CreditCard, History, Sparkles, Receipt, ShieldAlert, ArrowRight, Wallet, Users, Plus, Zap } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import SubscriptionDialog from '@/components/dashboard/dialogs/SubscriptionDialog'
import RechargeDialog from '@/components/billing/RechargeDialog'
import { togglePremiumFeature } from "@/lib/slices/userSlice"
import { useToast } from "@/hooks/use-toast"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { format, parseISO } from "date-fns"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import type { PremiumFeatures, BillingDetails, WalletTransaction, BillingPlanType } from '@/lib/types'
import { getBillingDetails } from "@/lib/actions/billingActions"
import { getWalletTransactions, estimateBalanceRunway } from "@/lib/actions/walletActions"
import { calculateLowBalanceStage } from "@/lib/utils"
import { PRICING_CONFIG } from "@/lib/mock-data"
import { Skeleton } from "@/components/ui/skeleton"

export default function SubscriptionPage() {
    const dispatch = useAppDispatch();
    const { toast } = useToast();
    const { currentUser, currentPlan } = useAppSelector((state) => state.user);
    const [isSaving, startTransition] = useTransition();
    const [isSubDialogOpen, setIsSubDialogOpen] = useState(false);
    const [isRechargeOpen, setIsRechargeOpen] = useState(false);
    const [billingDetails, setBillingDetails] = useState<BillingDetails | null>(null);
    const [walletTxns, setWalletTxns] = useState<WalletTransaction[]>([]);
    const [isLoadingBill, setIsLoadingBill] = useState(true);
    const [daysLeft, setDaysLeft] = useState(999);

    useEffect(() => {
        const fetchAll = async () => {
            if (!currentUser?.id) return;
            setIsLoadingBill(true);

            const [billingResult, txnResult, runwayResult] = await Promise.all([
                getBillingDetails(currentUser.id),
                getWalletTransactions(currentUser.id, 5),
                estimateBalanceRunway(currentUser.id),
            ]);

            if (billingResult.success && billingResult.data) {
                setBillingDetails(billingResult.data);
            }
            if (txnResult.success && txnResult.transactions) {
                setWalletTxns(txnResult.transactions);
            }
            if (runwayResult.success) {
                const daysLeftVal = runwayResult.daysLeft;
                const daysLeft = isNaN(daysLeftVal as number) ? 999 : (daysLeftVal ?? 999);
                setDaysLeft(daysLeft);
            }
            setIsLoadingBill(false);
        };
        
        if (currentUser?.id) {
            fetchAll();
        }
    }, [currentUser?.id, toast]);


    if (!currentUser || !currentPlan) return null;

    const handleToggleFeature = (feature: keyof PremiumFeatures, enabled: boolean) => {
        startTransition(async () => {
            const resultAction = await dispatch(togglePremiumFeature({ feature, enabled }));
            if (togglePremiumFeature.fulfilled.match(resultAction)) {
                 toast({ title: "Feature Updated", description: `Successfully ${enabled ? 'enabled' : 'disabled'} ${resultAction.payload.feature}. Changes will apply on your next bill.` });
                 if (currentUser?.id) {
                    const result = await getBillingDetails(currentUser.id);
                    if (result.success && result.data) {
                        setBillingDetails(result.data);
                    }
                 }
            } else {
                 toast({ variant: 'destructive', title: 'Update Failed', description: resultAction.payload as string || "An unknown error occurred" });
            }
        });
    };

    const walletBalance = currentUser.wallet?.balance ?? 0;
    const lowBalanceStage = calculateLowBalanceStage(walletBalance);
    const isTrialing = currentUser.subscription?.status === 'trialing';
    const planType: BillingPlanType = currentUser.billingConfig?.planType ?? (isTrialing ? 'trial' : 'monthly');
    const perTenantFee = currentUser.billingConfig?.perTenantFee ?? PRICING_CONFIG.perTenant;
    const baseFee = currentUser.billingConfig?.baseFee ?? PRICING_CONFIG.baseFee;

    const planLabels: Record<BillingPlanType, string> = {
        monthly: 'Monthly Plan',
        sixMonth: '6-Month Plan',
        yearly: 'Yearly Plan',
        trial: 'Trial Period',
    };

    const featureDescriptions: Record<string, string> = {
        website: "Create a public website to attract more tenants.",
        kyc: "Automate identity verification for new guests.",
        whatsapp: "Auto-send rent reminders and receipts."
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6 lg:p-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex flex-col gap-1 mb-8">
                <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
                    <CreditCard className="w-8 h-8 text-primary" />
                    Billing & Subscription
                </h1>
                <p className="text-muted-foreground font-medium">Manage your wallet, plan, and billing details.</p>
            </div>

            <SubscriptionDialog open={isSubDialogOpen} onOpenChange={setIsSubDialogOpen} />
            <RechargeDialog 
                open={isRechargeOpen} 
                onOpenChange={setIsRechargeOpen}
                maxBedCount={billingDetails?.details.totalBeds || billingDetails?.details.billableTenantCount || 0}
                baseFee={baseFee}
            />
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                {/* ─── Mobile Specific Header (Visible only on Mobile) ──── */}
                <div className="lg:hidden space-y-4">
                    <div className="grid grid-cols-1 gap-3">
                        <Card className={`relative overflow-hidden glass bg-indigo-500/[0.02] dark:bg-indigo-500/[0.05] border-indigo-500/20 rounded-3xl shadow-native ${
                            lowBalanceStage === 'restricted' ? 'border-red-500/30 bg-red-50/30' : ''
                        }`}>
                            <CardContent className="p-5 relative z-10 space-y-6">
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-white dark:bg-zinc-900 rounded-2xl shadow-sm text-emerald-600">
                                            <Wallet className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <p className="text-2xl font-black tracking-tighter text-emerald-600">₹{(walletBalance || 0).toLocaleString('en-IN')}</p>
                                            <div className="flex items-center gap-2">
                                                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-black text-[10px]">
                                                    {isTrialing ? 'Trial' : `~${daysLeft} days`}
                                                </Badge>
                                                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Balance</span>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="text-right">
                                        <p className="text-2xl font-black tracking-tighter text-indigo-600">
                                            {billingDetails?.details.billableTenantCount || 0}
                                            <span className="text-sm text-muted-foreground/50 ml-1 font-bold">/ {billingDetails?.details.totalBeds || 0}</span>
                                        </p>
                                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Occupancy</span>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-indigo-600/70">
                                        <span>Capacity Utilization</span>
                                        <span>{Math.round(((billingDetails?.details.billableTenantCount || 0) / (billingDetails?.details.totalBeds || 1)) * 100)}%</span>
                                    </div>
                                    <Progress 
                                        value={((billingDetails?.details.billableTenantCount || 0) / (billingDetails?.details.totalBeds || 1)) * 100} 
                                        className="h-2 bg-indigo-100 dark:bg-indigo-950/30"
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <Button 
                        className="w-full font-black py-6 text-lg rounded-2xl shadow-xl shadow-primary/20 bg-primary text-primary-foreground"
                        onClick={() => setIsRechargeOpen(true)}
                    >
                        <Plus className="w-6 h-6 mr-2" /> RECHARGE NOW
                    </Button>
                </div>

                {/* ─── Main Content Column ──── */}
                <div className="lg:col-span-2 space-y-6">


          <section id="features">
            <div className="flex items-center gap-2 mb-4 px-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-600">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-lg font-black tracking-tight uppercase">Optional Add-ons</h2>
                <p className="text-xs text-muted-foreground font-medium">Boost your property with these extra features. Charges are automatically added to your next recharge.</p>
              </div>
            </div>
            <Card className="glass-card overflow-hidden border-indigo-500/20">
              <div className="p-4 space-y-4">
                {Object.entries(PRICING_CONFIG.premiumFeatures).map(([key, feature]: [string, any]) => {
                  const isEnabled = currentUser.subscription?.premiumFeatures?.[key as keyof PremiumFeatures]?.enabled || false;
                  return (
                    <div key={key} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl bg-indigo-500/[0.03] border border-indigo-500/10 gap-4">
                      <div className="flex items-center gap-4">
                         <div className={`p-4 rounded-2xl shadow-sm transition-colors ${isEnabled ? 'bg-indigo-600 text-white shadow-indigo-500/30' : 'bg-white dark:bg-zinc-900 text-indigo-600'}`}>
                          <Zap className="w-6 h-6" />
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <p className="text-base font-black">{feature.name}</p>
                            {isEnabled && <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px] font-black px-2 uppercase">Active</Badge>}
                          </div>
                          <p className="text-sm text-muted-foreground font-medium leading-tight max-w-md">
                            {featureDescriptions[key] || "Advanced automation tool for your property."}
                          </p>
                          <p className="text-xs font-black text-indigo-600 tracking-wide pt-1">
                            {feature.billingType === 'monthly' ? `₹${feature.monthlyCharge} Flat / Month` : `₹${feature.perTenantCharge} / Bed / Month`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between sm:justify-end gap-3 bg-white/50 dark:bg-black/20 p-3 rounded-xl sm:bg-transparent sm:p-0">
                        <Label htmlFor={`feature-${key}`} className="text-xs font-black uppercase tracking-wider sm:hidden">
                          {isEnabled ? 'Turn Off' : 'Turn On'}
                        </Label>
                        <Switch 
                          id={`feature-${key}`}
                          checked={isEnabled}
                          onCheckedChange={(checked) => handleToggleFeature(key as keyof PremiumFeatures, checked)}
                          disabled={isSaving}
                          className="data-[state=checked]:bg-indigo-600"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </section>

                     {/* Payment History */}
                    <Card className="border-border/40 shadow-sm rounded-2xl overflow-hidden">
                        <CardHeader className="bg-muted/30">
                            <CardTitle className="flex items-center gap-2 text-xl"><History className="text-muted-foreground"/> Payment History</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow className="hover:bg-transparent bg-muted/20">
                                        <TableHead className="px-6 h-12 font-bold uppercase text-[0.7rem] tracking-wider">Date</TableHead>
                                        <TableHead className="px-6 h-12 font-bold uppercase text-[0.7rem] tracking-wider">Amount</TableHead>
                                        <TableHead className="px-6 h-12 font-bold uppercase text-[0.7rem] tracking-wider">Status</TableHead>
                                        <TableHead className="text-right px-6 h-12 font-bold uppercase text-[0.7rem] tracking-wider">Invoice</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {(currentUser.subscription?.paymentHistory || []).length > 0 ? currentUser.subscription?.paymentHistory?.map(payment => (
                                        <TableRow key={payment.id} className="hover:bg-muted/20 transition-colors">
                                            <TableCell className="px-6 py-4 font-medium text-muted-foreground">{format(parseISO(payment.date), 'do MMM, yyyy')}</TableCell>
                                            <TableCell className="px-6 py-4 font-bold text-foreground italic tracking-tighter text-lg">₹{(payment.amount || 0).toLocaleString('en-IN')}</TableCell>
                                            <TableCell className="px-6 py-4"><Badge variant={payment.status === 'paid' ? 'default' : 'destructive'} className="rounded-full px-4 py-1 font-bold text-[0.65rem] uppercase tracking-widest">{payment.status}</Badge></TableCell>
                                            <TableCell className="text-right px-6 py-4"><Button variant="secondary" size="sm" className="font-bold hover:bg-primary hover:text-primary-foreground transform active:scale-95 transition-all">Download</Button></TableCell>
                                        </TableRow>
                                    )) : (
                                        <TableRow>
                                            <TableCell colSpan={4} className="text-center h-48 text-muted-foreground font-medium italic">
                                                <div className="flex flex-col items-center gap-3">
                                                    <CreditCard className="w-10 h-10 opacity-20" />
                                                    No payment history found.
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>

                    <Card className="border-border/40 shadow-sm overflow-hidden rounded-2xl bg-blue-500/[0.02] border-blue-500/10">
                        <CardHeader className="p-6 flex flex-row items-center justify-between space-y-0">
                            <CardTitle className="flex items-center gap-2 text-xl font-bold">
                                <Receipt className="text-blue-500 w-6 h-6" /> Cycle Summary
                            </CardTitle>
                            {billingDetails && (
                                <p className="text-2xl font-black text-blue-600 dark:text-blue-400">
                                    ₹{(billingDetails.currentCycle.totalAmount || 0).toLocaleString('en-IN')}
                                </p>
                            )}
                        </CardHeader>
                        <CardContent className="px-6 pb-6 pt-0">
                            {isLoadingBill ? (
                                <Skeleton className="h-8 w-full rounded-xl" />
                            ) : billingDetails ? (
                                <details className="group">
                                    <summary className="list-none cursor-pointer">
                                        <div className="flex items-center gap-2 text-xs font-bold text-blue-600/60 uppercase tracking-widest hover:text-blue-600 transition-colors">
                                            <span>View Itemized Breakdown</span>
                                            <ArrowRight className="w-3 h-3 group-open:rotate-90 transition-transform" />
                                        </div>
                                    </summary>
                                    <div className="mt-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                                        <div className="flex justify-between items-center text-sm py-1">
                                            <span className="text-muted-foreground">Base Platform Fee</span>
                                            <span className="font-bold">₹{(baseFee || 0).toLocaleString('en-IN')}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-sm py-1">
                                            <span className="text-muted-foreground">Active Tenants ({billingDetails.details.billableTenantCount || 0})</span>
                                            <span className="font-bold">₹{(billingDetails.currentCycle.tenantCharge || 0).toLocaleString('en-IN')}</span>
                                        </div>
                                        {Object.entries(billingDetails.currentCycle.premiumFeaturesDetails || {}).map(([key, feature]) => (
                                            <div key={key} className="flex justify-between items-center text-sm py-1">
                                                <span className="text-muted-foreground truncate">{feature.description}</span>
                                                <span className="font-bold">₹{(feature.charge || 0).toLocaleString('en-IN')}</span>
                                            </div>
                                        ))}
                                        {billingDetails.currentCycle.discountAmount && billingDetails.currentCycle.discountAmount > 0 && (
                                            <div className="flex justify-between items-center text-sm py-1 text-emerald-600">
                                                <span>Applied Discount</span>
                                                <span className="font-bold">-₹{(billingDetails.currentCycle.discountAmount || 0).toLocaleString('en-IN')}</span>
                                            </div>
                                        )}
                                    </div>
                                </details>
                            ) : (
                                <p className="text-muted-foreground italic text-center py-2 text-sm">Could not load details.</p>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* ─── Sidebar Column ──── */}
                <div className="space-y-6">
                    <Card className="hidden lg:block sticky top-24 border-primary/20 shadow-2xl shadow-primary/10 bg-gradient-to-br from-primary/[0.03] via-transparent to-primary/[0.01] rounded-3xl overflow-hidden">
                        <CardHeader className="pb-3 bg-muted/10 border-b border-border/50 p-6">
                            <CardTitle className="flex items-center gap-2 text-xl font-bold">
                                <Wallet className="text-emerald-500 w-6 h-6" /> Wallet & Balance
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6 p-6">
                            <div className="text-center">
                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Available Balance</p>
                                <p className={`text-5xl font-black tracking-tight ${
                                    walletBalance <= 0 ? 'text-red-600 dark:text-red-400' :
                                    walletBalance <= PRICING_CONFIG.lowBalance.riskThreshold ? 'text-amber-600 dark:text-amber-400' :
                                    'text-foreground'
                                }`}>
                                    ₹{(walletBalance || 0).toLocaleString('en-IN')}
                                </p>
                                <p className="text-xs text-muted-foreground font-medium mt-3 px-2">
                                    {isTrialing ? '💎 No charges during trial' : `~${daysLeft} days of usage left`}
                                </p>
                            </div>
                            <Button 
                                className="w-full font-black py-6 text-lg rounded-2xl shadow-xl shadow-primary/20 transform active:scale-[0.98] transition-all hover:brightness-110"
                                onClick={() => setIsRechargeOpen(true)}
                            >
                                <Plus className="w-6 h-6 mr-2" /> RECHARGE
                            </Button>
                        </CardContent>
                    </Card>

                    <Card className="border-border/40 rounded-2xl shadow-sm overflow-hidden">
                        <CardContent className="p-6 space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="font-bold">Current Plan</span>
                                </div>
                                <Badge className="rounded-full px-3 py-1 font-bold text-[0.65rem] uppercase tracking-widest">
                                    {planLabels[planType] || 'Plan'}
                                </Badge>
                            </div>
                            <Button 
                                variant="outline" 
                                className="w-full rounded-xl font-bold border-border/60"
                                onClick={() => setIsSubDialogOpen(true)}
                            >
                                {planType === 'trial' ? 'Upgrade Plan' : 'Change Plan'} <ArrowRight className="w-4 h-4 ml-2" />
                            </Button>
                        </CardContent>
                    </Card>


                </div>
            </div>
        </div>
    )
}
