
'use client'

import React, { useState, useTransition } from "react"
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

export default function SubscriptionPage() {
    const dispatch = useAppDispatch();
    const { toast } = useToast();
    const { currentUser, currentPlan } = useAppSelector((state) => state.user);
    const [isSaving, startTransition] = useTransition();
    const [isSubDialogOpen, setIsSubDialogOpen] = useState(false);

    if (!currentUser || !currentPlan) return null;

    const handleToggleFeature = (feature: keyof PremiumFeatures, enabled: boolean) => {
        if(!currentUser) return;
        startTransition(async () => {
            const result = await togglePremiumFeature({ userId: currentUser.id, feature, enabled });
            if(result.success) {
                // We don't dispatch updateUserPlan here anymore, as the subscription itself doesn't change
                // Instead, we should refetch the user or update the local state to reflect the change
                // For now, a page reload might be the simplest, or we can dispatch a dedicated action.
                // Let's just show a toast for now.
                toast({ title: "Feature Updated", description: `Successfully ${enabled ? 'enabled' : 'disabled'} ${feature}. Changes will apply on your next bill.` });
                // To reflect UI immediately, we'd need to update user state in redux
                // For simplicity, we can let the user see the change on next page load or via a manual refresh for now.
                 dispatch(updateUserPlan({ planId: currentUser.subscription?.planId || 'free' }));
            } else {
                toast({ variant: 'destructive', title: 'Update Failed', description: result.error });
            }
        });
    };

    return (
        <div className="space-y-6">
            <SubscriptionDialog open={isSubDialogOpen} onOpenChange={setIsSubDialogOpen} />
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
                    <CardTitle className="flex items-center gap-2"><CreditCard /> Current Subscription</CardTitle>
                    <CardDescription>
                        You are currently on the {currentPlan.name} plan.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Button onClick={() => setIsSubDialogOpen(true)}>
                        {currentPlan.id === 'free' ? 'Upgrade Plan' : 'Manage Subscription'}
                    </Button>
                </CardContent>
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
    )
}

