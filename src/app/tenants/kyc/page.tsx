

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
import { Camera, CheckCircle, FileUp, Loader2, RefreshCw, XCircle } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import SubscriptionDialog from '@/components/dashboard/dialogs/SubscriptionDialog';
import { ShieldAlert } from 'lucide-react';

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
    const guest = guests.find(g => g.id === currentUser?.guestId);

    const [aadhaarUri, setAadhaarUri] = useState<string | null>(null);
    const [photoUri, setPhotoUri] = useState<string | null>(null);
    const [showCamera, setShowCamera] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [hasCameraPermission, setHasCameraPermission] = useState(true);
    const [isSubDialogOpen, setIsSubDialogOpen] = useState(false);

    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        let stream: MediaStream;
        const enableCamera = async () => {
            if (showCamera) {
                try {
                    stream = await navigator.mediaDevices.getUserMedia({ video: true });
                    if (videoRef.current) {
                        videoRef.current.srcObject = stream;
                    }
                    setHasCameraPermission(true);
                } catch (err) {
                    toast({ variant: 'destructive', title: 'Camera Error', description: 'Could not access camera. Please check permissions.' });
                    setHasCameraPermission(false);
                    setShowCamera(false);
                }
            }
        };
        enableCamera();

        return () => {
            stream?.getTracks().forEach(track => track.stop());
        };
    }, [showCamera, toast]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, setter: (uri: string) => void) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => setter(event.target?.result as string);
            reader.readAsDataURL(file);
        }
    };

    const handleCapture = () => {
        const video = videoRef.current;
        if (video) {
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height);
            setPhotoUri(canvas.toDataURL('image/jpeg'));
            setShowCamera(false);
        }
    };

    const handleSubmit = async () => {
        if (!aadhaarUri || !photoUri) {
            toast({ variant: 'destructive', title: 'Missing Documents', description: 'Please provide both an ID proof and a live photo.' });
            return;
        }
        setIsSubmitting(true);
        try {
            await dispatch(updateGuestKyc({ aadhaarDataUri: aadhaarUri, photoDataUri: photoUri })).unwrap();
            toast({ title: 'KYC Submitted', description: 'Your documents are being processed.' });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Submission Failed', description: 'Could not submit your documents. Please try again.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!guest) {
        return (
             <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <Skeleton className="h-8 w-1/3" />
                        <Skeleton className="h-4 w-2/3" />
                    </CardHeader>
                    <CardContent>
                        <Skeleton className="h-12 w-full" />
                    </CardContent>
                </Card>
                <Card>
                     <CardHeader>
                        <Skeleton className="h-8 w-1/2" />
                        <Skeleton className="h-4 w-3/4" />
                    </CardHeader>
                    <CardContent className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Skeleton className="h-5 w-1/4" />
                            <Skeleton className="w-full aspect-video rounded-md" />
                            <Skeleton className="h-10 w-full" />
                        </div>
                        <div className="space-y-2">
                             <Skeleton className="h-5 w-1/4" />
                            <Skeleton className="w-full aspect-video rounded-md" />
                            <Skeleton className="h-10 w-32" />
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Skeleton className="h-12 w-full" />
                    </CardFooter>
                </Card>
             </div>
        )
    }
    
    if (currentPlan && !currentPlan.hasKycVerification) {
        return (
            <>
            <SubscriptionDialog open={isSubDialogOpen} onOpenChange={setIsSubDialogOpen}/>
             <Card>
                <CardHeader>
                    <CardTitle>KYC Verification</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col items-center justify-center text-center p-8 bg-muted/50 rounded-lg border">
                        <ShieldAlert className="mx-auto h-12 w-12 text-primary" />
                        <h2 className="mt-4 text-xl font-semibold">Feature Not Available</h2>
                        <p className="mt-2 text-muted-foreground max-w-sm">
                            Your property owner has not enabled automatic KYC verification. Please contact them for manual verification.
                        </p>
                        <Button asChild className="mt-4">
                           <Link href="/tenants/my-pg">Go to Dashboard</Link>
                        </Button>
                    </div>
                </CardContent>
            </Card>
            </>
        )
    }

    const isVerified = guest.kycStatus === 'verified';
    const isPending = guest.kycStatus === 'pending';
    const isRejected = guest.kycStatus === 'rejected';
    const canSubmit = isRejected || guest.kycStatus === 'not-started';

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
                        <Alert variant="destructive">
                            <AlertTitle>Reason for Rejection</AlertTitle>
                            <AlertDescription>{guest.kycRejectReason}</AlertDescription>
                        </Alert>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Your Documents</CardTitle>
                    <CardDescription>Upload your ID and a live photo to get verified.</CardDescription>
                </CardHeader>
                <CardContent className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label htmlFor="aadhaar-upload">1. ID Proof (Aadhaar/PAN/PDF)</Label>
                        <div className="w-full aspect-video rounded-md border-2 border-dashed flex items-center justify-center relative bg-muted/40 overflow-hidden">
                            {aadhaarUri ? <Image src={aadhaarUri} alt="ID Preview" layout="fill" objectFit="contain" /> : <p className="text-muted-foreground text-sm">Upload your ID</p>}
                        </div>
                        {canSubmit && (
                            <div className="relative">
                                <Input id="aadhaar-upload" type="file" accept="image/*,application/pdf" onChange={(e) => handleFileChange(e, setAadhaarUri)} className="opacity-0 absolute inset-0 w-full h-full cursor-pointer" />
                                <Button asChild variant="outline" className="w-full pointer-events-none">
                                    <span><FileUp className="mr-2 h-4 w-4"/> {aadhaarUri ? "Change ID Proof" : "Upload ID Proof"}</span>
                                </Button>
                            </div>
                        )}
                    </div>
                    <div className="space-y-2">
                        <Label>2. Live Photo</Label>
                        <div className="w-full aspect-video rounded-md border-2 border-dashed flex items-center justify-center relative bg-muted/40 overflow-hidden">
                             <video ref={videoRef} autoPlay playsInline className={cn("w-full h-full object-cover", !showCamera && "hidden")} />
                             {!showCamera && photoUri && (
                                <Image src={photoUri} alt="Selfie Preview" layout="fill" objectFit="contain" />
                             )}
                              {!showCamera && !photoUri && (
                                <p className="text-muted-foreground text-sm">Take a live photo</p>
                              )}
                        </div>
                        {showCamera ? (
                            <div className="flex gap-2">
                                <Button onClick={handleCapture} className="w-full"><Camera className="mr-2"/> Capture</Button>
                                <Button variant="secondary" onClick={() => setShowCamera(false)}>Cancel</Button>
                            </div>
                        ) : (
                            canSubmit && (
                                <Button onClick={() => setShowCamera(true)}>
                                    {photoUri ? <RefreshCw className="mr-2"/> : <Camera className="mr-2"/>}
                                    {photoUri ? 'Retake Photo' : 'Open Camera'}
                                </Button>
                            )
                        )}
                         {!hasCameraPermission && (
                            <Alert variant="destructive">
                                <AlertTitle>Camera Access Required</AlertTitle>
                                <AlertDescription>Please allow camera access in your browser settings to use this feature.</AlertDescription>
                            </Alert>
                         )}
                    </div>
                </CardContent>
                <CardFooter>
                     {canSubmit && (
                        <Button onClick={handleSubmit} disabled={isSubmitting || !aadhaarUri || !photoUri} className="w-full">
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
