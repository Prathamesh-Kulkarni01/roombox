
'use client'

import React, { useState, useTransition, useMemo, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAppDispatch, useAppSelector } from '@/lib/hooks';
import { useToast } from '@/hooks/use-toast';
import type { PaymentMethod, BankPaymentMethod, UpiPaymentMethod, OnboardingStep, OnboardingStatus } from '@/lib/types';
import { addPayoutMethod, deletePayoutMethod, setPrimaryPayoutMethod } from '@/lib/actions/payoutActions';
import { setCurrentUser } from '@/lib/slices/userSlice';
import { format } from 'date-fns';

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
import { Separator } from '@/components/ui/separator';

const kycSchema = z.object({
    legal_business_name: z.string().min(2, "Business name is required."),
    pan_number: z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, "Invalid PAN format.").min(10, 'Invalid PAN format'),
    dob: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Invalid date" }),
});

const payoutAccountSchema = z.object({
  payoutMethod: z.enum(['bank_account', 'vpa']),
  name: z.string().optional(),
  account_number: z.string().min(5, "Account number is required.").regex(/^\d+$/, "Account number must contain only digits.").optional(),
  ifsc: z.string().length(11, "IFSC code must be 11 characters.").regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, "Invalid IFSC code format.").optional(),
  vpa: z.string().regex(/^[\w.-]+@[\w.-]+$/, "Invalid UPI ID format.").optional(),
  pan: z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, "Invalid PAN format.").min(10, 'Invalid PAN format').optional(),
  dob: z.string().optional(),
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
            pan_number: 'ABCDE1234F',
            dob: '1990-01-01',
        }
    });

    const payoutForm = useForm<PayoutAccountFormValues>({
        resolver: zodResolver(payoutAccountSchema),
        defaultValues: { payoutMethod: 'vpa' }
    });

    const payoutMethod = payoutForm.watch('payoutMethod');

    const handleKycSubmit = (data: KycFormValues) => {
        toast({ title: "KYC Info Saved", description: "Your business and KYC information has been updated." });
    }

    const handlePayoutAccountSubmit = (data: PayoutAccountFormValues) => {
        startSavingTransition(async () => {
            if (!currentUser) return;
            try {
                const kycData = kycForm.getValues();
                if (!kycForm.formState.isValid) {
                    toast({ variant: 'destructive', title: 'KYC Details Missing', description: 'Please fill in your legal name, PAN, and date of birth first.'});
                    return;
                }
                
                const submissionData = { 
                    ...data, 
                    pan: kycData.pan_number,
                    dob: kycData.dob,
                    name: data.name || (data.payoutMethod === 'vpa' ? data.vpa! : kycData.legal_business_name) 
                };

                const result = await addPayoutMethod(currentUser.id, submissionData);
                if (result.success && result.updatedUser) {
                    dispatch(setCurrentUser(result.updatedUser));
                    toast({ title: 'Account Linked!', description: 'Your new payout account has been successfully added.' });
                    setIsPayoutDialogOpen(false);
                    payoutForm.reset({ payoutMethod: 'vpa' });
                } else {
                    throw new Error(result.error || 'Failed to link account.');
                }
            } catch (e: any) {
                toast({ variant: 'destructive', title: 'Failed to Link Account', description: e?.message || 'An unexpected error occurred.' });
            }
        });
    };

    const handleSetPrimary = (methodId: string) => {
        if (!currentUser) return;
        startSavingTransition(async () => {
            try {
                const result = await setPrimaryPayoutMethod({ ownerId: currentUser.id, methodId });
                if (result.success && result.updatedUser) {
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
                const result = await deletePayoutMethod({ ownerId: currentUser.id, methodId: methodToUnlink.id });
                if (result.success && result.updatedUser) {
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
    
    const { timelineSteps, hasError } = useMemo((): { timelineSteps: OnboardingStep[], hasError: boolean } => {
        const isKycComplete = kycForm.formState.isValid;
        const payoutMethods = currentUser?.subscription?.payoutMethods || [];
        const primaryMethod = payoutMethods.find(m => m.isPrimary);
        const hasContact = !!currentUser?.subscription?.razorpay_contact_id;
        const hasLinkedAccount = !!primaryMethod?.id;
        const hasFundAccount = !!primaryMethod?.razorpay_fund_account_id;
        const onboardingError = primaryMethod?.onboardingError;

        let errorInTimeline = !!onboardingError;
        
        const getStatus = (stepId: string): OnboardingStatus => {
            if (onboardingError === stepId) return 'error';
            if (errorInTimeline && timelineSteps.findIndex(s => s.id === onboardingError) < timelineSteps.findIndex(s => s.id === stepId)) return 'disabled';
            
            switch (stepId) {
                case 'kyc': return isKycComplete ? 'complete' : 'pending';
                case 'contact': return hasContact ? 'complete' : (isKycComplete ? 'pending' : 'disabled');
                case 'linked_account': return hasLinkedAccount ? 'complete' : (hasContact ? 'pending' : 'disabled');
                case 'stakeholder': return hasLinkedAccount ? 'complete' : (hasContact ? 'pending' : 'disabled'); // We assume stakeholder is created with linked account
                case 'fund_account': return hasFundAccount ? 'complete' : (hasLinkedAccount ? 'pending' : 'disabled');
                case 'complete': return hasFundAccount ? 'complete' : 'disabled';
                default: return 'disabled';
            }
        };

        const timelineSteps: OnboardingStep[] = [
            { id: 'kyc', title: 'Provide KYC Details', description: 'Fill in your PAN and legal name.', icon: UserCheck, status: 'pending' },
            { id: 'contact', title: 'Contact Created', description: 'Your profile is created on Razorpay.', icon: Contact, status: 'pending' },
            { id: 'linked_account', title: 'Linked Account Generated', description: 'Virtual account for routing payments.', icon: LinkIcon, status: 'pending' },
            { id: 'stakeholder', title: 'Stakeholder Verified', description: 'Your identity as the account owner is verified.', icon: UserCheck, status: 'pending' },
            { id: 'fund_account', title: 'Fund Account Added', description: 'Your bank/UPI is linked for payouts.', icon: HandCoins, status: 'pending' },
            { id: 'complete', title: 'Setup Complete!', description: 'You are ready to receive automated payouts.', icon: PartyPopper, status: 'pending' },
        ];
        
        timelineSteps.forEach(step => step.status = getStatus(step.id));

        return { timelineSteps, hasError: errorInTimeline };
    }, [kycForm.formState.isValid, currentUser]);

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>KYC & Business Information</CardTitle>
                    <CardDescription>This information is required by Razorpay to verify your identity and process payouts.</CardDescription>
                </CardHeader>
                <Form {...kycForm}>
                    <form onSubmit={kycForm.handleSubmit(handleKycSubmit)}>
                        <CardContent className="space-y-4">
                            <FormField control={kycForm.control} name="legal_business_name" render={({ field }) => (
                                <FormItem><FormLabel>Legal Business Name</FormLabel><FormControl><Input placeholder="Your full name as per PAN" {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                            <div className="grid md:grid-cols-2 gap-4">
                                <FormField control={kycForm.control} name="pan_number" render={({ field }) => (
                                    <FormItem><FormLabel>PAN Number</FormLabel><FormControl><Input placeholder="Enter 10-digit PAN" {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                                 <FormField control={kycForm.control} name="dob" render={({ field }) => (
                                    <FormItem><FormLabel>Date of Birth</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Button type="submit" disabled={isSaving}>
                                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Edit className="mr-2 h-4 w-4"/>}
                                Save KYC Details
                            </Button>
                        </CardFooter>
                    </form>
                </Form>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Payout Onboarding Status</CardTitle>
                    <CardDescription>Follow these steps to enable automated payouts to your bank account.</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                    <div className="relative">
                        <div className="absolute left-6 top-6 h-full w-px bg-border -translate-x-1/2" aria-hidden="true"></div>
                        <ul className="space-y-4">
                            {timelineSteps.map((step) => (
                                <li key={step.id} className="flex items-start gap-4">
                                    <div className={cn("relative flex h-12 w-12 items-center justify-center rounded-full border-2", 
                                      step.status === 'complete' ? 'bg-green-100 border-green-500 text-green-600' :
                                      step.status === 'pending' ? 'bg-primary/10 border-primary text-primary' :
                                      step.status === 'error' ? 'bg-destructive/10 border-destructive text-destructive' :
                                      'bg-muted border-border text-muted-foreground'
                                    )}>
                                        {step.status === 'error' ? <AlertCircle className="h-6 w-6"/> : <step.icon className="h-6 w-6" />}
                                    </div>
                                    <div className="pt-1.5">
                                        <h4 className="font-semibold">{step.title}</h4>
                                        <p className={cn("text-sm", step.status === 'disabled' ? 'text-muted-foreground/50' : 'text-muted-foreground')}>
                                            {step.description}
                                        </p>
                                    </div>
                                </li>
                            ))}
                        </ul>
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
                            <div key={method.id} className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
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
                                        {!method.isPrimary && <DropdownMenuItem onClick={() => handleSetPrimary(method.id)} disabled={isSaving}><Check className="mr-2 h-4 w-4" /> Set as Primary</DropdownMenuItem>}
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
