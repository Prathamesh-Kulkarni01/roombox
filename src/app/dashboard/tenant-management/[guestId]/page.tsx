

'use client'

import React, { useState, useMemo, useEffect, useRef } from "react"
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { produce } from "immer"
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import jsPDF from 'jspdf';


import { useAppDispatch, useAppSelector } from "@/lib/hooks"
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose, DialogTrigger } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import EditGuestDialog from '@/components/dashboard/dialogs/EditGuestDialog'

import type { Guest, Complaint, AdditionalCharge, KycDocumentConfig, SubmittedKycDocument, Payment } from "@/lib/types"
import { ArrowLeft, User, IndianRupee, MessageCircle, ShieldCheck, Clock, Wallet, Home, LogOut, Copy, Calendar, Phone, Mail, Building, BedDouble, Trash2, PlusCircle, FileText, History, Pencil, Loader2, FileUp, ExternalLink, Printer, CheckCircle, XCircle, RefreshCcw } from "lucide-react"
import { format, addMonths, differenceInDays, parseISO, isAfter, differenceInMonths, isSameDay } from "date-fns"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { updateGuest as updateGuestAction, addAdditionalCharge as addChargeAction, removeAdditionalCharge as removeChargeAction, reconcileRentCycle, updateGuestKycFromOwner, updateGuestKycStatus, resetGuestKyc } from "@/lib/slices/guestsSlice"
import { useDashboard } from '@/hooks/use-dashboard'
import { canAccess } from "@/lib/permissions"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog"
import { Label } from "@/components/ui/label"
import { getDoc, doc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import Access from '@/components/ui/PermissionWrapper';
import { ScrollArea } from "@/components/ui/scroll-area"
import PaymentDialog from "@/components/dashboard/dialogs/PaymentDialog"


const chargeSchema = z.object({
  description: z.string().min(3, "Description is required."),
  amount: z.coerce.number().min(1, "Amount must be greater than 0."),
});

const rentStatusColors: Record<Guest['rentStatus'], string> = {
  paid: 'bg-green-100 text-green-800 border-green-300',
  unpaid: 'bg-red-100 text-red-800 border-red-300',
  partial: 'bg-orange-100 text-orange-800 border-orange-300',
};

const kycStatusColors: Record<Guest['kycStatus'], string> = {
  verified: 'bg-green-100 text-green-800 border-green-300',
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  rejected: 'bg-red-100 text-red-800 border-red-300',
  'not-started': 'bg-gray-100 text-gray-800 border-gray-300',
};

const complaintStatusColors: Record<Complaint['status'], string> = {
    open: "bg-red-100 text-red-800",
    "in-progress": "bg-yellow-100 text-yellow-800",
    resolved: "bg-green-100 text-green-800",
}

const isImageUrl = (url: string) => /\.(jpg|jpeg|png|webp|gif)$/i.test(url);


export default function GuestProfilePage() {
    const params = useParams()
    const router = useRouter()
    const dispatch = useAppDispatch()
    const { toast } = useToast()
    const guestId = params.guestId as string
    
    const { guests: guestsState, pgs, complaints } = useAppSelector(state => state)
    const { isLoading } = useAppSelector(state => state.app)
    const { currentUser, currentPlan } = useAppSelector(state => state.user)
    const { featurePermissions } = useAppSelector(state => state.permissions);
    const { kycConfigs } = useAppSelector(state => state.kycConfig);
    
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
    
    const guest = useMemo(() => guestsState.guests.find(g => g.id === guestId), [guestsState.guests, guestId])
    const pg = useMemo(() => guest ? pgs.pgs.find(p => p.id === guest.pgId) : null, [guest, pgs])
    
    const {
        isEditGuestDialogOpen,
        setIsEditGuestDialogOpen,
        guestToEdit,
        editGuestForm,
        handleEditGuestSubmit,
        handleOpenEditGuestDialog,
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
    } = useDashboard({ pgs: pgs.pgs, guests: guestsState.guests });


    const [isChargeDialogOpen, setIsChargeDialogOpen] = useState(false)
    const [isKycDialogOpen, setIsKycDialogOpen] = useState(false)
    const [isSubmittingKyc, setIsSubmittingKyc] = useState(false)
    const [isResetKycDialogOpen, setIsResetKycDialogOpen] = useState(false)
    const [documentUris, setDocumentUris] = useState<Record<string, string>>({});
    const [selectedDoc, setSelectedDoc] = useState<SubmittedKycDocument | null>(null);


    const guestComplaints = useMemo(() => complaints.complaints.filter(c => c.guestId === guestId), [complaints.complaints, guestId])

    useEffect(() => {
        if (guest && guest.dueDate && isAfter(new Date(), parseISO(guest.dueDate))) {
            dispatch(reconcileRentCycle(guest.id));
        }
    }, [guest, dispatch]);
    
    useEffect(() => {
        if (guest?.documents) {
            const initialUris = guest.documents.reduce((acc, doc) => {
                acc[doc.configId] = doc.url;
                return acc;
            }, {} as Record<string, string>);
            setDocumentUris(initialUris);
        }
    }, [guest?.documents]);


    const { totalDue, dueItems } = useMemo(() => {
        if (!guest?.ledger) return { totalDue: 0, dueItems: [] };
        const totalDue = guest.ledger.reduce((acc, entry) => acc + (entry.type === 'debit' ? entry.amount : -entry.amount), 0);
        return { totalDue, dueItems: guest.ledger.filter(e => e.type === 'debit') };
    }, [guest]);
    
    const chargeForm = useForm<z.infer<typeof chargeSchema>>({
        resolver: zodResolver(chargeSchema),
        defaultValues: { description: '', amount: undefined }
    });
    
    const handleInitiateExit = () => {
        if (!guest || guest.exitDate) return
        const exitDate = new Date()
        exitDate.setDate(exitDate.getDate() + guest.noticePeriodDays)
        const updatedGuest = { ...guest, exitDate: exitDate.toISOString() }
        dispatch(updateGuestAction({updatedGuest}))
    }
    
    const handleAddChargeSubmit = (values: z.infer<typeof chargeSchema>) => {
        if (!guest) return;
        dispatch(addChargeAction({ guestId: guest.id, charge: values }));
        setIsChargeDialogOpen(false);
        chargeForm.reset();
    };

    const handleRemoveCharge = (chargeId: string) => {
        if (!guest) return;
        dispatch(removeChargeAction({ guestId: guest.id, chargeId }));
    };

    const handleKycFileChange = (e: React.ChangeEvent<HTMLInputElement>, configId: string) => {
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
    
    const handleKycSubmit = async () => {
        const documentsToSubmit: { config: KycDocumentConfig; dataUri: string }[] = [];
        
        for (const config of kycConfigs) {
            if (config.required && !documentUris[config.id]) {
                toast({ variant: 'destructive', title: 'Missing Document', description: `Please upload the required document: ${config.label}.` });
                return;
            }
            if (documentUris[config.id] && !documentUris[config.id].startsWith('http')) {
                documentsToSubmit.push({
                    config,
                    dataUri: documentUris[config.id],
                });
            }
        }
        if (!guest || documentsToSubmit.length === 0) {
            toast({ variant: 'destructive', title: 'No New Documents', description: 'Please upload at least one new document to submit.' });
            return;
        }

        setIsSubmittingKyc(true);
        try {
            await dispatch(updateGuestKycFromOwner({ guestId: guest.id, documents: documentsToSubmit })).unwrap();
            toast({ title: 'KYC Submitted', description: 'The documents have been sent for review.' });
            setIsKycDialogOpen(false);
            setDocumentUris({});
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Submission Failed', description: error.message || 'Could not submit documents.' });
        } finally {
            setIsSubmittingKyc(false);
        }
    };


    const handleKycAction = async (action: 'verified' | 'rejected') => {
        if (!guest) return;
        let reason = '';
        if (action === 'rejected') {
            reason = prompt('Please provide a reason for rejecting the KYC documents.') || 'Documents were not clear or valid.';
        }
        try {
            await dispatch(updateGuestKycStatus({ guestId: guest.id, status: action, reason })).unwrap();
            toast({ title: 'KYC Status Updated', description: `Guest has been marked as ${action}.`})
        } catch (error: any) {
             toast({ variant: 'destructive', title: 'Update Failed', description: error.message || 'Could not update KYC status.' });
        }
    }
    
    const handleConfirmResetKyc = () => {
        if(!guest) return;
        dispatch(resetGuestKyc(guest.id));
        toast({ title: "KYC Reset", description: "The guest can now re-submit their documents."});
        setIsResetKycDialogOpen(false);
    }


    if (isLoading) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-8 w-48" />
                <div className="grid md:grid-cols-3 gap-6">
                    <Skeleton className="h-64 md:col-span-1" />
                    <Skeleton className="h-64 md:col-span-2" />
                </div>
                <Skeleton className="h-48 w-full" />
            </div>
        )
    }

    if (!guest) {
        return (
            <div className="text-center py-10">
                <User className="mx-auto h-12 w-12 text-muted-foreground" />
                <h2 className="mt-4 text-xl font-semibold">Guest Not Found</h2>
                <p className="mt-2 text-muted-foreground">The guest you are looking for does not exist.</p>
                <Button onClick={() => router.back()} className="mt-4">Go Back</Button>
            </div>
        )
    }

    return (
      <>
        <div className="flex flex-col gap-6">
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <h1 className="text-2xl font-bold">{guest.name}'s Profile</h1>
                <Access feature="guests" action="edit">
                    <Button variant="outline" size="icon" onClick={() => handleOpenEditGuestDialog(guest)}><Pencil className="h-4 w-4"/></Button>
                </Access>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                <div className="lg:col-span-1 space-y-6">
                    <Card>
                        <CardContent className="pt-6 flex flex-col items-center text-center">
                            <Avatar className="w-24 h-24 mb-4">
                                <AvatarImage src={`https://placehold.co/100x100.png?text=${guest.name.charAt(0)}`} />
                                <AvatarFallback>{guest.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <h2 className="text-xl font-semibold">{guest.name}</h2>
                             <div className="text-sm text-muted-foreground space-y-2 mt-2">
                                <p className="flex items-center justify-center gap-2"><Phone className="w-4 h-4"/> {guest.phone || 'Not provided'}</p>
                                <p className="flex items-center justify-center gap-2"><Mail className="w-4 h-4"/> {guest.email || 'Not provided'}</p>
                                <p className="flex items-center justify-center gap-2"><Building className="w-4 h-4"/> {guest.pgName}</p>
                                <p className="flex items-center justify-center gap-2"><BedDouble className="w-4 h-4"/> Bed ID: {guest.bedId}</p>
                            </div>
                            <div className="flex items-center justify-between gap-2 mt-4 p-2 rounded-md w-full border" >
                                <span className="text-sm font-medium">KYC Status:</span>
                                <Badge variant="outline" className={cn("capitalize", kycStatusColors[guest.kycStatus])}>{guest.kycStatus.replace('-', ' ')}</Badge>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Rent & Payment</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 text-sm">
                            <div className="flex justify-between items-center">
                                <span>Rent Status:</span>
                                <Badge variant="outline" className={cn("capitalize text-base", rentStatusColors[guest.rentStatus])}>{guest.rentStatus}</Badge>
                            </div>
                            
                            <div className="space-y-2 pt-4 border-t">
                                <p className="font-semibold text-base">Current Bill Details (Due: {format(parseISO(guest.dueDate), "do MMMM, yyyy")})</p>
                                {dueItems.length > 0 ? dueItems.map(item => (
                                    <div key={item.id} className="flex justify-between text-sm text-muted-foreground">
                                        <span className="flex items-center gap-2">
                                            {item.type === 'debit' && (
                                                <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive -ml-2" onClick={() => handleRemoveCharge(item.id)}><Trash2 className="w-3 h-3"/></Button>
                                            )}
                                            {item.description}
                                        </span>
                                        <span className="font-medium text-foreground">₹{item.amount.toLocaleString('en-IN')}</span>
                                    </div>
                                )) : <p className="text-sm text-muted-foreground">No outstanding charges.</p>}
                            </div>

                            <div className="flex justify-between items-center text-base pt-4 border-t">
                                <span className="font-semibold">Total Amount Due:</span>
                                <span className="font-bold text-lg text-primary">₹{totalDue.toLocaleString('en-IN')}</span>
                            </div>
                             <div className="flex justify-between items-center text-sm">
                                <span>Security Deposit Paid:</span>
                                <span className="font-medium">₹{(guest.depositAmount || 0).toLocaleString('en-IN')}</span>
                            </div>
                        </CardContent>
                        <CardFooter className="flex-wrap gap-2">
                             {(guest.rentStatus === 'unpaid' || guest.rentStatus === 'partial' || totalDue > 0) && !guest.exitDate && (
                                <Access feature="finances" action="add"><Button onClick={() => handleOpenPaymentDialog(guest)}><Wallet className="mr-2 h-4 w-4" /> Collect Rent</Button></Access>
                             )}
                              <Access feature="finances" action="add"><Button variant="secondary" onClick={() => setIsChargeDialogOpen(true)}><PlusCircle className="mr-2 h-4 w-4" /> Add Charge</Button></Access>
                              {(guest.rentStatus === 'unpaid' || guest.rentStatus === 'partial' || totalDue > 0) && !guest.exitDate && currentPlan?.hasAiRentReminders && (
                                <Button variant="outline" onClick={() => handleOpenReminderDialog(guest)}><MessageCircle className="mr-2 h-4 w-4" />Send Reminder</Button>
                            )}
                             {guest.phone && (
                                <Button variant="outline" asChild>
                                    <a href={`tel:${guest.phone}`}>
                                        <Phone className="mr-2 h-4 w-4" /> Call Guest
                                    </a>
                                </Button>
                            )}
                        </CardFooter>
                    </Card>
                </div>
            </div>
            
            <Dialog>
                <Card className="w-full">
                    <CardHeader>
                        <CardTitle>KYC Documents</CardTitle>
                        <CardDescription>Review guest-submitted documents for verification.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {guest.documents && guest.documents.length > 0 ? (
                            <div className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {guest.documents.map(doc => {
                                        const isDocImageUrl = isImageUrl(doc.url);
                                        return (
                                            <DialogTrigger key={doc.configId} asChild>
                                                <button className="space-y-2 group" onClick={() => setSelectedDoc(doc)}>
                                                    <Label>{doc.label}</Label>
                                                    <div className="w-full aspect-video rounded-md border-2 flex items-center justify-center relative bg-muted/40 overflow-hidden group-hover:ring-2 ring-primary transition-all">
                                                        {isDocImageUrl ? (
                                                            <img src={doc.url} alt={`${doc.label} Preview`} className="w-full h-full object-contain" />
                                                        ) : (
                                                            <div className="flex flex-col items-center gap-2 text-muted-foreground"><FileText className="w-10 h-10"/><span className="text-xs">Click to view PDF</span></div>
                                                        )}
                                                    </div>
                                                </button>
                                            </DialogTrigger>
                                        )
                                    })}
                                </div>
                                <div className="flex flex-wrap items-center gap-2 mt-4">
                                    {guest.kycStatus === 'pending' && (
                                        <Access feature="kyc" action="edit">
                                            <div className="flex items-center gap-2 p-4 border bg-muted/50 rounded-md">
                                                <p className="font-semibold mr-4">Verification Action:</p>
                                                <Button size="sm" variant="outline" onClick={() => handleKycAction('verified')}><CheckCircle className="mr-2 h-4 w-4"/>Approve</Button>
                                                <Button size="sm" variant="destructive" onClick={() => handleKycAction('rejected')}><XCircle className="mr-2 h-4 w-4"/>Reject</Button>
                                            </div>
                                        </Access>
                                    )}
                                    {(guest.kycStatus === 'verified' || guest.kycStatus === 'pending') && (
                                        <Access feature="kyc" action="edit">
                                            <Button variant="secondary" size="sm" onClick={() => setIsResetKycDialogOpen(true)}>
                                                <RefreshCcw className="mr-2 h-4 w-4"/> Re-initiate KYC
                                            </Button>
                                        </Access>
                                    )}
                                </div>
                            </div>
                        ) : <p className="text-sm text-muted-foreground text-center py-4">No documents submitted by the tenant yet.</p>}

                        <Access feature="kyc" action="add">
                            {(guest.kycStatus === 'not-started' || guest.kycStatus === 'rejected') && (
                                <Button className="mt-4" onClick={() => setIsKycDialogOpen(true)}>
                                    {guest.kycStatus === 'rejected' ? 'Re-submit for Guest' : 'Complete KYC for Guest'}
                                </Button>
                            )}
                        </Access>
                        {guest.kycRejectReason && (
                            <Alert variant="destructive" className="mt-4">
                                <AlertTitle>Reason for Rejection</AlertTitle>
                                <AlertDescription>{guest.kycRejectReason}</AlertDescription>
                            </Alert>
                        )}
                    </CardContent>
                </Card>
                <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0">
                    <DialogHeader className="p-6 pb-4 border-b">
                        <DialogTitle>Document Preview: {selectedDoc?.label}</DialogTitle>
                    </DialogHeader>
                    <div className="flex-1 flex items-center justify-center overflow-hidden bg-muted/30 p-4">
                        {selectedDoc && (
                            isImageUrl(selectedDoc.url) ? (
                                <div className="relative w-full h-full">
                                    <Image src={selectedDoc.url} alt={`Preview of ${selectedDoc.label}`} layout="fill" objectFit="contain" />
                                    <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3 opacity-15">
                                        {Array.from({ length: 9 }).map((_, i) => (
                                            <div key={i} className="flex items-center justify-center">
                                                <p className="text-foreground/50 text-center font-bold text-lg rotate-[-30deg] select-none">
                                                    {pg?.name || 'RentSutra'}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center">
                                    <p className="mb-4">PDF preview is not available here. Please open it in a new tab.</p>
                                    <Button asChild>
                                        <a href={selectedDoc.url} target="_blank" rel="noopener noreferrer">
                                            <ExternalLink className="mr-2 h-4 w-4"/> Open PDF
                                        </a>
                                    </Button>
                                </div>
                            )
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            <Card>
                <Tabs defaultValue="stay-details">
                    <CardHeader>
                        <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="stay-details">
                                <span className="sm:hidden">Stay</span>
                                <span className="hidden sm:inline">Stay Details</span>
                            </TabsTrigger>
                            <TabsTrigger value="payment-history">
                                <span className="sm:hidden">History</span>
                                <span className="hidden sm:inline">Payment History</span>
                            </TabsTrigger>
                            <TabsTrigger value="complaint-history">
                                <span className="sm:hidden">Issues</span>
                                <span className="hidden sm:inline">Complaint History</span>
                            </TabsTrigger>
                        </TabsList>
                    </CardHeader>
                    <CardContent className="pt-4">
                        <TabsContent value="stay-details">
                            <div className="space-y-4 text-sm">
                               <div className="flex justify-between items-center">
                                    <span>Move-in Date:</span>
                                    <span className="font-medium">{format(parseISO(guest.moveInDate), "do MMM, yyyy")}</span>
                                </div>
                                 <div className="flex justify-between items-center">
                                    <span>Notice Period:</span>
                                    <span className="font-medium">{guest.noticePeriodDays} days</span>
                                </div>
                                 <div className="flex justify-between items-center">
                                    <span>Exit Status:</span>
                                    {guest.exitDate ? (
                                        <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300">
                                            Exiting on {format(parseISO(guest.exitDate), "do MMMM, yyyy")} ({differenceInDays(parseISO(guest.exitDate), new Date())} days left)
                                        </Badge>
                                    ) : (
                                        <Badge variant="secondary">Active</Badge>
                                    )}
                                </div>
                                 <div className="pt-4">
                                     <Button variant="outline" onClick={handleInitiateExit} disabled={!!guest.exitDate}>
                                        <LogOut className="mr-2 h-4 w-4" />
                                        {guest.exitDate ? 'Exit Already Initiated' : 'Initiate Exit'}
                                    </Button>
                                 </div>
                            </div>
                        </TabsContent>
                        <TabsContent value="payment-history">
                            {guest.paymentHistory && guest.paymentHistory.length > 0 ? (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Date</TableHead>
                                            <TableHead>Payment For</TableHead>
                                            <TableHead>Method</TableHead>
                                            <TableHead className="text-right">Amount</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {guest.paymentHistory.map(payment => (
                                            <TableRow key={payment.id}>
                                                <TableCell>{format(parseISO(payment.date), 'dd MMM, yyyy')}</TableCell>
                                                <TableCell>{payment.forMonth}</TableCell>
                                                <TableCell className="capitalize">{payment.method}</TableCell>
                                                <TableCell className="text-right font-semibold">₹{payment.amount.toLocaleString('en-IN')}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            ) : (
                                <p className="text-muted-foreground text-center py-4">No payment history found.</p>
                            )}
                        </TabsContent>
                         <TabsContent value="complaint-history">
                             {guestComplaints.length === 0 ? (
                                <p className="text-muted-foreground text-center py-4">No complaints from this guest. Yay!</p>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Date</TableHead>
                                            <TableHead>Category</TableHead>
                                            <TableHead>Description</TableHead>
                                            <TableHead>Status</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {guestComplaints.map(complaint => (
                                            <TableRow key={complaint.id}>
                                                <TableCell>{format(parseISO(complaint.date), 'dd MMM, yyyy')}</TableCell>
                                                <TableCell className="capitalize">{complaint.category}</TableCell>
                                                <TableCell className="max-w-xs truncate">{complaint.description}</TableCell>
                                                <TableCell>
                                                    <Badge className={cn("capitalize", complaintStatusColors[complaint.status])}>{complaint.status}</Badge>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                         </TabsContent>
                    </CardContent>
                </Tabs>
            </Card>

            {/* Dialogs */}
            <EditGuestDialog isEditGuestDialogOpen={isEditGuestDialogOpen} setIsEditGuestDialogOpen={setIsEditGuestDialogOpen} guestToEdit={guest} {...{editGuestForm, handleEditGuestSubmit}}/>
            <PaymentDialog isPaymentDialogOpen={isPaymentDialogOpen} setIsPaymentDialogOpen={setIsPaymentDialogOpen} selectedGuestForPayment={selectedGuestForPayment} paymentForm={paymentForm} handlePaymentSubmit={handlePaymentSubmit}/>

            <Dialog open={isReminderDialogOpen} onOpenChange={setIsReminderDialogOpen}>
                <DialogContent><DialogHeader><DialogTitle>Send Rent Reminder</DialogTitle><DialogDescription>A reminder message has been generated for {guest.name}. You can copy it or send it directly via WhatsApp.</DialogDescription></DialogHeader><div className="py-4">{isGeneratingReminder ? (<div className="space-y-2"><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-3/4" /></div>) : (<Textarea readOnly value={reminderMessage} rows={6} className="bg-muted/50" />)}</div><DialogFooter className="gap-2 sm:justify-end"><Button variant="secondary" onClick={() => { navigator.clipboard.writeText(reminderMessage); toast({ title: "Copied!", description: "Reminder message copied to clipboard." }) }}><Copy className="mr-2 h-4 w-4" /> Copy</Button><a href={`https://wa.me/${guest.phone}?text=${encodeURIComponent(reminderMessage)}`} target="_blank" rel="noopener noreferrer" className="w-full sm:w-auto"><Button className="w-full bg-green-500 hover:bg-green-600 text-white"><MessageCircle className="mr-2 h-4 w-4" /> Send on WhatsApp</Button></a></DialogFooter></DialogContent>
            </Dialog>

            <Dialog open={isChargeDialogOpen} onOpenChange={setIsChargeDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add Additional Charge</DialogTitle>
                        <DialogDescription>Add a one-time charge to this guest's current bill.</DialogDescription>
                    </DialogHeader>
                    <Form {...chargeForm}>
                        <form id="charge-form" onSubmit={chargeForm.handleSubmit(handleAddChargeSubmit)} className="space-y-4">
                            <FormField control={chargeForm.control} name="description" render={({ field }) => (<FormItem><FormLabel>Description</FormLabel><FormControl><Input placeholder="e.g., AC usage for May" {...field} /></FormControl><FormMessage /></FormItem>)} />
                            <FormField control={chargeForm.control} name="amount" render={({ field }) => (<FormItem><FormLabel>Amount</FormLabel><FormControl><Input type="number" placeholder="e.g., 500" {...field} /></FormControl><FormMessage /></FormItem>)} />
                        </form>
                    </Form>
                    <DialogFooter>
                        <DialogClose asChild><Button type="button" variant="secondary">Cancel</Button></DialogClose>
                        <Button type="submit" form="charge-form">Add Charge</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

             <Dialog open={isKycDialogOpen} onOpenChange={setIsKycDialogOpen}>
                <DialogContent className="sm:max-w-xl flex flex-col max-h-[90vh]">
                    <DialogHeader>
                        <DialogTitle>Complete KYC for {guest.name}</DialogTitle>
                        <DialogDescription>Upload the guest's documents to initiate verification.</DialogDescription>
                    </DialogHeader>
                    <div className="flex-1 overflow-hidden">
                        <ScrollArea className="h-full pr-6 -mr-6">
                            <div className="flex flex-col gap-6 py-4">
                                {kycConfigs.map(config => (
                                    <div className="space-y-2" key={config.id}>
                                        <Label htmlFor={`owner-doc-${config.id}`}>{config.label} {config.required && <span className="text-destructive">*</span>}</Label>
                                        <div className="w-full aspect-video rounded-md border-2 border-dashed flex items-center justify-center relative bg-muted/40 overflow-hidden">
                                            {documentUris[config.id] ? <Image src={documentUris[config.id]} alt="Preview" layout="fill" objectFit="contain" /> : <p className="text-muted-foreground text-sm">Upload {config.label}</p>}
                                        </div>
                                        <div className="relative">
                                            <Input id={`owner-doc-${config.id}`} type="file" accept="image/*,application/pdf" onChange={(e) => handleKycFileChange(e, config.id)} className="opacity-0 absolute inset-0 w-full h-full cursor-pointer" />
                                            <Button asChild variant="outline" className="w-full pointer-events-none">
                                                <span><FileUp className="mr-2 h-4 w-4"/> {documentUris[config.id] ? "Change" : "Upload"}</span>
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    </div>
                    <DialogFooter className="pt-4 border-t">
                        <DialogClose asChild><Button type="button" variant="secondary">Cancel</Button></DialogClose>
                        <Button onClick={handleKycSubmit} disabled={isSubmittingKyc}>
                            {isSubmittingKyc ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                            Submit for Verification
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
        <AlertDialog open={isResetKycDialogOpen} onOpenChange={setIsResetKycDialogOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This will reset the guest's KYC status and remove all uploaded documents, requiring them to submit again.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleConfirmResetKyc}>Continue</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
        
      </>
    )
}

    
