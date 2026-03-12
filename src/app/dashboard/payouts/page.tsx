
'use client'

import React, { useState, useTransition, useMemo, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAppDispatch, useAppSelector } from '@/lib/hooks';
import { useToast } from '@/hooks/use-toast';
import type { PaymentMethod, BankPaymentMethod, UpiPaymentMethod, User } from '@/lib/types';
import { addPayoutMethod, deletePayoutMethod, setPrimaryPayoutMethod, resetRazorpayAccount } from '@/lib/actions/payoutActions';
import { setCurrentUser, updateUserKycDetails, updatePayoutMode } from '@/lib/slices/userSlice';
import { 
  Loader2, CheckCircle, AlertCircle, Banknote, IndianRupee, PlusCircle, 
  MoreVertical, Trash2, Check, HandCoins, RefreshCw, Zap, ShieldCheck, 
  Store, CreditCard, ArrowRight, Info, Sparkles, Building2, UserCircle
} from 'lucide-react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { auth } from '@/lib/firebase';
import { cn } from '@/lib/utils';
import ReactConfetti from 'react-confetti';
import { useWindowSize } from 'react-use';

// KYC & Payout Schemas
const kycSchema = z.object({
    legal_business_name: z.string().min(2, "Name/Business name is required."),
    business_type: z.enum(['proprietorship', 'partnership', 'private_limited', 'public_limited', 'llp', 'trust', 'society', 'not_for_profit']).optional(),
    pan_number: z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]$/, "Invalid PAN format.").or(z.literal("")).optional(),
    gst_number: z.string().optional(),
    email: z.string().email("A valid email address is required."),
    phone: z.string().regex(/^\d{10}$/, "A valid 10-digit phone number is required."),
    street1: z.string().min(3, 'Address is required.').or(z.literal("")).optional(),
    street2: z.string().optional(),
    city: z.string().min(2, 'City is required.').or(z.literal("")).optional(),
    state: z.string().min(2, 'State is required.').or(z.literal("")).optional(),
    postal_code: z.string().regex(/^\d{6}$/, 'Invalid postal code.').or(z.literal("")).optional(),
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
}, { message: 'Please fill all required fields.', path: ['payoutMethod'] });

type KycFormValues = z.infer<typeof kycSchema>;
type PayoutAccountFormValues = z.infer<typeof payoutAccountSchema>;

export default function PayoutsPage() {
    const dispatch = useAppDispatch();
    const { currentUser } = useAppSelector(state => state.user);
    const { toast } = useToast();
    const { width, height } = useWindowSize();
    const [isSaving, startSavingTransition] = useTransition();
    const [isPayoutDialogOpen, setIsPayoutDialogOpen] = useState(false);
    const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
    const [showConfetti, setShowConfetti] = useState(false);
    const [methodToUnlink, setMethodToUnlink] = useState<PaymentMethod | null>(null);

    const currentMode = currentUser?.subscription?.payoutMode || 'PAYOUT';

    const kycForm = useForm<KycFormValues>({
        resolver: zodResolver(kycSchema),
        defaultValues: currentUser?.subscription?.kycDetails || {
            legal_business_name: currentUser?.name || '',
            business_type: 'proprietorship',
            pan_number: '',
            gst_number: '',
            email: currentUser?.email || '',
            phone: currentUser?.phone || '',
            street1: '',
            street2: '',
            city: '',
            state: '',
            postal_code: '',
        }
    });

    useEffect(() => { 
        if (currentUser?.subscription?.kycDetails) {
            kycForm.reset(currentUser.subscription.kycDetails);
        }
    }, [currentUser?.subscription?.kycDetails, kycForm]);

    const payoutForm = useForm<PayoutAccountFormValues>({ resolver: zodResolver(payoutAccountSchema), defaultValues: { payoutMethod: 'vpa' } });
    const payoutMethod = payoutForm.watch('payoutMethod');

    const handlePayoutAccountSubmit = async (data: PayoutAccountFormValues) => {
        if (!currentUser) return;
        
        const kycData = kycForm.getValues();
        // Custom validation check if in ROUTE mode
        if (currentMode === 'ROUTE') {
            const hasFullDetails = kycData.pan_number && kycData.street1 && kycData.city && kycData.state && kycData.postal_code;
            if (!hasFullDetails) {
                toast({ variant: 'destructive', title: 'Action Required', description: 'Marketplace mode requires full GST/PAN and address details.' });
                kycForm.trigger();
                return;
            }
        } else {
            // Standard mode only needs basic info
            if (!kycData.legal_business_name || !kycData.email || !kycData.phone) {
                toast({ variant: 'destructive', title: 'Missing Info', description: 'Please fill name, email and phone.' });
                return;
            }
        }
    
        startSavingTransition(async () => {
            const isFirstAccount = (currentUser?.subscription?.payoutMethods || []).length === 0;
            const submissionData = { ...data, ...kycData, name: data.name || (data.payoutMethod === 'vpa' ? data.vpa! : kycData.legal_business_name) };
            try {
                const token = await auth?.currentUser?.getIdToken();
                const result = await addPayoutMethod(submissionData, token);
                if (result.success && result.updatedUser) {
                    dispatch(setCurrentUser(result.updatedUser));
                    toast({ title: 'Account Linked!', description: isFirstAccount ? '🎉 Congratulations on your first settlement account!' : 'Your payout account has been added successfully.' });
                    setIsPayoutDialogOpen(false);
                    if (isFirstAccount) {
                        setShowConfetti(true);
                        setTimeout(() => setShowConfetti(false), 5000);
                    }
                    payoutForm.reset({ payoutMethod: 'vpa', vpa: '', account_number: '', ifsc: '', name: '' });
                } else {
                    const errorMsg = (result as any).error || 'Failed to add payout account.';
                    toast({ variant: 'destructive', title: 'Error', description: errorMsg });
                }
            } catch (e: any) {
                toast({ variant: 'destructive', title: 'Failed', description: e.message || 'Error adding account.' });
            }
        });
    };

    const handleSaveKyc = (data: KycFormValues) => {
        startSavingTransition(async () => {
            try {
                // Assert that the data matches the interface, handling the optionality
                await dispatch(updateUserKycDetails(data as any)).unwrap();
                toast({ title: 'Information Saved' });
            } catch (e: any) { toast({ variant: 'destructive', title: 'Save Failed', description: e.message }); }
        });
    };

    const handleToggleMode = (mode: 'PAYOUT' | 'ROUTE') => {
        if (mode === currentMode) return;
        startSavingTransition(async () => {
            try {
                await dispatch(updatePayoutMode(mode)).unwrap();
                toast({ title: `Mode Switched to ${mode === 'PAYOUT' ? 'Standard' : 'Marketplace'}` });
            } catch (e: any) {
                toast({ variant: 'destructive', title: 'Switch Failed', description: e.message });
            }
        });
    };

    const handleSetPrimary = (methodId: string) => {
        if (!currentUser) return;
        startSavingTransition(async () => {
            try {
                const token = await auth?.currentUser?.getIdToken();
                const result = await setPrimaryPayoutMethod(methodId, token);
                if (result.success && result.updatedUser) {
                    dispatch(setCurrentUser(result.updatedUser));
                    toast({ title: 'Primary Account Updated' });
                }
            } catch (e: any) { toast({ variant: 'destructive', title: 'Failed', description: e.message }); }
        });
    };

    const handleUnlink = () => {
        if (!currentUser || !methodToUnlink) return;
        startSavingTransition(async () => {
            try {
                const token = await auth?.currentUser?.getIdToken();
                const result = await deletePayoutMethod(methodToUnlink.razorpay_fund_account_id!, token);
                if (result.success && result.updatedUser) {
                    dispatch(setCurrentUser(result.updatedUser));
                    toast({ title: 'Account Unlinked' });
                }
            } catch (e: any) { toast({ variant: 'destructive', title: 'Unlink Failed', description: e.message }); }
            finally { setMethodToUnlink(null); }
        });
    };

    const handleResetAccount = () => {
        if (!currentUser) return;
        startSavingTransition(async () => {
            try {
                const token = await auth?.currentUser?.getIdToken();
                const result = await resetRazorpayAccount(token);
                if (result.success && result.updatedUser) {
                    dispatch(setCurrentUser(result.updatedUser));
                    toast({ title: 'Reset Successful', description: 'Your Razorpay linking has been cleared.' });
                    setIsResetConfirmOpen(false);
                }
            } catch (e: any) {
                toast({ variant: 'destructive', title: 'Reset Failed', description: e.message });
            }
        });
    };
    
    const onboardingComplete = !!currentUser?.subscription?.payoutMethods?.some(m => m.isActive && m.razorpay_fund_account_id);

    return (
        <div className="max-w-5xl mx-auto space-y-8 pb-12">
            {showConfetti && <ReactConfetti width={width} height={height} numberOfPieces={200} recycle={false} />}
            
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b pb-8">
                <div>
                    <h1 className="text-4xl font-extrabold tracking-tight text-foreground">Settlement Settings</h1>
                    <p className="text-muted-foreground mt-2 text-lg max-w-2xl">Configure how and where you receive rent payments from your guests.</p>
                </div>
                <div className="flex flex-col items-start md:items-end gap-2">
                    {onboardingComplete ? (
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-200 shadow-sm animate-in fade-in zoom-in duration-500">
                            <ShieldCheck className="w-5 h-5 fill-emerald-500/10"/>
                            <span className="text-sm font-semibold">Active & Ready for Payouts</span>
                        </div>
                    ) : (
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 text-amber-600 border border-amber-200">
                            <AlertCircle className="w-5 h-5"/>
                            <span className="text-sm font-semibold">Setup Incomplete</span>
                        </div>
                    )}
                    <p className="text-[0.7rem] text-muted-foreground uppercase tracking-widest font-bold">Powered by Razorpay Verified Partner</p>
                </div>
            </div>

            {/* Payout Mode Selection */}
            <section className="space-y-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-amber-500/10">
                        <Zap className="w-5 h-5 text-amber-500" />
                    </div>
                    <h2 className="text-2xl font-bold">Step 1: Choose Payout Architecture</h2>
                </div>
                <div className="grid md:grid-cols-2 gap-6">
                    <Card 
                        className={cn(
                            "relative overflow-hidden cursor-pointer transition-all duration-500 hover:shadow-2xl border-2 ring-offset-4 ring-primary/20",
                            currentMode === 'PAYOUT' ? "border-primary bg-primary/[0.02] shadow-xl ring-2" : "border-border/50 opacity-80 hover:opacity-100 grayscale-[0.5] hover:grayscale-0"
                        )}
                        onClick={() => handleToggleMode('PAYOUT')}
                    >
                        {currentMode === 'PAYOUT' && <div className="absolute top-0 right-0 p-3 bg-primary text-primary-foreground rounded-bl-xl font-bold text-[0.65rem] uppercase tracking-tighter">Selected</div>}
                        <CardHeader className="pb-4">
                            <div className="flex items-center justify-between">
                                <div className={cn("p-3 rounded-2xl", currentMode === 'PAYOUT' ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
                                    <Zap className="w-7 h-7" />
                                </div>
                                <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none">Recommended</Badge>
                            </div>
                            <CardTitle className="mt-6 text-2xl">Standard Payouts</CardTitle>
                            <CardDescription className="text-base">Fast 2-minute setup with minimal documentation.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-3">
                                <div className="flex items-start gap-3">
                                    <Check className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                                    <p className="text-sm">Money settles to platform first, then pushed to You.</p>
                                </div>
                                <div className="flex items-start gap-3">
                                    <Check className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                                    <p className="text-sm">Works with Any UPI ID or Bank Account.</p>
                                </div>
                                <div className="flex items-start gap-3">
                                    <Check className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                                    <p className="text-sm font-semibold">Instant Transfers: Receive money within 24h.</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card 
                         className={cn(
                            "relative overflow-hidden cursor-pointer transition-all duration-500 hover:shadow-2xl border-2 ring-offset-4 ring-purple-500/20",
                            currentMode === 'ROUTE' ? "border-purple-500 bg-purple-500/[0.02] shadow-xl ring-2" : "border-border/50 opacity-80 hover:opacity-100 grayscale-[0.5] hover:grayscale-0"
                        )}
                        onClick={() => handleToggleMode('ROUTE')}
                    >
                         {currentMode === 'ROUTE' && <div className="absolute top-0 right-0 p-3 bg-purple-500 text-white rounded-bl-xl font-bold text-[0.65rem] uppercase tracking-tighter">Selected</div>}
                        <CardHeader className="pb-4">
                            <div className="flex items-center justify-between">
                                <div className={cn("p-3 rounded-2xl", currentMode === 'ROUTE' ? "bg-purple-500 text-white" : "bg-muted text-muted-foreground")}>
                                    <Store className="w-7 h-7" />
                                </div>
                                <Badge variant="outline" className="text-purple-600 border-purple-200">Scale Mode</Badge>
                            </div>
                            <CardTitle className="mt-6 text-2xl">Marketplace Direct</CardTitle>
                            <CardDescription className="text-base">Direct routing from guest to you. Enterprise-grade.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-3">
                                <div className="flex items-start gap-3">
                                    <Check className="w-5 h-5 text-purple-500 shrink-0 mt-0.5" />
                                    <p className="text-sm">Automatic money split at source (PG level).</p>
                                </div>
                                <div className="flex items-start gap-3">
                                    <Check className="w-5 h-5 text-purple-500 shrink-0 mt-0.5" />
                                    <p className="text-sm">Legally direct payment from Guest to PG Owner.</p>
                                </div>
                                <div className="flex items-start gap-3">
                                    <Check className="w-5 h-5 text-purple-500 shrink-0 mt-0.5" />
                                    <p className="text-sm font-semibold">Requires full business KYC (PAN/GST + Address).</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </section>

            <div className="grid lg:grid-cols-3 gap-8">
                {/* KYC Column */}
                <div className="lg:col-span-2 space-y-6">
                    <section className="space-y-4">
                        <div className="flex items-center gap-2">
                            <UserCircle className="w-5 h-5 text-blue-500" />
                            <h2 className="text-xl font-semibold">Step 2: Basic & Business Information</h2>
                        </div>
                        <Card className="shadow-sm">
                            <Form {...kycForm}>
                                <form onSubmit={kycForm.handleSubmit(handleSaveKyc)} className="space-y-6">
                                    <CardContent className="pt-6 space-y-6">
                                        <div className="grid md:grid-cols-2 gap-6">
                                            <FormField control={kycForm.control} name="legal_business_name" render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Legal Name (As per PAN)</FormLabel>
                                                    <FormControl><Input placeholder="John Doe" {...field} /></FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}/>
                                            <FormField control={kycForm.control} name="email" render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Payout Email</FormLabel>
                                                    <FormControl><Input placeholder="payouts@example.com" {...field} /></FormControl>
                                                    <TooltipProvider><Tooltip><TooltipTrigger asChild><p className="text-[0.7rem] text-muted-foreground flex items-center gap-1 mt-1 cursor-help"><Info className="w-3 h-3"/> Why different?</p></TooltipTrigger><TooltipContent><p className="max-w-xs text-xs">For security, use an email different from your master Razorpay account.</p></TooltipContent></Tooltip></TooltipProvider>
                                                    <FormMessage />
                                                </FormItem>
                                            )}/>
                                        </div>

                                        <div className="grid md:grid-cols-2 gap-6">
                                            <FormField control={kycForm.control} name="phone" render={({ field }) => (<FormItem><FormLabel>Phone Number</FormLabel><FormControl><Input placeholder="9876543210" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                                            <FormField control={kycForm.control} name="pan_number" render={({ field }) => ( <FormItem><FormLabel>PAN Card Number</FormLabel><FormControl><Input placeholder="ABCDE1234F" className="uppercase" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                                        </div>

                                        {currentMode === 'ROUTE' && (
                                             <div className="grid md:grid-cols-2 gap-6 p-4 bg-purple-500/5 rounded-xl border border-purple-500/10">
                                                <FormField control={kycForm.control} name="business_type" render={({ field }) => (<FormItem><FormLabel className="text-purple-700">Business Type</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger className="border-purple-200"><SelectValue placeholder="Select type..." /></SelectTrigger></FormControl><SelectContent><SelectItem value="proprietorship">Individual / Proprietor</SelectItem><SelectItem value="partnership">Partnership</SelectItem><SelectItem value="private_limited">Private Ltd</SelectItem><SelectItem value="public_limited">Public Ltd</SelectItem><SelectItem value="llp">LLP</SelectItem><SelectItem value="trust">Trust / NGO</SelectItem></SelectContent></Select><FormMessage /></FormItem>)}/>
                                                <FormField control={kycForm.control} name="gst_number" render={({ field }) => ( <FormItem><FormLabel className="text-purple-700">GSTIN (Optional)</FormLabel><FormControl><Input placeholder="Enter 15-digit GST" className="border-purple-200" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                                            </div>
                                        )}

                                        <div className="space-y-4">
                                            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Mailing Address</h3>
                                            <div className="grid gap-4">
                                                <FormField control={kycForm.control} name="street1" render={({ field }) => (<FormItem><FormControl><Input placeholder="Building, Area, Street Name" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                                                <div className="grid md:grid-cols-3 gap-4">
                                                    <FormField control={kycForm.control} name="city" render={({ field }) => (<FormItem><FormControl><Input placeholder="City" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                                                    <FormField control={kycForm.control} name="state" render={({ field }) => (<FormItem><FormControl><Input placeholder="State" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                                                    <FormField control={kycForm.control} name="postal_code" render={({ field }) => (<FormItem><FormControl><Input placeholder="Pincode" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                    <CardFooter className="bg-muted/30 border-t py-4 flex justify-between items-center">
                                        <p className="text-xs text-muted-foreground">Information verified securely via SSL.</p>
                                        <Button type="submit" disabled={isSaving} size="sm">
                                            {isSaving ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
                                            Save Details
                                        </Button>
                                    </CardFooter>
                                </form>
                            </Form>
                        </Card>
                    </section>
                </div>

                {/* Payout Methods Column */}
                <div className="space-y-6">
                    <section className="space-y-4">
                        <div className="flex items-center gap-2">
                            <CreditCard className="w-5 h-5 text-emerald-500" />
                            <h2 className="text-xl font-semibold">Step 3: Linked Accounts</h2>
                        </div>
                        <Card className="shadow-sm h-full">
                            <CardHeader className="pb-3">
                                <Button className="w-full bg-emerald-600 hover:bg-emerald-700 shadow-md" onClick={() => setIsPayoutDialogOpen(true)}>
                                    <PlusCircle className="mr-2 h-4 w-4" /> Add Payment Method
                                </Button>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {(currentUser?.subscription?.payoutMethods || []).map(method => (
                                    <div key={method.razorpay_fund_account_id} className="group relative flex items-center justify-between p-4 border rounded-xl hover:border-emerald-200 hover:shadow-sm transition-all duration-200">
                                        <div className="flex items-center gap-4">
                                            <div className={cn("p-2 rounded-lg", method.type === 'upi' ? "bg-emerald-50 text-emerald-600" : "bg-blue-50 text-blue-600")}>
                                                {method.type === 'upi' ? <IndianRupee className="w-5 h-5" /> : <Banknote className="w-5 h-5" />}
                                            </div>
                                            <div>
                                                <div className="font-semibold text-sm flex items-center gap-2">
                                                    {method.name}
                                                    {method.isPrimary && <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none text-[0.65rem] h-4">Primary</Badge>}
                                                </div>
                                                <div className="text-xs text-muted-foreground font-mono mt-0.5">
                                                    {method.type === 'upi' ? (method as UpiPaymentMethod).vpaAddress : `A/C: ...${(method as BankPaymentMethod).accountNumberLast4}`}
                                                </div>
                                            </div>
                                        </div>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"><MoreVertical className="w-4 h-4" /></Button></DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                {!method.isPrimary && <DropdownMenuItem onClick={() => handleSetPrimary(method.razorpay_fund_account_id!)} disabled={isSaving} className="text-xs"><Check className="mr-2 h-4 w-4" /> Use as Primary</DropdownMenuItem>}
                                                <DropdownMenuItem className="text-destructive focus:text-destructive text-xs" onClick={() => setMethodToUnlink(method)} disabled={isSaving}><Trash2 className="mr-2 h-4 w-4" /> Unlink</DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                ))}
                                {(currentUser?.subscription?.payoutMethods || []).length === 0 && (
                                    <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed rounded-xl border-muted/50">
                                        <div className="p-3 rounded-full bg-muted/50 mb-3"><HandCoins className="w-6 h-6 text-muted-foreground/60"/></div>
                                        <p className="text-sm font-medium text-muted-foreground">No accounts linked yet.</p>
                                        <p className="text-[0.7rem] text-muted-foreground/60">Add a UPI ID or Bank Account.</p>
                                    </div>
                                )}
                            </CardContent>
                            <CardFooter className="flex flex-col gap-2 pt-0">
                                {onboardingComplete && (
                                     <div className="w-full p-3 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs flex items-start gap-2">
                                        <Sparkles className="w-4 h-4 mt-0.5 shrink-0"/>
                                        <p>You're all set! Rent collected will be settled automatically to your primary account.</p>
                                    </div>
                                )}
                                {!onboardingComplete && (
                                    <div className="w-full p-3 rounded-lg bg-amber-50 border border-amber-100 text-amber-800 text-xs flex items-start gap-2">
                                        <AlertCircle className="w-4 h-4 mt-0.5 shrink-0"/>
                                        <p>Complete linking to start receiving rent settlements automatically.</p>
                                    </div>
                                )}
                            </CardFooter>
                        </Card>
                    </section>
                </div>
            </div>

            {/* Account Settings / Reset section */}
            <div className="pt-12 border-t flex items-center justify-between opacity-50 hover:opacity-100 transition-opacity">
                 <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <p>© RoomBox Payments Powerd by Razorpay</p>
                    <span>•</span>
                    <button className="underline hover:text-primary">Terms of Service</button>
                    <span>•</span>
                    <button className="underline hover:text-primary">Help Center</button>
                 </div>
                 {onboardingComplete && (
                    <Button variant="ghost" size="sm" onClick={() => setIsResetConfirmOpen(true)} className="text-xs text-muted-foreground hover:text-red-500 hover:bg-red-50">
                        <RefreshCw className="mr-2 h-3 w-3" /> Reset Account Connection
                    </Button>
                 )}
            </div>

            {/* Modals & Dialogs */}
            <Dialog open={isPayoutDialogOpen} onOpenChange={setIsPayoutDialogOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-xl"><CreditCard className="w-5 h-5 text-emerald-600"/> Add Payout Method</DialogTitle>
                        <DialogDescription>Your details are shared securely with Razorpay.</DialogDescription>
                    </DialogHeader>
                    <Form {...payoutForm}>
                        <form id="payout-form-modal" onSubmit={payoutForm.handleSubmit(handlePayoutAccountSubmit)} className="space-y-6 pt-4">
                            <FormField
                                control={payoutForm.control}
                                name="payoutMethod"
                                render={({ field }) => (
                                    <FormItem className="space-y-3">
                                        <FormControl>
                                            <RadioGroup onValueChange={field.onChange} value={field.value} className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <RadioGroupItem value="vpa" id="vpa" className="peer sr-only" />
                                                    <label htmlFor="vpa" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary transition-all cursor-pointer">
                                                        <IndianRupee className="mb-3 h-6 w-6" />
                                                        <span className="text-sm font-semibold">UPI ID</span>
                                                    </label>
                                                </div>
                                                <div>
                                                    <RadioGroupItem value="bank_account" id="bank_account" className="peer sr-only" />
                                                    <label htmlFor="bank_account" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary transition-all cursor-pointer">
                                                        <Building2 className="mb-3 h-6 w-6" />
                                                        <span className="text-sm font-semibold">Bank Account</span>
                                                    </label>
                                                </div>
                                            </RadioGroup>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            
                            <div className="space-y-4 animate-in slide-in-from-bottom-2 duration-300">
                                {payoutMethod === 'bank_account' && (
                                    <>
                                        <FormField control={payoutForm.control} name="name" render={({ field }) => (<FormItem><FormLabel>Account Holder Name</FormLabel><FormControl><Input placeholder="Legal name as in bank" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                        <FormField control={payoutForm.control} name="account_number" render={({ field }) => (<FormItem><FormLabel>A/C Number</FormLabel><FormControl><Input placeholder="0000 0000 0000" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                        <FormField control={payoutForm.control} name="ifsc" render={({ field }) => (<FormItem><FormLabel>IFSC Code</FormLabel><FormControl><Input placeholder="HDFC0000123" className="uppercase" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                    </>
                                )}
                                {payoutMethod === 'vpa' && (
                                    <FormField control={payoutForm.control} name="vpa" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>UPI ID (VPA)</FormLabel>
                                            <FormControl><Input placeholder="user@okhdfcbank" className="lowercase" {...field} onChange={(e) => field.onChange(e.target.value.trim().toLowerCase())} /></FormControl>
                                            <p className="text-[0.65rem] text-muted-foreground mt-1 px-1">Money will be credited instantly to this UPI ID.</p>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                )}
                            </div>
                        </form>
                    </Form>
                    <DialogFooter className="mt-4 gap-2">
                        <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
                        <Button type="submit" form="payout-form-modal" disabled={isSaving} className="bg-emerald-600 hover:bg-emerald-700">
                            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            SecureLink Account
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AlertDialog open={!!methodToUnlink} onOpenChange={() => setMethodToUnlink(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Unlink Payout Method?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Confirm unlinking <span className="font-bold text-foreground">{methodToUnlink?.name}</span>? You must have at least one account to receive payouts.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Keep it</AlertDialogCancel>
                        <AlertDialogAction onClick={handleUnlink} disabled={isSaving} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Unlink Account
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={isResetConfirmOpen} onOpenChange={setIsResetConfirmOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Reset Razorpay Connection?</AlertDialogTitle>
                        <AlertDialogDescription className="space-y-4">
                            <p>This will disconnect your account from our Razorpay integration and clear all linked payout methods in this app.</p>
                            <p className="p-3 bg-red-50 rounded-lg border border-red-100 text-red-900 text-xs">
                                **Safety Note:** This does not delete any funds in your account. You can re-connect anytime with the same or different email.
                            </p>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleResetAccount} disabled={isSaving} className="bg-red-600 hover:bg-red-700">
                            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Reset Now
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
