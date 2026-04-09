

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


import { useAppSelector } from "@/lib/hooks"
import { usePermissionsStore, useKycConfigStore } from '@/lib/stores/configStores'
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose, DialogTrigger } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import EditGuestDialog from '@/components/dashboard/dialogs/EditGuestDialog'

import { ActivityLogsList } from "@/components/activity/activity-logs-list"

import type { Guest, Complaint, AdditionalCharge, KycDocumentConfig, SubmittedKycDocument, Payment, LedgerEntry } from "@/lib/types"
import { ArrowLeft, User, IndianRupee, MessageCircle, ShieldCheck, Clock, Wallet, Home, LogOut, Copy, Calendar, Phone, Mail, Building, BedDouble, Trash2, PlusCircle, FileText, History, Pencil, Loader2, FileUp, ExternalLink, Printer, CheckCircle, XCircle, RefreshCcw, Link as LinkIcon, Key } from "lucide-react"
import { format, addMonths, differenceInDays, parseISO, isAfter, differenceInMonths, isSameDay } from "date-fns"
import { formatBalanceBreakdown, getBalanceBreakdown } from "@/lib/ledger-utils"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { useInitiateGuestExitMutation, useVacateGuestMutation, useAddGuestChargeMutation, useRemoveGuestChargeMutation, useUpdateKycStatusMutation, useSubmitKycDocumentsMutation, useResetKycMutation } from '@/lib/api/apiSlice'
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
    const { toast } = useToast()
    const guestId = params.guestId as string

    const [initiateExit] = useInitiateGuestExitMutation()
    const [vacateGuest] = useVacateGuestMutation()
    const [addGuestCharge] = useAddGuestChargeMutation()
    const [removeGuestCharge] = useRemoveGuestChargeMutation()
    const [updateKycStatus] = useUpdateKycStatusMutation()
    const [submitKycDocuments] = useSubmitKycDocumentsMutation()
    const [resetKyc] = useResetKycMutation()

    const { guests: guestsState, pgs, complaints } = useAppSelector(state => state)
    const { isLoading } = useAppSelector(state => state.app)
    const { currentUser, currentPlan } = useAppSelector(state => state.user)
    const { featurePermissions } = usePermissionsStore();
    const { kycConfigs: kycConfigMap } = useKycConfigStore();

    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
    const [isVacateDialogOpen, setIsVacateDialogOpen] = useState(false);
    const [sendWhatsAppOnExit, setSendWhatsAppOnExit] = useState(true);

    const guest = useMemo(() => guestsState.guests.find(g => g.id === guestId), [guestsState.guests, guestId])
    const pg = useMemo(() => guest ? pgs.pgs.find(p => p.id === guest.pgId) : null, [guest, pgs])
    const kycConfigs = (guest && kycConfigMap[guest.pgId]) || [];

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
        handleOpenReminderDialog,
        isRecordingPayment,
        setReminderMessage,
        isUpdatingGuest
    } = useDashboard();


    const [isChargeDialogOpen, setIsChargeDialogOpen] = useState(false)
    const [isKycDialogOpen, setIsKycDialogOpen] = useState(false)
    const [isSubmittingKyc, setIsSubmittingKyc] = useState(false)
    const [isResetKycDialogOpen, setIsResetKycDialogOpen] = useState(false)
    const [documentUris, setDocumentUris] = useState<Record<string, string>>({});
    const [selectedDoc, setSelectedDoc] = useState<SubmittedKycDocument | null>(null);

    const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
    const [generatedPassword, setGeneratedPassword] = useState('');
    const [isMagicLinkDialogOpen, setIsMagicLinkDialogOpen] = useState(false);
    const [generatedMagicLink, setGeneratedMagicLink] = useState('');
    const [generatedSetupCode, setGeneratedSetupCode] = useState('');
    const [isGeneratingMagicLink, setIsGeneratingMagicLink] = useState(false);
    const [isGeneratingPassword, setIsGeneratingPassword] = useState(false);

    const guestComplaints = useMemo(() => complaints.complaints.filter(c => c.guestId === guestId), [complaints.complaints, guestId])

    // Rent cycle reconciliation is now handled server-side on fetch

    useEffect(() => {
        if (guest?.documents) {
            const initialUris = guest.documents.reduce((acc, doc) => {
                acc[doc.configId] = doc.url;
                return acc;
            }, {} as Record<string, string>);
            setDocumentUris(initialUris);
        }
    }, [guest?.documents]);


    const { totalDue, dueItems, symbolicBalance } = useMemo(() => {
        if (!guest) return { totalDue: 0, dueItems: [], symbolicBalance: null };
        const breakdown = getBalanceBreakdown(guest);
        
        // Match the unpaid items logic for display
        const ledger = [...(guest.ledger || [])].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        let creditsToApply = ledger.filter(e => e.type === 'credit' && e.amountType !== 'symbolic').reduce((sum, e) => sum + e.amount, 0);
        let symbolicCreditsToApply = ledger.filter(e => e.type === 'credit' && e.amountType === 'symbolic').length;

        const unpaidItems: (LedgerEntry & { isSymbolic?: boolean; displayAmount?: string })[] = [];
        const debits = ledger.filter(e => e.type === 'debit');

        for (const debit of debits) {
            const isSymbolic = debit.amountType === 'symbolic';
            if (isSymbolic) {
                if (symbolicCreditsToApply >= 1) symbolicCreditsToApply -= 1;
                else unpaidItems.push({ ...debit, isSymbolic: true, displayAmount: debit.symbolicValue || 'XXX' });
            } else {
                if (creditsToApply >= debit.amount) creditsToApply -= debit.amount;
                else {
                    unpaidItems.push({ ...debit, amount: debit.amount - creditsToApply, displayAmount: `₹${(debit.amount - creditsToApply).toLocaleString('en-IN')}` });
                    creditsToApply = 0;
                }
            }
        }

        return { 
            totalDue: breakdown.total, 
            dueItems: unpaidItems,
            symbolicBalance: breakdown.symbolic
        };
    }, [guest]);

    const chargeForm = useForm<z.infer<typeof chargeSchema>>({
        resolver: zodResolver(chargeSchema),
        defaultValues: { description: '', amount: undefined }
    });

    const handleConfirmImmediateExit = async () => {
        if (!guest || !currentUser) return;

        try {
            await vacateGuest({
                guestId: guest.id,
                sendWhatsApp: sendWhatsAppOnExit
            }).unwrap();
            setIsVacateDialogOpen(false);
            toast({ title: 'Guest Vacated', description: `${guest.name} has been successfully vacated.` });
            router.push('/dashboard');
        } catch (err: any) {
            toast({ variant: 'destructive', title: 'Error', description: err.data?.error || 'Failed to vacate guest.' });
        }
    };

    const handleInitiateExit = async () => {
        if (!guest || guest.exitDate) return
        try {
            await initiateExit({ guestId: guest.id, noticePeriodDays: guest.noticePeriodDays }).unwrap()
            toast({ title: 'Exit Initiated', description: `${guest.name}'s exit notice has been set.` })
        } catch (err: any) {
            toast({ variant: 'destructive', title: 'Failed', description: err.message || 'Could not initiate exit.' })
        }
    }

    const handleAddChargeSubmit = async (values: z.infer<typeof chargeSchema>) => {
        if (!guest) return;
        try {
            await addGuestCharge({ guestId: guest.id, description: values.description, amount: values.amount }).unwrap()
            toast({ title: 'Charge Added', description: `₹${values.amount} charge added to ${guest.name}'s bill.` })
            setIsChargeDialogOpen(false);
            chargeForm.reset();
        } catch (err: any) {
            toast({ variant: 'destructive', title: 'Failed', description: err.message || 'Could not add charge.' })
        }
    };

    const handleRemoveCharge = async (chargeId: string) => {
        if (!guest) return;
        try {
            await removeGuestCharge({ guestId: guest.id, chargeId }).unwrap()
        } catch (err: any) {
            toast({ variant: 'destructive', title: 'Failed', description: err.message || 'Could not remove charge.' })
        }
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
        const documentsToSubmit: { config: any; dataUri: string }[] = [];

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
            await submitKycDocuments({ guestId: guest.id, documents: documentsToSubmit }).unwrap();
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
            await updateKycStatus({ guestId: guest.id, status: action, reason }).unwrap();
            toast({ title: 'KYC Status Updated', description: `Guest has been marked as ${action}.` })
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Update Failed', description: error.message || 'Could not update KYC status.' });
        }
    }

    const handleConfirmResetKyc = async () => {
        if (!guest) return;
        try {
            await resetKyc({ guestId: guest.id }).unwrap();
            toast({ title: "KYC Reset", description: "The guest can now re-submit their documents." });
        } catch (err: any) {
            toast({ variant: 'destructive', title: 'Failed', description: err.message || 'Could not reset KYC.' })
        }
        setIsResetKycDialogOpen(false);
    }

    const handleGeneratePassword = async () => {
        if (!guest || !currentUser) return;
        setIsGeneratingPassword(true);
        try {
            const response = await fetch('/api/owners/tenants/generate-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ownerId: currentUser.id,
                    tenantId: guest.id,
                    phone: guest.phone
                })
            });
            const data = await response.json();
            if (data.success) {
                setGeneratedPassword(data.newPassword);
                setIsPasswordDialogOpen(true);
            } else {
                toast({ variant: 'destructive', title: 'Error', description: data.error || 'Failed to generate password.' });
            }
        } catch (err: any) {
            toast({ variant: 'destructive', title: 'Error', description: 'Network error generating password.' });
        } finally {
            setIsGeneratingPassword(false);
        }
    };

    const handleGenerateMagicLink = async () => {
        if (!guest || !currentUser) return;
        setIsGeneratingMagicLink(true);
        try {
            const response = await fetch('/api/owners/tenants/magic-link', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ guestId: guest.id, phone: guest.phone })
            });
            const data = await response.json();
            if (data.success) {
                setGeneratedMagicLink(data.magicLink);
                setGeneratedSetupCode(data.inviteCode);
                setIsMagicLinkDialogOpen(true);
            } else {
                toast({ variant: 'destructive', title: 'Error', description: data.error || 'Failed to generate link', });
            }
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to generate link', });
        } finally {
            setIsGeneratingMagicLink(false);
        }
    };


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
                        <Button variant="outline" size="icon" onClick={() => handleOpenEditGuestDialog(guest)}><Pencil className="h-4 w-4" /></Button>
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
                                    <p className="flex items-center justify-center gap-2"><Phone className="w-4 h-4" /> {guest.phone || 'Not provided'}</p>
                                    <p className="flex items-center justify-center gap-2"><Mail className="w-4 h-4" /> {guest.email || 'Not provided'}</p>
                                    <p className="flex items-center justify-center gap-2"><Building className="w-4 h-4" /> {guest.pgName}</p>
                                    <p className="flex items-center justify-center gap-2"><BedDouble className="w-4 h-4" /> Bed ID: {guest.bedId}</p>
                                </div>
                                <div className="flex items-center justify-between gap-2 mt-4 p-2 rounded-md w-full border" >
                                    <span className="text-sm font-medium">KYC Status:</span>
                                    <Badge variant="outline" className={cn("capitalize", kycStatusColors[guest.kycStatus])}>{guest.kycStatus.replace('-', ' ')}</Badge>
                                </div>
                                 <Access feature="guests" action="edit">
                                    <div className="flex flex-col gap-2 w-full mt-4">
                                        <Button
                                            variant="outline"
                                            className="w-full"
                                            disabled={isGeneratingPassword}
                                            onClick={handleGeneratePassword}
                                        >
                                            {isGeneratingPassword ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
                                            Generate New Password
                                        </Button>

                                        <Button
                                            variant="outline"
                                            className="w-full border-primary/30 hover:border-primary"
                                            disabled={isGeneratingMagicLink}
                                            onClick={handleGenerateMagicLink}
                                        >
                                            {isGeneratingMagicLink ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LinkIcon className="mr-2 h-4 w-4" />}
                                            {generatedMagicLink ? 'Regenerate Invite Link' : 'Generate Invite Link'}
                                        </Button>
                                    </div>
                                </Access>
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
                                    <div className="flex flex-col items-end">
                                        <Badge variant="outline" className={cn("capitalize text-base", rentStatusColors[guest.rentStatus])}>{guest.rentStatus}</Badge>
                                        {formatBalanceBreakdown(guest) && (
                                            <span className="text-[10px] text-rose-600 font-bold uppercase mt-1">
                                                {formatBalanceBreakdown(guest)}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-2 pt-4 border-t">
                                    <p className="font-semibold text-base">Current Bill Details (Due: {format(parseISO(guest.dueDate), "do MMMM, yyyy")})</p>
                                    {dueItems.length > 0 ? dueItems.map(item => (
                                        <div key={item.id} className="flex justify-between text-sm text-muted-foreground">
                                            <span className="flex items-center gap-2">
                                                {item.type === 'debit' && (
                                                    <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive -ml-2" onClick={() => handleRemoveCharge(item.id)}><Trash2 className="w-3 h-3" /></Button>
                                                )}
                                                {item.description}
                                            </span>
                                            <span className="font-medium text-foreground">{item.displayAmount}</span>
                                        </div>
                                    )) : <p className="text-sm text-muted-foreground">No outstanding charges.</p>}
                                </div>

                                <div className="flex justify-between items-center text-base pt-4 border-t">
                                    <span className="font-semibold">Total Amount Due:</span>
                                    <div className="text-right">
                                        {guest.amountType === 'symbolic' ? (
                                            <>
                                                {totalDue > 0 ? (
                                                    <>
                                                        <span className="font-bold text-lg text-primary">₹{totalDue.toLocaleString('en-IN')}</span>
                                                        {symbolicBalance && <div className="text-xs font-semibold text-rose-600">+ {symbolicBalance}</div>}
                                                    </>
                                                ) : (
                                                    <span className="font-bold text-lg text-primary">{symbolicBalance || 'Settled'}</span>
                                                )}
                                            </>
                                        ) : (
                                            <>
                                                <span className="font-bold text-lg text-primary">₹{totalDue.toLocaleString('en-IN')}</span>
                                                {symbolicBalance && <div className="text-xs font-semibold text-muted-foreground">+ {symbolicBalance}</div>}
                                            </>
                                        )}
                                    </div>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span>Security Deposit:</span>
                                    <span className="font-medium">
                                        {guest.amountType === 'symbolic' ? (guest.symbolicDepositValue || 'YYY') : `₹${(guest.depositAmount || 0).toLocaleString('en-IN')}`}
                                    </span>
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
                                                                <div className="flex flex-col items-center gap-2 text-muted-foreground"><FileText className="w-10 h-10" /><span className="text-xs">Click to view PDF</span></div>
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
                                                    <Button size="sm" variant="outline" onClick={() => handleKycAction('verified')}><CheckCircle className="mr-2 h-4 w-4" />Approve</Button>
                                                    <Button size="sm" variant="destructive" onClick={() => handleKycAction('rejected')}><XCircle className="mr-2 h-4 w-4" />Reject</Button>
                                                </div>
                                            </Access>
                                        )}
                                        {(guest.kycStatus === 'verified' || guest.kycStatus === 'pending') && (
                                            <Access feature="kyc" action="edit">
                                                <Button variant="secondary" size="sm" onClick={() => setIsResetKycDialogOpen(true)}>
                                                    <RefreshCcw className="mr-2 h-4 w-4" /> Re-initiate KYC
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
                                                <ExternalLink className="mr-2 h-4 w-4" /> Open PDF
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
                            <TabsList className="grid w-full grid-cols-4">
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
                                <TabsTrigger value="activity">
                                    <span className="sm:hidden">Activity</span>
                                    <span className="hidden sm:inline">Activity Log</span>
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
                                    <div className="pt-4 flex flex-col sm:flex-row gap-3">
                                        <Button variant="outline" className="flex-1" onClick={handleInitiateExit} disabled={!!guest.exitDate || guest.isVacated}>
                                            <LogOut className="mr-2 h-4 w-4" />
                                            {guest.exitDate ? 'Exit Already Initiated' : 'Initiate Exit'}
                                        </Button>
                                        <Access feature="guests" action="delete">
                                            <Button variant="destructive" className="flex-1" onClick={() => setIsVacateDialogOpen(true)} disabled={guest.isVacated}>
                                                <XCircle className="mr-2 h-4 w-4" />
                                                Vacate Immediately
                                            </Button>
                                        </Access>
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
                            <TabsContent value="activity">
                                <div className="pt-2">
                                    <ActivityLogsList module="guests" targetId={guest.id} />
                                </div>
                            </TabsContent>
                        </CardContent>
                    </Tabs>
                </Card>

                {/* Dialogs */}
                <EditGuestDialog isUpdatingGuest={isUpdatingGuest} isEditGuestDialogOpen={isEditGuestDialogOpen} setIsEditGuestDialogOpen={setIsEditGuestDialogOpen} guestToEdit={guest} {...{ editGuestForm, handleEditGuestSubmit }} />
                <PaymentDialog isPaymentDialogOpen={isPaymentDialogOpen} setIsPaymentDialogOpen={setIsPaymentDialogOpen} selectedGuestForPayment={selectedGuestForPayment} paymentForm={paymentForm} handlePaymentSubmit={handlePaymentSubmit} isRecordingPayment={isRecordingPayment} />

                <Dialog open={isReminderDialogOpen} onOpenChange={setIsReminderDialogOpen}>
                    <DialogContent><DialogHeader><DialogTitle>Send Rent Reminder</DialogTitle><DialogDescription>A reminder message has been generated for {guest.name}. You can copy it or send it directly via WhatsApp.</DialogDescription></DialogHeader><div className="py-4">{isGeneratingReminder ? (<div className="space-y-2"><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-3/4" /></div>) : (<Textarea readOnly value={reminderMessage} rows={6} className="bg-muted/50" />)}</div><DialogFooter className="gap-2 sm:justify-end"><Button variant="secondary" onClick={() => { navigator.clipboard.writeText(reminderMessage); toast({ title: "Copied!", description: "Reminder message copied to clipboard." }) }}><Copy className="mr-2 h-4 w-4" /> Copy</Button><a href={`https://wa.me/${guest.phone}?text=${encodeURIComponent(reminderMessage)}`} target="_blank" rel="noopener noreferrer" className="w-full sm:w-auto"><Button className="w-full bg-green-500 hover:bg-green-600 text-white"><MessageCircle className="mr-2 h-4 w-4" /> Send on WhatsApp</Button></a></DialogFooter></DialogContent>
                </Dialog>

                <Dialog open={!!generatedPassword} onOpenChange={(open) => !open && setGeneratedPassword('')}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>New Password Generated</DialogTitle>
                            <DialogDescription>
                                A new password has been generated for {guest.name}. Please share this with them securely.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="flex items-center justify-center p-6 bg-muted rounded-md relative group">
                            <span className="text-3xl font-mono tracking-widest font-bold">{generatedPassword}</span>
                        </div>
                        <DialogFooter className="flex-col sm:flex-row items-center gap-2 mt-4">
                            <Button className="w-full sm:w-auto" variant="secondary" onClick={() => { navigator.clipboard.writeText(generatedPassword || ''); toast({ title: "Copied!", description: "Password copied to clipboard." }) }}>
                                <Copy className="mr-2 h-4 w-4" /> Copy Password
                            </Button>
                            <a className="w-full sm:w-auto flex-1" href={`https://wa.me/${guest.phone}?text=${encodeURIComponent(`Hi ${guest.name}, your new login password for RoomBox is: *${generatedPassword}*\n\nPlease login at ${typeof window !== 'undefined' ? window.location.origin : process.env.NEXT_PUBLIC_APP_URL}/login`)}`} target="_blank" rel="noopener noreferrer">
                                <Button className="w-full bg-green-500 hover:bg-green-600 text-white">
                                    <MessageCircle className="mr-2 h-4 w-4" /> Share via WhatsApp
                                </Button>
                            </a>
                        </DialogFooter>
                    </DialogContent>
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
                                                    <span><FileUp className="mr-2 h-4 w-4" /> {documentUris[config.id] ? "Change" : "Upload"}</span>
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
                                {isSubmittingKyc ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
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

            <AlertDialog open={isVacateDialogOpen} onOpenChange={setIsVacateDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Vacate {guest.name} Immediately?</AlertDialogTitle>
                        <AlertDialogDescription asChild>
                            <div className="space-y-4">
                                <p>This will immediately vacate the guest from their bed. This action cannot be undone.</p>
                                {(() => {
                                    const depositAmount = guest.depositAmount || 0;
                                    const currentBalance = (guest.ledger || []).reduce((acc, entry) =>
                                        acc + (entry.type === 'debit' ? entry.amount : -entry.amount), 0
                                    );
                                    const finalSettlementAmount = depositAmount - currentBalance;

                                    return (
                                        <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-md border text-sm text-foreground">
                                            <div className="flex justify-between py-1 text-muted-foreground">
                                                <span>Security Deposit:</span>
                                                <span className="font-medium text-foreground">₹{depositAmount.toLocaleString('en-IN')}</span>
                                            </div>
                                            <div className="flex justify-between py-1 text-muted-foreground">
                                                <span>Unpaid Balance (Dues):</span>
                                                <span className="font-medium text-foreground">₹{currentBalance.toLocaleString('en-IN')}</span>
                                            </div>
                                            <div className="h-px bg-border my-2" />
                                            <div className="flex justify-between py-1 font-semibold">
                                                <span>Final Settlement:</span>
                                                <span className={cn(finalSettlementAmount > 0 ? "text-green-600" : finalSettlementAmount < 0 ? "text-red-600" : "")}>
                                                    {finalSettlementAmount > 0
                                                        ? `Refund ₹${finalSettlementAmount.toLocaleString('en-IN')}`
                                                        : finalSettlementAmount < 0
                                                            ? `Owes ₹${Math.abs(finalSettlementAmount).toLocaleString('en-IN')}`
                                                            : `₹0`}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })()}
                                <div className="flex items-center space-x-2 pt-2">
                                    <Checkbox id="sendWhatsAppGuest" checked={sendWhatsAppOnExit} onCheckedChange={(checked) => setSendWhatsAppOnExit(!!checked)} />
                                    <Label htmlFor="sendWhatsAppGuest" className="text-sm cursor-pointer text-foreground">Send Settlement details via WhatsApp</Label>
                                </div>
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={handleConfirmImmediateExit}>Confirm Vacate</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <Dialog open={isMagicLinkDialogOpen} onOpenChange={setIsMagicLinkDialogOpen}>
                <DialogContent className="max-w-[95vw] sm:max-w-md rounded-2xl p-0 overflow-hidden border-none shadow-2xl flex flex-col">
                    <DialogHeader className="p-4 sm:p-6 pb-0">
                        <DialogTitle className="text-lg sm:text-xl font-bold tracking-tight">Tenant Login Setup</DialogTitle>
                        <DialogDescription className="text-xs sm:text-sm">Share either the link or the 6-digit code for instant login.</DialogDescription>
                    </DialogHeader>
                    
                    <div className="px-4 sm:px-6 py-4 space-y-4 sm:space-y-6 overflow-hidden">
                        <div className="space-y-3 overflow-hidden">
                             <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Option 1: 6-Digit Setup Code</Label>
                             <div className="flex items-center justify-between p-3 sm:p-4 bg-primary/5 rounded-2xl border border-primary/10 overflow-hidden">
                                 <span className="text-xl sm:text-3xl font-mono font-black tracking-normal sm:tracking-[0.3em] text-primary flex-1 min-w-0 truncate">{generatedSetupCode}</span>
                                 <Button size="icon" variant="secondary" className="h-9 w-9 rounded-xl shadow-sm shrink-0 ml-2" onClick={() => { navigator.clipboard.writeText(generatedSetupCode); toast({ title: "Code Copied!" }) }}>
                                     <Copy className="h-4 w-4" />
                                 </Button>
                             </div>
                             <p className="text-[10px] text-muted-foreground/60 text-center font-medium">Valid for 24 hours</p>
                        </div>

                        <div className="relative">
                            <div className="absolute inset-0 flex items-center px-4"><span className="w-full border-t border-border/50" /></div>
                            <div className="relative flex justify-center text-[10px] font-bold uppercase"><span className="bg-background px-3 text-muted-foreground/40">OR</span></div>
                        </div>

                        <div className="space-y-3 overflow-hidden">
                            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Option 2: One-Tap Magic Link</Label>
                            <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-xl border border-border/50 overflow-hidden group">
                                <LinkIcon className="h-4 w-4 text-muted-foreground/50 shrink-0 group-hover:text-primary transition-colors" />
                                <div className="text-[11px] sm:text-xs font-mono truncate text-muted-foreground/80 flex-1 min-w-0 select-all">{generatedMagicLink}</div>
                                <Button size="icon" variant="ghost" className="shrink-0 h-8 w-8 rounded-lg" onClick={() => { navigator.clipboard.writeText(generatedMagicLink); toast({ title: "Link Copied!" }) }}>
                                    <Copy className="h-3.5 w-3.5" />
                                </Button>
                            </div>
                        </div>
                    </div>

                    <div className="p-4 sm:p-6 pt-0 mt-auto">
                        <Button className="w-full bg-[#25D366] hover:bg-[#128C7E] text-white font-bold h-12 rounded-xl shadow-lg shadow-green-500/20 group transition-all active:scale-[0.98] overflow-hidden" asChild>
                            <a href={`https://wa.me/${guest?.phone}?text=${encodeURIComponent(`Hi ${guest?.name}, here is your login setup for ${pg?.name || 'the property'}:\n\n✅ *Invite Code:* ${generatedSetupCode}\n\n🔗 *Or click to login:* ${generatedMagicLink}`)}`} target="_blank" rel="noopener noreferrer">
                                <MessageCircle className="mr-2 h-5 w-5 shrink-0 animate-pulse group-hover:animate-none" /> 
                                <span className="truncate">Share on WhatsApp</span>
                            </a>
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    )
}
