
'use client'

import { useState, useEffect, useMemo, useTransition } from 'react';
import { useParams } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { IndianRupee, Loader2, CheckCircle, ShieldX, Building, User, Calendar, Copy, Smartphone, Upload, Info } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Guest, LedgerEntry } from '@/lib/types';
import { format, parseISO } from 'date-fns';

type RentDetails = {
    guest: Omit<Guest, 'paymentHistory' | 'additionalCharges' | 'ledger'> & {
        totalDue: number;
        dueItems: LedgerEntry[];
        amountType?: 'numeric' | 'symbolic';
        symbolicBalance?: string;
    };
    property: {
        paymentMode: 'DIRECT_UPI' | 'GATEWAY' | 'CASH_ONLY';
        upiId?: string;
        payeeName?: string;
        qrCodeImage?: string;
        online_payment_enabled: boolean;
    } | null;
    ownerId: string;
};

export default function PublicPaymentPage() {
    const params = useParams();
    const token = params.token as string;
    const { toast } = useToast();
    const [details, setDetails] = useState<RentDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isPaying, startPaymentTransition] = useTransition();

    // Direct UPI / Manual Verification state
    const [showManualForm, setShowManualForm] = useState(false);
    const [utr, setUtr] = useState('');
    const [screenshotLink, setScreenshotLink] = useState('');
    const [isSubmittingManual, setIsSubmittingManual] = useState(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const [activePaymentId, setActivePaymentId] = useState<string | null>(null);
    const [serverUpiLink, setServerUpiLink] = useState<string>('');
    const [isGeneratingLink, setIsGeneratingLink] = useState(false);

    useEffect(() => {
        if (token) {
            fetch(`/api/rent-details/${token}`)
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        setDetails(data.details);
                    } else {
                        setError(data.error || 'Could not load rent details.');
                    }
                })
                .catch(() => setError('An unexpected error occurred.'))
                .finally(() => setLoading(false));
        }
    }, [token]);

    const handlePayNow = async () => {
        if (!details || details.guest.totalDue <= 0) return;

        // If Direct UPI is enabled, create an intent first
        if (details.property?.paymentMode === 'DIRECT_UPI') {
            setIsGeneratingLink(true);
            try {
                const res = await fetch('/api/payments/intent', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ token, amount: details.guest.totalDue }),
                });
                const data = await res.json();
                if (data.success) {
                    setActivePaymentId(data.paymentId);
                    setServerUpiLink(data.upiLink);
                    setShowManualForm(true);
                } else {
                    toast({ variant: 'destructive', title: 'Error', description: data.error || 'Could not prepare UPI link.' });
                }
            } catch (err) {
                toast({ variant: 'destructive', title: 'Error', description: 'Failed to connect to server.' });
            } finally {
                setIsGeneratingLink(false);
            }
            return;
        }

        startPaymentTransition(async () => {
            // ... (rest of the razorpay logic remains same for now)
            try {
                const res = await fetch('/api/razorpay/create-rent-order', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        token,
                        amount: details.guest.totalDue,
                    }),
                });

                const { success, order, error } = await res.json();
                if (!success || !order) {
                    throw new Error(error || 'Failed to create payment order.');
                }

                const options = {
                    key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
                    amount: order.amount,
                    currency: order.currency,
                    name: `Rent for ${details.guest.pgName}`,
                    description: `Payment for ${details.guest.name}`,
                    order_id: order.id,
                    handler: function (response: any) {
                        toast({ title: 'Payment Successful!', description: 'Your payment is being processed and your landlord has been notified.' });
                        setError('Payment successfully completed. You can close this page.');
                    },
                    prefill: {
                        name: details.guest.name,
                        email: details.guest.email,
                        contact: details.guest.phone,
                    },
                    theme: { color: '#3399cc' }
                };

                const rzp = new (window as any).Razorpay(options);
                rzp.on('payment.failed', function (response: any) {
                    toast({
                        variant: 'destructive',
                        title: 'Payment Failed',
                        description: response.error.description || 'Something went wrong.'
                    });
                });
                rzp.open();

            } catch (error: any) {
                toast({ variant: 'destructive', title: 'Error', description: error.message || 'Could not initiate payment.' });
            }
        })
    }

    const handleConfirmManualPayment = async () => {
        if (!utr) {
            toast({ variant: 'destructive', title: 'Error', description: 'Please enter the UTR / Transaction ID.' });
            return;
        }

        setIsSubmittingManual(true);
        try {
            const res = await fetch('/api/payments/claim', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    token,
                    paymentId: activePaymentId,
                    utr,
                }),
            });

            const data = await res.json();
            if (data.success) {
                setSuccessMessage('Payment confirmation submitted. The owner will verify and update your passbook soon.');
            } else {
                throw new Error(data.error || 'Failed to submit confirmation.');
            }
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message || 'Could not submit confirmation.' });
        } finally {
            setIsSubmittingManual(false);
        }
    }

    const copyToClipboard = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        toast({ title: 'Copied!', description: `${label} copied to clipboard.` });
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-muted/40">
                <Card className="w-full max-w-md">
                    <CardHeader><Skeleton className="h-8 w-3/4 mx-auto" /></CardHeader>
                    <CardContent className="space-y-4">
                        <Skeleton className="h-6 w-full" />
                        <Skeleton className="h-6 w-1/2" />
                        <Skeleton className="h-12 w-full mt-4" />
                    </CardContent>
                </Card>
            </div>
        )
    }

    if (successMessage) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-muted/40 text-center p-4">
                <Card className="w-full max-w-md">
                    <CardHeader>
                        <CheckCircle className="w-14 h-14 mx-auto text-green-500" />
                        <CardTitle className="mt-4 text-green-600">Payment Submitted!</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground">{successMessage}</p>
                    </CardContent>
                </Card>
            </div>
        )
    }

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-muted/40 text-center p-4">
                <Card className="w-full max-w-md">
                    <CardHeader>
                        <ShieldX className="w-12 h-12 mx-auto text-destructive" />
                        <CardTitle className="mt-4">Oops! Something went wrong.</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground">{error}</p>
                    </CardContent>
                </Card>
            </div>
        )
    }

    if (!details) return null;
    const { guest, property } = details;

    const isSymbolic = guest.amountType === 'symbolic';

    if (showManualForm && property?.paymentMode === 'DIRECT_UPI') {
        return (
            <div className="flex items-center justify-center min-h-screen bg-muted/40 p-4">
                <Card className="w-full max-w-md">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Smartphone className="w-6 h-6 text-primary" />
                            Direct UPI Payment
                        </CardTitle>
                        <CardDescription>Scan QR or use UPI ID to pay ₹{guest.totalDue.toLocaleString('en-IN')}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {property.qrCodeImage && (
                            <div className="flex flex-col items-center gap-2 border p-4 rounded-xl bg-white shadow-sm">
                                <img src={property.qrCodeImage} alt="Owner QR Code" className="w-48 h-48 object-contain" />
                                <span className="text-xs text-muted-foreground">Scan with any UPI App</span>
                            </div>
                        )}

                        <div className="space-y-4">
                            <div className="p-3 bg-muted rounded-lg flex justify-between items-center group relative cursor-pointer active:bg-muted/80 transition-colors"
                                 onClick={() => copyToClipboard(property.upiId || '', 'UPI ID')}>
                                <div className="flex flex-col">
                                    <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Owner UPI ID</span>
                                    <span className="font-mono text-sm">{property.upiId}</span>
                                </div>
                                <div className="p-2 hover:bg-background rounded-full transition-colors">
                                    <Copy className="w-4 h-4 text-primary" />
                                </div>
                            </div>

                            <Button asChild className="w-full h-12 text-lg gap-2 bg-[#0070E0] hover:bg-[#005BB8]" variant="default" disabled={isGeneratingLink}>
                                <a href={serverUpiLink}>
                                    {isGeneratingLink ? <Loader2 className="w-5 h-5 animate-spin" /> : <Smartphone className="w-5 h-5" />}
                                    Pay via UPI App
                                </a>
                            </Button>
                            <p className="text-[10px] text-center text-muted-foreground flex items-center justify-center gap-1">
                                <Info className="w-3 h-3" />
                                Please do not change the <strong>Note</strong> in your UPI app.
                            </p>
                        </div>

                        <div className="space-y-3 pt-4 border-t">
                            <Label htmlFor="utr" className="text-sm font-semibold">Enter UTR / Transaction ID</Label>
                            <Input 
                                id="utr"
                                placeholder="12-digit number from payment apps" 
                                value={utr}
                                onChange={(e) => setUtr(e.target.value)}
                                className="h-11"
                            />
                            <p className="text-[10px] text-muted-foreground flex items-start gap-1">
                                <Info className="w-3 h-3 flex-shrink-0 mt-0.5" />
                                Please enter the reference number from GPay/PhonePe to help us verify your payment.
                            </p>
                            
                            <Button 
                                className="w-full h-11 mt-2" 
                                onClick={handleConfirmManualPayment}
                                disabled={isSubmittingManual || !utr}
                            >
                                {isSubmittingManual && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Confirm Payment
                            </Button>
                            
                            <Button variant="ghost" className="w-full text-xs text-muted-foreground" onClick={() => setShowManualForm(false)}>
                                Go Back
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-muted/40 p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <Building className="w-10 h-10 mx-auto text-primary mb-2" />
                    <CardTitle className="text-2xl">Rent Payment for {guest.pgName}</CardTitle>
                    <CardDescription>Hi {guest.name}, here is your rent summary.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex justify-between items-center text-sm p-3 rounded-lg border bg-muted">
                        <span className="text-muted-foreground flex items-center gap-2"><Calendar className="w-4 h-4" />Due Date</span>
                        <span className="font-semibold">{format(parseISO(guest.dueDate), 'do MMMM, yyyy')}</span>
                    </div>

                    <div className="space-y-2 pt-4 border-t">
                        <p className="font-semibold text-base">Dues Breakdown:</p>
                        {guest.dueItems && guest.dueItems.length > 0 ? (
                            guest.dueItems.map((item: LedgerEntry) => (
                                <div key={item.id} className="flex justify-between text-sm text-muted-foreground">
                                    <span>{item.description}</span>
                                    <span className="font-medium text-foreground">
                                        {item.amountType === 'symbolic' ? item.symbolicValue : `₹${item.amount.toLocaleString('en-IN')}`}
                                    </span>
                                </div>
                            ))
                        ) : (
                            <div className="flex justify-between text-sm text-muted-foreground">
                                <span>Current Rent</span>
                                <span>
                                    {guest.amountType === 'symbolic' ? guest.symbolicRentValue : `₹${guest.rentAmount.toLocaleString('en-IN')}`}
                                </span>
                            </div>
                        )}
                    </div>

                    <div className="flex justify-between items-center pt-4 border-t">
                        <span className="font-bold text-lg">Total Due</span>
                        <div className="text-right">
                            {isSymbolic && (
                                <div className="text-sm font-semibold text-primary mb-1">{guest.symbolicBalance}</div>
                            )}
                            <span className="font-extrabold text-2xl text-primary flex items-center justify-end">
                                <IndianRupee className="w-6 h-6" />
                                {guest.totalDue.toLocaleString('en-IN')}
                            </span>
                        </div>
                    </div>
                </CardContent>
                <div className="p-6 pt-2">
                    {property?.paymentMode === 'CASH_ONLY' || !property?.online_payment_enabled ? (
                        <div className="p-4 bg-orange-50 border border-orange-100 rounded-lg flex gap-3">
                            <Info className="w-5 h-5 text-orange-500 flex-shrink-0" />
                            <p className="text-xs text-orange-800 leading-relaxed">
                                <strong>Online payment is disabled.</strong> Please pay via Cash or ask your owner for their Direct UPI details.
                            </p>
                        </div>
                    ) : (
                        <Button className="w-full text-lg h-12" onClick={handlePayNow} disabled={isPaying || guest.totalDue <= 0}>
                            {isPaying ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
                            {guest.totalDue > 0 ? (property?.paymentMode === 'DIRECT_UPI' ? 'Pay via UPI' : 'Pay Now') : 'No Dues'}
                        </Button>
                    )}
                </div>
            </Card>
        </div>
    )
}
