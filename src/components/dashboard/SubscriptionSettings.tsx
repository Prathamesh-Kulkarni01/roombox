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
import { Skeleton } from "@/components/ui/skeleton"
import { PRICING_CONFIG } from "@/lib/constants"
import { getBillingDetails, getMonthlyInvoices } from "@/lib/actions/billingActions"
import UsageBreakdownDialog from "@/components/billing/UsageBreakdownDialog"
import type { MonthlyInvoice, BillingDetails, PremiumFeatures, BillingCycleDetails } from "@/lib/types"

export default function SubscriptionSettings() {
    const dispatch = useAppDispatch();
    const { toast } = useToast();
    const { currentUser, currentPlan } = useAppSelector((state) => state.user);
    const [isSaving, startTransition] = useTransition();
    const [isSubDialogOpen, setIsSubDialogOpen] = useState(false);
    const [billingDetails, setBillingDetails] = useState<BillingDetails | null>(null);
    const [isLoadingBill, setIsLoadingBill] = useState(true);
    const [invoices, setInvoices] = useState<MonthlyInvoice[]>([]);
    const [isLoadingInvoices, setIsLoadingInvoices] = useState(true);
    const [selectedInvoice, setSelectedInvoice] = useState<MonthlyInvoice | null>(null);
    const [isBreakdownOpen, setIsBreakdownOpen] = useState(false);

    useEffect(() => {
        const fetchBillingData = async () => {
            if (!currentUser) return;
            setIsLoadingBill(true);
            setIsLoadingInvoices(true);
            
            const [billingResult, invoicesResult] = await Promise.all([
                getBillingDetails(currentUser.id),
                getMonthlyInvoices(currentUser.id)
            ]);

            if (billingResult.success && billingResult.data) {
                setBillingDetails(billingResult.data);
            } else {
                toast({ variant: 'destructive', title: 'Error', description: 'Could not load billing details.' });
            }

            if (invoicesResult.success && invoicesResult.data) {
                setInvoices(invoicesResult.data);
            }

            setIsLoadingBill(false);
            setIsLoadingInvoices(false);
        };
        
        if (currentUser?.id) {
            fetchBillingData();
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
                    <span>Platform Base Fee</span>
                    <span>₹{cycle.propertyCharge.toLocaleString('en-IN')}</span>
                </div>
            }
             {cycle.tenantCharge > 0 &&
                <div className="flex justify-between text-sm">
                    <span>Tenants ({details.billableTenantCount} × ₹{cycle.perTenantFee})</span>
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
                                    <p className="text-muted-foreground text-xs font-medium">Get a professional website for your PG. (₹{PRICING_CONFIG.premiumFeatures.website.monthlyCharge}/month)</p>
                                </div>
                                <Switch id="website-builder" checked={!!currentUser.subscription?.premiumFeatures?.website?.enabled} onCheckedChange={(c) => handleToggleFeature('website', c)} disabled={isSaving}/>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-border/40 shadow-sm">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-xl"><History className="text-muted-foreground"/> Billing History</CardTitle>
                            <CardDescription>Review your monthly invoices and granular usage breakdowns.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow className="hover:bg-transparent">
                                        <TableHead>Month</TableHead>
                                        <TableHead>Amount</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right whitespace-nowrap">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isLoadingInvoices ? (
                                        [...Array(3)].map((_, i) => (
                                            <TableRow key={i}>
                                                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                                                <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                                                <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                                                <TableCell className="text-right"><Skeleton className="h-8 w-16 ml-auto" /></TableCell>
                                            </TableRow>
                                        ))
                                    ) : invoices.length > 0 ? invoices.map(invoice => (
                                        <TableRow key={invoice.id}>
                                            <TableCell className="font-medium">
                                                {format(parseISO(`${invoice.month}-01`), 'MMMM yyyy')}
                                            </TableCell>
                                            <TableCell className="font-bold text-foreground">₹{invoice.totalAmount.toLocaleString('en-IN')}</TableCell>
                                            <TableCell>
                                                <Badge variant={invoice.status === 'paid' ? 'default' : 'secondary'} className="rounded-full px-3 uppercase text-[0.6rem] font-bold">
                                                    {invoice.status.replace('_', ' ')}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button 
                                                    variant="outline" 
                                                    size="sm" 
                                                    className="font-bold rounded-xl h-8 text-xs hover:bg-primary hover:text-white transition-all"
                                                    onClick={() => {
                                                        setSelectedInvoice(invoice);
                                                        setIsBreakdownOpen(true);
                                                    }}
                                                >
                                                    View Details
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    )) : (
                                        <TableRow>
                                            <TableCell colSpan={4} className="text-center h-24 text-muted-foreground font-medium italic">
                                                No billing history found.
                                            </TableCell>
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

            <UsageBreakdownDialog 
                ownerId={currentUser.id}
                invoice={selectedInvoice}
                open={isBreakdownOpen}
                onOpenChange={setIsBreakdownOpen}
            />
        </div>
    )
}
