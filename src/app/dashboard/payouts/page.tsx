'use client'

import React, { useState, useTransition, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAppDispatch, useAppSelector } from '@/lib/hooks';
import { useToast } from '@/hooks/use-toast';
import type { PaymentMethod, BankPaymentMethod, UpiPaymentMethod } from '@/lib/types';
import { addPayoutMethod, deletePayoutMethod, setPrimaryPayoutMethod } from '@/lib/actions/payoutActions';
import { setCurrentUser, updateUserKycDetails } from '@/lib/slices/userSlice';
import { Loader2, CheckCircle, AlertCircle, Banknote, IndianRupee, PlusCircle, MoreVertical, Trash2, Check } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from '@/components/ui/alert-dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

// KYC & Payout Schemas
const kycSchema = z.object({
    legal_business_name: z.string().min(2, "Business name is required."),
    business_type: z.enum(['proprietorship', 'partnership', 'private_limited', 'public_limited', 'llp', 'trust', 'society', 'not_for_profit']),
    pan_number: z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]$/, "Invalid PAN format."),
    gst_number: z.string().optional(),
    phone: z.string().regex(/^\d{10}$/, "A valid 10-digit phone number is required."),
    street1: z.string().min(3, 'Address is required.'),
    street2: z.string().optional(),
    city: z.string().min(2, 'City is required.'),
    state: z.string().min(2, 'State is required.'),
    postal_code: z.string().regex(/^\d{6}$/, 'Invalid postal code.'),
});

const payoutAccountSchema = z.object({
    payoutMethod: z.enum(['bank_account', 'vpa']),
    name: z.string().optional(),
    account_number: z.string().min(5).regex(/^\d+$/).optional(),
    ifsc: z.string().length(11).regex(/^[A-Z]{4}0[A-Z0-9]{6}$/).optional(),
    vpa: z.string().regex(/^[\w.-]+@[\w.-]+$/).optional(),
}).refine(data => {
    if (data.payoutMethod === 'bank_account') return !!data.name && !!data.account_number && !!data.ifsc;
    if (data.payoutMethod === 'vpa') return !!data.vpa;
    return false;
}, { message: 'Please fill all required fields for selected payout method.', path: ['payoutMethod'] });

type KycFormValues = z.infer<typeof kycSchema>;
type PayoutAccountFormValues = z.infer<typeof payoutAccountSchema>;

export default function PayoutsPage() {
    const dispatch = useAppDispatch();
    const { currentUser } = useAppSelector(state => state.user);
    const { toast } = useToast();
    const [isSaving, startSavingTransition] = useTransition();
    const [isPayoutDialogOpen, setIsPayoutDialogOpen] = useState(false);
    const [methodToUnlink, setMethodToUnlink] = useState<PaymentMethod | null>(null);

    const kycForm = useForm<KycFormValues>({
        resolver: zodResolver(kycSchema),
        defaultValues: {
            legal_business_name: currentUser?.subscription?.kycDetails?.legal_business_name || '',
            business_type: currentUser?.subscription?.kycDetails?.business_type || 'proprietorship',
            pan_number: currentUser?.subscription?.kycDetails?.pan_number || '',
            gst_number: currentUser?.subscription?.kycDetails?.gst_number || '',
            phone: currentUser?.subscription?.kycDetails?.phone || '',
            street1: currentUser?.subscription?.kycDetails?.street1 || '',
            street2: currentUser?.subscription?.kycDetails?.street2 || '',
            city: currentUser?.subscription?.kycDetails?.city || '',
            state: currentUser?.subscription?.kycDetails?.state || '',
            postal_code: currentUser?.subscription?.kycDetails?.postal_code || '',
        }
    });

    useEffect(() => { if (currentUser?.subscription?.kycDetails) kycForm.reset(currentUser.subscription.kycDetails); }, [currentUser]);

    const payoutForm = useForm<PayoutAccountFormValues>({ resolver: zodResolver(payoutAccountSchema), defaultValues: { payoutMethod: 'vpa' } });
    const payoutMethod = payoutForm.watch('payoutMethod');

    const handlePayoutAccountSubmit = (data: PayoutAccountFormValues) => {
        startSavingTransition(async () => {
            if (!currentUser) return;

            const kycData = kycForm.getValues();
            if (!kycSchema.safeParse(kycData).success) {
                toast({ variant: 'destructive', title: 'KYC Missing', description: 'Complete your KYC before adding payout methods.' });
                kycForm.trigger(); return;
            }

            const submissionData = { ...data, ...kycData, name: data.name || (data.payoutMethod === 'vpa' ? data.vpa! : kycData.legal_business_name) };
            try {
                const result = await addPayoutMethod(currentUser.id, submissionData);
                if (result.success && result.updatedUser) {
                    dispatch(setCurrentUser(result.updatedUser));
                    toast({ title: 'Success', description: 'Payout account added.' });
                    setIsPayoutDialogOpen(false);
                    payoutForm.reset({ payoutMethod: 'vpa' });
                }
            } catch (e: any) {
                toast({ variant: 'destructive', title: 'Failed', description: e.message || 'Error adding account.' });
            }
        });
    };

    const handleSaveKyc = (data: KycFormValues) => {
        startSavingTransition(async () => {
            try {
                await dispatch(updateUserKycDetails(data)).unwrap();
                toast({ title: 'KYC Saved' });
            } catch (e: any) { toast({ variant: 'destructive', title: 'Save Failed', description: e.message }); }
        });
    };

    const handleSetPrimary = (methodId: string) => {
        if (!currentUser) return;
        startSavingTransition(async () => {
            try {
                const result = await setPrimaryPayoutMethod({ ownerId: currentUser.id, methodId });
                if (result.success) dispatch(setCurrentUser(result.updatedUser));
            } catch (e: any) { toast({ variant: 'destructive', title: 'Failed', description: e.message }); }
        });
    };

    const handleUnlink = () => {
        if (!currentUser || !methodToUnlink) return;
        startSavingTransition(async () => {
            try {
                const result = await deletePayoutMethod({ ownerId: currentUser.id, methodId: methodToUnlink.razorpay_fund_account_id! });
                if (result.success) dispatch(setCurrentUser(result.updatedUser));
            } catch (e: any) { toast({ variant: 'destructive', title: 'Failed', description: e.message }); }
            finally { setMethodToUnlink(null); }
        });
    };

    const onboardingComplete = !!currentUser?.subscription?.payoutMethods?.some(m => m.isActive && m.razorpay_fund_account_id);

    return (
        <div className="space-y-6">
            {/* KYC Card */}
            <Card>
                <Form {...kycForm}>
                    <form onSubmit={kycForm.handleSubmit(handleSaveKyc)} className="space-y-6">
                        <CardHeader><CardTitle>KYC & Business Info</CardTitle><CardDescription>Required for payouts.</CardDescription></CardHeader>
                        <CardContent className="space-y-6 grid md:grid-cols-2 gap-4">
                            <FormField control={kycForm.control} name="legal_business_name" render={({ field }) => <FormItem><FormLabel>Business Name</FormLabel><FormControl><Input {...field} placeholder="As per PAN" /></FormControl><FormMessage /></FormItem>} />
                            <FormField control={kycForm.control} name="phone" render={({ field }) => <FormItem><FormLabel>Phone</FormLabel><FormControl><Input {...field} placeholder="10-digit mobile" /></FormControl><FormMessage /></FormItem>} />
                            <FormField control={kycForm.control} name="pan_number" render={({ field }) => <FormItem><FormLabel>PAN</FormLabel><FormControl><Input {...field} placeholder="ABCDE1234F" /></FormControl><FormMessage /></FormItem>} />
                            <FormField control={kycForm.control} name="business_type" render={({ field }) => <FormItem><FormLabel>Business Type</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger></FormControl><SelectContent><SelectItem value="proprietorship">Proprietorship</SelectItem><SelectItem value="partnership">Partnership</SelectItem><SelectItem value="private_limited">Private Limited</SelectItem><SelectItem value="public_limited">Public Limited</SelectItem><SelectItem value="llp">LLP</SelectItem><SelectItem value="trust">Trust</SelectItem><SelectItem value="society">Society</SelectItem><SelectItem value="not_for_profit">Not for Profit</SelectItem></SelectContent></Select><FormMessage /></FormItem>} />
                            <FormField control={kycForm.control} name="gst_number" render={({ field }) => <FormItem><FormLabel>GST (Optional)</FormLabel><FormControl><Input {...field} placeholder="15-digit GSTIN" /></FormControl><FormMessage /></FormItem>} />
                            {/* Address */}
                            <div className="col-span-2 space-y-2 p-3 border rounded-lg">
                                <h3 className="font-medium">Registered Address</h3>
                                <FormField control={kycForm.control} name="street1" render={({ field }) => <FormItem><FormLabel>Street 1</FormLabel><FormControl><Input {...field} placeholder="Flat, Building" /></FormControl><FormMessage /></FormItem>} />
                                <FormField control={kycForm.control} name="street2" render={({ field }) => <FormItem><FormLabel>Street 2 (Optional)</FormLabel><FormControl><Input {...field} placeholder="Area, Locality" /></FormControl><FormMessage /></FormItem>} />
                                <div className="grid md:grid-cols-3 gap-2">
                                    <FormField control={kycForm.control} name="city" render={({ field }) => <FormItem><FormLabel>City</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
                                    <FormField control={kycForm.control} name="state" render={({ field }) => <FormItem><FormLabel>State</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
                                    <FormField control={kycForm.control} name="postal_code" render={({ field }) => <FormItem><FormLabel>Pincode</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter><Button type="submit" disabled={isSaving}>{isSaving && <Loader2 className="animate-spin mr-2 h-4 w-4" />}Save KYC</Button></CardFooter>
                    </form>
                </Form>
            </Card>

            {/* Onboarding Status */}
            <Card>
                <CardHeader><CardTitle>Onboarding Status</CardTitle></CardHeader>
                <CardContent>
                    <div className={cn("flex items-center gap-3 p-4 rounded-lg border", onboardingComplete ? 'bg-green-100 text-green-900 border-green-300' : 'bg-yellow-100 text-yellow-900 border-yellow-300')}>
                        {onboardingComplete ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                        <span className="font-semibold">{onboardingComplete ? 'Complete' : 'Action Required'}</span>
                    </div>
                </CardContent>
            </Card>

            {/* Payout Methods */}
            <Card>
                <CardHeader className="flex justify-between items-center">
                    <div><CardTitle>Payout Methods</CardTitle><CardDescription>Manage linked accounts</CardDescription></div>
                    <Button onClick={() => setIsPayoutDialogOpen(true)}><PlusCircle className="mr-2 h-4 w-4" />Add Method</Button>
                </CardHeader>
                <CardContent className="space-y-3">
                    {(currentUser?.subscription?.payoutMethods || []).map(method => (
                        <div key={method.razorpay_fund_account_id} className="flex justify-between items-center p-3 border rounded-lg bg-muted/30">
                            <div className="flex items-center gap-3">
                                {method.type === 'vpa' ? <IndianRupee className="w-5 h-5 text-primary" /> : <Banknote className="w-5 h-5 text-primary" />}
                                <div>
                                    <div className="flex items-center gap-2 font-semibold">{method.name}{method.isPrimary && <Badge>Primary</Badge>}</div>
                                    <div className="text-sm text-muted-foreground">{method.type === 'vpa' ? (method as UpiPaymentMethod).vpaAddress : `A/C: ...${(method as BankPaymentMethod).accountNumberLast4}`}</div>
                                </div>
                            </div>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreVertical className="w-4 h-4" /></Button></DropdownMenuTrigger>
                                <DropdownMenuContent>
                                    {!method.isPrimary && <DropdownMenuItem onClick={() => handleSetPrimary(method.razorpay_fund_account_id!)}><Check className="mr-2 h-4 w-4" />Set as Primary</DropdownMenuItem>}
                                    <DropdownMenuItem className="text-destructive" onClick={() => setMethodToUnlink(method)}><Trash2 className="mr-2 h-4 w-4" />Unlink</DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    ))}
                    {(currentUser?.subscription?.payoutMethods || []).length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No payout methods added.</p>}
                </CardContent>
            </Card>

            {/* Add Payout Dialog */}
            <Dialog open={isPayoutDialogOpen} onOpenChange={setIsPayoutDialogOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Add Payout Method</DialogTitle><DialogDescription>Link UPI or Bank Account</DialogDescription></DialogHeader>
                    <Form {...payoutForm}>
                        <form id="payout-form" onSubmit={payoutForm.handleSubmit(handlePayoutAccountSubmit)} className="space-y-4">
                            <FormField control={payoutForm.control} name="payoutMethod" render={({ field }) => (
                                <FormItem className="flex gap-4"><RadioGroup onValueChange={field.onChange} value={field.value} className="flex gap-4"><FormItem><FormControl><RadioGroupItem value="vpa" id="vpa" /></FormControl><FormLabel htmlFor="vpa">UPI ID</FormLabel></FormItem><FormItem><FormControl><RadioGroupItem value="bank_account" id="bank" /></FormControl><FormLabel htmlFor="bank">Bank Account</FormLabel></FormItem></RadioGroup><FormMessage /></FormItem>
                            )} />
                            {payoutMethod === 'bank_account' && <>
                                <FormField control={payoutForm.control} name="name" render={({ field }) => <FormItem><FormLabel>Full Name</FormLabel><FormControl><Input {...field} placeholder="As per Bank/PAN" /></FormControl><FormMessage /></FormItem>} />
                                <FormField control={payoutForm.control} name="account_number" render={({ field }) => <FormItem><FormLabel>Account Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
                                <FormField control={payoutForm.control} name="ifsc" render={({ field }) => <FormItem><FormLabel>IFSC</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
                            </>}
                            {payoutMethod === 'vpa' && <FormField control={payoutForm.control} name="vpa" render={({ field }) => <FormItem><FormLabel>UPI ID</FormLabel><FormControl><Input {...field} onChange={(e) => field.onChange(e.target.value.trim().toLowerCase())} placeholder="your-upi@bank" /></FormControl><FormMessage /></FormItem>} />}
                        </form>
                    </Form>
                    <DialogFooter className="mt-2">
                        <DialogClose asChild><Button variant="secondary">Cancel</Button></DialogClose>
                        <Button type="submit" form="payout-form" disabled={isSaving}>{isSaving && <Loader2 className="animate-spin mr-2 h-4 w-4" />}Add</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Confirm Unlink */}
            <AlertDialog open={!!methodToUnlink} onOpenChange={() => setMethodToUnlink(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader><AlertDialogTitle>Confirm Unlink</AlertDialogTitle><AlertDialogDescription>Unlink <b>{methodToUnlink?.name}</b>? You will stop receiving payouts here.</AlertDialogDescription></AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleUnlink} className="bg-destructive">{isSaving && <Loader2 className="animate-spin mr-2 h-4 w-4" />}Unlink</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
