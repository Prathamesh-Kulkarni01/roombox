

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
import { Camera, CheckCircle, FileUp, Loader2, RefreshCw, XCircle, FileText, ShieldAlert, Video, VideoOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import SubscriptionDialog from '@/components/dashboard/dialogs/SubscriptionDialog';
import type { KycDocumentConfig, SubmittedKycDocument } from '@/lib/types';
import { ScrollArea } from '@/components/ui/scroll-area';


const kycStatusMeta = {
    'not-started': { text: 'Not Started', color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200 border-gray-300', icon: <FileText className="w-4 h-4" /> },
    'pending': { text: 'Pending Review', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800/20 dark:text-yellow-300 border-yellow-300', icon: <Loader2 className="w-4 h-4 animate-spin" /> },
    'verified': { text: 'Verified', color: 'bg-green-100 text-green-800 dark:bg-green-800/20 dark:text-green-300 border-green-300', icon: <CheckCircle className="w-4 h-4" /> },
    'rejected': { text: 'Rejected', color: 'bg-red-100 text-red-800 dark:bg-red-800/20 dark:text-red-300 border-red-300', icon: <XCircle className="w-4 h-4" /> },
};

export default function KycPage() {
    const dispatch = useAppDispatch();
    const { toast } = useToast();
    const { currentUser } = useAppSelector(state => state.user);
    const { guests } = useAppSelector(state => state.guests);
    const { kycConfigs } = useAppSelector(state => state.kycConfig);
    const guest = guests.find(g => g.id === currentUser?.guestId);

    const [documentUris, setDocumentUris] = useState<Record<string, string>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSubDialogOpen, setIsSubDialogOpen] = useState(false);

    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        if (guest?.documents) {
            const initialUris = guest.documents.reduce((acc, doc) => {
                acc[doc.configId] = doc.url;
                return acc;
            }, {} as Record<string, string>);
            setDocumentUris(initialUris);
        }
    }, [guest?.documents]);

     useEffect(() => {
        const getCameraPermission = async () => {
          if (!isCameraOpen) {
            if (videoRef.current?.srcObject) {
              const stream = videoRef.current.srcObject as MediaStream;
              stream.getTracks().forEach(track => track.stop());
            }
            return;
          }
          try {
            const stream = await navigator.mediaDevices.getUserMedia({video: true});
            setHasCameraPermission(true);

            if (videoRef.current) {
              videoRef.current.srcObject = stream;
            }
          } catch (error) {
            console.error('Error accessing camera:', error);
            setHasCameraPermission(false);
            toast({
              variant: 'destructive',
              title: 'Camera Access Denied',
              description: 'Please enable camera permissions in your browser settings.',
            });
          }
        };
        getCameraPermission();

        return () => {
             if (videoRef.current?.srcObject) {
              const stream = videoRef.current.srcObject as MediaStream;
              stream.getTracks().forEach(track => track.stop());
            }
        }
    }, [isCameraOpen, toast]);


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
    
    const handleCapturePhoto = () => {
        if (videoRef.current) {
            const canvas = document.createElement('canvas');
            canvas.width = videoRef.current.videoWidth;
            canvas.height = videoRef.current.videoHeight;
            canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0);
            const dataUri = canvas.toDataURL('image/jpeg');
            const photoConfig = kycConfigs.find(c => c.label.toLowerCase().includes('photo') || c.label.toLowerCase().includes('selfie'));
            if(photoConfig) {
                setDocumentUris(prev => ({...prev, [photoConfig.id]: dataUri }));
            }
            setIsCameraOpen(false);
        }
    };


    const handleSubmit = async () => {
        const documentsToSubmit: { config: KycDocumentConfig; dataUri: string }[] = [];
        
        for (const config of kycConfigs) {
            if (config.required && !documentUris[config.id]) {
                toast({ variant: 'destructive', title: 'Missing Document', description: `Please upload the required document: ${config.label}.` });
                return;
            }
            if (documentUris[config.id] && !documentUris[config.id].startsWith('http')) {
                documentsToSubmit.push({
                    config: config,
                    dataUri: documentUris[config.id],
                });
            }
        }
        
        if (documentsToSubmit.length === 0) {
            toast({ variant: 'destructive', title: 'No New Documents', description: 'Please upload at least one new document to submit.' });
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
    
    const isVerified = guest.kycStatus === 'verified';
    const isPending = guest.kycStatus === 'pending';
    const isRejected = guest.kycStatus === 'rejected';
    const canSubmit = isRejected || guest.kycStatus === 'not-started';
    const allRequiredSubmitted = kycConfigs.filter(c => c.required).every(c => !!documentUris[c.id]);

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                <div className="lg:col-span-1 lg:sticky top-20">
                    <Card>
                        <CardHeader>
                            <CardTitle>KYC Verification</CardTitle>
                            <CardDescription>Secure your profile by completing the KYC process.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className={cn("flex items-center gap-3 p-3 rounded-lg border", kycStatusMeta[guest.kycStatus].color)}>
                                {kycStatusMeta[guest.kycStatus].icon}
                                <p className="font-semibold">{kycStatusMeta[guest.kycStatus].text}</p>
                            </div>
                            {isRejected && guest.kycRejectReason && (
                                <Alert variant="destructive"><AlertTitle>Reason for Rejection</AlertTitle><AlertDescription>{guest.kycRejectReason}</AlertDescription></Alert>
                            )}
                        </CardContent>
                    </Card>
                </div>

                <div className="lg:col-span-2">
                    <Card>
                        <CardHeader>
                            <CardTitle>Your Documents</CardTitle>
                            <CardDescription>Upload the documents required by your property owner.</CardDescription>
                        </CardHeader>
                         <CardContent>
                            <ScrollArea className="h-[calc(100vh-22rem)] md:h-auto -mr-6 pr-6">
                                <div className="space-y-6">
                                    {kycConfigs.length > 0 ? (
                                        kycConfigs.map(config => {
                                            const isPhotoUpload = config.label.toLowerCase().includes('photo') || config.label.toLowerCase().includes('selfie');
                                            const fileUrl = documentUris[config.id];
                                            const isPdf = fileUrl?.startsWith('data:application/pdf') || fileUrl?.endsWith('.pdf');
                                            return (
                                            <div key={config.id} className="space-y-2">
                                                <Label htmlFor={`doc-${config.id}`}>{config.label} {config.required && <span className="text-destructive">*</span>}</Label>
                                                <div className="w-full aspect-video rounded-md border-2 border-dashed flex items-center justify-center relative bg-muted/40 overflow-hidden">
                                                    {isCameraOpen && isPhotoUpload ? (
                                                        <div className="w-full h-full flex flex-col items-center justify-center">
                                                            <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted playsInline/>
                                                            {hasCameraPermission === false && <p className="text-destructive text-sm p-2">Camera access denied.</p>}
                                                        </div>
                                                    ) : fileUrl ? (
                                                        isPdf ? (
                                                            <div className="flex flex-col items-center gap-2 text-muted-foreground"><FileText className="w-10 h-10"/><span className="text-xs px-2 truncate max-w-full">{config.label}</span></div>
                                                        ) : (
                                                            <Image src={fileUrl} alt="Document Preview" layout="fill" objectFit="contain" />
                                                        )
                                                    ) : (
                                                        <p className="text-muted-foreground text-sm">Upload {config.label}</p>
                                                    )}
                                                </div>
                                                {canSubmit && (
                                                    <div className="flex gap-2">
                                                        <div className="relative flex-1">
                                                            <Input id={`doc-${config.id}`} type="file" accept={config.type === 'pdf' ? '.pdf' : 'image/*'} onChange={(e) => handleFileChange(e, config.id)} className="opacity-0 absolute inset-0 w-full h-full cursor-pointer" />
                                                            <Button asChild variant="outline" className="w-full pointer-events-none"><span><FileUp className="mr-2 h-4 w-4"/> {documentUris[config.id] ? "Change" : "Upload"}</span></Button>
                                                        </div>
                                                        {isPhotoUpload && (
                                                            <Button type="button" variant="secondary" onClick={() => isCameraOpen ? handleCapturePhoto() : setIsCameraOpen(true)}>
                                                                {isCameraOpen ? <CheckCircle className="mr-2 h-4 w-4"/> : <Camera className="mr-2 h-4 w-4"/>}
                                                                {isCameraOpen ? 'Capture' : 'Use Camera'}
                                                            </Button>
                                                        )}
                                                        {isCameraOpen && isPhotoUpload && <Button type="button" variant="ghost" size="icon" onClick={()=> setIsCameraOpen(false)}><XCircle className="w-4 h-4"/></Button>}
                                                    </div>
                                                )}
                                            </div>
                                        )})
                                    ) : (
                                        <div className="md:col-span-2 text-center py-10 text-muted-foreground border-2 border-dashed rounded-lg">
                                            <p className="font-semibold">No Documents Required</p>
                                            <p className="text-sm">Your property owner has not configured any document requirements yet.</p>
                                        </div>
                                    )}
                                </div>
                            </ScrollArea>
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
            </div>
        </div>
    );
}
