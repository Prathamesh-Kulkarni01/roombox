
'use client'

import React, { useState, useTransition, useEffect } from 'react';
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { auth } from '@/lib/firebase';
import { cn } from '@/lib/utils';
import Image from 'next/image';

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

interface OnlineSetupProps {
    onOnboardingComplete?: () => void;
}

export default function OnlineSetup({ onOnboardingComplete }: OnlineSetupProps) {
    const dispatch = useAppDispatch();
    const { currentUser } = useAppSelector(state => state.user);
    const { toast } = useToast();
    const [isSaving, startSavingTransition] = useTransition();
    const [isPayoutDialogOpen, setIsPayoutDialogOpen] = useState(false);
    const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
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
    const payoutMethodValue = payoutForm.watch('payoutMethod');

    const handlePayoutAccountSubmit = async (data: PayoutAccountFormValues) => {
        if (!currentUser) return;
        
        const kycData = kycForm.getValues();
        if (currentMode === 'ROUTE') {
            const hasFullDetails = kycData.pan_number && kycData.street1 && kycData.city && kycData.state && kycData.postal_code;
            if (!hasFullDetails) {
                toast({ variant: 'destructive', title: 'Action Required', description: 'Marketplace mode requires full GST/PAN and address details.' });
                kycForm.trigger();
                return;
            }
        } else {
            if (!kycData.legal_business_name || !kycData.email || !kycData.phone) {
                toast({ variant: 'destructive', title: 'Missing Info', description: 'Please fill name, email and phone.' });
                return;
            }
        }
    
        startSavingTransition(() => {
            (async () => {
                const isFirstAccount = (currentUser?.subscription?.payoutMethods || []).length === 0;
                const submissionData = { ...data, ...kycData, name: data.name || (data.payoutMethod === 'vpa' ? data.vpa! : kycData.legal_business_name) };
                try {
                    const token = await auth?.currentUser?.getIdToken();
                    const result = await addPayoutMethod(submissionData, token);
                    if (result.success && result.updatedUser) {
                        dispatch(setCurrentUser(result.updatedUser));
                        toast({ title: 'Account Linked!', description: isFirstAccount ? '🎉 Congratulations on your first settlement account!' : 'Your payout account has been added successfully.' });
                        setIsPayoutDialogOpen(false);
                        if (isFirstAccount && onOnboardingComplete) {
                            onOnboardingComplete();
                        }
                        payoutForm.reset({ payoutMethod: 'vpa', vpa: '', account_number: '', ifsc: '', name: '' });
                    } else {
                        const errorMsg = (result as any).error || 'Failed to add payout account.';
                        toast({ variant: 'destructive', title: 'Error', description: errorMsg });
                    }
                } catch (e: any) {
                    toast({ variant: 'destructive', title: 'Failed', description: e.message || 'Error adding account.' });
                }
            })();
        });
    };

    const handleSaveKyc = (data: KycFormValues) => {
        startSavingTransition(() => {
            (async () => {
                try {
                    await dispatch(updateUserKycDetails(data as any)).unwrap();
                    toast({ title: 'Information Saved' });
                } catch (e: any) { toast({ variant: 'destructive', title: 'Save Failed', description: e.message }); }
            })();
        });
    };

    const handleToggleMode = (mode: 'PAYOUT' | 'ROUTE') => {
        if (mode === currentMode) return;
        startSavingTransition(() => {
            (async () => {
                try {
                    await dispatch(updatePayoutMode(mode)).unwrap();
                    toast({ title: `Mode Switched to ${mode === 'PAYOUT' ? 'Standard' : 'Marketplace'}` });
                } catch (e: any) {
                    toast({ variant: 'destructive', title: 'Switch Failed', description: e.message });
                }
            })();
        });
    };

    const handleSetPrimary = (methodId: string) => {
        if (!currentUser) return;
        startSavingTransition(() => {
            (async () => {
                try {
                    const token = await auth?.currentUser?.getIdToken();
                    const result = await setPrimaryPayoutMethod(methodId, token);
                    if (result.success && result.updatedUser) {
                        dispatch(setCurrentUser(result.updatedUser));
                        toast({ title: 'Primary Account Updated' });
                    }
                } catch (e: any) { toast({ variant: 'destructive', title: 'Failed', description: e.message }); }
            })();
        });
    };

    const handleUnlink = () => {
        if (!currentUser || !methodToUnlink) return;
        startSavingTransition(() => {
            (async () => {
                try {
                    const token = await auth?.currentUser?.getIdToken();
                    const result = await deletePayoutMethod(methodToUnlink.razorpay_fund_account_id!, token);
                    if (result.success && result.updatedUser) {
                        dispatch(setCurrentUser(result.updatedUser));
                        toast({ title: 'Account Unlinked' });
                    }
                } catch (e: any) { toast({ variant: 'destructive', title: 'Unlink Failed', description: e.message }); }
                finally { setMethodToUnlink(null); }
            })();
        });
    };

    const handleResetAccount = () => {
        if (!currentUser) return;
        startSavingTransition(() => {
            (async () => {
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
            })();
        });
    };
    
    const onboardingCompleteStatus = !!currentUser?.subscription?.payoutMethods?.some(m => m.isActive && m.razorpay_fund_account_id);

    return (
        <>
            <section className="space-y-6">
                <div className="flex items-center gap-3 px-1">
                    <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-200">
                        <Zap className="w-5 h-5 text-amber-500" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight">Settlement Architecture</h2>
                        <p className="text-muted-foreground text-sm font-medium">Choose how money reaches your account.</p>
                    </div>
                </div>
                <div className="grid md:grid-cols-2 gap-6">
                    <Card 
                        className={cn(
                            "relative overflow-hidden cursor-pointer transition-all duration-500 hover:shadow-2xl border-2 ring-offset-4 ring-primary/20 rounded-3xl",
                            currentMode === 'PAYOUT' ? "border-primary bg-primary/[0.02] shadow-xl ring-2" : "border-border/50 opacity-80 hover:opacity-100 grayscale-[0.5] hover:grayscale-0"
                        )}
                        onClick={() => handleToggleMode('PAYOUT')}
                    >
                        {currentMode === 'PAYOUT' && <div className="absolute top-0 right-0 p-3 bg-primary text-primary-foreground rounded-bl-2xl font-bold text-[0.65rem] uppercase tracking-tighter">Selected</div>}
                        <CardHeader className="pb-4">
                            <div className="flex items-center justify-between">
                                <div className={cn("p-4 rounded-2xl shadow-inner", currentMode === 'PAYOUT' ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
                                    <Zap className="w-7 h-7" />
                                </div>
                                <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none px-3 font-bold">Recommended</Badge>
                            </div>
                            <CardTitle className="mt-6 text-2xl font-extrabold tracking-tight">Standard Payouts</CardTitle>
                            <CardDescription className="text-base font-medium">Fast 2-minute setup with minimal documentation.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-4">
                                <div className="flex items-start gap-3">
                                    <Check className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                                    <p className="text-sm font-medium leading-relaxed">Money settles to platform first, then pushed to You.</p>
                                </div>
                                <div className="flex items-start gap-3">
                                    <Check className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                                    <p className="text-sm font-medium leading-relaxed">Works with Any UPI ID or Bank Account.</p>
                                </div>
                                <div className="flex items-start gap-3">
                                    <Check className="w-5 h-5 text-emerald-500 shrink-0 mt-1" />
                                    <p className="text-sm font-bold text-emerald-700 leading-relaxed">Receive money within 24h of guest payment.</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card 
                        className={cn(
                            "relative overflow-hidden cursor-pointer transition-all duration-500 hover:shadow-2xl border-2 ring-offset-4 ring-purple-500/20 rounded-3xl",
                            currentMode === 'ROUTE' ? "border-purple-500 bg-purple-500/[0.02] shadow-xl ring-2" : "border-border/50 opacity-80 hover:opacity-100 grayscale-[0.5] hover:grayscale-0"
                        )}
                        onClick={() => handleToggleMode('ROUTE')}
                    >
                        {currentMode === 'ROUTE' && <div className="absolute top-0 right-0 p-3 bg-purple-500 text-white rounded-bl-2xl font-bold text-[0.65rem] uppercase tracking-tighter">Selected</div>}
                        <CardHeader className="pb-4">
                            <div className="flex items-center justify-between">
                                <div className={cn("p-4 rounded-2xl shadow-inner", currentMode === 'ROUTE' ? "bg-purple-500 text-white" : "bg-muted text-muted-foreground")}>
                                    <Store className="w-7 h-7" />
                                </div>
                                <Badge variant="outline" className="text-purple-600 border-purple-200 px-3 font-bold">Scale Mode</Badge>
                            </div>
                            <CardTitle className="mt-6 text-2xl font-extrabold tracking-tight">Marketplace Direct</CardTitle>
                            <CardDescription className="text-base font-medium">Direct routing from guest to you. Enterprise-grade.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-4">
                                <div className="flex items-start gap-3">
                                    <Check className="w-5 h-5 text-purple-500 shrink-0 mt-0.5" />
                                    <p className="text-sm font-medium leading-relaxed">Automatic money split at source (PG level).</p>
                                </div>
                                <div className="flex items-start gap-3">
                                    <Check className="w-5 h-5 text-purple-500 shrink-0 mt-0.5" />
                                    <p className="text-sm font-medium leading-relaxed">Legally direct payment from Guest to PG Owner.</p>
                                </div>
                                <div className="flex items-start gap-3">
                                    <Check className="w-5 h-5 text-purple-500 shrink-0 mt-1" />
                                    <p className="text-sm font-bold text-purple-700 leading-relaxed">Requires full business KYC (PAN/GST + Address).</p>
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
                        <div className="flex items-center gap-2 px-1">
                            <UserCircle className="w-5 h-5 text-blue-500" />
                            <h2 className="text-xl font-bold tracking-tight">Business Verification</h2>
                        </div>
                        <Card className="shadow-sm rounded-3xl border-border/40">
                            <Form {...kycForm}>
                                <form onSubmit={kycForm.handleSubmit(handleSaveKyc)} className="space-y-6">
                                    <CardContent className="pt-8 space-y-8">
                                        <div className="grid md:grid-cols-2 gap-8">
                                            <FormField control={kycForm.control} name="legal_business_name" render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="font-bold">Legal Name (As per PAN)</FormLabel>
                                                    <FormControl><Input placeholder="John Doe" className="rounded-xl h-12" {...field} /></FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}/>
                                            <FormField control={kycForm.control} name="email" render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="font-bold">Settlement Notification Email</FormLabel>
                                                    <FormControl><Input placeholder="payouts@example.com" className="rounded-xl h-12" {...field} /></FormControl>
                                                    <TooltipProvider><Tooltip><TooltipTrigger asChild><p className="text-[0.65rem] text-muted-foreground flex items-center gap-1 mt-1.5 cursor-help font-medium"><Info className="w-3.5 h-3.5"/> Important security note</p></TooltipTrigger><TooltipContent className="max-w-xs p-3 rounded-xl shadow-xl"><p className="text-xs font-medium">Use an email dedicated for billing notifications to keep your payout records organized.</p></TooltipContent></Tooltip></TooltipProvider>
                                                    <FormMessage />
                                                </FormItem>
                                            )}/>
                                        </div>

                                        <div className="grid md:grid-cols-2 gap-8">
                                            <FormField control={kycForm.control} name="phone" render={({ field }) => (<FormItem><FormLabel className="font-bold">Primary Contact Number</FormLabel><FormControl><Input placeholder="9876543210" className="rounded-xl h-12" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                                            <FormField control={kycForm.control} name="pan_number" render={({ field }) => ( <FormItem><FormLabel className="font-bold">PAN Card Number</FormLabel><FormControl><Input placeholder="ABCDE1234F" className="uppercase rounded-xl h-12 font-mono tracking-widest" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                                        </div>

                                        {currentMode === 'ROUTE' && (
                                            <div className="grid md:grid-cols-2 gap-8 p-6 bg-purple-500/[0.03] rounded-3xl border border-purple-500/10 shadow-inner">
                                                <FormField control={kycForm.control} name="business_type" render={({ field }) => (<FormItem><FormLabel className="text-purple-900 font-bold">Business Entity Type</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger className="border-purple-200 rounded-xl h-12 bg-white"><SelectValue placeholder="Select type..." /></SelectTrigger></FormControl><SelectContent className="rounded-xl"><SelectItem value="proprietorship">Individual / Proprietor</SelectItem><SelectItem value="partnership">Partnership</SelectItem><SelectItem value="private_limited">Private Ltd</SelectItem><SelectItem value="public_limited">Public Ltd</SelectItem><SelectItem value="llp">LLP</SelectItem><SelectItem value="trust">Trust / NGO</SelectItem></SelectContent></Select><FormMessage /></FormItem>)}/>
                                                <FormField control={kycForm.control} name="gst_number" render={({ field }) => ( <FormItem><FormLabel className="text-purple-900 font-bold">GSTIN Number</FormLabel><FormControl><Input placeholder="Enter 15-digit GST" className="border-purple-200 rounded-xl h-12 bg-white font-mono uppercase tracking-widest" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                                            </div>
                                        )}

                                        <div className="space-y-6">
                                            <div className="flex items-center gap-2 border-b pb-2">
                                                <Building2 className="w-4 h-4 text-muted-foreground"/>
                                                <h3 className="text-xs font-extrabold text-muted-foreground uppercase tracking-[0.2em]">Registered Address</h3>
                                            </div>
                                            <div className="grid gap-6">
                                                <FormField control={kycForm.control} name="street1" render={({ field }) => (<FormItem><FormControl><Input placeholder="Building, Area, Street Name" className="rounded-xl h-12" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                                                <div className="grid md:grid-cols-3 gap-6">
                                                    <FormField control={kycForm.control} name="city" render={({ field }) => (<FormItem><FormControl><Input placeholder="City" className="rounded-xl h-12" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                                                    <FormField control={kycForm.control} name="state" render={({ field }) => (<FormItem><FormControl><Input placeholder="State" className="rounded-xl h-12" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                                                    <FormField control={kycForm.control} name="postal_code" render={({ field }) => (<FormItem><FormControl><Input placeholder="Pincode" className="rounded-xl h-12 font-mono" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                    <CardFooter className="bg-muted/30 border-t py-6 flex justify-between items-center px-8 rounded-b-3xl">
                                        <div className="flex items-center gap-2 text-[0.65rem] text-muted-foreground font-bold uppercase tracking-wider">
                                            <ShieldCheck className="w-4 h-4 text-emerald-500 fill-emerald-500/10"/>
                                            AES-256 Encrypted
                                        </div>
                                        <Button type="submit" disabled={isSaving} size="lg" className="rounded-xl font-bold px-8 shadow-native h-12">
                                            {isSaving ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
                                            Update KYC Profile
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
                        <div className="flex items-center gap-2 px-1">
                            <CreditCard className="w-5 h-5 text-emerald-500" />
                            <h2 className="text-xl font-bold tracking-tight">Settlement Accounts</h2>
                        </div>
                        <Card className="shadow-sm h-full rounded-3xl border-border/40 overflow-hidden">
                            <CardHeader className="pb-4 bg-emerald-500/[0.02] border-b">
                                <Button className="w-full bg-emerald-600 hover:bg-emerald-700 shadow-md rounded-xl h-12 font-bold" onClick={() => setIsPayoutDialogOpen(true)}>
                                    <PlusCircle className="mr-2 h-5 w-5" /> Add New Account
                                </Button>
                            </CardHeader>
                            <CardContent className="space-y-4 pt-6">
                                {(currentUser?.subscription?.payoutMethods || []).map(method => (
                                    <div key={method.razorpay_fund_account_id} className="group relative flex items-center justify-between p-4 border rounded-2xl hover:border-emerald-200 hover:shadow-lg hover:shadow-emerald-500/5 transition-all duration-300 bg-white">
                                        <div className="flex items-center gap-4">
                                            <div className={cn("p-3 rounded-xl shadow-inner", method.type === 'upi' ? "bg-emerald-50 text-emerald-600" : "bg-blue-50 text-blue-600")}>
                                                {method.type === 'upi' ? <IndianRupee className="w-5 h-5" /> : <Banknote className="w-5 h-5" />}
                                            </div>
                                            <div>
                                                <div className="font-bold text-sm flex items-center gap-2">
                                                    {method.name}
                                                    {method.isPrimary && <Badge className="bg-emerald-500 text-white hover:bg-emerald-500 border-none text-[0.6rem] h-4.5 font-black uppercase tracking-tighter">Primary</Badge>}
                                                </div>
                                                <div className="text-xs text-muted-foreground font-mono mt-0.5 tracking-tight group-hover:text-foreground transition-colors">
                                                    {method.type === 'upi' ? (method as UpiPaymentMethod).vpaAddress : `A/C: ...${(method as BankPaymentMethod).accountNumberLast4}`}
                                                </div>
                                            </div>
                                        </div>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-9 w-9 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl"><MoreVertical className="w-4 h-4 text-muted-foreground" /></Button></DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="rounded-xl p-2 shadow-2xl border-border/40">
                                                {!method.isPrimary && <DropdownMenuItem onClick={() => handleSetPrimary(method.razorpay_fund_account_id!)} disabled={isSaving} className="text-xs font-bold rounded-lg cursor-pointer"><Check className="mr-2 h-4 w-4 text-emerald-600" /> Set as Primary</DropdownMenuItem>}
                                                <DropdownMenuItem className="text-destructive focus:text-destructive text-xs font-bold rounded-lg cursor-pointer" onClick={() => setMethodToUnlink(method)} disabled={isSaving}><Trash2 className="mr-2 h-4 w-4" /> Unlink Account</DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                ))}
                                {(currentUser?.subscription?.payoutMethods || []).length === 0 && (
                                    <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed rounded-3xl border-muted/50 bg-muted/[0.02]">
                                        <div className="p-4 rounded-3xl bg-muted/50 mb-4 shadow-inner"><HandCoins className="w-8 h-8 text-muted-foreground/60"/></div>
                                        <p className="text-sm font-bold text-muted-foreground">No accounts linked</p>
                                        <p className="text-[0.7rem] text-muted-foreground/60 max-w-[150px] mt-1">Connect your bank account to start receiving money.</p>
                                    </div>
                                )}
                            </CardContent>
                            <CardFooter className="flex flex-col gap-3 py-6 px-6 bg-muted/[0.02] border-t">
                                {onboardingCompleteStatus ? (
                                    <div className="w-full p-4 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs flex items-start gap-3 shadow-inner">
                                        <Sparkles className="w-4 h-4 mt-0.5 shrink-0 text-emerald-600"/>
                                        <p className="font-medium leading-relaxed italic">Congratulations! Your settlements are fully automated. Payments will reach you based on your selected bank account.</p>
                                    </div>
                                ) : (
                                    <div className="w-full p-4 rounded-2xl bg-amber-50 border border-amber-100 text-amber-800 text-xs flex items-start gap-3 shadow-inner">
                                        <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-amber-600"/>
                                        <p className="font-medium leading-relaxed italic">Complete linking to start receiving rent settlements automatically to your bank account.</p>
                                    </div>
                                )}
                            </CardFooter>
                        </Card>
                    </section>
                </div>
            </div>

            <div className="pt-12 border-t flex items-center justify-between opacity-50 hover:opacity-100 transition-opacity">
                <div className="flex items-center gap-5 text-[0.65rem] font-bold text-muted-foreground uppercase tracking-widest">
                    <p>© RoomBox Payments 2024</p>
                    <span className="w-1 h-1 bg-muted-foreground/30 rounded-full"></span>
                    <button className="hover:text-primary transition-colors">Privacy Policy</button>
                    <span className="w-1 h-1 bg-muted-foreground/30 rounded-full"></span>
                    <button className="hover:text-primary transition-colors">Compliance</button>
                </div>
                {onboardingCompleteStatus && (
                    <Button variant="ghost" size="sm" onClick={() => setIsResetConfirmOpen(true)} className="text-[0.65rem] font-black uppercase tracking-tighter text-muted-foreground hover:text-red-500 hover:bg-red-50 rounded-full px-4">
                        <RefreshCw className="mr-2 h-3.5 w-3.5" /> Disconnect Razorpay Node
                    </Button>
                )}
            </div>

            {/* Modals & Dialogs */}
            <Dialog open={isPayoutDialogOpen} onOpenChange={setIsPayoutDialogOpen}>
                <DialogContent className="max-w-md rounded-3xl p-8">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-3 text-2xl font-black tracking-tight"><CreditCard className="w-6 h-6 text-emerald-600"/> Add Target Account</DialogTitle>
                        <DialogDescription className="text-base font-medium">Link your business account for secure settlements.</DialogDescription>
                    </DialogHeader>
                    <Form {...payoutForm}>
                        <form id="payout-form-modal" onSubmit={payoutForm.handleSubmit(handlePayoutAccountSubmit)} className="space-y-6 pt-6">
                            <FormField
                                control={payoutForm.control}
                                name="payoutMethod"
                                render={({ field }) => (
                                    <FormItem className="space-y-3">
                                        <FormControl>
                                            <RadioGroup onValueChange={field.onChange} value={field.value} className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <RadioGroupItem value="vpa" id="setup_vpa" className="peer sr-only" />
                                                    <label htmlFor="setup_vpa" className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-muted bg-popover p-6 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/[0.03] [&:has([data-state=checked])]:border-primary transition-all cursor-pointer shadow-sm group">
                                                        <IndianRupee className="h-8 w-8 text-muted-foreground group-hover:text-primary transition-colors" />
                                                        <span className="text-sm font-bold tracking-tight">UPI / VPA</span>
                                                    </label>
                                                </div>
                                                <div>
                                                    <RadioGroupItem value="bank_account" id="setup_bank_account" className="peer sr-only" />
                                                    <label htmlFor="setup_bank_account" className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-muted bg-popover p-6 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/[0.03] [&:has([data-state=checked])]:border-primary transition-all cursor-pointer shadow-sm group">
                                                        <Building2 className="h-8 w-8 text-muted-foreground group-hover:text-primary transition-colors" />
                                                        <span className="text-sm font-bold tracking-tight">Bank Details</span>
                                                    </label>
                                                </div>
                                            </RadioGroup>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            
                            <div className="space-y-4 animate-in slide-in-from-bottom-2 duration-300">
                                {payoutMethodValue === 'bank_account' && (
                                    <div className="space-y-5">
                                        <FormField control={payoutForm.control} name="name" render={({ field }) => (<FormItem><FormLabel className="font-bold">Account Holder Name</FormLabel><FormControl><Input placeholder="Legal name as in bank" className="rounded-xl h-12" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                        <div className="grid grid-cols-2 gap-4">
                                            <FormField control={payoutForm.control} name="account_number" render={({ field }) => (<FormItem><FormLabel className="font-bold">A/C Number</FormLabel><FormControl><Input placeholder="0000 0000 0000" className="rounded-xl h-12 font-mono" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                            <FormField control={payoutForm.control} name="ifsc" render={({ field }) => (<FormItem><FormLabel className="font-bold">IFSC Code</FormLabel><FormControl><Input placeholder="HDFC0000123" className="uppercase rounded-xl h-12 font-mono" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                        </div>
                                    </div>
                                )}
                                {payoutMethodValue === 'vpa' && (
                                    <FormField control={payoutForm.control} name="vpa" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="font-bold">UPI ID Address</FormLabel>
                                            <FormControl><Input placeholder="user@okhdfcbank" className="lowercase rounded-xl h-12 font-mono" {...field} onChange={(e) => field.onChange(e.target.value.trim().toLowerCase())} /></FormControl>
                                            <p className="text-[0.65rem] text-muted-foreground mt-2 px-1 font-medium italic">Instant settlements: Money reflects in your account within minutes of release.</p>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                )}
                            </div>
                        </form>
                    </Form>
                    <DialogFooter className="mt-8 gap-3 sm:justify-center">
                        <DialogClose asChild><Button type="button" variant="ghost" className="font-bold h-12 px-6 rounded-xl">Discard</Button></DialogClose>
                        <Button type="submit" form="payout-form-modal" disabled={isSaving} className="bg-emerald-600 hover:bg-emerald-700 h-12 px-8 rounded-xl font-bold font-lg shadow-native min-w-[180px]">
                            {isSaving ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <ShieldCheck className="mr-2 h-5 w-5" />}
                            Secure Link Now
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AlertDialog open={!!methodToUnlink} onOpenChange={() => setMethodToUnlink(null)}>
                <AlertDialogContent className="rounded-3xl p-8">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-2xl font-black tracking-tight">Unlink this Account?</AlertDialogTitle>
                        <AlertDialogDescription className="text-base font-medium">
                            Are you sure you want to decouple <span className="font-bold text-foreground underline decoration-emerald-500/30 underline-offset-4">{methodToUnlink?.name}</span>? 
                            <br/><br/>
                            <span className="text-sm italic">You will need to link a new target if this is your last account.</span>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="mt-6 gap-3">
                        <AlertDialogCancel className="rounded-xl h-12 font-bold px-6">Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleUnlink} disabled={isSaving} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-xl h-12 font-bold px-6 border-none">
                            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                            Confirm Unlink
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={isResetConfirmOpen} onOpenChange={setIsResetConfirmOpen}>
                <AlertDialogContent className="rounded-3xl p-8">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-2xl font-black tracking-tight">Reset Connection Node?</AlertDialogTitle>
                        <AlertDialogDescription className="space-y-4">
                            <p className="font-medium text-base">This will purge your current Razorpay integration settings and clear all target accounts.</p>
                            <div className="p-4 bg-red-500/[0.03] rounded-2xl border border-red-100/50 text-red-900 text-[0.7rem] font-bold uppercase tracking-wider leading-relaxed shadow-inner">
                                <p className="flex items-center gap-2 mb-1 text-red-600"><AlertCircle className="w-4 h-4"/> Security Enforcement</p>
                                Re-connection will require fresh authentication. No funds will be lost.
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="mt-6 gap-3">
                        <AlertDialogCancel className="rounded-xl h-12 font-bold px-6">Keep Secure</AlertDialogCancel>
                        <AlertDialogAction onClick={handleResetAccount} disabled={isSaving} className="bg-red-600 hover:bg-red-700 rounded-xl h-12 font-bold px-6">
                            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                            Full Reset
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}

// Helper hook for window size
function useWindowSize() {
    const [windowSize, setWindowSize] = useState({
        width: typeof window !== 'undefined' ? window.innerWidth : 0,
        height: typeof window !== 'undefined' ? window.innerHeight : 0,
    });

    useEffect(() => {
        function handleResize() {
            setWindowSize({
                width: window.innerWidth,
                height: window.innerHeight,
            });
        }
        window.addEventListener("resize", handleResize);
        handleResize();
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    return windowSize;
}
