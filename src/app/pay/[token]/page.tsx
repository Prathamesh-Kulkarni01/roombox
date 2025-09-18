
'use client'

import { useState, useEffect, useMemo, useTransition } from 'react';
import { useParams } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { IndianRupee, Loader2, CheckCircle, ShieldX, Building, User, Calendar } from 'lucide-react';
import type { Guest } from '@/lib/types';
import { format, parseISO } from 'date-fns';

type RentDetails = {
    guest: Omit<Guest, 'paymentHistory' | 'additionalCharges'> & {
        totalDue: number;
        balanceBroughtForward: number;
        additionalCharges: { description: string, amount: number }[];
    };
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
    
    const handlePayNow = () => {
        if (!details || details.guest.totalDue <= 0) return;

        startPaymentTransition(async () => {
             try {
                const res = await fetch('/api/razorpay/create-rent-order', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        guestId: details.guest.id,
                        ownerId: details.ownerId,
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

    if (error) {
        return (
             <div className="flex items-center justify-center min-h-screen bg-muted/40 text-center p-4">
                <Card className="w-full max-w-md">
                    <CardHeader>
                        <ShieldX className="w-12 h-12 mx-auto text-destructive"/>
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

    const { guest } = details;

    return (
        <div className="flex items-center justify-center min-h-screen bg-muted/40 p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <Building className="w-10 h-10 mx-auto text-primary mb-2"/>
                    <CardTitle className="text-2xl">Rent Payment for {guest.pgName}</CardTitle>
                    <CardDescription>Hi {guest.name}, here is your rent summary.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex justify-between items-center text-sm p-3 rounded-lg border bg-muted">
                        <span className="text-muted-foreground flex items-center gap-2"><Calendar className="w-4 h-4"/>Due Date</span>
                        <span className="font-semibold">{format(parseISO(guest.dueDate), 'do MMMM, yyyy')}</span>
                    </div>

                    <div className="space-y-2 pt-4 border-t">
                        {guest.balanceBroughtForward > 0 && 
                            <div className="flex justify-between text-sm text-muted-foreground"><span>Previous Dues</span><span>₹{guest.balanceBroughtForward.toLocaleString('en-IN')}</span></div>
                        }
                        <div className="flex justify-between text-sm text-muted-foreground"><span>Current Rent</span><span>₹{guest.rentAmount.toLocaleString('en-IN')}</span></div>
                        {guest.additionalCharges.map(charge => (
                             <div key={charge.description} className="flex justify-between text-sm text-muted-foreground"><span>{charge.description}</span><span>₹{charge.amount.toLocaleString('en-IN')}</span></div>
                        ))}
                    </div>

                    <div className="flex justify-between items-center pt-4 border-t">
                        <span className="font-bold text-lg">Total Due</span>
                        <span className="font-extrabold text-2xl text-primary flex items-center"><IndianRupee className="w-6 h-6"/>{guest.totalDue.toLocaleString('en-IN')}</span>
                    </div>
                </CardContent>
                <div className="p-6 pt-2">
                    <Button className="w-full text-lg h-12" onClick={handlePayNow} disabled={isPaying || guest.totalDue <= 0}>
                        {isPaying ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
                        {guest.totalDue > 0 ? 'Pay Now' : 'No Dues'}
                    </Button>
                </div>
            </Card>
        </div>
    )
}
