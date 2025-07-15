
'use client'

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { useAppDispatch, useAppSelector } from '@/lib/hooks';
import { updateGuestKyc } from '@/lib/slices/guestsSlice';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Camera, CheckCircle, FileUp, Loader2, RefreshCw, XCircle } from 'lucide-react';
import Link from 'next/link';

const kycStatusMeta = {
    'not-started': { text: 'Not Started', color: 'bg-gray-100 text-gray-800', icon: <></> },
    'pending': { text: 'Pending Review', color: 'bg-yellow-100 text-yellow-800', icon: <Loader2 className="w-4 h-4 animate-spin" /> },
    'verified': { text: 'Verified', color: 'bg-green-100 text-green-800', icon: <CheckCircle className="w-4 h-4" /> },
    'rejected': { text: 'Rejected', color: 'bg-red-100 text-red-800', icon: <XCircle className="w-4 h-4" /> },
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
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        if (guest) {
            setAadhaarUri(guest.aadhaarDataUri || null);
            setPhotoUri(guest.photoDataUri || null);
        }
    }, [guest]);

    useEffect(() => {
        const enableCamera = async () => {
            if (showCamera) {
                try {
                    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                    if (videoRef.current) {
                        videoRef.current.srcObject = stream;
                    }
                } catch (err) {
                    toast({ variant: 'destructive', title: 'Camera Error', description: 'Could not access camera. Please check permissions.' });
                    setShowCamera(false);
                }
            } else {
                if (videoRef.current?.srcObject) {
                    (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
                }
            }
        };
        enableCamera();
        return () => {
            if (videoRef.current?.srcObject) {
                (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
            }
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
            <Card>
                <CardHeader>
                    <CardTitle>KYC Verification</CardTitle>
                </CardHeader>
                <CardContent>
                    <Alert>
                        <AlertTitle>Feature Not Available</AlertTitle>
                        <AlertDescription>
                            This feature is not enabled by your property owner. Please contact them for manual KYC verification.
                             <br/><br/>
                             <Button asChild><Link href="/tenants/my-pg">Go to Dashboard</Link></Button>
                        </AlertDescription>
                    </Alert>
                </CardContent>
            </Card>
        )
    }

    const isVerified = guest.kycStatus === 'verified';
    const isRejected = guest.kycStatus === 'rejected';

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>KYC Verification</CardTitle>
                    <CardDescription>Secure your profile by completing the KYC process.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center gap-2 p-3 rounded-md border" style={{ backgroundColor: kycStatusMeta[guest.kycStatus].color }}>
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
                        <Label htmlFor="aadhaar-upload">1. ID Proof (Aadhaar/PAN)</Label>
                        <div className="w-full aspect-video rounded-md border-2 border-dashed flex items-center justify-center relative bg-muted/40 overflow-hidden">
                            {aadhaarUri ? <Image src={aadhaarUri} alt="ID Preview" layout="fill" objectFit="contain" /> : <p className="text-muted-foreground text-sm">Upload your ID</p>}
                        </div>
                        <Input id="aadhaar-upload" type="file" accept="image/*" onChange={(e) => handleFileChange(e, setAadhaarUri)} disabled={isVerified || isSubmitting} />
                    </div>
                    <div className="space-y-2">
                        <Label>2. Live Photo</Label>
                        <div className="w-full aspect-video rounded-md border-2 border-dashed flex items-center justify-center relative bg-muted/40 overflow-hidden">
                            {showCamera ? (
                                <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                            ) : photoUri ? (
                                <Image src={photoUri} alt="Selfie Preview" layout="fill" objectFit="contain" />
                            ) : <p className="text-muted-foreground text-sm">Take a live photo</p>}
                        </div>
                        {showCamera ? (
                            <div className="flex gap-2">
                                <Button onClick={handleCapture} className="w-full"><Camera className="mr-2"/> Capture</Button>
                                <Button variant="secondary" onClick={() => setShowCamera(false)}>Cancel</Button>
                            </div>
                        ) : (
                            <Button onClick={() => setShowCamera(true)} disabled={isVerified || isSubmitting}>
                                {photoUri ? <RefreshCw className="mr-2"/> : <Camera className="mr-2"/>}
                                {photoUri ? 'Retake Photo' : 'Open Camera'}
                            </Button>
                        )}
                    </div>
                </CardContent>
                <CardFooter>
                    <Button onClick={handleSubmit} disabled={isVerified || isSubmitting || !aadhaarUri || !photoUri} className="w-full">
                        {isSubmitting && <Loader2 className="mr-2 animate-spin" />}
                        {isVerified ? 'KYC Verified' : isSubmitting ? 'Submitting...' : 'Submit for Verification'}
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
