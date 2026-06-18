'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Printer, Share2, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ClientReceiptActionsProps {
    id: string;
    pgName: string;
    amount: string;
}

export default function ClientReceiptActions({ id, pgName, amount }: ClientReceiptActionsProps) {
    const { toast } = useToast();
    const [copied, setCopied] = useState(false);

    const handlePrint = () => {
        window.print();
    };

    const handleShare = async () => {
        const shareData = {
            title: `Rent Receipt - ${pgName}`,
            text: `Here is the digital rent receipt of ${amount} for stay at ${pgName}. Receipt ID: ${id}`,
            url: window.location.href,
        };

        if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
            try {
                await navigator.share(shareData);
                toast({ title: 'Shared successfully!' });
            } catch (e) {
                console.warn('Share cancelled or failed', e);
            }
        } else {
            // Fallback: Copy link
            try {
                await navigator.clipboard.writeText(window.location.href);
                setCopied(true);
                toast({
                    title: 'Link Copied!',
                    description: 'Receipt link copied to clipboard. You can now share it manually.',
                });
                setTimeout(() => setCopied(false), 2000);
            } catch (err) {
                toast({
                    variant: 'destructive',
                    title: 'Copy Failed',
                    description: 'Could not copy link to clipboard.',
                });
            }
        }
    };

    return (
        <div className="bg-slate-50 dark:bg-slate-900/30 border-t border-slate-100 dark:border-slate-900 p-6 flex flex-col sm:flex-row gap-3 print:hidden">
            <Button 
                onClick={handlePrint} 
                variant="outline" 
                className="flex-1 bg-white dark:bg-slate-950 border-slate-200 hover:bg-slate-100 dark:border-slate-800 dark:hover:bg-slate-900 font-semibold"
            >
                <Printer className="w-4 h-4 mr-2" />
                Print / Download PDF
            </Button>
            <Button 
                onClick={handleShare} 
                className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
            >
                {copied ? (
                    <>
                        <Check className="w-4 h-4 mr-2 text-emerald-400" />
                        Copied Link
                    </>
                ) : (
                    <>
                        <Share2 className="w-4 h-4 mr-2" />
                        Share Receipt
                    </>
                )}
            </Button>
        </div>
    );
}
