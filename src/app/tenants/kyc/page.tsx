

'use client'

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { useAppDispatch, useAppSelector } from '@/lib/hooks';
import { updateGuestKyc } from '@/lib/slices/guestsSlice';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Camera, CheckCircle, FileUp, Loader2, RefreshCw, XCircle, FileText } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import SubscriptionDialog from '@/components/dashboard/dialogs/SubscriptionDialog';
import { ShieldAlert } from 'lucide-react';
import type { KycDocumentConfig, SubmittedKycDocument } from '@/lib/types';


const kycStatusMeta = {
    'not-started': { text: 'Not Started', color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200', icon: <></> },
    'pending': { text: 'Pending Review', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800/20 dark:text-yellow-300', icon: <Loader2 className="w-4 h-4 animate-spin" /> },
    'verified': { text: 'Verified', color: 'bg-green-100 text-green-800 dark:bg-green-800/20 dark:text-green-300', icon: <CheckCircle className="w-4 h-4" /> },
    'rejected': { text: 'Rejected', color: 'bg-red-100 text-red-800 dark:bg-red-800/20 dark:text-red-300', icon: <XCircle className="w-4 h-4" /> },
};


export default function KycPage() {
    const dispatch = useAppDispatch();
    const { toast } = useToast();
    const { currentUser, currentPlan } = useAppSelector(state => state.user);
    const { guests } = useAppSelector(state => state.guests);
    const { kycConfigs } = useAppSelector(state => state.kycConfig);
    const guest = guests.find(g => g.id === currentUser?.guestId);

    const [documentUris, setDocumentUris] = useState<Record<string, string>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSubDialogOpen, setIsSubDialogOpen] = useState(false);

    useEffect(() => {
        if (guest?.documents) {
            const initialUris = guest.documents.reduce((acc, doc) => {
                acc[doc.configId] = doc.url;
                return acc;
            }, {} as Record<string, string>);
            setDocumentUris(initialUris);
        }
    }, [guest?.documents]);


    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, configId: string) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                setDocumentUris(prev => ({
                    ...prev,
                    [configId]: event.target?.result as string
                }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async () => {
        const documentsToSubmit: { config: KycDocumentConfig; dataUri: string }[] = [];
        
        for (const config of kycConfigs) {
            if (config.required && !documentUris[config.id]) {
                toast({ variant: 'destructive', title: 'Missing Document', description: `Please upload the required document: ${config.label}.` });
                return;
            }
            if (documentUris[config.id]) {
                documentsToSubmit.push({
                    config: config,
                    dataUri: documentUris[config.id],
                });
            }
        }
        
        if (documentsToSubmit.length === 0) {
            toast({ variant: 'destructive', title: 'No Documents', description: 'Please upload at least one document to submit.' });
            return;
        }

        setIsSubmitting(true);
        try {
            await dispatch(updateGuestKyc({ documents: documentsToSubmit })).unwrap();
            toast({ title: 'KYC Submitted', description: 'Your documents are being processed.' });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Submission Failed', description: error.message || 'Could not submit your documents. Please try again.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!guest) {
        return (
             <div className="space-y-6">
                <Card><CardHeader><Skeleton className="h-8 w-1/3" /></CardHeader><CardContent><Skeleton className="h-12 w-full" /></CardContent></Card>
                <Card><CardHeader><Skeleton className="h-8 w-1/2" /></CardHeader><CardContent className="grid md:grid-cols-2 gap-6"><div className="space-y-2"><Skeleton className="h-5 w-1/4" /><Skeleton className="w-full aspect-video rounded-md" /><Skeleton className="h-10 w-full" /></div><div className="space-y-2"><Skeleton className="h-5 w-1/4" /><Skeleton className="w-full aspect-video rounded-md" /><Skeleton className="h-10 w-32" /></div></CardContent><CardFooter><Skeleton className="h-12 w-full" /></CardFooter></Card>
             </div>
        )
    }
    
    if (currentPlan && !currentPlan.hasKycVerification) {
        return (
            <>
            <SubscriptionDialog open={isSubDialogOpen} onOpenChange={setIsSubDialogOpen}/>
             <Card>
                <CardHeader><CardTitle>KYC Verification</CardTitle></CardHeader>
                <CardContent><div className="flex flex-col items-center justify-center text-center p-8 bg-muted/50 rounded-lg border"><ShieldAlert className="mx-auto h-12 w-12 text-primary" /><h2 className="mt-4 text-xl font-semibold">Feature Not Available</h2><p className="mt-2 text-muted-foreground max-w-sm">Your property owner has not enabled automatic KYC verification. Please contact them for manual verification.</p><Button asChild className="mt-4"><Link href="/tenants/my-pg">Go to Dashboard</Link></Button></div></CardContent>
            </Card>
            </>
        )
    }

    const isVerified = guest.kycStatus === 'verified';
    const isPending = guest.kycStatus === 'pending';
    const isRejected = guest.kycStatus === 'rejected';
    const canSubmit = isRejected || guest.kycStatus === 'not-started';
    const allRequiredSubmitted = kycConfigs.filter(c => c.required).every(c => !!documentUris[c.id]);

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>KYC Verification</CardTitle>
                    <CardDescription>Secure your profile by completing the KYC process.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className={cn("flex items-center gap-2 p-3 rounded-md border", kycStatusMeta[guest.kycStatus].color)}>
                        {kycStatusMeta[guest.kycStatus].icon}
                        <p className="font-semibold">{kycStatusMeta[guest.kycStatus].text}</p>
                    </div>
                    {isRejected && guest.kycRejectReason && (
                        <Alert variant="destructive"><AlertTitle>Reason for Rejection</AlertTitle><AlertDescription>{guest.kycRejectReason}</AlertDescription></Alert>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Your Documents</CardTitle>
                    <CardDescription>Upload the documents required by your property owner.</CardDescription>
                </CardHeader>
                <CardContent className="grid md:grid-cols-2 gap-6">
                    {kycConfigs.length > 0 ? (
                        kycConfigs.map(config => (
                            <div key={config.id} className="space-y-2">
                                <Label htmlFor={`doc-${config.id}`}>{config.label} {config.required && <span className="text-destructive">*</span>}</Label>
                                <div className="w-full aspect-video rounded-md border-2 border-dashed flex items-center justify-center relative bg-muted/40 overflow-hidden">
                                    {documentUris[config.id] && config.type === 'image' ? (
                                        <Image src={documentUris[config.id]} alt="Document Preview" layout="fill" objectFit="contain" />
                                    ) : documentUris[config.id] && config.type === 'pdf' ? (
                                        <div className="flex flex-col items-center gap-2 text-muted-foreground"><FileText className="w-10 h-10"/><span>PDF Uploaded</span></div>
                                    ) : (
                                        <p className="text-muted-foreground text-sm">Upload {config.label}</p>
                                    )}
                                </div>
                                {canSubmit && (
                                    <div className="relative">
                                        <Input id={`doc-${config.id}`} type="file" accept={config.type === 'pdf' ? '.pdf' : 'image/*'} onChange={(e) => handleFileChange(e, config.id)} className="opacity-0 absolute inset-0 w-full h-full cursor-pointer" />
                                        <Button asChild variant="outline" className="w-full pointer-events-none"><span><FileUp className="mr-2 h-4 w-4"/> {documentUris[config.id] ? "Change File" : "Upload File"}</span></Button>
                                    </div>
                                )}
                            </div>
                        ))
                    ) : (
                         <div className="md:col-span-2 text-center py-10 text-muted-foreground border-2 border-dashed rounded-lg">
                            <p className="font-semibold">No Documents Required</p>
                            <p className="text-sm">Your property owner has not configured any document requirements yet.</p>
                        </div>
                    )}
                </CardContent>
                <CardFooter>
                     {canSubmit && kycConfigs.length > 0 && (
                        <Button onClick={handleSubmit} disabled={isSubmitting || !allRequiredSubmitted} className="w-full">
                            {isSubmitting && <Loader2 className="mr-2 animate-spin" />}
                            {isSubmitting ? 'Submitting...' : 'Submit for Verification'}
                        </Button>
                     )}
                     {(isVerified || isPending) && (
                        <Button disabled className="w-full">{isVerified ? 'KYC Already Verified' : 'Submission Under Review'}</Button>
                     )}
                </CardFooter>
            </Card>
        </div>
    );
}
