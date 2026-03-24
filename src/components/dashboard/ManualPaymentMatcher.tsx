'use client'

import { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, MapPin, User, IndianRupee, Loader2, Link as LinkIcon, AlertTriangle, ShieldCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Guest } from '@/lib/types';
import { getBalanceBreakdown } from '@/lib/ledger-utils';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';

interface MatchResult {
    guest: Guest;
    confidence: 'HIGH' | 'MEDIUM' | 'LOW';
    reason: string;
    score: number;
    breakdown: ReturnType<typeof getBalanceBreakdown>;
}

export default function ManualPaymentMatcher({ guests }: { guests: Guest[] }) {
    const { toast } = useToast();
    const router = useRouter();
    const [query, setQuery] = useState('');
    const [isSubmitting, setIsSubmitting] = useState<string | null>(null);

    const matches = useMemo(() => {
        if (!query.trim() || query.length < 2) return [];

        const normalizedQuery = query.toLowerCase().replace(/[^a-z0-9\s-]/g, '');
        const results: MatchResult[] = [];

        for (const guest of guests) {
            const breakdown = getBalanceBreakdown(guest);
            let score = 0;
            let confidence: 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';
            let reason = '';

            const guestAny = guest as any;
            const shortId = (guest.shortId || '').toLowerCase();
            const referenceRegex = new RegExp(`^r${shortId}-`, 'i');
            
            // PRIORITY 1: Exact Reference Match (e.g. R12A-MAR-5000)
            if (shortId && (normalizedQuery === shortId || normalizedQuery.match(referenceRegex) || normalizedQuery.includes(`r${shortId}`))) {
                score = 100;
                confidence = 'HIGH';
                reason = 'Exact Reference Match';
            } 
            // PRIORITY 2: Fuzzy Name / Room Match
            else {
                const nameMatch = guest.name.toLowerCase().includes(normalizedQuery);
                const roomMatch = guestAny.roomName?.toLowerCase().includes(normalizedQuery);
                const isAmountMatch = String(breakdown.total) === normalizedQuery;

                if (nameMatch) {
                    score += 50;
                    reason += 'Name Match. ';
                }
                if (roomMatch) {
                    score += 30;
                    reason += 'Room Match. ';
                }
                if (isAmountMatch && breakdown.total > 0) {
                    score += 40;
                    reason += 'Amount Match. ';
                }

                if (score >= 80) confidence = 'HIGH';
                else if (score >= 50) confidence = 'MEDIUM';
                else if (score > 0) confidence = 'LOW';
            }

            // Exclude extreme low scores
            if (score > 0) {
                results.push({ guest, confidence, reason: reason.trim() || 'Fuzzy Note Matching', score, breakdown });
            }
        }

        return results.sort((a, b) => b.score - a.score);
    }, [query, guests]);

    const handleMarkAsPaid = async (match: MatchResult) => {
        // Prevent double mapping without warning handled directly by backend constraint on UTR mapping
        if (!confirm(`Mark ₹${match.breakdown.total} as paid for ${match.guest.name}?`)) return;

        setIsSubmitting(match.guest.id);
        try {
            const res = await fetch('/api/payments/map-manual', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    guestId: match.guest.id,
                    amount: match.breakdown.total > 0 ? match.breakdown.total : 0,
                    noteOrUtr: query,
                    confidence: match.confidence,
                    ownerId: (match.guest as any).ownerId
                })
            });

            const data = await res.json();
            if (data.success) {
                toast({ title: 'Payment Mapped Successful!', description: `Mapped ${query} to ${match.guest.name}` });
                setQuery('');
                router.refresh();
            } else {
                throw new Error(data.error || 'Failed to map payment.');
            }
        } catch (err: any) {
            toast({ variant: 'destructive', title: 'Action Failed', description: err.message });
        } finally {
            setIsSubmitting(null);
        }
    };

    return (
        <Card className="w-full border-primary/20 shadow-md">
            <CardHeader className="bg-muted/30 pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                    <LinkIcon className="w-5 h-5 text-primary" />
                    Fast Payment Mapper
                </CardTitle>
                <CardDescription>Instantly map messy bank transfers using UTR, Note, Name, or Reference ID</CardDescription>
                <div className="pt-2 relative">
                    <Search className="absolute left-3 top-5 w-5 h-5 text-muted-foreground" />
                    <Input 
                        placeholder="Type UTR, RS-..., Tenant Name, or Amount..." 
                        className="pl-10 h-14 text-lg font-mono rounded-xl bg-white focus:ring-primary/20"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        autoFocus
                    />
                </div>
            </CardHeader>
            {query.length >= 2 && (
                <CardContent className="p-0">
                    {matches.length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground">
                            <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-30" />
                            <p className="font-medium">No strict matches found for "{query}"</p>
                            <p className="text-xs mt-1">Try typing their partial name, room, or amount.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-dashed">
                            {matches.map((m) => (
                                <div key={m.guest.id} className="p-4 flex flex-col md:flex-row items-start md:items-center justify-between hover:bg-muted/10 transition-colors gap-4">
                                    <div className="flex-1 space-y-2">
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-lg">{m.guest.name}</span>
                                            <Badge variant="outline" className="font-mono">{(m.guest as any).roomName || 'No Room'}</Badge>
                                            {m.confidence === 'HIGH' && <Badge className="bg-green-600">High Match</Badge>}
                                            {m.confidence === 'MEDIUM' && <Badge variant="secondary">Partial Match</Badge>}
                                            {m.confidence === 'LOW' && <Badge variant="destructive" className="bg-orange-500">Low Conf</Badge>}
                                        </div>
                                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                            <span className="flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5" /> {m.reason}</span>
                                            {m.guest.shortId && <span className="font-mono text-xs">Ref: R{m.guest.shortId.substring(0,4)}</span>}
                                        </div>
                                    </div>
                                    <div className="text-right flex items-center gap-4 w-full md:w-auto mt-2 md:mt-0">
                                        <div className="flex flex-col text-right flex-1 md:flex-none">
                                            <span className="font-black text-xl flex items-center justify-end text-destructive">
                                                ₹{m.breakdown.total.toLocaleString()}
                                            </span>
                                            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Pending Dues</span>
                                        </div>
                                        <Button 
                                            size="lg"
                                            className="font-bold bg-primary hover:bg-primary/90 rounded-xl"
                                            disabled={isSubmitting === m.guest.id || m.breakdown.total <= 0}
                                            onClick={() => handleMarkAsPaid(m)}
                                        >
                                            {isSubmitting === m.guest.id ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <IndianRupee className="w-4 h-4 mr-2" />}
                                            Mark as Paid
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            )}
        </Card>
    );
}
