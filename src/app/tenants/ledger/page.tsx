'use client'

import { useMemo } from 'react';
import { useAppSelector } from "@/lib/hooks";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { History, IndianRupee } from 'lucide-react';

export default function TenantLedgerPage() {
    const { currentUser } = useAppSelector(state => state.user);
    const { guests } = useAppSelector(state => state.guests);
    const { isLoading } = useAppSelector(state => state.app);

    const currentGuest = useMemo(() => {
        if (!currentUser || !currentUser.guestId) return null;
        return guests.find(g => g.id === currentUser.guestId);
    }, [currentUser, guests]);

    const sortedLedger = useMemo(() => {
        if (!currentGuest?.ledger) return [];
        return [...currentGuest.ledger].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [currentGuest]);
    
    const currentBalance = useMemo(() => {
        if (!currentGuest?.ledger) return 0;
        return currentGuest.ledger.reduce((acc, entry) => acc + (entry.type === 'debit' ? entry.amount : -entry.amount), 0);
    }, [currentGuest]);


    if (isLoading || !currentGuest) {
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
                        <Skeleton className="h-12 w-full" />
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-2xl">
                    <History /> Your Financial Ledger
                </CardTitle>
                <CardDescription>
                    A complete history of all your charges and payments. Your current outstanding balance is <span className="font-bold text-primary">₹{currentBalance.toLocaleString('en-IN')}</span>.
                </CardDescription>
            </CardHeader>
            <CardContent>
                {sortedLedger.length > 0 ? (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead className="text-right">Debit (+)</TableHead>
                                <TableHead className="text-right">Credit (-)</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sortedLedger.map(entry => (
                                <TableRow key={entry.id}>
                                    <TableCell>{format(parseISO(entry.date), 'dd MMM, yyyy')}</TableCell>
                                    <TableCell>{entry.description}</TableCell>
                                    <TableCell className="text-right font-medium text-destructive">
                                        {entry.type === 'debit' ? `₹${entry.amount.toLocaleString('en-IN')}` : '-'}
                                    </TableCell>
                                    <TableCell className="text-right font-medium text-green-600">
                                        {entry.type === 'credit' ? `₹${entry.amount.toLocaleString('en-IN')}` : '-'}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                ) : (
                    <div className="text-center py-10 text-muted-foreground">
                        No financial activity has been recorded yet.
                    </div>
                )}
            </CardContent>
        </Card>
    );
}