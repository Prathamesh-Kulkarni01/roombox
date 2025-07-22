
'use client'

import { useState, useMemo } from 'react';
import { useAppSelector } from '@/lib/hooks';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from '@/components/ui/button';
import { format, parseISO, startOfMonth, endOfMonth } from 'date-fns';
import { IndianRupee } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useReactToPrint } from 'react-to-print';
import React from 'react';

export default function RentPassbookPage() {
    const { guests, pgs, isLoading } = useAppSelector(state => ({
        guests: state.guests.guests,
        pgs: state.pgs.pgs,
        isLoading: state.app.isLoading
    }));

    const [filters, setFilters] = useState({
        pgId: 'all',
        guestId: 'all',
        month: format(new Date(), 'yyyy-MM'),
    });

    const printRef = React.useRef<HTMLDivElement>(null);

    const handlePrint = useReactToPrint({
        content: () => printRef.current,
    });

    const allPayments = useMemo(() => {
        return guests.flatMap(g => 
            (g.paymentHistory || []).map(p => ({
                ...p,
                guestName: g.name,
                pgName: g.pgName,
                pgId: g.pgId,
                guestId: g.id,
            }))
        ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [guests]);

    const filteredPayments = useMemo(() => {
        const [year, month] = filters.month.split('-');
        const startDate = startOfMonth(new Date(parseInt(year), parseInt(month) - 1));
        const endDate = endOfMonth(startDate);
        
        return allPayments.filter(p => {
            const paymentDate = parseISO(p.date);
            const pgMatch = filters.pgId === 'all' || p.pgId === filters.pgId;
            const guestMatch = filters.guestId === 'all' || p.guestId === filters.guestId;
            const dateMatch = paymentDate >= startDate && paymentDate <= endDate;
            return pgMatch && guestMatch && dateMatch;
        });
    }, [allPayments, filters]);

    const uniqueGuestsForFilter = useMemo(() => {
        if (filters.pgId === 'all') return guests;
        return guests.filter(g => g.pgId === filters.pgId);
    }, [guests, filters.pgId]);
    
    const totalCollection = useMemo(() => {
        return filteredPayments.reduce((sum, p) => sum + p.amount, 0);
    }, [filteredPayments]);

    if (isLoading) {
        return (
             <div className="flex flex-col gap-8">
                <Skeleton className="h-28 w-full" />
                <Card>
                    <CardHeader>
                        <Skeleton className="h-8 w-48" />
                    </CardHeader>
                    <CardContent>
                        <Skeleton className="h-64 w-full" />
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Rent Collection Passbook</CardTitle>
                    <CardDescription>View and filter all rent transactions across your properties.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                        <Select value={filters.pgId} onValueChange={(val) => setFilters(f => ({ ...f, pgId: val, guestId: 'all' }))}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent><SelectItem value="all">All Properties</SelectItem>{pgs.map(pg => <SelectItem key={pg.id} value={pg.id}>{pg.name}</SelectItem>)}</SelectContent>
                        </Select>
                         <Select value={filters.guestId} onValueChange={(val) => setFilters(f => ({ ...f, guestId: val }))}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent><SelectItem value="all">All Guests</SelectItem>{uniqueGuestsForFilter.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}</SelectContent>
                        </Select>
                        <Input type="month" value={filters.month} onChange={(e) => setFilters(f => ({ ...f, month: e.target.value }))} />
                         <Button onClick={handlePrint} variant="outline">Print Report</Button>
                    </div>
                    <div className="p-4 mb-4 border rounded-lg bg-muted/50 text-center">
                        <p className="text-sm text-muted-foreground">Total Collection for {format(parseISO(`${filters.month}-01`), 'MMMM yyyy')}</p>
                        <p className="text-3xl font-bold flex items-center justify-center gap-1"><IndianRupee/>{totalCollection.toLocaleString('en-IN')}</p>
                    </div>

                    <div ref={printRef} className="printable-area">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Guest</TableHead>
                                    <TableHead>Property</TableHead>
                                    <TableHead>Payment For</TableHead>
                                    <TableHead>Method</TableHead>
                                    <TableHead className="text-right">Amount</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredPayments.length > 0 ? filteredPayments.map(p => (
                                    <TableRow key={p.id}>
                                        <TableCell>{format(parseISO(p.date), 'dd MMM, yyyy')}</TableCell>
                                        <TableCell className="font-medium">{p.guestName}</TableCell>
                                        <TableCell>{p.pgName}</TableCell>
                                        <TableCell>{p.forMonth}</TableCell>
                                        <TableCell className="capitalize">{p.method}</TableCell>
                                        <TableCell className="text-right font-semibold">₹{p.amount.toLocaleString('en-IN')}</TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow><TableCell colSpan={6} className="text-center h-24">No transactions found for the selected filters.</TableCell></TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
