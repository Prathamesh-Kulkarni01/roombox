
'use client'

import React, { useState, useTransition, useEffect } from "react"
import { useAppSelector, useAppDispatch } from "@/lib/hooks"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { 
    CreditCard, History, Sparkles, Receipt, ShieldAlert, 
    ArrowRight, Wallet, Users, Plus, Zap, Check, Info, 
    TrendingDown, Target, HelpCircle, ArrowUpRight,
    Lock, Calendar, ZapOff, Activity
} from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import RechargeDialog from '@/components/wallet/RechargeDialog'
import { togglePremiumFeature } from "@/lib/slices/userSlice"
import { useToast } from "@/hooks/use-toast"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { format, parseISO } from "date-fns"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import type { PremiumFeatures, BillingDetails, WalletTransaction, BillingPlanType } from '@/lib/types'
import { getBillingDetails } from "@/lib/actions/billingActions"
import { getWalletTransactions, estimateBalanceRunway } from "@/lib/actions/walletActions"
import { calculateLowBalanceStage, cn } from "@/lib/utils"
import { PRICING_CONFIG } from "@/lib/constants"
import { Skeleton } from "@/components/ui/skeleton"

export default function WalletPage() {
    const dispatch = useAppDispatch();
    const { toast } = useToast();
    const { currentUser, currentPlan } = useAppSelector((state) => state.user);
    const [isSaving, startTransition] = useTransition();
    const [isRechargeOpen, setIsRechargeOpen] = useState(false);
    const [billingDetails, setBillingDetails] = useState<BillingDetails | null>(null);
    const [walletTxns, setWalletTxns] = useState<WalletTransaction[]>([]);
    const [isLoadingBill, setIsLoadingBill] = useState(true);
    const [daysLeft, setDaysLeft] = useState(999);

    useEffect(() => {
        const fetchAll = async () => {
            if (!currentUser?.id) return;
            setIsLoadingBill(true);

            try {
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
                    const dl = isNaN(daysLeftVal as number) ? 999 : (daysLeftVal ?? 999);
                    setDaysLeft(dl);
                }
            } catch (error) {
                console.error("Failed to fetch billing data:", error);
            } finally {
                setIsLoadingBill(false);
            }
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
                 toast({ 
                    title: "Feature Updated", 
                    description: `Successfully ${enabled ? 'enabled' : 'disabled'} ${resultAction.payload.feature}. Changes will reflect in your cycle summary.` 
                 });
                 // Refresh billing details to show updated itemization
                 if (currentUser?.id) {
                    const result = await getBillingDetails(currentUser.id);
                    if (result.success && result.data) {
                        setBillingDetails(result.data);
                    }
                 }
            } else {
                 toast({ 
                    variant: 'destructive', 
                    title: 'Update Failed', 
                    description: resultAction.payload as string || "An unknown error occurred" 
                 });
            }
        });
    };

    const walletBalance = currentUser.wallet?.balance ?? 0;
    const lowBalanceStage = calculateLowBalanceStage(walletBalance);
    const planType: BillingPlanType = currentUser.billingConfig?.planType ?? 'monthly';
    const perTenantFee = currentUser.billingConfig?.perTenantFee ?? (
        planType === 'yearly' ? PRICING_CONFIG.yearly.perTenant : 
        planType === 'sixMonth' ? PRICING_CONFIG.sixMonth.perTenant : 
        PRICING_CONFIG.monthly.perTenant
    );
    const baseFee = currentUser.billingConfig?.baseFee ?? PRICING_CONFIG.baseFee;

    const planLabels: Record<BillingPlanType, string> = {
        monthly: 'Pay-As-You-Go',
        sixMonth: '6-Month Saver',
        yearly: 'Annual Pro',
        trial: 'Free Trial',
    };

    const featureDescriptions: Record<string, string> = {
        website: "Your own property website to capture leads directly.",
        kyc: "Instant identity verification for all your tenants.",
        whatsapp: "Automated rent reminders & receipts via WhatsApp."
    };

    return (
        <div className="space-y-8 max-w-7xl mx-auto p-4 md:p-6 lg:p-8 animate-in fade-in duration-700">
            {/* Header section with Stats */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-4">
                <div className="space-y-1">
                    <h1 className="text-4xl font-black tracking-tight flex items-center gap-3">
                        <Wallet className="w-10 h-10 text-primary" />
                        Wallet
                    </h1>
                    <p className="text-muted-foreground font-medium flex items-center gap-2">
                        Manage your balance, add credits, and track usage
                    </p>
                </div>
                
                <div className="flex items-center gap-3 bg-muted/30 p-2 rounded-2xl border border-border/50">
                    <div className="px-4 py-2 text-center">
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Status</p>
                        <Badge className="mt-1 font-black px-3 py-0.5 uppercase text-[10px] bg-emerald-600">
                            Active
                        </Badge>
                    </div>
                    <div className="w-px h-8 bg-border/50" />
                    <div className="px-4 py-2 text-center">
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Current Plan</p>
                        <p className="font-black text-sm uppercase">{planLabels[planType]}</p>
                    </div>
                </div>
            </div>

            <RechargeDialog 
                open={isRechargeOpen} 
                onOpenChange={setIsRechargeOpen}
                maxBedCount={billingDetails?.details.totalBeds || billingDetails?.details.billableTenantCount || 0}
                baseFee={baseFee}
            />
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                {/* ─── Top Level Financial Cards (Now at top for mobile) ──── */}
                <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Wallet Card - PRIMARY ACTION */}
                    <Card className="border-primary/20 shadow-2xl shadow-primary/10 bg-gradient-to-br from-primary/[0.04] via-transparent to-primary/[0.02] rounded-3xl overflow-hidden relative group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Wallet className="w-24 h-24 rotate-12" />
                        </div>
                        <CardHeader className="pb-3 border-b border-border/50 bg-card/50 p-6 backdrop-blur-sm">
                            <CardTitle className="flex items-center gap-2 text-xl font-black">
                                <Wallet className="text-emerald-500 w-6 h-6" /> Available Balance
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6 p-6 relative z-10">
                            <div className="text-center py-2">
                                <div className="flex items-center justify-center gap-1">
                                    <span className="text-2xl font-black text-muted-foreground/50 self-start mt-1">₹</span>
                                    <p className={cn(
                                        "text-6xl font-black tracking-tighter leading-none",
                                        walletBalance <= 0 ? 'text-red-600' :
                                        walletBalance <= PRICING_CONFIG.lowBalance.riskThreshold ? 'text-amber-600' :
                                        'text-emerald-600'
                                    )}>
                                        {(walletBalance || 0).toLocaleString('en-IN')}
                                    </p>
                                </div>
                                <div className="mt-4 inline-flex items-center gap-2 bg-card/80 px-4 py-2 rounded-2xl border shadow-sm">
                                    <Calendar className="w-4 h-4 text-primary" />
                                    <p className="text-xs font-black uppercase tracking-widest">
                                        {`~${daysLeft} Days Runway`}
                                    </p>
                                </div>
                            </div>
                            <Button 
                                className="w-full font-black py-7 text-lg rounded-2xl shadow-xl shadow-primary/25 bg-primary text-primary-foreground transform active:scale-[0.97] transition-all hover:brightness-110"
                                onClick={() => setIsRechargeOpen(true)}
                            >
                                <Plus className="w-6 h-6 mr-2" /> ADD CREDITS
                            </Button>
                        </CardContent>
                    </Card>


                    {/* How it works (Desktop only or as 3rd card) */}
                    <Card className="border-border/40 rounded-3xl shadow-sm overflow-hidden bg-muted/20 border-dashed hidden lg:block">
                        <CardContent className="p-6 space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-card flex items-center justify-center text-muted-foreground border shadow-sm">
                                    <Info className="w-4 h-4" />
                                </div>
                                <h4 className="font-black text-[10px] uppercase tracking-widest">Billing Rules</h4>
                            </div>
                            <div className="space-y-4">
                                <div className="space-y-1">
                                    <p className="text-xs font-black uppercase tracking-tight">Auto-Deduction</p>
                                    <p className="text-[10px] font-medium text-muted-foreground leading-relaxed">
                                        Charges are deducted daily at midnight. No manual bills to pay.
                                    </p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs font-black uppercase tracking-tight">Fair Usage</p>
                                    <p className="text-[10px] font-medium text-muted-foreground leading-relaxed">
                                        You are only charged for active tenants. Empty beds are free.
                                    </p>
                                </div>
                                <div className="pt-2">
                                    <Button variant="link" className="p-0 h-auto text-[10px] font-black uppercase text-primary">View Detailed FAQ</Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* ─── Main Content Column ──── */}
                <div className="lg:col-span-2 space-y-8">
                    


                    {/* Features Grid */}
                    <section id="features">
                        <div className="flex items-center justify-between mb-4 px-2">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                                    <Zap className="w-4 h-4" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-black tracking-tight uppercase">Premium Add-ons</h2>
                                    <p className="text-xs text-muted-foreground font-medium">Toggle features to boost your business efficiency.</p>
                                </div>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {Object.entries(PRICING_CONFIG.premiumFeatures).map(([key, feature]: [string, any]) => {
                                const isEnabled = currentUser.subscription?.premiumFeatures?.[key as keyof PremiumFeatures]?.enabled || false;
                                return (
                                    <Card key={key} className={cn(
                                        "group transition-all duration-300 border-border/50 hover:border-primary/30 rounded-2xl overflow-hidden",
                                        isEnabled ? "bg-primary/[0.02] border-primary/20" : "bg-card"
                                    )}>
                                        <CardContent className="p-5 space-y-4">
                                            <div className="flex justify-between items-start">
                                                <div className={cn(
                                                    "p-3 rounded-xl transition-colors",
                                                    isEnabled ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" : "bg-muted text-muted-foreground"
                                                )}>
                                                    <Zap className="w-5 h-5" />
                                                </div>
                                                <Switch 
                                                    checked={isEnabled}
                                                    onCheckedChange={(checked) => handleToggleFeature(key as keyof PremiumFeatures, checked)}
                                                    disabled={isSaving}
                                                    className="data-[state=checked]:bg-primary"
                                                />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h4 className="font-black text-base">{feature.name}</h4>
                                                    {isEnabled && <Badge className="bg-primary/10 text-primary border-primary/20 text-[9px] font-black uppercase">Active</Badge>}
                                                </div>
                                                <p className="text-xs text-muted-foreground font-medium mt-1 leading-relaxed">
                                                    {featureDescriptions[key] || "Enhance your property management with advanced tools."}
                                                </p>
                                            </div>
                                            <div className="pt-2 border-t border-border/50 flex justify-between items-center">
                                                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Pricing</p>
                                                <p className="text-xs font-black text-primary">
                                                    {feature.billingType === 'monthly' ? `₹${feature.monthlyCharge} / Month` : `₹${feature.perTenantCharge} / Bed / Month`}
                                                </p>
                                            </div>
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>
                    </section>

                    {/* Itemized Cycle Summary */}
                    <Card className="border-border/40 shadow-sm overflow-hidden rounded-3xl bg-zinc-500/[0.01] border-dashed">
                        <CardHeader className="p-6 border-b border-border/40 bg-muted/10">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <CardTitle className="flex items-center gap-2 text-xl font-black">
                                    <Receipt className="text-primary w-6 h-6" /> Cycle Forecast
                                </CardTitle>
                                {billingDetails && (
                                    <div className="flex items-center gap-3 bg-card px-4 py-2 rounded-xl border shadow-sm">
                                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Est. Monthly Total</p>
                                        <p className="text-xl font-black text-primary">
                                            ₹{(billingDetails.currentCycle.totalAmount || 0).toLocaleString('en-IN')}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent className="p-6">
                            {isLoadingBill ? (
                                <div className="space-y-4">
                                    <Skeleton className="h-12 w-full rounded-xl" />
                                    <Skeleton className="h-12 w-full rounded-xl" />
                                </div>
                            ) : billingDetails ? (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="p-4 rounded-2xl bg-card border border-border/50 shadow-sm">
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Platform Base</span>
                                                <span className="text-xs font-black">Fixed</span>
                                            </div>
                                            <div className="flex justify-between items-end">
                                                <p className="text-sm font-bold">Standard Access</p>
                                                <p className="text-lg font-black italic tracking-tighter">₹{(baseFee || 0).toLocaleString('en-IN')}</p>
                                            </div>
                                        </div>
                                        <div className="p-4 rounded-2xl bg-card border border-border/50 shadow-sm">
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Usage Billing</span>
                                                <span className="text-xs font-black text-primary">{billingDetails.details.billableTenantCount || 0} Tenants</span>
                                            </div>
                                            <div className="flex justify-between items-end">
                                                <p className="text-sm font-bold">₹{perTenantFee}/tenant</p>
                                                <p className="text-lg font-black italic tracking-tighter">₹{(billingDetails.currentCycle.tenantCharge || 0).toLocaleString('en-IN')}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {Object.keys(billingDetails.currentCycle.premiumFeaturesDetails || {}).length > 0 && (
                                        <div className="pt-4 space-y-3">
                                            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-1">Active Add-ons</p>
                                            <div className="bg-card rounded-2xl border border-border/50 divide-y divide-border/50">
                                                {Object.entries(billingDetails.currentCycle.premiumFeaturesDetails || {}).map(([key, feature]) => (
                                                    <div key={key} className="flex justify-between items-center p-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-2 h-2 rounded-full bg-primary" />
                                                            <span className="text-sm font-medium">{feature.description}</span>
                                                        </div>
                                                        <span className="font-black text-sm italic">₹{(feature.charge || 0).toLocaleString('en-IN')}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {billingDetails.currentCycle.discountAmount && billingDetails.currentCycle.discountAmount > 0 && (
                                        <div className="flex justify-between items-center p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 text-emerald-600">
                                            <div className="flex items-center gap-3">
                                                <Sparkles className="w-4 h-4" />
                                                <span className="text-sm font-black uppercase tracking-widest">Applied Savings</span>
                                            </div>
                                            <span className="font-black text-sm">-₹{(billingDetails.currentCycle.discountAmount || 0).toLocaleString('en-IN')}</span>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                                    <ShieldAlert className="w-12 h-12 opacity-20 mb-4" />
                                    <p className="font-bold italic">Forecasting unavailable</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* History Table */}
                    <Card className="border-border/40 shadow-sm rounded-3xl overflow-hidden">
                        <CardHeader className="bg-muted/30 border-b border-border/40 p-6">
                            <CardTitle className="flex items-center gap-2 text-xl font-black"><History className="text-muted-foreground w-5 h-5"/> Payment History</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow className="hover:bg-transparent bg-muted/20 border-b border-border/40">
                                        <TableHead className="px-6 h-12 font-black uppercase text-[0.65rem] tracking-widest text-muted-foreground">Date</TableHead>
                                        <TableHead className="px-6 h-12 font-black uppercase text-[0.65rem] tracking-widest text-muted-foreground">Amount</TableHead>
                                        <TableHead className="px-6 h-12 font-black uppercase text-[0.65rem] tracking-widest text-muted-foreground">Type</TableHead>
                                        <TableHead className="text-right px-6 h-12 font-black uppercase text-[0.65rem] tracking-widest text-muted-foreground">Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {walletTxns.length > 0 ? walletTxns.map(txn => (
                                        <TableRow key={txn.id} className="hover:bg-muted/20 transition-colors border-b border-border/40 last:border-0">
                                            <TableCell className="px-6 py-5">
                                                <p className="font-bold text-sm">{format(typeof txn.createdAt === 'string' ? parseISO(txn.createdAt) : txn.createdAt as any, 'do MMM, yyyy')}</p>
                                                <p className="text-[10px] text-muted-foreground font-medium">{format(typeof txn.createdAt === 'string' ? parseISO(txn.createdAt) : txn.createdAt as any, 'HH:mm')}</p>
                                            </TableCell>
                                            <TableCell className="px-6 py-5">
                                                <p className={cn(
                                                    "font-black text-lg italic tracking-tighter",
                                                    (txn.type === 'recharge' || txn.type === 'admin_credit' || txn.type === 'refund') ? "text-emerald-600" : "text-foreground"
                                                )}>
                                                    {(txn.type === 'recharge' || txn.type === 'admin_credit' || txn.type === 'refund') ? '+' : '-'}₹{(txn.amount || 0).toLocaleString('en-IN')}
                                                </p>
                                            </TableCell>
                                            <TableCell className="px-6 py-5">
                                                <Badge variant="outline" className="rounded-full px-3 py-0.5 font-bold text-[0.65rem] uppercase tracking-widest">
                                                    {txn.description || txn.type}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right px-6 py-5">
                                                <Badge className={cn(
                                                    "rounded-full px-3 py-0.5 font-black text-[0.65rem] uppercase tracking-widest",
                                                    (txn.status || 'success') === 'success' ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600"
                                                )}>
                                                    {txn.status || 'success'}
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    )) : (
                                        <TableRow>
                                            <TableCell colSpan={4} className="text-center h-48 text-muted-foreground font-medium italic">
                                                <div className="flex flex-col items-center gap-3">
                                                    <Activity className="w-10 h-10 opacity-10" />
                                                    No transactions recorded yet.
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>

            </div>
        </div>
    )
}

