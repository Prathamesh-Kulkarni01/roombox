
'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { IndianRupee, AlertCircle, Loader2, Copy, Check } from "lucide-react"
import type { PG, Guest } from "@/lib/types"

interface TenantPaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentPg: PG;
    currentGuest: Guest;
    totalDue: number;
    onConfirmManual: (utr: string) => Promise<void>;
}

export default function TenantPaymentModal({ 
    isOpen, 
    onClose, 
    currentPg, 
    currentGuest, 
    totalDue,
    onConfirmManual 
}: TenantPaymentModalProps) {
    const [utr, setUtr] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [copied, setCopied] = useState(false);

    const hasOnlineDetails = !!currentPg.upiId || !!currentPg.qrCodeImage;
    const isManualOnly = !hasOnlineDetails;
    const isUplandUpi = hasOnlineDetails;

    const handleCopyUpi = () => {
        if (!currentPg.upiId) return;
        navigator.clipboard.writeText(currentPg.upiId);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleSubmit = async () => {
        if (!utr) return;
        setIsSubmitting(true);
        try {
            await onConfirmManual(utr);
            setUtr('');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md p-0 overflow-hidden flex flex-col max-h-[90vh]">
                <DialogHeader className="p-6 pb-2">
                    <DialogTitle className="flex items-center gap-2 text-xl">
                        <IndianRupee className="w-5 h-5 text-green-600" />
                        Pay Rent - ₹{totalDue.toLocaleString('en-IN')}
                    </DialogTitle>
                    <DialogDescription>
                        {isManualOnly ? 'Offline payment details for your PG.' : 'Pay using QR or UPI ID below.'}
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto p-6 pt-2 space-y-6">
                    {isManualOnly ? (
                        <div className="bg-muted/50 p-6 rounded-2xl text-center border-2 border-dashed border-muted-foreground/20">
                            <AlertCircle className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-30" />
                            <h3 className="font-bold text-lg mb-1">Offline Payment Only</h3>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                                Online payments are not configured by your host. 
                                <br />Please <span className="font-bold text-foreground">Contact your PG owner</span> to pay via Cash or Transfer.
                            </p>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center gap-6">
                            {/* QR Code - Only show if image exists */}
                            {currentPg.qrCodeImage && (
                                <div className="bg-white p-4 rounded-3xl border-2 border-primary/5 shadow-xl w-full max-w-[240px] aspect-square flex items-center justify-center">
                                    <img src={currentPg.qrCodeImage} alt="UPI QR" className="w-full h-full object-contain" />
                                </div>
                            )}

                            {/* UPI ID */}
                            <div className="w-full space-y-2">
                                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1">UPI Address</label>
                                <div className="group relative">
                                    <div className="w-full font-mono text-sm font-bold bg-muted/50 p-4 rounded-2xl border border-primary/10 break-all pr-12 flex items-center min-h-[56px]">
                                        {currentPg.upiId || 'Not set'}
                                    </div>
                                    {currentPg.upiId && (
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-xl hover:bg-white shadow-sm"
                                            onClick={handleCopyUpi}
                                        >
                                            {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4 text-primary/40" />}
                                        </Button>
                                    )}
                                </div>
                                {currentPg.payeeName && (
                                    <p className="text-[10px] text-muted-foreground font-medium ml-1">Registered to: <span className="text-foreground font-bold">{currentPg.payeeName}</span></p>
                                )}
                            </div>

                            {/* UTR Input */}
                            <div className="w-full space-y-3 pt-6 border-t border-dashed">
                                <label className="text-sm font-black tracking-tight">Transaction UTR / Ref Number</label>
                                <Input 
                                    placeholder="Enter 12-digit UTR from your app" 
                                    value={utr} 
                                    onChange={(e) => setUtr(e.target.value)}
                                    className="h-14 rounded-2xl font-mono text-center text-lg tracking-widest bg-muted/30 border-primary/5 focus:ring-green-500/20"
                                />
                                <p className="text-[10px] text-muted-foreground text-center font-medium">
                                    Submit this after paying to notify your owner for verification.
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter className="p-6 pt-2 flex-col sm:flex-row gap-3 border-t bg-muted/5">
                    <DialogClose asChild>
                        <Button variant="outline" className="h-12 rounded-2xl font-bold uppercase tracking-widest text-xs flex-1">Close</Button>
                    </DialogClose>
                    {!isManualOnly && (
                        <Button 
                            className="h-12 rounded-2xl font-bold uppercase tracking-widest text-xs flex-[2] bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-600/20" 
                            disabled={!utr || isSubmitting}
                            onClick={handleSubmit}
                        >
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Confirm Payment
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
