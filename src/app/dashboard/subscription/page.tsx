
'use client'

import React, { useState, useTransition, useEffect } from "react"
import { useAppDispatch, useAppSelector } from "@/lib/hooks"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertCircle, Loader2, Star, CreditCard, History, ShieldAlert, Globe, UserCheck, BotIcon } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import SubscriptionDialog from '@/components/dashboard/dialogs/SubscriptionDialog'
import { togglePremiumFeature } from "@/lib/actions/userActions"
import { updateUserPlan } from "@/lib/slices/userSlice"
import { useToast } from "@/hooks/use-toast"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { format, parseISO } from "date-fns"
import { Badge } from "@/components/ui/badge"
import type { PremiumFeatures } from '@/lib/types'
import { getBillingDetails, type BillingDetails } from "@/lib/actions/billingActions"
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

        fetchBillingDetails();
    }, [currentUser, toast]);


    if (!currentUser || !currentPlan) return null;

    const handleToggleFeature = (feature: keyof PremiumFeatures, enabled: boolean) => {
        if(!currentUser) return;
        startTransition(async () => {
            const result = await togglePremiumFeature({ userId: currentUser.id, feature, enabled });
            if(result.success) {
                toast({ title: "Feature Updated", description: `Successfully ${enabled ? 'enabled' : 'disabled'} ${feature}. Changes will apply on your next bill.` });
                dispatch(updateUserPlan({ planId: currentUser.subscription?.planId || 'free' }));
            } else {
                toast({ variant: 'destructive', title: 'Update Failed', description: result.error });
            }
        });
    };

    return (
        <div className="space-y-6">
            <SubscriptionDialog open={isSubDialogOpen} onOpenChange={setIsSubDialogOpen} />
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                <div className="lg:col-span-2 space-y-6">
                     <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Star /> Premium Feature Add-ons</CardTitle>
                            <CardDescription>Enable powerful features to supercharge your PG management. Your monthly bill will be updated based on your usage.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <Alert>
                                <AlertCircle className="h-4 w-4" />
                                <AlertTitle>Billing Information</AlertTitle>
                                <AlertDescription>
                                    Changes to features will apply from your next billing cycle. You will be charged for the current cycle if a feature was used.
                                </AlertDescription>
                            </Alert>
                            <div className="flex items-center justify-between p-4 border rounded-lg">
                                <div className="space-y-1">
                                    <Label htmlFor="website-builder" className="flex items-center gap-2 font-semibold text-base"><Globe/> Website Builder</Label>
                                    <p className="text-muted-foreground text-sm">Get a professional website for your PG. (₹20/month)</p>
                                </div>
                                <Switch id="website-builder" checked={!!currentUser.subscription?.premiumFeatures?.website?.enabled} onCheckedChange={(c) => handleToggleFeature('website', c)} disabled={isSaving}/>
                            </div>
                            <div className="flex items-center justify-between p-4 border rounded-lg">
                                <div className="space-y-1">
                                    <Label htmlFor="kyc" className="flex items-center gap-2 font-semibold text-base"><UserCheck/> Automated KYC</Label>
                                    <p className="text-muted-foreground text-sm">AI-powered document verification.</p>
                                </div>
                                <Switch id="kyc" checked={!!currentUser.subscription?.premiumFeatures?.kyc?.enabled} onCheckedChange={(c) => handleToggleFeature('kyc', c)} disabled={isSaving}/>
                            </div>
                            <div className="flex items-center justify-between p-4 border rounded-lg">
                                <div className="space-y-1">
                                    <Label htmlFor="whatsapp" className="flex items-center gap-2 font-semibold text-base"><BotIcon/> WhatsApp Automation</Label>
                                    <p className="text-muted-foreground text-sm">Automated reminders and notifications. (₹30/tenant/month)</p>
                                </div>
                                <Switch id="whatsapp" checked={!!currentUser.subscription?.premiumFeatures?.whatsapp?.enabled} onCheckedChange={(c) => handleToggleFeature('whatsapp', c)} disabled={isSaving}/>
                            </div>
                        </CardContent>
                         <CardFooter>
                            <p className="text-xs text-muted-foreground">Note: Billing is usage-based. You will be charged at the end of your monthly cycle for enabled features.</p>
                         </CardFooter>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><History/> Payment History</CardTitle>
                            <CardDescription>
                                Your record of past subscription payments.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Amount</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Invoice</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {(currentUser.subscription?.paymentHistory || []).length > 0 ? currentUser.subscription?.paymentHistory?.map(payment => (
                                        <TableRow key={payment.id}>
                                            <TableCell>{format(parseISO(payment.date), 'do MMM, yyyy')}</TableCell>
                                            <TableCell>₹{payment.amount.toLocaleString('en-IN')}</TableCell>
                                            <TableCell><Badge variant={payment.status === 'paid' ? 'default' : 'destructive'}>{payment.status}</Badge></TableCell>
                                            <TableCell className="text-right"><Button variant="link" size="sm">View</Button></TableCell>
                                        </TableRow>
                                    )) : (
                                        <TableRow>
                                            <TableCell colSpan={4} className="text-center h-24">No payment history found.</TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>
                 <div className="lg:col-span-1 space-y-6">
                     <Card className="sticky top-20">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><CreditCard /> Billing Summary</CardTitle>
                            <CardDescription>
                                Estimated charges for the current cycle.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {isLoadingBill ? (
                                <div className="space-y-3">
                                    <Skeleton className="h-5 w-3/4" />
                                    <Skeleton className="h-5 w-full" />
                                    <Skeleton className="h-5 w-1/2" />
                                    <hr/>
                                    <Skeleton className="h-8 w-2/3" />
                                </div>
                            ) : billingDetails ? (
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between"><span>Properties:</span> <span>{billingDetails.details.propertyCount} x ₹{billingDetails.details.pricingConfig.perProperty}</span></div>
                                    <div className="flex justify-between"><span>Tenants ({billingDetails.details.billableTenantCount} billable):</span> <span>{billingDetails.details.billableTenantCount} x ₹{billingDetails.details.pricingConfig.perTenant}</span></div>
                                    {Object.values(billingDetails.details.premiumFeaturesDetails).map(feature => (
                                         <div key={feature.description} className="flex justify-between"><span>{feature.description.split('@')[0].trim()}:</span> <span>₹{feature.charge}</span></div>
                                    ))}
                                    <hr className="my-2"/>
                                    <div className="flex justify-between font-bold text-base"><span>Est. Total:</span> <span>₹{billingDetails.totalAmount}</span></div>
                                </div>
                            ) : (
                                <p className="text-muted-foreground text-sm">Could not load billing details.</p>
                            )}
                        </CardContent>
                        <CardFooter>
                            <Button className="w-full" onClick={() => setIsSubDialogOpen(true)}>
                                Manage Subscription
                            </Button>
                        </CardFooter>
                    </Card>
                 </div>
            </div>
        </div>
    )
}

