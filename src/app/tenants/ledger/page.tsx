'use client'

import { useMemo, useEffect, useState } from 'react';
import { useAppSelector } from "@/lib/hooks";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { History, ShieldCheck, Wallet } from 'lucide-react';
import { getFinancialEvents } from '@/lib/actions/financialActions';
import type { FinancialEvent } from '@/lib/types';

export default function TenantLedgerPage() {
    const { currentUser } = useAppSelector(state => state.user);
    const { guests } = useAppSelector(state => state.guests);
    const { isLoading } = useAppSelector(state => state.app);

    const [events, setEvents] = useState<FinancialEvent[]>([]);
    const [loadingEvents, setLoadingEvents] = useState(true);

    const currentGuest = useMemo(() => {
        if (!currentUser || !currentUser.guestId) return null;
        return guests.find(g => g.id === currentUser.guestId);
    }, [currentUser, guests]);

    useEffect(() => {
        async function fetchEvents() {
            if (currentUser && currentUser.guestId && currentGuest) {
                setLoadingEvents(true);
                const res = await getFinancialEvents((currentGuest as any).ownerId, currentUser.guestId);
                if (res.success && res.events) {
                    setEvents(res.events);
                }
                setLoadingEvents(false);
            }
        }
        fetchEvents();
    }, [currentUser, currentGuest]);
    
    // In event-sourced model, balance is pre-computed on the guest document
    const currentBalance = currentGuest?.balance || 0;
    const escrowBalance = currentGuest?.walletBalance || 0;

    if (isLoading || !currentGuest || loadingEvents) {
        return (
            <Card>
                <CardHeader>
                    <Skeleton className="h-8 w-48 mb-2" />
                    <Skeleton className="h-5 w-72" />
                </CardHeader>
                <CardContent>
                    <div className="space-y-2">
                        <Skeleton className="h-12 w-full" />
                        <Skeleton className="h-12 w-full" />
                        <Skeleton className="h-12 w-full" />
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
                    <CardHeader className="pb-2">
                        <CardDescription className="text-primary font-medium flex items-center gap-2">
                            <History className="h-4 w-4" /> Outstanding Rent Dues
                        </CardDescription>
                        <CardTitle className="text-4xl font-black text-primary">
                            {currentGuest.symbolicBalance ? `${currentGuest.symbolicBalance} Units` : `₹${currentBalance.toLocaleString('en-IN')}`}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground">
                            {(currentBalance <= 0 && !currentGuest.symbolicBalance) ? "You're all caught up! No pending dues." : "Please clear your dues to avoid late fees."}
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5">
                    <CardHeader className="pb-2">
                        <CardDescription className="text-green-700 font-medium flex items-center gap-2">
                            <ShieldCheck className="h-4 w-4" /> Escrow / Security Deposit
                        </CardDescription>
                        <CardTitle className="text-4xl font-black text-green-700">
                            {currentGuest.amountType === 'symbolic' ? `${currentGuest.symbolicDepositValue || 'N/A'}` : `₹${escrowBalance.toLocaleString('en-IN')}`}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-green-800/80">
                            Your security deposit is safely held in Escrow and will be refunded upon move-out.
                        </p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="text-xl">Financial Events</CardTitle>
                    <CardDescription>
                        An immutable, event-sourced ledger of all your charges and payments.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        {events.length > 0 ? (
                            <Table className="min-w-[600px]">
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Description</TableHead>
                                        <TableHead>Type</TableHead>
                                        <TableHead className="text-right">Charge (+)</TableHead>
                                        <TableHead className="text-right">Payment (-)</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {events.map(entry => {
                                        // amount > 0 means charge. amount < 0 means payment.
                                        // deposit_received is money given to us, so it is a payment from tenant perspective, but it goes to escrow.
                                        const isCharge = entry.amount > 0 && entry.type !== 'deposit_received';
                                        const isPayment = entry.amount < 0 || entry.type === 'deposit_received' || entry.type === 'payment_received';
                                        
                                        const isSymbolic = (entry as any).amountType === 'symbolic';
                                        const displayVal = isSymbolic ? ((entry as any).symbolicValue || '1 Unit') : `₹${Math.abs(entry.amount).toLocaleString('en-IN')}`;
                                        
                                        return (
                                            <TableRow key={entry.id}>
                                                <TableCell className="whitespace-nowrap">{format(parseISO(entry.date), 'dd MMM, yyyy')}</TableCell>
                                                <TableCell>{entry.description}</TableCell>
                                                <TableCell>
                                                    <span className="capitalize text-xs px-2 py-1 bg-secondary rounded-full">
                                                        {entry.type.replace('_', ' ')}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-right font-medium text-destructive">
                                                    {isCharge ? displayVal : '-'}
                                                </TableCell>
                                                <TableCell className="text-right font-medium text-green-600">
                                                    {isPayment ? displayVal : '-'}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        ) : (
                            <div className="text-center py-10 text-muted-foreground">
                                No financial activity has been recorded yet.
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}