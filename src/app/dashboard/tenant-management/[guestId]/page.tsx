

'use client'

import React, { useState, useMemo, useEffect, useRef } from "react"
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { produce } from "immer"
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { v4 as uuidv4 } from 'uuid';

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
import { useReactToPrint } from 'react-to-print'

import type { Guest, Complaint, AdditionalCharge, KycDocumentConfig, SubmittedKycDocument, PG, Payment } from "@/lib/types"
import { ArrowLeft, User, IndianRupee, MessageCircle, ShieldCheck, Clock, Wallet, Home, LogOut, Copy, Calendar, Phone, Mail, Building, BedDouble, Trash2, PlusCircle, FileText, History, Pencil, Loader2, FileUp, ExternalLink, Printer } from "lucide-react"
import { format, addMonths, differenceInDays, parseISO, isAfter, differenceInMonths } from "date-fns"
import { cn } from "@/lib/utils"
import { generateRentReminder, type GenerateRentReminderInput } from '@/ai/flows/generate-rent-reminder'
import { useToast } from "@/hooks/use-toast"
import { updateGuest as updateGuestAction, addAdditionalCharge as addChargeAction, removeAdditionalCharge as removeChargeAction, reconcileRentCycle, updateGuestKycFromOwner, updateGuestKycStatus } from "@/lib/slices/guestsSlice"
import { useDashboard } from "@/hooks/use-dashboard"
import { canAccess } from "@/lib/permissions"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { Label } from "@/components/ui/label"
import { getDoc, doc } from "firebase/firestore"
import { db } from "@/lib/firebase"


const paymentSchema = z.object({
  amountPaid: z.coerce.number().min(0.01, "Payment amount must be greater than 0."),
  paymentMethod: z.enum(['cash', 'upi', 'in-app']),
});

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

const PoliceVerificationFormContent = React.forwardRef<HTMLDivElement, { guest: Guest | null; pgs: PG[] }>(({ guest, pgs }, ref) => {
    if (!guest) return null;
    const pg = pgs.find(p => p.id === guest.pgId);

    const styles = {
        page: {
            width: '210mm',
            minHeight: '297mm',
            padding: '20mm',
            margin: '10mm auto',
            border: '1px #D3D3D3 solid',
            borderRadius: '5px',
            background: 'white',
            boxShadow: '0 0 5px rgba(0, 0, 0, 0.1)',
            fontFamily: 'Arial, sans-serif',
            color: '#333',
        },
        header: {
            textAlign: 'center' as 'center',
            borderBottom: '2px solid #333',
            paddingBottom: '10px',
            marginBottom: '20px',
        },
        h1: {
            margin: '0',
            fontSize: '24px',
        },
        section: {
            marginBottom: '20px',
        },
        h2: {
            fontSize: '18px',
            borderBottom: '1px solid #eee',
            paddingBottom: '5px',
            marginBottom: '10px',
        },
        grid: {
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '10px',
        },
        gridItem: {
            
        },
        label: {
            fontWeight: 'bold' as 'bold',
            display: 'block',
            marginBottom: '5px',
            fontSize: '14px',
        },
        value: {
            fontSize: '14px',
            padding: '8px',
            border: '1px solid #ccc',
            borderRadius: '4px',
            backgroundColor: '#f9f9f9',
        },
        fullWidth: {
        gridColumn: '1 / -1',
        },
        documentImage: {
            width: '100%',
            height: 'auto',
            maxHeight: '400px',
            objectFit: 'contain' as 'contain',
            border: '1px solid #ddd',
            borderRadius: '4px',
            marginTop: '10px',
        },
        pageBreak: {
            pageBreakAfter: 'always' as 'always'
        }
    };
    
  return (
    <div ref={ref}>
        <div style={styles.page}>
        <header style={styles.header}>
            <h1 style={styles.h1}>Tenant Verification Form</h1>
        </header>
        
        <section style={styles.section}>
            <h2 style={styles.h2}>Tenant Details</h2>
            <div style={styles.grid}>
            <div style={styles.gridItem}>
                <span style={styles.label}>Full Name:</span>
                <div style={styles.value}>{guest.name}</div>
            </div>
            <div style={styles.gridItem}>
                <span style={styles.label}>Phone Number:</span>
                <div style={styles.value}>{guest.phone}</div>
            </div>
            <div style={styles.gridItem}>
                <span style={styles.label}>Email Address:</span>
                <div style={styles.value}>{guest.email}</div>
            </div>
            <div style={styles.gridItem}>
                <span style={styles.label}>Move-in Date:</span>
                <div style={styles.value}>{format(parseISO(guest.moveInDate), 'dd-MM-yyyy')}</div>
            </div>
            </div>
        </section>

        <section style={styles.section}>
            <h2 style={styles.h2}>Property Details</h2>
            <div style={styles.grid}>
                <div style={styles.gridItem}>
                    <span style={styles.label}>Property Name:</span>
                    <div style={styles.value}>{pg?.name}</div>
                </div>
                <div style={{ ...styles.gridItem, ...styles.fullWidth }}>
                    <span style={styles.label}>Property Address:</span>
                    <div style={styles.value}>{pg?.location}, {pg?.city}</div>
                </div>
            </div>
        </section>
        
        {guest.documents && guest.documents.map((doc, index) => (
            <React.Fragment key={uuidv4()}>
                <div style={styles.pageBreak}></div>
                 <section style={styles.section}>
                    <h2 style={styles.h2}>Document: {doc.label}</h2>
                    <img
                        src={doc.url}
                        alt={doc.label}
                        style={styles.documentImage}
                    />
                </section>
            </React.Fragment>
        ))}
        </div>
    </div>
  );
});
PoliceVerificationFormContent.displayName = 'PoliceVerificationFormContent';


export default function GuestProfilePage() {
    const params = useParams()
    const router = useRouter()
    const dispatch = useAppDispatch()
    const { toast } = useToast()
    const guestId = params.guestId as string
    
    const { guests, pgs, complaints } = useAppSelector(state => state)
    const { isLoading } = useAppSelector(state => state.app)
    const { currentUser, currentPlan } = useAppSelector(state => state.user)
    const { featurePermissions } = useAppSelector(state => state.permissions);
    const { kycConfigs } = useAppSelector(state => state.kycConfig);
    
    const verificationFormRef = useRef<HTMLDivElement>(null);
    const handlePrint = useReactToPrint({
      content: () => verificationFormRef.current,
      documentTitle: 'RentVastu-Police-Verification'
    });
    
    const {
        isEditGuestDialogOpen,
        setIsEditGuestDialogOpen,
        guestToEdit,
        editGuestForm,
        handleEditGuestSubmit,
        handleOpenEditGuestDialog,
    } = useDashboard({ pgs: pgs.pgs, guests: guests.guests });


    const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false)
    const [isReminderDialogOpen, setIsReminderDialogOpen] = useState(false)
    const [isChargeDialogOpen, setIsChargeDialogOpen] = useState(false)
    const [isKycDialogOpen, setIsKycDialogOpen] = useState(false)
    const [isSubmittingKyc, setIsSubmittingKyc] = useState(false)
    const [reminderMessage, setReminderMessage] = useState('')
    const [isGeneratingReminder, setIsGeneratingReminder] = useState(false)
    const [documentUris, setDocumentUris] = useState<Record<string, string>>({});
    const [selectedDoc, setSelectedDoc] = useState<SubmittedKycDocument | null>(null);


    const guest = useMemo(() => guests.guests.find(g => g.id === guestId), [guests, guestId])
    const guestComplaints = useMemo(() => complaints.complaints.filter(c => c.guestId === guestId), [complaints, guestId])

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


    const { totalDue, balanceBroughtForward } = useMemo(() => {
        if (!guest) return { totalDue: 0, balanceBroughtForward: 0 };
        
        const balanceBf = guest.balanceBroughtForward || 0;
        const currentMonthRent = guest.rentAmount;
        const chargesDue = (guest.additionalCharges || []).reduce((sum, charge) => sum + charge.amount, 0);
        
        const total = balanceBf + currentMonthRent + chargesDue - (guest.rentPaidAmount || 0);

        return { totalDue: total, balanceBroughtForward: balanceBf };
    }, [guest]);

    const paymentForm = useForm<z.infer<typeof paymentSchema>>({
        resolver: zodResolver(paymentSchema),
        defaultValues: { paymentMethod: 'cash' }
    });
    
    const chargeForm = useForm<z.infer<typeof chargeSchema>>({
        resolver: zodResolver(chargeSchema),
        defaultValues: { description: '', amount: undefined }
    });

    useEffect(() => {
        if (guest) {
            paymentForm.reset({ paymentMethod: 'cash', amountPaid: totalDue > 0 ? Number(totalDue.toFixed(2)) : 0 })
        }
    }, [guest, totalDue, paymentForm]);
    
    const handleInitiateExit = () => {
        if (!guest || guest.exitDate) return
        const exitDate = new Date()
        exitDate.setDate(exitDate.getDate() + guest.noticePeriodDays)
        const updatedGuest = { ...guest, exitDate: exitDate.toISOString() }
        dispatch(updateGuestAction({updatedGuest}))
    }

    const handlePaymentSubmit = (values: z.infer<typeof paymentSchema>) => {
        if (!guest) return;
        
        const paymentRecord: Payment = {
            id: `pay-${Date.now()}`,
            date: new Date().toISOString(),
            amount: values.amountPaid,
            method: values.paymentMethod,
            forMonth: format(parseISO(guest.dueDate), 'MMMM yyyy'),
        };

        const updatedGuest = produce(guest, draft => {
            let amountPaid = values.amountPaid;
            
            if (!draft.paymentHistory) draft.paymentHistory = [];
            draft.paymentHistory.push(paymentRecord);

            let mutableCharges = JSON.parse(JSON.stringify(draft.additionalCharges || [])) as AdditionalCharge[];
            
            for (const charge of mutableCharges) {
                if (amountPaid <= 0) break;
                const amountToClear = Math.min(amountPaid, charge.amount);
                charge.amount -= amountToClear;
                amountPaid -= amountToClear;
            }
            draft.additionalCharges = mutableCharges.filter(c => c.amount > 0);

            draft.rentPaidAmount = (draft.rentPaidAmount || 0) + amountPaid;
            
            const totalDueAfterPayment = draft.rentAmount - (draft.rentPaidAmount || 0) + (draft.additionalCharges.reduce((sum, c) => sum + c.amount, 0));

            if (totalDueAfterPayment <= 0) {
                draft.rentStatus = 'paid';
                draft.balanceBroughtForward = (draft.balanceBroughtForward || 0) + Math.abs(totalDueAfterPayment);
                draft.rentPaidAmount = 0;
                draft.additionalCharges = [];
                draft.dueDate = format(addMonths(new Date(draft.dueDate), 1), 'yyyy-MM-dd');
            } else {
                draft.rentStatus = 'partial';
            }
        });
        
        dispatch(updateGuestAction({ updatedGuest }));
        setIsPaymentDialogOpen(false);
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

    const handleOpenReminderDialog = async () => {
        if (!guest || !currentPlan?.hasAiRentReminders) return
        setIsReminderDialogOpen(true)
        setIsGeneratingReminder(true)
        setReminderMessage('')

        try {
            const input: GenerateRentReminderInput = {
                guestName: guest.name,
                rentAmount: totalDue,
                dueDate: format(new Date(guest.dueDate), "do MMMM yyyy"),
                pgName: guest.pgName,
            }
            const result = await generateRentReminder(input)
            setReminderMessage(result.reminderMessage)
        } catch (error) {
            console.error("Failed to generate reminder", error)
            setReminderMessage("Sorry, we couldn't generate a reminder at this time. Please try again.")
        } finally {
            setIsGeneratingReminder(false)
        }
    }

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
      <Dialog open={!!selectedDoc} onOpenChange={(isOpen) => !isOpen && setSelectedDoc(null)}>
        <div className="flex flex-col gap-6">
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <h1 className="text-2xl font-bold">{guest.name}'s Profile</h1>
                <Button variant="outline" size="icon" onClick={() => handleOpenEditGuestDialog(guest)}><Pencil className="h-4 w-4"/></Button>
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
                             <div className="flex items-center justify-center gap-2 mt-4 p-2 rounded-md w-full border" >
                                <span className="text-sm font-medium">KYC:</span>
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
                                 <div className="flex justify-between items-center text-muted-foreground">
                                    <span>Balance from previous months:</span>
                                    <span className="font-medium text-foreground">₹{balanceBroughtForward.toLocaleString('en-IN')}</span>
                                </div>
                                 <div className="flex justify-between items-center text-muted-foreground">
                                    <span>Current month's rent:</span>
                                    <span className="font-medium text-foreground">₹{guest.rentAmount.toLocaleString('en-IN')}</span>
                                </div>
                                {guest.additionalCharges && guest.additionalCharges.length > 0 && (
                                    <div className="space-y-1 pt-1">
                                        {guest.additionalCharges.map(charge => (
                                            <div key={charge.id} className="flex justify-between items-center text-muted-foreground">
                                                <span className="flex items-center gap-2">
                                                    <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive -ml-2" onClick={() => handleRemoveCharge(charge.id)}><Trash2 className="w-3 h-3"/></Button>
                                                    {charge.description}
                                                </span>
                                                <span className="font-medium text-foreground">₹{charge.amount.toLocaleString('en-IN')}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {(guest.rentPaidAmount || 0) > 0 && (
                                    <div className="flex justify-between items-center text-green-600 dark:text-green-400">
                                        <span>Paid this cycle:</span>
                                        <span className="font-medium">- ₹{(guest.rentPaidAmount || 0).toLocaleString('en-IN')}</span>
                                    </div>
                                )}
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
                        <CardFooter className="flex flex-wrap gap-2">
                             {(guest.rentStatus === 'unpaid' || guest.rentStatus === 'partial' || totalDue > 0) && !guest.exitDate && (
                                <Button onClick={() => setIsPaymentDialogOpen(true)}><Wallet className="mr-2 h-4 w-4" /> Collect Rent</Button>
                             )}
                              <Button variant="secondary" onClick={() => setIsChargeDialogOpen(true)}><PlusCircle className="mr-2 h-4 w-4" /> Add Charge</Button>
                              {(guest.rentStatus === 'unpaid' || guest.rentStatus === 'partial' || totalDue > 0) && !guest.exitDate && currentPlan?.hasAiRentReminders && (
                                <Button variant="outline" onClick={handleOpenReminderDialog}><MessageCircle className="mr-2 h-4 w-4" />Send Reminder</Button>
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
                                        <button key={doc.configId} className="space-y-2 group" onClick={() => setSelectedDoc(doc)}>
                                            <Label>{doc.label}</Label>
                                            <div className="w-full aspect-video rounded-md border-2 flex items-center justify-center relative bg-muted/40 overflow-hidden group-hover:ring-2 ring-primary transition-all">
                                                {isDocImageUrl ? (
                                                    <Image src={doc.url} alt={`${doc.label} Preview`} layout="fill" objectFit="contain" />
                                                ) : (
                                                    <div className="flex flex-col items-center gap-2 text-muted-foreground"><FileText className="w-10 h-10"/><span className="text-xs">Click to view PDF</span></div>
                                                )}
                                            </div>
                                        </button>
                                    )
                                })}
                            </div>
                             {guest.kycStatus === 'pending' && (
                                <div className="p-4 border bg-muted/50 rounded-md mt-6">
                                    <p className="font-semibold mb-2">Manual Verification</p>
                                    {guest.kycExtractedName && <p className="text-sm">AI Extracted Name: <span className="font-semibold">{guest.kycExtractedName}</span></p>}
                                    <p className="text-sm">Guest's Name: <span className="font-semibold">{guest.name}</span></p>
                                    <div className="flex gap-2 mt-4">
                                        <Button size="sm" variant="outline" onClick={() => handleKycAction('verified')}>Approve</Button>
                                        <Button size="sm" variant="destructive" onClick={() => handleKycAction('rejected')}>Reject</Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : <p className="text-sm text-muted-foreground text-center py-4">No documents submitted by the tenant yet.</p>}

                     {canAccess(featurePermissions, currentUser?.role, 'kyc', 'edit') && (guest.kycStatus === 'not-started' || guest.kycStatus === 'rejected') && (
                        <Button className="mt-4" onClick={() => setIsKycDialogOpen(true)}>
                            {guest.kycStatus === 'rejected' ? 'Re-submit for Guest' : 'Complete KYC for Guest'}
                        </Button>
                     )}
                      {guest.kycRejectReason && (
                        <Alert variant="destructive" className="mt-4">
                            <AlertTitle>Reason for Rejection</AlertTitle>
                            <AlertDescription>{guest.kycRejectReason}</AlertDescription>
                        </Alert>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader><CardTitle>Police Verification</CardTitle></CardHeader>
                <CardContent>
                    <p className="text-muted-foreground mb-4">Generate a consolidated document with the guest's details and KYC proofs for police verification submission.</p>
                     <div onClick={handlePrint} className="inline-block">
                        <Button>
                            <Printer className="mr-2 h-4 w-4" />
                            Generate Verification PDF
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <div className="hidden">
                <PoliceVerificationFormContent ref={verificationFormRef} guest={guest} pgs={pgs.pgs}/>
            </div>

            <Card>
                <Tabs defaultValue="stay-details">
                    <CardHeader>
                        <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="stay-details">Stay Details</TabsTrigger>
                            <TabsTrigger value="payment-history">Payment History</TabsTrigger>
                            <TabsTrigger value="complaint-history">Complaint History</TabsTrigger>
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
            <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
                <DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>Collect Rent Payment</DialogTitle><DialogDescription>Record a full or partial payment for {guest.name}.</DialogDescription></DialogHeader><Form {...paymentForm}><form onSubmit={paymentForm.handleSubmit(handlePaymentSubmit)} id="payment-form" className="space-y-4"><div className="space-y-2 py-2"><p className="text-sm text-muted-foreground">Total Rent: <span className="font-medium text-foreground">₹{guest.rentAmount.toLocaleString('en-IN')}</span></p><p className="text-sm text-muted-foreground">Amount Due: <span className="font-bold text-lg text-foreground">₹{totalDue.toLocaleString('en-IN')}</span></p></div><FormField control={paymentForm.control} name="amountPaid" render={({ field }) => (<FormItem><FormLabel>Amount to Collect</FormLabel><FormControl><Input type="number" placeholder="Enter amount" {...field} /></FormControl><FormMessage /></FormItem>)} /><FormField control={paymentForm.control} name="paymentMethod" render={({ field }) => (<FormItem className="space-y-3"><FormLabel>Payment Method</FormLabel><FormControl><RadioGroup onValueChange={field.onChange} value={field.value} className="flex gap-4 pt-1"><FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="cash" id="cash" /></FormControl><Label htmlFor="cash" className="font-normal cursor-pointer">Cash</Label></FormItem><FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="upi" id="upi" /></FormControl><Label htmlFor="upi" className="font-normal cursor-pointer">UPI</Label></FormItem><FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="in-app" id="in-app" disabled /></FormControl><Label htmlFor="in-app" className="font-normal text-muted-foreground">In-App (soon)</Label></FormItem></RadioGroup></FormControl><FormMessage /></FormItem>)} /></form></Form><DialogFooter><DialogClose asChild><Button type="button" variant="secondary">Cancel</Button></DialogClose><Button type="submit" form="payment-form">Confirm Payment</Button></DialogFooter></DialogContent>
            </Dialog>

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
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Complete KYC for {guest.name}</DialogTitle>
                        <DialogDescription>Upload the guest's documents to initiate verification.</DialogDescription>
                    </DialogHeader>
                    <div className="grid md:grid-cols-2 gap-6 py-4">
                        {kycConfigs.map(config => (
                             <div className="space-y-2" key={config.id}>
                                <Label htmlFor={`owner-doc-${config.id}`}>{config.label}</Label>
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
                    <DialogFooter>
                        <DialogClose asChild><Button type="button" variant="secondary">Cancel</Button></DialogClose>
                        <Button onClick={handleKycSubmit} disabled={isSubmittingKyc}>
                            {isSubmittingKyc ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                            Submit for Verification
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
            <DialogHeader>
                 <DialogTitle>Document Preview: {selectedDoc?.label}</DialogTitle>
            </DialogHeader>
            <div className="flex-1 flex items-center justify-center overflow-hidden">
                {selectedDoc && (
                    isImageUrl(selectedDoc.url) ? (
                        <Image src={selectedDoc.url} alt={`Preview of ${selectedDoc.label}`} width={800} height={600} className="max-w-full max-h-full object-contain" />
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
    )
}
