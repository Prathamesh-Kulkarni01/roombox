

'use client'

import { useState, useMemo, useRef } from 'react';
import { useAppSelector } from '@/lib/hooks';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from '@/components/ui/button';
import { format, parseISO, startOfMonth, endOfMonth } from 'date-fns';
import { IndianRupee, Download, Printer, CheckCircle, XCircle, AlertCircle, Loader2, Info } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useReactToPrint } from 'react-to-print';
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import RentAnalytics from '@/components/dashboard/rent-passbook/RentAnalytics';
import DepositManagementTab from '@/components/dashboard/rent-passbook/DepositManagementTab';
import PaymentDialog from '@/components/dashboard/dialogs/PaymentDialog';
import ReminderDialog from '@/components/dashboard/dialogs/ReminderDialog';
import { useDashboard } from '@/hooks/use-dashboard';
import { Wallet, MessageCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { Payment } from '@/lib/types';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';


const PendingDuesTable = ({ guests, pgs, filters, onCollectRent, onSendReminder }: any) => {
    const filteredPendingGuests = useMemo(() => {
        const guestMap = new Map();
        guests.forEach((g: any) => {
            if (!guestMap.has(g.id)) {
                guestMap.set(g.id, g);
            }
        });

        const uniqueGuests = Array.from(guestMap.values());

        return uniqueGuests.filter(g => {
            const isDue = g.rentStatus === 'unpaid' || g.rentStatus === 'partial' || (g.additionalCharges && g.additionalCharges.length > 0);
            const pgMatch = filters.pgId === 'all' || g.pgId === filters.pgId;
            return isDue && pgMatch;
        });
    }, [guests, filters]);

    if (filteredPendingGuests.length === 0) {
        return <div className="text-center py-10 text-muted-foreground">No pending dues for the selected property. Great job!</div>;
    }

    return (
        <div className="printable-area">
            <Accordion type="multiple" className="w-full">
                {filteredPendingGuests.map(guest => {
                     const balanceBf = guest.balanceBroughtForward || 0;
                     const chargesDue = (guest.additionalCharges || []).reduce((sum: number, charge: { amount: number; }) => sum + charge.amount, 0);
                     const rentDue = (guest.rentStatus === 'paid') ? 0 : guest.rentAmount - (guest.rentPaidAmount || 0);
                     const totalDue = balanceBf + chargesDue + rentDue;

                     if (totalDue <= 0) return null; // Don't show if there's nothing to pay

                    return (
                        <AccordionItem value={guest.id} key={guest.id}>
                            <AccordionTrigger>
                                <div className="flex justify-between items-center w-full pr-4">
                                    <div className="flex flex-col text-left">
                                        <span className="font-semibold">{guest.name}</span>
                                        <span className="text-sm text-muted-foreground">{guest.pgName} - Due on {format(parseISO(guest.dueDate), 'do MMM')}</span>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold text-lg text-destructive">₹{totalDue.toLocaleString('en-IN')}</p>
                                        <p className="text-xs text-muted-foreground">Total Pending</p>
                                    </div>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent>
                                <div className="p-4 bg-muted/50 rounded-md border space-y-4">
                                    <div className="space-y-2 text-sm">
                                        <h4 className="font-semibold mb-2">Dues Breakdown for {guest.name}</h4>
                                         {balanceBf > 0 && (
                                            <div className="flex justify-between items-center text-muted-foreground">
                                                <span>Balance from previous months:</span>
                                                <span className="font-medium text-foreground">₹{balanceBf.toLocaleString('en-IN')}</span>
                                            </div>
                                        )}
                                        {rentDue > 0 &&
                                            <div className="flex justify-between items-center text-muted-foreground">
                                                <span>Current month's rent:</span>
                                                <span className="font-medium text-foreground">₹{rentDue.toLocaleString('en-IN')}</span>
                                            </div>
                                        }
                                        {(guest.additionalCharges || []).map((charge: any) => (
                                            <div key={charge.id} className="flex justify-between items-center text-muted-foreground pl-4">
                                                <span>- {charge.description}</span>
                                                <span className="font-medium text-foreground">₹{charge.amount.toLocaleString('en-IN')}</span>
                                            </div>
                                        ))}
                                        
                                         <div className="flex justify-between items-center border-t pt-2 mt-2">
                                            <span className="font-bold text-base">Total Amount Due:</span>
                                            <span className="font-bold text-base text-destructive">₹{totalDue.toLocaleString('en-IN')}</span>
                                        </div>
                                    </div>
                                    <div className="flex gap-2 justify-end pt-2 border-t">
                                        <Button size="sm" variant="ghost" onClick={() => onSendReminder(guest)}><MessageCircle className="w-4 h-4 mr-2"/>Send Reminder</Button>
                                        <Button size="sm" onClick={() => onCollectRent(guest)}><Wallet className="w-4 h-4 mr-2"/>Collect Rent</Button>
                                    </div>
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    )
                })}
            </Accordion>
        </div>
    );
};

const PayoutStatusBadge = ({ payment }: { payment: Payment }) => {
    const [open, setOpen] = useState(false);
    
    if (!payment) {
        return <Badge variant="outline">N/A</Badge>;
    }

    const statusMeta = {
        processed: { text: "Processed", icon: CheckCircle, className: "bg-green-100 text-green-800" },
        failed: { text: "Failed", icon: XCircle, className: "bg-red-100 text-red-800" },
        pending: { text: "Pending", icon: Loader2, className: "bg-yellow-100 text-yellow-800 animate-spin" },
    };

    const status = payment.payoutStatus || 'pending';
    const meta = statusMeta[status] || { text: 'Unknown', icon: AlertCircle, className: 'bg-gray-100 text-gray-800' };

    const isClickable = payment.method === 'in-app' && (status === 'processed' || status === 'failed');

    const BadgeComponent = (
        <Badge variant="outline" className={cn("cursor-pointer", meta.className, !isClickable && 'cursor-default')}>
            <meta.icon className={cn("w-3 h-3 mr-1", status !== 'pending' && 'animate-none')} />
            {meta.text}
        </Badge>
    );

    if (!isClickable) {
        return BadgeComponent;
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {BadgeComponent}
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Payout Details</DialogTitle>
                    <DialogDescription>Details for payment made on {format(parseISO(payment.date), 'do MMM, yyyy')}.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                     <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">Status</span>
                        <Badge variant="outline" className={cn(meta.className, "text-base")}>
                             <meta.icon className={cn("w-4 h-4 mr-1.5", status !== 'pending' && 'animate-none')} />
                            {meta.text}
                        </Badge>
                    </div>
                    {status === 'failed' && payment.payoutFailureReason && (
                        <div className="text-sm p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                            <p className="font-semibold text-destructive">Reason for Failure:</p>
                            <p className="text-destructive/90">{payment.payoutFailureReason}</p>
                        </div>
                    )}
                     <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">Original Payment ID</span>
                        <span className="font-mono text-xs">{payment.id}</span>
                    </div>
                     <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">Payout Transaction ID</span>
                        <span className="font-mono text-xs">{payment.payoutId || 'N/A'}</span>
                    </div>
                     <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">Amount Transferred</span>
                        <span className="font-semibold">₹{payment.amount.toLocaleString('en-IN')}</span>
                    </div>
                     <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">Destination Account</span>
                        <span className="font-medium">{payment.payoutTo || 'Primary Account'}</span>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

const PrintableReport = React.forwardRef(({ payments, pgName, dateRange, totalCollection }: any, ref: any) => {
    return (
        <div ref={ref} className="p-8 print-content">
            <div className="mb-8">
                <h1 className="text-2xl font-bold">Rent Collection Report</h1>
                <p className="text-muted-foreground">{pgName}</p>
                <p className="text-muted-foreground">{dateRange}</p>
            </div>
             <div className="p-4 mb-6 border rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground">Total Collection for this Period</p>
                <p className="text-3xl font-bold flex items-center gap-1"><IndianRupee/>{totalCollection.toLocaleString('en-IN')}</p>
            </div>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Guest</TableHead>
                        <TableHead>Payment Method</TableHead>
                        <TableHead>Payout Status</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {payments.length > 0 ? payments.map((p: Payment) => (
                        <TableRow key={p.id}>
                            <TableCell>{format(parseISO(p.date), 'dd MMM, yyyy')}</TableCell>
                            <TableCell className="font-medium">{(p as any).guestName}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{p.notes || p.method}</TableCell>
                            <TableCell>
                               <span className="capitalize">{p.payoutStatus || 'N/A'}</span>
                            </TableCell>
                            <TableCell className="text-right font-semibold">₹{p.amount.toLocaleString('en-IN')}</TableCell>
                        </TableRow>
                    )) : (
                        <TableRow><TableCell colSpan={5} className="text-center h-24">No transactions found.</TableCell></TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
    );
});
PrintableReport.displayName = 'PrintableReport';


export default function RentPassbookPage() {
    const { guests, pgs, isLoading } = useAppSelector(state => ({
        guests: state.guests.guests,
        pgs: state.pgs.pgs,
        isLoading: state.app.isLoading
    }));
    
    const {
        isPaymentDialogOpen,
        setIsPaymentDialogOpen,
        paymentForm,
        handlePaymentSubmit,
        selectedGuestForPayment,
        handleOpenPaymentDialog,
        isReminderDialogOpen,
        setIsReminderDialogOpen,
        reminderMessage,
        isGeneratingReminder,
        selectedGuestForReminder,
        handleOpenReminderDialog
    } = useDashboard({ pgs, guests });

    const [filters, setFilters] = useState({
        pgId: 'all',
        guestId: 'all',
        month: format(new Date(), 'yyyy-MM'),
    });

    const printRef = useRef<HTMLDivElement>(null);

    const handlePrint = useReactToPrint({
        content: () => printRef.current,
        documentTitle: `Rent_Report_${filters.month}`
    });
    
     const handleDownloadCsv = () => {
        const headers = ["Date", "Guest Name", "Property Name", "Payment Details", "Amount", "Payout Status", "Payout Account", "Payout Failure Reason"];
        const rows = filteredPayments.map(p => [
            format(parseISO(p.date), 'yyyy-MM-dd'),
            p.guestName,
            p.pgName,
            p.notes || p.method,
            p.amount,
            p.payoutStatus || 'pending',
            p.payoutTo || '',
            p.payoutFailureReason || ''
        ].map(val => `"${String(val ?? '').replace(/"/g, '""')}"`));

        let csvContent = "data:text/csv;charset=utf-8," 
            + headers.join(",") + "\n" 
            + rows.map(e => e.join(",")).join("\n");
        
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `rent_history_${filters.month}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };


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
        const guestMap = new Map();
        guests.forEach((g: any) => {
            if (!guestMap.has(g.id)) {
                guestMap.set(g.id, g);
            }
        });
        const uniqueGuests = Array.from(guestMap.values());

        if (filters.pgId === 'all') return uniqueGuests;
        return uniqueGuests.filter(g => g.pgId === filters.pgId);
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
                    <CardTitle>Rentbook</CardTitle>
                    <CardDescription>View pending dues, payment history, and financial analytics.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Tabs defaultValue="analytics">
                        <TabsList className="grid w-full grid-cols-4">
                             <TabsTrigger value="analytics">
                                <span className="sm:hidden">Stats</span>
                                <span className="hidden sm:inline">Analytics</span>
                            </TabsTrigger>
                            <TabsTrigger value="pending-dues">
                                <span className="sm:hidden">Dues</span>
                                <span className="hidden sm:inline">Pending Dues</span>
                            </TabsTrigger>
                            <TabsTrigger value="payment-history">
                                <span className="sm:hidden">History</span>
                                <span className="hidden sm:inline">Payment History</span>
                            </TabsTrigger>
                             <TabsTrigger value="deposits">
                                <span className="sm:hidden">Deposits</span>
                                <span className="hidden sm:inline">Deposits</span>
                            </TabsTrigger>
                        </TabsList>
                        <TabsContent value="analytics" className="mt-4">
                            <RentAnalytics guests={guests} pgs={pgs} />
                        </TabsContent>
                        <TabsContent value="pending-dues" className="mt-4">
                            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                                <Select value={filters.pgId} onValueChange={(val) => setFilters(f => ({ ...f, pgId: val, guestId: 'all' }))}>
                                    <SelectTrigger><SelectValue placeholder="Filter by Property..." /></SelectTrigger>
                                    <SelectContent><SelectItem value="all">All Properties</SelectItem>{pgs.map(pg => <SelectItem key={pg.id} value={pg.id}>{pg.name}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                            <PendingDuesTable guests={guests} pgs={pgs} filters={filters} onCollectRent={handleOpenPaymentDialog} onSendReminder={handleOpenReminderDialog} />
                        </TabsContent>
                        <TabsContent value="payment-history" className="mt-4">
                           <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                                <Select value={filters.pgId} onValueChange={(val) => setFilters(f => ({ ...f, pgId: val, guestId: 'all' }))}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent><SelectItem value="all">All Properties</SelectItem>{pgs.map(pg => <SelectItem key={pg.id} value={pg.id}>{pg.name}</SelectItem>)}</SelectContent>
                                </Select>
                                <Select value={filters.guestId} onValueChange={(val) => setFilters(f => ({ ...f, guestId: val }))}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent><SelectItem value="all">All Guests</SelectItem>{uniqueGuestsForFilter.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}</SelectContent>
                                </Select>
                                <Input type="month" value={filters.month} onChange={(e) => setFilters(f => ({ ...f, month: e.target.value }))} />
                            </div>
                            <div className="flex gap-2 justify-end mb-4">
                                <Button onClick={handleDownloadCsv} variant="outline"><Download className="mr-2 h-4 w-4"/>Download CSV</Button>
                                <Button onClick={handlePrint} variant="outline"><Printer className="mr-2 h-4 w-4"/>Print Report</Button>
                            </div>
                            
                            <div style={{ display: "none" }}>
                                <PrintableReport 
                                    ref={printRef} 
                                    payments={filteredPayments}
                                    pgName={filters.pgId === 'all' ? 'All Properties' : pgs.find(p => p.id === filters.pgId)?.name}
                                    dateRange={format(parseISO(`${filters.month}-01`), 'MMMM yyyy')}
                                    totalCollection={totalCollection}
                                />
                            </div>

                            <div className="border rounded-lg">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Date</TableHead>
                                            <TableHead>Guest</TableHead>
                                            <TableHead>Payment Details</TableHead>
                                            <TableHead>Payout Status</TableHead>
                                            <TableHead className="text-right">Amount</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredPayments.length > 0 ? filteredPayments.map(p => (
                                            <TableRow key={p.id}>
                                                <TableCell>{format(parseISO(p.date), 'dd MMM, yyyy')}</TableCell>
                                                <TableCell className="font-medium">{p.guestName}</TableCell>
                                                <TableCell className="text-xs text-muted-foreground">{p.notes || p.method}</TableCell>
                                                <TableCell>
                                                    <PayoutStatusBadge payment={p} />
                                                </TableCell>
                                                <TableCell className="text-right font-semibold">₹{p.amount.toLocaleString('en-IN')}</TableCell>
                                            </TableRow>
                                        )) : (
                                            <TableRow><TableCell colSpan={5} className="text-center h-24">No transactions found for the selected filters.</TableCell></TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </TabsContent>
                        <TabsContent value="deposits" className="mt-4">
                            <DepositManagementTab guests={guests} />
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>

            <PaymentDialog isPaymentDialogOpen={isPaymentDialogOpen} setIsPaymentDialogOpen={setIsPaymentDialogOpen} selectedGuestForPayment={selectedGuestForPayment} paymentForm={paymentForm} handlePaymentSubmit={handlePaymentSubmit} />
            <ReminderDialog isReminderDialogOpen={isReminderDialogOpen} setIsReminderDialogOpen={setIsReminderDialogOpen} selectedGuestForReminder={selectedGuestForReminder} isGeneratingReminder={isGeneratingReminder} reminderMessage={reminderMessage} />
        </div>
    )
}
