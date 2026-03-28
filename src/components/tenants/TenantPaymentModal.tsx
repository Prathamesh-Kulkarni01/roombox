
'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { IndianRupee, AlertCircle, Loader2, Copy, Check, Smartphone, Upload, X, ImageIcon } from "lucide-react"
import { format } from 'date-fns'
import { auth } from '@/lib/firebase'
import { generateRentSutraNote } from '@/lib/upi'
import { useToast } from "@/hooks/use-toast"
import type { PG, Guest } from "@/lib/types"

interface TenantPaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentPg: PG;
    currentGuest: Guest;
    totalDue: number;
    onConfirmManual: (utr: string, screenshotUrl?: string) => Promise<void>;
}

export default function TenantPaymentModal({ 
    isOpen, 
    onClose, 
    currentPg, 
    currentGuest, 
    totalDue,
    onConfirmManual 
}: TenantPaymentModalProps) {
    const { toast } = useToast();
    const [utr, setUtr] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isGeneratingLink, setIsGeneratingLink] = useState(false);
    const [copied, setCopied] = useState(false);
    const [noteCopied, setNoteCopied] = useState(false);
    const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
    const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);

    const hasOnlineDetails = !!currentPg.upiId || !!currentPg.qrCodeImage;
    const isManualOnly = !hasOnlineDetails;

    const handleUpiClick = async () => {
        setIsGeneratingLink(true);
        try {
            const token = await auth?.currentUser?.getIdToken();
            const res = await fetch('/api/payments/intent', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                },
                body: JSON.stringify({ 
                    guestId: currentGuest.id, 
                    amount: totalDue, 
                    month: format(new Date(), 'MMM').toUpperCase(),
                    pgId: currentPg.id,
                    ownerId: currentPg.ownerId
                }),
            });
            const data = await res.json();
            if (data.success && data.upiLink) {
                window.location.href = data.upiLink;
            } else {
                toast({ variant: 'destructive', title: 'Error', description: data.error || 'Failed to generate payment link.' });
            }
        } catch (err) {
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to connect to payment server.' });
        } finally {
            setIsGeneratingLink(false);
        }
    };

    const handleCopyUpi = () => {
        if (!currentPg.upiId) return;
        navigator.clipboard.writeText(currentPg.upiId);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };
    
    const handleScreenshotChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                toast({ variant: 'destructive', title: 'File too large', description: 'Please upload an image smaller than 5MB.' });
                return;
            }
            setScreenshotFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setScreenshotPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const uploadScreenshot = async (): Promise<string | undefined> => {
        if (!screenshotPreview) return undefined;
        
        setIsUploading(true);
        try {
            const token = await auth?.currentUser?.getIdToken();
            const response = await fetch('/api/upload', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    dataUri: screenshotPreview,
                    folder: 'payment-receipts',
                }),
            });

            if (!response.ok) throw new Error('Upload failed');
            const data = await response.json();
            return data.url;
        } catch (error) {
            toast({ variant: 'destructive', title: 'Upload Error', description: 'Failed to upload screenshot. Please try again.' });
            return undefined;
        } finally {
            setIsUploading(false);
        }
    };

    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            let screenshotUrl;
            if (screenshotFile) {
                screenshotUrl = await uploadScreenshot();
                if (!screenshotUrl) {
                    setIsSubmitting(false);
                    return;
                }
            }
            await onConfirmManual(utr, screenshotUrl);
            setUtr('');
            setScreenshotFile(null);
            setScreenshotPreview(null);
            onClose();
        } catch (error) {
            console.error('Error confirming payment:', error);
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
                            {/* Pay via UPI App Button */}
                            <Button 
                                onClick={handleUpiClick}
                                disabled={isGeneratingLink}
                                className="w-full h-14 rounded-2xl bg-primary hover:opacity-90 text-primary-foreground font-bold flex items-center justify-center gap-3 shadow-lg transition-all active:scale-95"
                            >
                                {isGeneratingLink ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <Smartphone className="w-5 h-5" />
                                )}
                                <div className="flex flex-col items-start leading-none">
                                    <span className="text-sm">Pay via UPI App</span>
                                    <span className="text-[10px] opacity-70 font-normal">Instant & Verified</span>
                                </div>
                            </Button>

                            <div className="flex items-center gap-4 w-full px-2 py-2">
                                <div className="h-px bg-border flex-1" />
                                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">OR SCAN / COPY</span>
                                <div className="h-px bg-border flex-1" />
                            </div>

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

                            {/* Verification Note (IMPORTANT FOR OWNER TRACKING) */}
                            <div className="w-full space-y-2 p-4 bg-primary/5 rounded-2xl border border-primary/10">
                                <label className="text-[10px] font-bold text-primary flex items-center gap-2 uppercase tracking-wider">
                                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                                    Payment Note (Paste in app)
                                </label>
                                <div className="flex items-center justify-between gap-3">
                                    <span className="font-mono text-xs font-black tracking-tight text-foreground/80 truncate">
                                        {generateRentSutraNote(
                                            currentGuest.shortId || 'NEW',
                                            totalDue,
                                            format(new Date(), 'MMM').toUpperCase()
                                        )}
                                    </span>
                                    <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        className="h-8 px-2 text-[10px] font-bold gap-1 rounded-lg hover:bg-white"
                                        onClick={() => {
                                            const note = generateRentSutraNote(
                                                currentGuest.shortId || 'NEW',
                                                totalDue,
                                                format(new Date(), 'MMM').toUpperCase()
                                            );
                                            navigator.clipboard.writeText(note);
                                            setNoteCopied(true);
                                            setTimeout(() => setNoteCopied(false), 2000);
                                        }}
                                    >
                                        {noteCopied ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3" />}
                                        {noteCopied ? 'Done!' : 'Copy'}
                                    </Button>
                                </div>
                                <p className="text-[10px] text-muted-foreground leading-tight italic">Paste this in your payment app note for instant verification.</p>
                            </div>

                            <div className="w-full space-y-3 pt-6 border-t border-dashed">
                                <label className="text-sm font-black tracking-tight">Transaction UTR / Ref Number (Optional)</label>
                                <Input 
                                    placeholder="Enter 12-digit UTR from your app" 
                                    value={utr} 
                                    onChange={(e) => setUtr(e.target.value)}
                                    className="h-14 rounded-2xl font-mono text-center text-lg tracking-widest bg-muted/30 border-primary/5 focus:ring-green-500/20"
                                />
                                <p className="text-[10px] text-muted-foreground text-center font-medium">
                                    Optionally submit this after paying to notify your owner for verification faster.
                                </p>
                            </div>

                            {/* Screenshot Upload Section */}
                            <div className="w-full space-y-3 pt-6 border-t border-dashed">
                                <label className="text-sm font-black tracking-tight flex items-center gap-2">
                                    Payment Screenshot (Optional)
                                    <span className="text-[10px] uppercase bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Recommended</span>
                                </label>
                                
                                {!screenshotPreview ? (
                                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-primary/20 rounded-2xl bg-primary/5 hover:bg-primary/10 cursor-pointer transition-all group">
                                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                            <Upload className="w-8 h-8 text-primary/40 group-hover:text-primary/60 mb-2 transition-colors" />
                                            <p className="text-xs font-bold text-primary/60">Tap to upload receipt</p>
                                            <p className="text-[10px] text-muted-foreground mt-1">PNG, JPG up to 5MB</p>
                                        </div>
                                        <input type="file" className="hidden" accept="image/*" onChange={handleScreenshotChange} />
                                    </label>
                                ) : (
                                    <div className="relative rounded-2xl overflow-hidden border-2 border-primary/20 bg-muted/30 aspect-video group">
                                        <img src={screenshotPreview} alt="Receipt Preview" className="w-full h-full object-contain" />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                                            <Button 
                                                variant="destructive" 
                                                size="sm" 
                                                className="h-9 rounded-xl font-bold"
                                                onClick={() => {
                                                    setScreenshotFile(null);
                                                    setScreenshotPreview(null);
                                                }}
                                            >
                                                <X className="w-4 h-4 mr-2" />
                                                Remove
                                            </Button>
                                            <label className="h-9 px-4 inline-flex items-center justify-center rounded-xl bg-white text-black text-sm font-bold cursor-pointer hover:bg-white/90">
                                                <ImageIcon className="w-4 h-4 mr-2" />
                                                Change
                                                <input type="file" className="hidden" accept="image/*" onChange={handleScreenshotChange} />
                                            </label>
                                        </div>
                                    </div>
                                )}
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
                            disabled={isSubmitting || isUploading}
                            onClick={handleSubmit}
                        >
                            {(isSubmitting || isUploading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {isUploading ? 'Uploading Screenshot...' : 'Notify Owner of Payment'}
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
