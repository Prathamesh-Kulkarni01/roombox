
'use client'

import { useState, useMemo, useEffect } from "react"
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

import { useAppDispatch, useAppSelector } from "@/lib/hooks"
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"

import type { Guest, Complaint } from "@/lib/types"
import { ArrowLeft, User, IndianRupee, MessageCircle, ShieldCheck, Clock, Wallet, Home, LogOut, Copy, Calendar, Phone, Mail, Building, BedDouble } from "lucide-react"
import { format, addMonths, differenceInDays } from "date-fns"
import { cn } from "@/lib/utils"
import { generateRentReminder, type GenerateRentReminderInput } from '@/ai/flows/generate-rent-reminder'
import { useToast } from "@/hooks/use-toast"
import { updateGuest as updateGuestAction } from "@/lib/slices/guestsSlice"

const paymentSchema = z.object({
  amountPaid: z.coerce.number().min(0.01, "Payment amount must be greater than 0."),
  paymentMethod: z.enum(['cash', 'upi', 'in-app']),
});

const rentStatusColors: Record<Guest['rentStatus'], string> = {
  paid: 'bg-green-100 text-green-800 border-green-300',
  unpaid: 'bg-red-100 text-red-800 border-red-300',
  partial: 'bg-orange-100 text-orange-800 border-orange-300',
};

const kycStatusColors: Record<Guest['kycStatus'], string> = {
  verified: 'bg-blue-100 text-blue-800 border-blue-300',
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  rejected: 'bg-red-100 text-red-800 border-red-300'
};

const complaintStatusColors: Record<Complaint['status'], string> = {
    open: "bg-red-100 text-red-800",
    "in-progress": "bg-yellow-100 text-yellow-800",
    resolved: "bg-green-100 text-green-800",
}

export default function GuestProfilePage() {
    const params = useParams()
    const router = useRouter()
    const dispatch = useAppDispatch()
    const { toast } = useToast()
    const guestId = params.guestId as string
    
    const { guests } = useAppSelector(state => state.guests)
    const { complaints } = useAppSelector(state => state.complaints)
    const { isLoading } = useAppSelector(state => state.app)
    const { currentPlan } = useAppSelector(state => state.user)

    const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false)
    const [isReminderDialogOpen, setIsReminderDialogOpen] = useState(false)
    const [reminderMessage, setReminderMessage] = useState('')
    const [isGeneratingReminder, setIsGeneratingReminder] = useState(false)

    const guest = useMemo(() => guests.find(g => g.id === guestId), [guests, guestId])
    const guestComplaints = useMemo(() => complaints.filter(c => c.guestId === guestId), [complaints, guestId])

    const paymentForm = useForm<z.infer<typeof paymentSchema>>({
        resolver: zodResolver(paymentSchema),
        defaultValues: { paymentMethod: 'cash' }
    })

    useEffect(() => {
        if (guest) {
            const amountDue = guest.rentAmount - (guest.rentPaidAmount || 0)
            paymentForm.reset({ paymentMethod: 'cash', amountPaid: amountDue > 0 ? Number(amountDue.toFixed(2)) : 0 })
        }
    }, [guest, paymentForm])

    const handleInitiateExit = () => {
        if (!guest || guest.exitDate) return
        const exitDate = new Date()
        exitDate.setDate(exitDate.getDate() + guest.noticePeriodDays)
        const updatedGuest = { ...guest, exitDate: format(exitDate, 'yyyy-MM-dd') }
        dispatch(updateGuestAction(updatedGuest))
    }

    const handlePaymentSubmit = (values: z.infer<typeof paymentSchema>) => {
        if (!guest) return
        const newTotalPaid = (guest.rentPaidAmount || 0) + values.amountPaid
        let updatedGuest: Guest;
        if (newTotalPaid >= guest.rentAmount) {
            updatedGuest = { ...guest, rentStatus: 'paid', rentPaidAmount: 0, dueDate: format(addMonths(new Date(guest.dueDate), 1), 'yyyy-MM-dd') }
        } else {
            updatedGuest = { ...guest, rentStatus: 'partial', rentPaidAmount: newTotalPaid }
        }
        dispatch(updateGuestAction(updatedGuest))
        setIsPaymentDialogOpen(false)
    }

    const handleOpenReminderDialog = async () => {
        if (!guest || !currentPlan?.hasAiRentReminders) return
        setIsReminderDialogOpen(true)
        setIsGeneratingReminder(true)
        setReminderMessage('')

        try {
            const input: GenerateRentReminderInput = {
                guestName: guest.name,
                rentAmount: guest.rentAmount - (guest.rentPaidAmount || 0),
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
        <div className="flex flex-col gap-6">
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <h1 className="text-2xl font-bold">{guest.name}'s Profile</h1>
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
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>KYC Details</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex justify-between items-center">
                                <span>Status:</span>
                                <Badge variant="outline" className={cn("capitalize", kycStatusColors[guest.kycStatus])}>{guest.kycStatus}</Badge>
                            </div>
                            {guest.kycDocUrl && guest.kycStatus === 'verified' && (
                                <div>
                                    <p className="text-sm font-medium mb-2">Submitted Document:</p>
                                    <Link href={guest.kycDocUrl} target="_blank">
                                        <Image src={guest.kycDocUrl} alt="KYC Document" width={200} height={150} className="rounded-md border hover:opacity-80 transition-opacity" />
                                    </Link>
                                </div>
                            )}
                             {guest.kycStatus !== 'verified' && (
                                <Button className="w-full">Upload & Verify KYC</Button>
                             )}
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
                            <div className="flex justify-between items-center">
                                <span>Monthly Rent:</span>
                                <span className="font-medium">₹{guest.rentAmount.toLocaleString('en-IN')}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span>Amount Due:</span>
                                <span className="font-bold text-lg text-primary">₹{(guest.rentAmount - (guest.rentPaidAmount || 0)).toLocaleString('en-IN')}</span>
                            </div>
                             <div className="flex justify-between items-center">
                                <span>Next Due Date:</span>
                                <span className="font-medium">{format(new Date(guest.dueDate), "do MMM, yyyy")}</span>
                            </div>
                             <div className="flex justify-between items-center">
                                <span>Security Deposit:</span>
                                <span className="font-medium">₹{(guest.depositAmount || 0).toLocaleString('en-IN')}</span>
                            </div>
                        </CardContent>
                        <CardFooter className="flex flex-wrap gap-2">
                             {(guest.rentStatus === 'unpaid' || guest.rentStatus === 'partial') && !guest.exitDate && (
                                <Button onClick={() => setIsPaymentDialogOpen(true)}><Wallet className="mr-2 h-4 w-4" /> Collect Rent</Button>
                             )}
                              {(guest.rentStatus === 'unpaid' || guest.rentStatus === 'partial') && !guest.exitDate && currentPlan?.hasAiRentReminders && (
                                <Button variant="secondary" onClick={handleOpenReminderDialog}><MessageCircle className="mr-2 h-4 w-4" />Send Reminder</Button>
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
                     <Card>
                        <CardHeader>
                            <CardTitle>Stay Details</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 text-sm">
                           <div className="flex justify-between items-center">
                                <span>Move-in Date:</span>
                                <span className="font-medium">{format(new Date(guest.moveInDate), "do MMM, yyyy")}</span>
                            </div>
                             <div className="flex justify-between items-center">
                                <span>Notice Period:</span>
                                <span className="font-medium">{guest.noticePeriodDays} days</span>
                            </div>
                             <div className="flex justify-between items-center">
                                <span>Exit Status:</span>
                                {guest.exitDate ? (
                                    <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300">
                                        Exiting on {format(new Date(guest.exitDate), "do MMM, yyyy")} ({differenceInDays(new Date(guest.exitDate), new Date())} days left)
                                    </Badge>
                                ) : (
                                    <Badge variant="secondary">Active</Badge>
                                )}
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Button variant="outline" onClick={handleInitiateExit} disabled={!!guest.exitDate}>
                                <LogOut className="mr-2 h-4 w-4" />
                                {guest.exitDate ? 'Exit Already Initiated' : 'Initiate Exit'}
                            </Button>
                        </CardFooter>
                    </Card>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Complaint History</CardTitle>
                    <CardDescription>A log of all complaints raised by {guest.name}.</CardDescription>
                </CardHeader>
                <CardContent>
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
                                        <TableCell>{complaint.date}</TableCell>
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
                </CardContent>
            </Card>

            {/* Dialogs */}
            <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
                <DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>Collect Rent Payment</DialogTitle><DialogDescription>Record a full or partial payment for {guest.name}.</DialogDescription></DialogHeader><Form {...paymentForm}><form onSubmit={paymentForm.handleSubmit(handlePaymentSubmit)} id="payment-form" className="space-y-4"><div className="space-y-2 py-2"><p className="text-sm text-muted-foreground">Total Rent: <span className="font-medium text-foreground">₹{guest.rentAmount.toLocaleString('en-IN')}</span></p><p className="text-sm text-muted-foreground">Amount Due: <span className="font-bold text-lg text-foreground">₹{(guest.rentAmount - (guest.rentPaidAmount || 0)).toLocaleString('en-IN')}</span></p></div><FormField control={paymentForm.control} name="amountPaid" render={({ field }) => (<FormItem><FormLabel>Amount to Collect</FormLabel><FormControl><Input type="number" placeholder="Enter amount" {...field} /></FormControl><FormMessage /></FormItem>)} /><FormField control={paymentForm.control} name="paymentMethod" render={({ field }) => (<FormItem className="space-y-3"><FormLabel>Payment Method</FormLabel><FormControl><RadioGroup onValueChange={field.onChange} value={field.value} className="flex gap-4 pt-1"><FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="cash" id="cash" /></FormControl><FormLabel htmlFor="cash" className="font-normal cursor-pointer">Cash</FormLabel></FormItem><FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="upi" id="upi" /></FormControl><FormLabel htmlFor="upi" className="font-normal cursor-pointer">UPI</FormLabel></FormItem><FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="in-app" id="in-app" disabled /></FormControl><FormLabel htmlFor="in-app" className="font-normal text-muted-foreground">In-App (soon)</FormLabel></FormItem></RadioGroup></FormControl><FormMessage /></FormItem>)} /></form></Form><DialogFooter><DialogClose asChild><Button type="button" variant="secondary">Cancel</Button></DialogClose><Button type="submit" form="payment-form">Confirm Payment</Button></DialogFooter></DialogContent>
            </Dialog>

            <Dialog open={isReminderDialogOpen} onOpenChange={setIsReminderDialogOpen}>
                <DialogContent><DialogHeader><DialogTitle>Send Rent Reminder</DialogTitle><DialogDescription>A reminder message has been generated for {guest.name}. You can copy it or send it directly via WhatsApp.</DialogDescription></DialogHeader><div className="py-4">{isGeneratingReminder ? (<div className="space-y-2"><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-3/4" /></div>) : (<Textarea readOnly value={reminderMessage} rows={6} className="bg-muted/50" />)}</div><DialogFooter className="gap-2 sm:justify-end"><Button variant="secondary" onClick={() => { navigator.clipboard.writeText(reminderMessage); toast({ title: "Copied!", description: "Reminder message copied to clipboard." }) }}><Copy className="mr-2 h-4 w-4" /> Copy</Button><a href={`https://wa.me/${guest.phone}?text=${encodeURIComponent(reminderMessage)}`} target="_blank" rel="noopener noreferrer" className="w-full sm:w-auto"><Button className="w-full bg-green-500 hover:bg-green-600 text-white"><MessageCircle className="mr-2 h-4 w-4" /> Send on WhatsApp</Button></a></DialogFooter></DialogContent>
            </Dialog>
        </div>
    )
}
