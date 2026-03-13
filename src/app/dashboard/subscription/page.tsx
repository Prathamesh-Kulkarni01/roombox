
'use client'

import React, { useState, useTransition, useEffect } from "react"
import { useAppSelector, useAppDispatch } from "@/lib/hooks"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertCircle, Loader2, Star, CreditCard, History, ShieldAlert, Globe, UserCheck, BotIcon } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import SubscriptionDialog from '@/components/dashboard/dialogs/SubscriptionDialog'
import { togglePremiumFeature } from "@/lib/slices/userSlice"
import { useToast } from "@/hooks/use-toast"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { format, parseISO } from "date-fns"
import { Badge } from "@/components/ui/badge"
import type { PremiumFeatures, BillingDetails, BillingCycleDetails } from '@/lib/types'
import { getBillingDetails } from "@/lib/actions/billingActions"
import { IndianRupee } from 'lucide-react'
import { Skeleton } from "@/components/ui/skeleton"

export default function SubscriptionPage() {
    const dispatch = useAppDispatch();
    const { toast } = useToast();
    const { currentUser, currentPlan } = useAppSelector((state) => state.user);
    const [isSaving, startTransition] = useTransition();
    const [isSubDialogOpen, setIsSubDialogOpen] = useState(false);
    const [billingDetails, setBillingDetails] = useState<BillingDetails | null>(null);
    const [isLoadingBill, setIsLoadingBill] = useState(true);

    useEffect(() => {
        const fetchBillingDetails = async () => {
            if (!currentUser) return;
            setIsLoadingBill(true);
            const result = await getBillingDetails(currentUser.id);
            if (result.success && result.data) {
                setBillingDetails(result.data);
            } else {
                toast({ variant: 'destructive', title: 'Error', description: 'Could not load billing details.' });
            }
            setIsLoadingBill(false);
        };
        
        if (currentUser?.id) {
            fetchBillingDetails();
        }
    }, [currentUser?.id, toast]);


    if (!currentUser || !currentPlan) return null;

    const handleToggleFeature = (feature: keyof PremiumFeatures, enabled: boolean) => {
        startTransition(async () => {
            const resultAction = await dispatch(togglePremiumFeature({ feature, enabled }));
            if (togglePremiumFeature.fulfilled.match(resultAction)) {
                 toast({ title: "Feature Updated", description: `Successfully ${enabled ? 'enabled' : 'disabled'} ${resultAction.payload.feature}. Changes will apply on your next bill.` });
                 // Refetch billing details after state change
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
    
    const BillingBreakdown = ({ cycle, title, details }: { cycle: BillingCycleDetails, title: string, details: BillingDetails['details'] }) => (
        <div className="space-y-2">
            <h4 className="font-semibold">{title}</h4>
            {cycle.propertyCharge > 0 &&
                <div className="flex justify-between text-sm">
                    <span>Properties ({details.propertyCount} × ₹{details.pricingConfig.perProperty})</span>
                    <span>₹{cycle.propertyCharge.toLocaleString('en-IN')}</span>
                </div>
            }
             {cycle.tenantCharge > 0 &&
                <div className="flex justify-between text-sm">
                    <span>Tenants ({details.billableTenantCount} × ₹{details.pricingConfig.perTenant})</span>
                    <span>₹{cycle.tenantCharge.toLocaleString('en-IN')}</span>
                </div>
             }
            {Object.entries(cycle.premiumFeaturesDetails).map(([key, feature]) => (
                 <div key={key} className="flex justify-between text-sm">
                    <span>{feature.description}</span> 
                    <span>₹{feature.charge.toLocaleString('en-IN')}</span>
                </div>
            ))}
            <hr className="my-2 border-border/50"/>
            <div className="flex justify-between font-bold text-base text-foreground">
                <span>Total:</span> 
                <span>₹{cycle.totalAmount.toLocaleString('en-IN')}</span>
            </div>
        </div>
    );

    return (
        <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6 lg:p-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex flex-col gap-1 mb-8">
                <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
                    <CreditCard className="w-8 h-8 text-primary" />
                    Billing & Subscription
                </h1>
                <p className="text-muted-foreground font-medium">Manage your RoomBox plan, premium features, and billing history.</p>
            </div>

            <SubscriptionDialog open={isSubDialogOpen} onOpenChange={setIsSubDialogOpen} />
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                <div className="lg:col-span-2 space-y-8">
                     <Card className="border-border/40 shadow-sm overflow-hidden rounded-2xl">
                        <CardHeader className="bg-muted/30">
                            <CardTitle className="flex items-center gap-2 text-xl"><Star className="text-amber-500 fill-amber-500/20" /> Premium Feature Add-ons</CardTitle>
                            <CardDescription>Enable powerful features to supercharge your PG management.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-5 p-6">
                            <Alert className="bg-primary/5 border-primary/20 rounded-xl">
                                <AlertCircle className="h-4 w-4 text-primary" />
                                <AlertTitle className="text-primary font-bold">Billing Information</AlertTitle>
                                <AlertDescription className="text-primary/80 font-medium">
                                    Changes to features will apply from your next billing cycle.
                                </AlertDescription>
                            </Alert>
                            <div className="grid gap-4">
                                <div className="flex items-center justify-between p-5 border rounded-2xl hover:border-primary/30 transition-all hover:bg-muted/20 group">
                                    <div className="space-y-1">
                                        <Label htmlFor="website-builder" className="flex items-center gap-2 font-bold text-lg tracking-tight"><Globe className="w-5 h-5 text-blue-500"/> Website Builder</Label>
                                        <p className="text-muted-foreground text-sm font-medium">Get a professional website for your PG. (₹20/month)</p>
                                    </div>
                                    <Switch id="website-builder" checked={!!currentUser.subscription?.premiumFeatures?.website?.enabled} onCheckedChange={(c) => handleToggleFeature('website', c)} disabled={isSaving} className="data-[state=checked]:bg-blue-500"/>
                                </div>
                                <div className="flex items-center justify-between p-5 border rounded-2xl hover:border-primary/30 transition-all hover:bg-muted/20 group">
                                    <div className="space-y-1">
                                        <Label htmlFor="kyc" className="flex items-center gap-2 font-bold text-lg tracking-tight"><UserCheck className="w-5 h-5 text-emerald-500"/> Automated KYC</Label>
                                        <p className="text-muted-foreground text-sm font-medium">AI-powered document verification. (₹50/month)</p>
                                    </div>
                                    <Switch id="kyc" checked={!!currentUser.subscription?.premiumFeatures?.kyc?.enabled} onCheckedChange={(c) => handleToggleFeature('kyc', c)} disabled={isSaving} className="data-[state=checked]:bg-emerald-500"/>
                                </div>
                                <div className="flex items-center justify-between p-5 border rounded-2xl hover:border-primary/30 transition-all hover:bg-muted/20 group">
                                    <div className="space-y-1">
                                        <Label htmlFor="whatsapp" className="flex items-center gap-2 font-bold text-lg tracking-tight"><BotIcon className="w-5 h-5 text-purple-500"/> WhatsApp Automation</Label>
                                        <p className="text-muted-foreground text-sm font-medium">Automated reminders and notifications. (₹30/tenant/month)</p>
                                    </div>
                                    <Switch id="whatsapp" checked={!!currentUser.subscription?.premiumFeatures?.whatsapp?.enabled} onCheckedChange={(c) => handleToggleFeature('whatsapp', c)} disabled={isSaving} className="data-[state=checked]:bg-purple-500"/>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

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
                                            <TableCell className="px-6 py-4 font-bold text-foreground italic tracking-tighter text-lg">₹{payment.amount.toLocaleString('en-IN')}</TableCell>
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
                </div>
                 <div className="lg:col-span-1 space-y-6">
                     <Card className="sticky top-24 border-primary/20 shadow-2xl shadow-primary/10 bg-gradient-to-br from-primary/[0.03] via-transparent to-primary/[0.01] rounded-3xl overflow-hidden">
                        <CardHeader className="pb-4">
                            <CardTitle className="flex items-center gap-2 text-xl font-black italic tracking-tighter"><CreditCard className="text-primary w-6 h-6"/> Billing Summary</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6 p-6 pt-0">
                            {isLoadingBill ? (
                                <div className="space-y-4">
                                    <Skeleton className="h-20 w-full rounded-2xl" />
                                    <Skeleton className="h-20 w-full rounded-2xl" />
                                    <Skeleton className="h-10 w-full rounded-2xl" />
                                </div>
                            ) : billingDetails ? (
                                <div className="space-y-8">
                                    <div className="p-4 rounded-2xl bg-muted/30 border border-border/40">
                                        <BillingBreakdown cycle={billingDetails.currentCycle} title="Current Monthly Bill" details={billingDetails.details}/>
                                    </div>
                                    <div className="p-4 rounded-2xl bg-primary/[0.02] border border-primary/10">
                                        <BillingBreakdown cycle={billingDetails.nextCycleEstimate} title="Next Month's Forecast" details={billingDetails.details} />
                                    </div>
                                     <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-500/5 border border-amber-500/10">
                                         <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                                         <p className="text-[0.65rem] text-amber-800/80 font-bold leading-tight">Billing estimates are based on {billingDetails.details.propertyCount} active properties and {billingDetails.details.billableTenantCount} managed tenants.</p>
                                     </div>
                                </div>
                            ) : (
                                <p className="text-muted-foreground text-sm italic">Could not load billing details.</p>
                            )}
                        </CardContent>
                        <CardFooter className="p-6 pt-0">
                            <Button className="w-full font-black italic py-7 text-lg rounded-2xl shadow-xl shadow-primary/20 transform active:scale-[0.98] transition-all hover:brightness-110" onClick={() => setIsSubDialogOpen(true)}>
                                MANAGE SUBSCRIPTION
                            </Button>
                        </CardFooter>
                    </Card>

                    <Card className="border-dashed border-2 rounded-2xl bg-muted/20">
                        <CardContent className="p-6 text-center space-y-4">
                            <ShieldAlert className="w-8 h-8 text-muted-foreground mx-auto" />
                            <div className="space-y-1">
                                <h4 className="font-bold text-sm">Need Help with Billing?</h4>
                                <p className="text-xs text-muted-foreground px-4">Our support team is available 24/7 to help you with payment or plan related queries.</p>
                            </div>
                            <Button variant="outline" size="sm" className="w-full font-bold rounded-xl border-border/60">Contact Support</Button>
                        </CardContent>
                    </Card>
                 </div>
            </div>
        </div>
    )
}
