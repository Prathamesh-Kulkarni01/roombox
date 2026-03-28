'use client'

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format, parseISO } from 'date-fns';
import { Check, X, Eye, ExternalLink, Loader2, AlertCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useVerifyPaymentMutation } from '@/lib/api/apiSlice';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';

interface DirectPaymentVerificationProps {
    pendingPayments: any[];
}

export default function DirectPaymentVerification({ pendingPayments }: DirectPaymentVerificationProps) {
    const [selectedPayment, setSelectedPayment] = useState<any | null>(null);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    const [verificationNotes, setVerificationNotes] = useState('');
    const [verifyPayment, { isLoading: isVerifying }] = useVerifyPaymentMutation();
    const { toast } = useToast();

    const handleVerify = async (status: 'VERIFIED' | 'REJECTED') => {
        if (!selectedPayment) return;

        try {
            const result = await verifyPayment({
                guestId: selectedPayment.guestId,
                paymentId: selectedPayment.id,
                status,
                notes: verificationNotes
            }).unwrap();

            if (result.success) {
                toast({
                    title: status === 'VERIFIED' ? "Payment Verified" : "Payment Rejected",
                    description: `The payment for ${selectedPayment.guestName} has been ${status.toLowerCase()}.`,
                });
                setIsDetailsOpen(false);
                setSelectedPayment(null);
                setVerificationNotes('');
            }
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.data?.error || "Something went wrong. Please try again.",
                variant: "destructive"
            });
        }
    };

    if (pendingPayments.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="bg-primary/10 p-4 rounded-full mb-4">
                    <Check className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-lg font-semibold">All caught up!</h3>
                <p className="text-muted-foreground">No pending payments to verify.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="border rounded-lg overflow-hidden">
                <Table>
                    <TableHeader className="bg-muted/50">
                        <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Guest</TableHead>
                            <TableHead>Property</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>UTR</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {pendingPayments.map((payment) => (
                            <TableRow key={payment.id}>
                                <TableCell className="whitespace-nowrap">
                                    {format(parseISO(payment.date || payment.createdAt || new Date().toISOString()), 'dd MMM, HH:mm')}
                                </TableCell>
                                <TableCell>
                                    <div className="font-medium">{payment.guestName}</div>
                                </TableCell>
                                <TableCell className="text-muted-foreground whitespace-nowrap">
                                    {payment.pgName}
                                </TableCell>
                                <TableCell className="font-semibold text-primary">
                                    {payment.amountType === 'symbolic' ? 'XXX' : `₹${payment.amount.toLocaleString('en-IN')}`}
                                </TableCell>
                                <TableCell className="font-mono text-xs">
                                    {payment.utr || 'N/A'}
                                </TableCell>
                                <TableCell className="text-right">
                                    <Button 
                                        variant="ghost" 
                                        size="sm"
                                        onClick={() => {
                                            setSelectedPayment(payment);
                                            setIsDetailsOpen(true);
                                        }}
                                    >
                                        <Eye className="w-4 h-4 mr-2" />
                                        Review
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
                <DialogContent className="max-w-2xl p-0 flex flex-col max-h-[90dvh]">
                    <DialogHeader className="p-6 pb-2 flex-shrink-0">
                        <DialogTitle>Verify Payment Details</DialogTitle>
                        <DialogDescription>
                            Review the transaction receipt and UTR before approving.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto px-6 py-2">
                        {selectedPayment && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
                                <div className="space-y-4">
                                    <div className="flex justify-between items-start">
                                        <div className="space-y-1">
                                            <p className="text-sm text-muted-foreground uppercase tracking-wider font-semibold">Guest Name</p>
                                            <p className="font-medium">{selectedPayment.guestName}</p>
                                        </div>
                                        <Badge variant={selectedPayment.status === 'CLAIMED_PAID' ? 'default' : 'secondary'} className={selectedPayment.status === 'CLAIMED_PAID' ? 'bg-blue-100 text-blue-800 border-blue-200' : ''}>
                                            {selectedPayment.status === 'CLAIMED_PAID' ? 'Tenant Paid' : selectedPayment.status || 'Pending'}
                                        </Badge>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <p className="text-sm text-muted-foreground uppercase tracking-wider font-semibold">Amount</p>
                                            <p className="text-xl font-bold text-primary">
                                                {selectedPayment.amountType === 'symbolic' ? 'XXX' : `₹${selectedPayment.amount.toLocaleString('en-IN')}`}
                                            </p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-sm text-muted-foreground uppercase tracking-wider font-semibold">For Month</p>
                                            <p className="font-medium">{selectedPayment.month || 'N/A'}</p>
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <p className="text-sm text-muted-foreground uppercase tracking-wider font-semibold">UTR Number</p>
                                        <p className="font-mono bg-muted p-2 rounded text-sm select-all">{selectedPayment.utr || 'Not provided'}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-sm text-muted-foreground uppercase tracking-wider font-semibold">Submission Date</p>
                                        <p>{format(parseISO(selectedPayment.date || selectedPayment.createdAt || new Date().toISOString()), 'do MMMM yyyy, h:mm a')}</p>
                                    </div>
                                    
                                    <div className="pt-2">
                                        <p className="text-sm font-semibold mb-2">Internal Notes (Optional)</p>
                                        <Textarea 
                                            placeholder="Add a reason for rejection or a note for approval..."
                                            value={verificationNotes}
                                            onChange={(e) => setVerificationNotes(e.target.value)}
                                            className="h-20"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <p className="text-sm text-muted-foreground uppercase tracking-wider font-semibold">Screenshot / Receipt</p>
                                    {selectedPayment.screenshotUrl ? (
                                        <div className="relative group rounded-lg overflow-hidden border bg-black/5 aspect-[3/4] flex items-center justify-center">
                                            <img 
                                                src={selectedPayment.screenshotUrl} 
                                                alt="Payment Screenshot" 
                                                className="max-w-full max-h-full object-contain"
                                            />
                                            <a 
                                                href={selectedPayment.screenshotUrl} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="absolute bottom-2 right-2 p-2 bg-white/90 rounded-full text-black opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 shadow-sm text-xs"
                                            >
                                                <ExternalLink className="w-3 h-3" /> Full View
                                            </a>
                                        </div>
                                    ) : (
                                        <div className="aspect-[3/4] rounded-lg border-2 border-dashed flex flex-col items-center justify-center text-muted-foreground bg-muted/20">
                                            <AlertCircle className="w-8 h-8 mb-2 opacity-20" />
                                            <p className="text-xs">No screenshot uploaded</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    <DialogFooter className="p-6 pt-2 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-2 border-t flex-shrink-0">
                        <Button 
                            variant="destructive" 
                            className="w-full sm:w-auto"
                            onClick={() => handleVerify('REJECTED')}
                            disabled={isVerifying}
                        >
                            {isVerifying ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <X className="w-4 h-4 mr-2" />}
                            Reject
                        </Button>
                        <Button 
                            variant="default" 
                            className="bg-green-600 hover:bg-green-700 w-full sm:w-auto"
                            onClick={() => handleVerify('VERIFIED')}
                            disabled={isVerifying}
                        >
                            {isVerifying ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
                            Approve
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
