
'use client'

import React, { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAppDispatch, useAppSelector } from '@/lib/hooks';
import { useToast } from '@/hooks/use-toast';
import type { PaymentMethod, BankPaymentMethod, UpiPaymentMethod } from '@/lib/types';
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
import { Banknote, Check, IndianRupee, Loader2, MoreVertical, PlusCircle, Trash2, Edit } from 'lucide-react';

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
            legal_business_name: currentUser?.name || 'Prathamesh Kulkarni', // Prefilled
            pan_number: 'ABCDE1234F', // Test data
            dob: format(new Date('1990-01-01'), 'yyyy-MM-dd'), // Test data
        }
    });

    const payoutForm = useForm<PayoutAccountFormValues>({
        resolver: zodResolver(payoutAccountSchema),
        defaultValues: { payoutMethod: 'vpa' }
    });

    const payoutMethod = payoutForm.watch('payoutMethod');
    
    const handleKycSubmit = (data: KycFormValues) => {
        // In a real scenario, this would trigger an update to the user's KYC/stakeholder info on Razorpay
        toast({ title: "KYC Info Saved", description: "Your business and KYC information has been updated." });
    }

    const handlePayoutAccountSubmit = (data: PayoutAccountFormValues) => {
        startSavingTransition(async () => {
            if (!currentUser) return;
            try {
                // For 'vpa', the name field is not strictly needed for the API but good for display
                const submissionData = { ...data, name: data.name || (data.payoutMethod === 'vpa' ? data.vpa : currentUser.name) };

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
                } else {
                    throw new Error(result.error);
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
                } else {
                    throw new Error(result.error);
                }
            } catch (e: any) {
                toast({ variant: 'destructive', title: 'Unlink Failed', description: e.message });
            } finally {
                setMethodToUnlink(null);
            }
        });
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>KYC &amp; Business Information</CardTitle>
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

