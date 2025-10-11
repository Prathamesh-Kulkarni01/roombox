

'use client'

import { useAppSelector } from "@/lib/hooks"
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, BedDouble, Building, Calendar, CheckCircle, Clock, FileText, IndianRupee, ShieldCheck, Loader2, User } from "lucide-react"
import { format, differenceInDays, parseISO, isValid, differenceInSeconds } from "date-fns"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { useMemo, useState, useTransition, useEffect } from "react"
import { useToast } from "@/hooks/use-toast"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { LedgerEntry } from "@/lib/types"

const rentStatusColors: Record<string, string> = {
  paid: 'bg-green-100 text-green-800 border-green-300',
  unpaid: 'bg-red-100 text-red-800 border-red-300',
  partial: 'bg-orange-100 text-orange-800 border-orange-300',
};

const kycStatusColors: Record<string, string> = {
    verified: 'text-blue-600 dark:text-blue-400',
    pending: 'text-yellow-600 dark:text-yellow-400',
    rejected: 'text-red-600 dark:text-red-400',
    'not-started': 'text-gray-600 dark:text-gray-400',
};


export default function MyPgPage() {
    const { currentUser } = useAppSelector(state => state.user)
    const { guests } = useAppSelector(state => state.guests)
    const { pgs } = useAppSelector(state => state.pgs)
    const { isLoading } = useAppSelector(state => state.app)
    const { toast } = useToast();
    const [isPaying, startPaymentTransition] = useTransition();
    const [timeLeft, setTimeLeft] = useState('');

    const currentGuest = useMemo(() => {
        if (!currentUser || !currentUser.guestId) return null;
        return guests.find(g => g.id === currentUser.guestId);
    }, [currentUser, guests]);

    const currentPg = useMemo(() => {
        if (!currentGuest) return null;
        return pgs.find(p => p.id === currentGuest.pgId);
    }, [currentGuest, pgs]);

    const bedDetails = useMemo(() => {
        if (!currentPg || !currentGuest) return { roomName: 'N/A', bedName: 'N/A' };
        const pg = pgs.find(p => p.id === currentPg.id)
        if (!pg) return { roomName: 'N/A', bedName: 'N/A' };
        const floor = pg.floors?.find(f => f.rooms.some(r => r.beds.some(b => b.id === currentGuest.bedId)));
        if (!floor) return { roomName: 'N/A', bedName: 'N/A' };
        const room = floor.rooms.find(r => r.beds.some(b => b.id === currentGuest.bedId));
        if (!room) return { roomName: 'N/A', bedName: 'N/A' };
        const bed = room.beds.find(b => b.id === currentGuest.bedId);
        if (!bed) return { roomName: 'N/A', bedName: 'N/A' };
        return { roomName: room.name, bedName: bed.name };  
    }, [currentPg, currentGuest, pgs]);

     const { totalDue, sortedLedger, dueItems } = useMemo(() => {
        if (!currentGuest) return { totalDue: 0, sortedLedger: [], dueItems: [] };
        
        const debits = currentGuest.ledger.filter(e => e.type === 'debit');
        const credits = currentGuest.ledger.filter(e => e.type === 'credit');
        
        const totalDebits = debits.reduce((sum, e) => sum + e.amount, 0);
        const totalCredits = credits.reduce((sum, e) => sum + e.amount, 0);
        
        const due = totalDebits - totalCredits;

        const sorted = [...currentGuest.ledger].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        
        return { totalDue: due, sortedLedger: sorted, dueItems: debits };
    }, [currentGuest]);
    
     useEffect(() => {
        if (!currentGuest?.dueDate) return;

        const interval = setInterval(() => {
            const dueDate = parseISO(currentGuest.dueDate);
            const now = new Date();

            if (isValid(dueDate) && dueDate > now) {
                const totalSeconds = differenceInSeconds(dueDate, now);
                const days = Math.floor(totalSeconds / (3600 * 24));
                const hours = Math.floor((totalSeconds % (3600 * 24)) / 3600);
                const minutes = Math.floor((totalSeconds % 3600) / 60);
                const seconds = totalSeconds % 60;
                
                setTimeLeft(`${days}d ${hours}h ${minutes}m ${seconds}s`);
            } else {
                setTimeLeft('Due');
                clearInterval(interval);
            }
        }, 1000);

        return () => clearInterval(interval);

    }, [currentGuest?.dueDate]);


    const handlePayNow = () => {
        if (!currentGuest || !currentUser || !currentUser.ownerId || totalDue <= 0) return;
        
        startPaymentTransition(async () => {
             try {
                const res = await fetch('/api/razorpay/create-rent-order', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        guestId: currentGuest.id,
                        ownerId: currentUser.ownerId,
                        amount: totalDue,
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
                    name: `Rent for ${currentGuest.pgName}`,
                    description: `Payment for ${currentGuest.name}`,
                    order_id: order.id,
                    handler: function (response: any) {
                        toast({ title: 'Payment Successful!', description: 'Your payment is being processed. The status will update shortly.' });
                    },
                    prefill: {
                        name: currentGuest.name,
                        email: currentGuest.email,
                        contact: currentGuest.phone,
                    },
                    notes: {
                        address: `${currentGuest.pgName}, ${bedDetails.roomName}`
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
        });
    };

    if (isLoading || !currentGuest || !currentPg) {
        return (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <CardHeader>
                            <Skeleton className="h-8 w-3/4" />
                            <Skeleton className="h-4 w-1/2" />
                        </CardHeader>
                        <CardContent className="grid md:grid-cols-2 gap-6">
                            <Skeleton className="h-6 w-full" />
                            <Skeleton className="h-6 w-full" />
                            <Skeleton className="h-6 w-full" />
                            <Skeleton className="h-6 w-full" />
                        </CardContent>
                    </Card>
                    <Card>
                         <CardHeader>
                            <Skeleton className="h-7 w-1/3" />
                         </CardHeader>
                         <CardContent>
                            <Skeleton className="h-14 w-full" />
                         </CardContent>
                    </Card>
                </div>
                <div className="lg:col-span-1 space-y-6">
                     <Card>
                        <CardHeader><Skeleton className="h-7 w-1/2" /></CardHeader>
                        <CardContent className="space-y-4">
                            <Skeleton className="h-6 w-full" />
                            <Skeleton className="h-6 w-full" />
                            <Skeleton className="h-7 w-full" />
                            <Skeleton className="h-6 w-full" />
                        </CardContent>
                        <CardFooter><Skeleton className="h-10 w-full" /></CardFooter>
                     </Card>
                </div>
            </div>
        )
    }

    const moveInDate = currentGuest.moveInDate ? parseISO(currentGuest.moveInDate) : null;
    const exitDate = currentGuest.exitDate ? parseISO(currentGuest.exitDate) : null;
    const dueDate = currentGuest.dueDate ? parseISO(currentGuest.dueDate) : null;
    const stayDuration = moveInDate && isValid(moveInDate) ? differenceInDays(new Date(), moveInDate) : 0;

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            <div className="lg:col-span-2 space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-2xl">
                           <Building/> Welcome to {currentGuest.pgName}!
                        </CardTitle>
                        <CardDescription>Here are the details about your stay.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid md:grid-cols-2 gap-6 text-sm">
                        <div className="flex items-center gap-3"><Calendar className="w-5 h-5 text-primary" /><p>Moved In: <span className="font-medium">{moveInDate && isValid(moveInDate) ? format(moveInDate, "do MMM, yyyy") : 'N/A'}</span></p></div>
                        <div className="flex items-center gap-3"><Clock className="w-5 h-5 text-primary" /><p>Stay Duration: <span className="font-medium">{stayDuration} days</span></p></div>
                        <div className="flex items-center gap-3"><BedDouble className="w-5 h-5 text-primary" /><p>Room/Bed: <span className="font-medium">Room {bedDetails.roomName}, Bed {bedDetails.bedName}</span></p></div>
                        <div className="flex items-center gap-3"><FileText className="w-5 h-5 text-primary" /><p>Notice Period: <span className="font-medium">{currentGuest.noticePeriodDays} days</span></p></div>
                    </CardContent>
                    {exitDate && isValid(exitDate) && !currentGuest.isVacated && (
                         <CardFooter>
                             <Alert variant="default" className="bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-950 dark:border-blue-800 dark:text-blue-200 w-full">
                                <AlertCircle className="text-blue-600 dark:text-blue-400" />
                                <AlertTitle className="font-semibold">Notice Period Active</AlertTitle>
                                <AlertDescription>Your final day to vacate is <span className="font-bold">{format(exitDate, "do MMMM, yyyy")}</span>.</AlertDescription>
                            </Alert>
                        </CardFooter>
                    )}
                </Card>
                
                 <Card>
                    <CardHeader>
                        <CardTitle className="text-xl">Financial Ledger</CardTitle>
                        <CardDescription>A complete history of your payments and charges.</CardDescription>
                    </CardHeader>
                    <CardContent>
                         {(sortedLedger && sortedLedger.length > 0) ? (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Description</TableHead>
                                        <TableHead className="text-right">Amount</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {sortedLedger.map(entry => (
                                        <TableRow key={entry.id}>
                                            <TableCell>{format(parseISO(entry.date), 'dd MMM, yyyy')}</TableCell>
                                            <TableCell>{entry.description}</TableCell>
                                            <TableCell className={cn("text-right font-semibold", entry.type === 'debit' ? 'text-destructive' : 'text-green-600')}>
                                                {entry.type === 'credit' ? '-' : '+'} ₹{entry.amount.toLocaleString('en-IN')}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                         ) : (
                             <p className="text-sm text-muted-foreground text-center py-4">No payment history yet.</p>
                         )}
                    </CardContent>
                </Card>
            </div>
            <div className="lg:col-span-1 space-y-6">
                <Card className="sticky top-20">
                    <CardHeader>
                        <CardTitle className="text-xl">Rent Details</CardTitle>
                        <CardDescription>Due on {dueDate && isValid(dueDate) ? format(dueDate, "do MMMM, yyyy") : 'N/A'}</CardDescription>
                    </CardHeader>
                     <CardContent className="space-y-4">
                        {currentGuest.rentStatus !== 'paid' && timeLeft && (
                            <div className="text-center p-3 rounded-lg bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800">
                                <p className="text-sm text-yellow-800 dark:text-yellow-300 font-semibold">Time Left to Pay</p>
                                <p className="text-2xl font-bold font-mono text-yellow-900 dark:text-yellow-200 tracking-wider">{timeLeft}</p>
                            </div>
                        )}
                        <div className="flex justify-between items-center text-sm">
                            <span>Status:</span>
                            <Badge variant="outline" className={cn("capitalize text-base", rentStatusColors[currentGuest.rentStatus])}>{currentGuest.rentStatus}</Badge>
                        </div>
                        
                         <div className="space-y-2 pt-4 border-t">
                             <p className="font-semibold text-base">Dues Breakdown</p>
                             {dueItems.length > 0 ? dueItems.map(item => (
                                <div key={item.id} className="flex justify-between text-sm text-muted-foreground">
                                    <span>{item.description}</span>
                                    <span className="font-medium text-foreground">₹{item.amount.toLocaleString('en-IN')}</span>
                                </div>
                            )) : <p className="text-sm text-muted-foreground">No outstanding charges.</p>}
                        </div>


                        <div className="flex justify-between items-center text-base pt-4 border-t">
                            <span className="font-bold">Total Amount Due:</span>
                            <span className="font-bold text-lg text-primary flex items-center"><IndianRupee className="w-5 h-5"/>{totalDue.toLocaleString('en-IN')}</span>
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button className="w-full bg-accent text-accent-foreground hover:bg-accent/90" onClick={handlePayNow} disabled={totalDue <= 0 || isPaying}>
                            {isPaying && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                            Pay Now
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        </div>
    )
}
