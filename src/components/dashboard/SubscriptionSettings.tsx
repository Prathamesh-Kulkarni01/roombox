'use client'

import React, { useState, useTransition, useEffect } from "react"
import { useAppSelector, useAppDispatch } from "@/lib/hooks"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertCircle, Loader2, Star, CreditCard, History, ShieldAlert, Globe, UserCheck, BotIcon, IndianRupee } from "lucide-react"
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
import { Skeleton } from "@/components/ui/skeleton"

export default function SubscriptionSettings() {
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
            <hr className="my-2"/>
            <div className="flex justify-between font-bold text-base">
                <span>Total:</span> 
                <span>₹{cycle.totalAmount.toLocaleString('en-IN')}</span>
            </div>
        </div>
    );

    return (
        <div className="space-y-6">
            <SubscriptionDialog open={isSubDialogOpen} onOpenChange={setIsSubDialogOpen} />
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                <div className="lg:col-span-2 space-y-6">
                     <Card className="border-border/40 shadow-sm">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-xl"><Star className="text-amber-500 fill-amber-500/20" /> Premium Feature Add-ons</CardTitle>
                            <CardDescription>Enable powerful features to supercharge your PG management.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <Alert className="bg-blue-500/5 border-blue-200">
                                <AlertCircle className="h-4 w-4 text-blue-600" />
                                <AlertTitle className="text-blue-800 font-bold">Billing Information</AlertTitle>
                                <AlertDescription className="text-blue-700">
                                    Changes to features will apply from your next billing cycle.
                                </AlertDescription>
                            </Alert>
                            <div className="flex items-center justify-between p-4 border rounded-xl hover:border-primary/20 transition-colors">
                                <div className="space-y-1">
                                    <Label htmlFor="website-builder" className="flex items-center gap-2 font-bold text-base tracking-tight"><Globe className="w-5 h-5 text-blue-500"/> Website Builder</Label>
                                    <p className="text-muted-foreground text-xs font-medium">Get a professional website for your PG. (₹20/month)</p>
                                </div>
                                <Switch id="website-builder" checked={!!currentUser.subscription?.premiumFeatures?.website?.enabled} onCheckedChange={(c) => handleToggleFeature('website', c)} disabled={isSaving}/>
                            </div>
                            <div className="flex items-center justify-between p-4 border rounded-xl hover:border-primary/20 transition-colors">
                                <div className="space-y-1">
                                    <Label htmlFor="kyc" className="flex items-center gap-2 font-bold text-base tracking-tight"><UserCheck className="w-5 h-5 text-emerald-500"/> Automated KYC</Label>
                                    <p className="text-muted-foreground text-xs font-medium">AI-powered document verification. (₹50/month)</p>
                                </div>
                                <Switch id="kyc" checked={!!currentUser.subscription?.premiumFeatures?.kyc?.enabled} onCheckedChange={(c) => handleToggleFeature('kyc', c)} disabled={isSaving}/>
                            </div>
                            <div className="flex items-center justify-between p-4 border rounded-xl hover:border-primary/20 transition-colors">
                                <div className="space-y-1">
                                    <Label htmlFor="whatsapp" className="flex items-center gap-2 font-bold text-base tracking-tight"><BotIcon className="w-5 h-5 text-purple-500"/> WhatsApp Automation</Label>
                                    <p className="text-muted-foreground text-xs font-medium">Automated reminders and notifications. (₹30/tenant/month)</p>
                                </div>
                                <Switch id="whatsapp" checked={!!currentUser.subscription?.premiumFeatures?.whatsapp?.enabled} onCheckedChange={(c) => handleToggleFeature('whatsapp', c)} disabled={isSaving}/>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-border/40 shadow-sm">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-xl"><History className="text-muted-foreground"/> Payment History</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow className="hover:bg-transparent">
                                        <TableHead>Date</TableHead>
                                        <TableHead>Amount</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right whitespace-nowrap">Invoice</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {(currentUser.subscription?.paymentHistory || []).length > 0 ? currentUser.subscription?.paymentHistory?.map(payment => (
                                        <TableRow key={payment.id}>
                                            <TableCell className="font-medium">{format(parseISO(payment.date), 'do MMM, yyyy')}</TableCell>
                                            <TableCell className="font-bold text-foreground">₹{payment.amount.toLocaleString('en-IN')}</TableCell>
                                            <TableCell><Badge variant={payment.status === 'paid' ? 'default' : 'destructive'} className="rounded-full px-3">{payment.status}</Badge></TableCell>
                                            <TableCell className="text-right"><Button variant="link" size="sm" className="font-bold">View</Button></TableCell>
                                        </TableRow>
                                    )) : (
                                        <TableRow>
                                            <TableCell colSpan={4} className="text-center h-24 text-muted-foreground">No payment history found.</TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>
                 <div className="lg:col-span-1 space-y-6">
                     <Card className="sticky top-20 border-primary/20 shadow-lg shadow-primary/5 bg-gradient-to-b from-primary/[0.02] to-transparent">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><CreditCard className="text-primary"/> Billing Summary</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {isLoadingBill ? (
                                <div className="space-y-3">
                                    <Skeleton className="h-5 w-3/4" />
                                    <Skeleton className="h-5 w-full" />
                                    <Skeleton className="h-5 w-1/2" />
                                    <hr/>
                                    <Skeleton className="h-8 w-2/3" />
                                </div>
                            ) : billingDetails ? (
                                <div className="space-y-6">
                                    <BillingBreakdown cycle={billingDetails.currentCycle} title="This Month's Bill" details={billingDetails.details}/>
                                    <BillingBreakdown cycle={billingDetails.nextCycleEstimate} title="Next Month's Estimate" details={billingDetails.details} />
                                     <p className="text-[0.65rem] text-muted-foreground font-medium pt-2 border-t text-center italic tracking-tight">Based on {billingDetails.details.propertyCount} properties and {billingDetails.details.billableTenantCount} billable tenants.</p>
                                </div>
                            ) : (
                                <p className="text-muted-foreground text-sm">Could not load billing details.</p>
                            )}
                        </CardContent>
                        <CardFooter>
                            <Button className="w-full font-bold shadow-native py-6" onClick={() => setIsSubDialogOpen(true)}>
                                Manage Subscription
                            </Button>
                        </CardFooter>
                    </Card>
                 </div>
            </div>
        </div>
    )
}
