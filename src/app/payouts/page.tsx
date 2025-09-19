
'use client'

import React, { useState, useTransition, useMemo, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAppDispatch, useAppSelector } from '@/lib/hooks';
import { useToast } from '@/hooks/use-toast';
import type { PaymentMethod, BankPaymentMethod, UpiPaymentMethod } from '@/lib/types';
import { addPayoutMethod, deletePayoutMethod, setPrimaryPayoutMethod } from '@/lib/actions/payoutActions';
import { setCurrentUser } from '@/lib/slices/userSlice';

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Banknote, Check, IndianRupee, Loader2, MoreVertical, PlusCircle, Trash2, Edit, UserCheck, PartyPopper, Contact, Link as LinkIcon, HandCoins, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';

const kycSchema = z.object({
    legal_business_name: z.string().min(2, "Business name is required."),
    business_type: z.enum(['proprietorship', 'partnership', 'private_limited', 'public_limited', 'llp', 'trust', 'society', 'not_for_profit']),
    pan_number: z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, "Invalid PAN format.").min(10, 'Invalid PAN format'),
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
  account_number: z.string().min(5, "Account number is required.").regex(/^\d+$/, "Account number must contain only digits.").optional(),
  ifsc: z.string().length(11, "IFSC code must be 11 characters.").regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, "Invalid IFSC code format.").optional(),
  vpa: z.string().regex(/^[\w.-]+@[\w.-]+$/, "Invalid UPI ID format.").optional(),
}).refine(data => {
    if (data.payoutMethod === 'bank_account') {
        return !!data.name && !!data.account_number && !!data.ifsc;
    }
    if (data.payoutMethod === 'vpa') {
        return !!data.vpa;
    }
    return false;
}, {
    message: 'Please fill in the required fields for the selected payout method.',
    path: ['payoutMethod'],
});


type KycFormValues = z.infer<typeof kycSchema>;
type PayoutAccountFormValues = z.infer<typeof payoutAccountSchema>;

export default function PayoutsPage() {
    const dispatch = useAppDispatch();
    const { currentUser } = useAppSelector((state) => state.user);
    const { toast } = useToast();
    const [isSaving, startSavingTransition] = useTransition();
    const [isPayoutDialogOpen, setIsPayoutDialogOpen] = useState(false);
    const [methodToUnlink, setMethodToUnlink] = useState<PaymentMethod | null>(null);

    const kycForm = useForm<KycFormValues>({
        resolver: zodResolver(kycSchema),
        defaultValues: {
            legal_business_name: currentUser?.name || '',
            business_type: 'proprietorship',
            phone: currentUser?.phone || ''
        }
    });

    const payoutForm = useForm<PayoutAccountFormValues>({
        resolver: zodResolver(payoutAccountSchema),
        defaultValues: { payoutMethod: 'vpa' }
    });

    const payoutMethod = payoutForm.watch('payoutMethod');

    const handlePayoutAccountSubmit = (data: PayoutAccountFormValues) => {
        startSavingTransition(async () => {
            if (!currentUser) return;
            
            const kycData = kycForm.getValues();
            const isKycValid = await kycForm.trigger();
            if (!isKycValid) {
                toast({ variant: 'destructive', title: 'KYC Details Missing', description: 'Please fill in all required business and address information first.'});
                return;
            }
            
            const submissionData = { 
                ...data, 
                ...kycData,
                name: data.name || (data.payoutMethod === 'vpa' ? data.vpa! : kycData.legal_business_name) 
            };
            
            try {
                const result = await addPayoutMethod(currentUser.id, submissionData);
                if (result.success && result.updatedUser) {
                    dispatch(setCurrentUser(result.updatedUser));
                    toast({ title: 'Account Linked!', description: 'Your new payout account has been successfully added.' });
                    setIsPayoutDialogOpen(false);
                    payoutForm.reset({ payoutMethod: 'vpa' });
                }
            } catch (e: any) {
                toast({ variant: 'destructive', title: 'Failed to Link Account', description: e.message || 'An unexpected error occurred.' });
            }
        });
    };

    const handleSetPrimary = (methodId: string) => {
        if (!currentUser) return;
        startSavingTransition(async () => {
            try {
                const result = await setPrimaryPayoutMethod({ ownerId: currentUser.id, methodId });
                 if (result.success) {
                    dispatch(setCurrentUser(result.updatedUser));
                    toast({ title: 'Primary Account Updated' });
                }
            } catch (e: any) {
                toast({ variant: 'destructive', title: 'Update Failed', description: e.message });
            }
        });
    };

    const handleUnlink = () => {
        if (!currentUser || !methodToUnlink) return;
        startSavingTransition(async () => {
            try {
                const result = await deletePayoutMethod({ ownerId: currentUser.id, methodId: methodToUnlink.razorpay_fund_account_id! });
                if(result.success) {
                    dispatch(setCurrentUser(result.updatedUser));
                    toast({ title: 'Account Unlinked' });
                }
            } catch (e: any) {
                toast({ variant: 'destructive', title: 'Unlink Failed', description: e.message });
            } finally {
                setMethodToUnlink(null);
            }
        });
    };
    
    const onboardingComplete = !!currentUser?.subscription?.payoutMethods?.some(m => m.isActive && m.razorpay_fund_account_id);

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>KYC &amp; Business Information</CardTitle>
                    <CardDescription>This information is required by Razorpay to create your sub-merchant account for payouts.</CardDescription>
                </CardHeader>
                <Form {...kycForm}>
                    <form>
                        <CardContent className="space-y-6">
                             <div className="grid md:grid-cols-2 gap-6">
                                <FormField control={kycForm.control} name="legal_business_name" render={({ field }) => (
                                    <FormItem><FormLabel>Legal Business Name</FormLabel><FormControl><Input placeholder="Your full name as per PAN" {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                                <FormField control={kycForm.control} name="phone" render={({ field }) => (
                                    <FormItem><FormLabel>Phone Number</FormLabel><FormControl><Input placeholder="Your 10-digit mobile number" {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                            </div>
                            <div className="grid md:grid-cols-2 gap-6">
                                <FormField control={kycForm.control} name="pan_number" render={({ field }) => ( <FormItem><FormLabel>PAN Number</FormLabel><FormControl><Input placeholder="Enter 10-digit PAN" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                                <FormField control={kycForm.control} name="business_type" render={({ field }) => (
                                    <FormItem><FormLabel>Business Type</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select business type..." /></SelectTrigger></FormControl><SelectContent><SelectItem value="proprietorship">Proprietorship</SelectItem><SelectItem value="partnership">Partnership</SelectItem><SelectItem value="private_limited">Private Limited</SelectItem><SelectItem value="public_limited">Public Limited</SelectItem><SelectItem value="llp">LLP</SelectItem><SelectItem value="trust">Trust</SelectItem><SelectItem value="society">Society</SelectItem><SelectItem value="not_for_profit">Not for Profit</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                                )}/>
                            </div>
                             <div className="grid md:grid-cols-2 gap-6">
                                <FormField control={kycForm.control} name="gst_number" render={({ field }) => ( <FormItem><FormLabel>GST Number (Optional)</FormLabel><FormControl><Input placeholder="Enter 15-digit GSTIN" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                            </div>
                             <div>
                                <h3 className="text-base font-medium mb-2">Registered Business Address</h3>
                                <div className="space-y-4 p-4 border rounded-lg">
                                    <FormField control={kycForm.control} name="street1" render={({ field }) => (<FormItem><FormLabel>Street Address 1</FormLabel><FormControl><Input placeholder="Flat, Building, Street" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                                    <FormField control={kycForm.control} name="street2" render={({ field }) => (<FormItem><FormLabel>Street Address 2 (Optional)</FormLabel><FormControl><Input placeholder="Area, Locality" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                                    <div className="grid md:grid-cols-3 gap-4">
                                        <FormField control={kycForm.control} name="city" render={({ field }) => (<FormItem><FormLabel>City</FormLabel><FormControl><Input placeholder="e.g., Bangalore" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                                        <FormField control={kycForm.control} name="state" render={({ field }) => (<FormItem><FormLabel>State</FormLabel><FormControl><Input placeholder="e.g., Karnataka" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                                        <FormField control={kycForm.control} name="postal_code" render={({ field }) => (<FormItem><FormLabel>Postal Code</FormLabel><FormControl><Input placeholder="e.g., 560034" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </form>
                </Form>
            </Card>
            
            <Card>
                <CardHeader>
                    <CardTitle>Payout Onboarding Status</CardTitle>
                    <CardDescription>{onboardingComplete ? "Your account is set up to receive automated payouts." : "Link a payout method to complete your onboarding."}</CardDescription>
                </CardHeader>
                 <CardContent>
                    <div className={cn("flex items-center gap-3 p-4 rounded-lg border", onboardingComplete ? 'bg-green-100 text-green-900 border-green-300' : 'bg-yellow-100 text-yellow-900 border-yellow-300')}>
                        {onboardingComplete ? <CheckCircle className="w-5 h-5"/> : <AlertCircle className="w-5 h-5"/>}
                        <span className="font-semibold">{onboardingComplete ? 'Onboarding Complete' : 'Action Required'}</span>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">Payout Methods</CardTitle>
                        <CardDescription>Manage your linked bank accounts and UPI IDs to receive rent settlements.</CardDescription>
                    </div>
                    <Button onClick={() => setIsPayoutDialogOpen(true)}>
                        <PlusCircle className="mr-2 h-4 w-4" /> Add Method
                    </Button>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {(currentUser?.subscription?.payoutMethods || []).map(method => (
                            <div key={method.razorpay_fund_account_id} className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
                                <div className="flex items-center gap-4">
                                    {method.type === 'vpa' ? <IndianRupee className="w-5 h-5 text-primary" /> : <Banknote className="w-5 h-5 text-primary" />}
                                    <div>
                                        <div className="font-semibold flex items-center gap-2">
                                            {method.name}
                                            {method.isPrimary && <Badge>Primary</Badge>}
                                        </div>
                                        <div className="text-sm text-muted-foreground">
                                            {method.type === 'vpa' ? (method as UpiPaymentMethod).vpaAddress : `A/C: ...${(method as BankPaymentMethod).accountNumberLast4}`}
                                        </div>
                                    </div>
                                </div>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon"><MoreVertical className="w-4 h-4" /></Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent>
                                        {!method.isPrimary && <DropdownMenuItem onClick={() => handleSetPrimary(method.razorpay_fund_account_id!)} disabled={isSaving}><Check className="mr-2 h-4 w-4" /> Set as Primary</DropdownMenuItem>}
                                        <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setMethodToUnlink(method)} disabled={isSaving}><Trash2 className="mr-2 h-4 w-4" /> Unlink</DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        ))}
                        {(currentUser?.subscription?.payoutMethods || []).length === 0 && (
                            <p className="text-sm text-muted-foreground text-center py-4">No payout methods added yet.</p>
                        )}
                    </div>
                </CardContent>
            </Card>

            <Dialog open={isPayoutDialogOpen} onOpenChange={setIsPayoutDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add New Payout Method</DialogTitle>
                        <DialogDescription>Link a UPI ID or Bank Account to receive rent settlements.</DialogDescription>
                    </DialogHeader>
                    <Form {...payoutForm}>
                        <form id="payout-form-modal" onSubmit={payoutForm.handleSubmit(handlePayoutAccountSubmit)} className="space-y-6">
                            <FormField
                                control={payoutForm.control}
                                name="payoutMethod"
                                render={({ field }) => (
                                    <FormItem className="space-y-3">
                                        <FormControl>
                                            <RadioGroup onValueChange={field.onChange} value={field.value} className="flex space-x-4">
                                                <FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="vpa" id="vpa" /></FormControl><FormLabel htmlFor="vpa" className="font-normal">UPI ID</FormLabel></FormItem>
                                                <FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="bank_account" id="bank_account" /></FormControl><FormLabel htmlFor="bank_account" className="font-normal">Bank Account</FormLabel></FormItem>
                                            </RadioGroup>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            {payoutMethod === 'bank_account' && (
                                <FormField control={payoutForm.control} name="name" render={({ field }) => (<FormItem><FormLabel>Full Name (as per Bank/PAN)</FormLabel><FormControl><Input placeholder="Enter full legal name" {...field} /></FormControl><FormMessage /></FormItem>)} />
                            )}
                            {payoutMethod === 'bank_account' && (
                                <div className="space-y-4">
                                    <FormField control={payoutForm.control} name="account_number" render={({ field }) => (<FormItem><FormLabel>Bank Account Number</FormLabel><FormControl><Input placeholder="Enter bank account number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                    <FormField control={payoutForm.control} name="ifsc" render={({ field }) => (<FormItem><FormLabel>IFSC Code</FormLabel><FormControl><Input placeholder="Enter IFSC code" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                </div>
                            )}
                            {payoutMethod === 'vpa' && (
                                <FormField control={payoutForm.control} name="vpa" render={({ field }) => (
                                    <FormItem><FormLabel>UPI ID (VPA)</FormLabel><FormControl><Input placeholder="your-upi-id@okhdfcbank" {...field} onChange={(e) => field.onChange(e.target.value.trim().toLowerCase())} /></FormControl><FormMessage /></FormItem>
                                )} />
                            )}
                        </form>
                    </Form>
                    <DialogFooter className="mt-4">
                        <DialogClose asChild><Button type="button" variant="secondary">Cancel</Button></DialogClose>
                        <Button type="submit" form="payout-form-modal" disabled={isSaving}>
                            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Add Payout Method
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

             <AlertDialog open={!!methodToUnlink} onOpenChange={() => setMethodToUnlink(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently unlink the payout method <span className="font-semibold">{methodToUnlink?.name}</span>. You will no longer receive payouts to this account.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleUnlink} disabled={isSaving} className="bg-destructive hover:bg-destructive/90">
                            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Unlink
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
