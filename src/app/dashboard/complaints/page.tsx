
'use client'

import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAppDispatch, useAppSelector } from '@/lib/hooks'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ShieldAlert, Send } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Complaint } from '@/lib/types'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose, DialogTrigger } from '@/components/ui/dialog'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { updateComplaint as updateComplaintAction } from '@/lib/slices/complaintsSlice'
import { canAccess } from '@/lib/permissions'
import Access from '@/components/ui/PermissionWrapper'
import SubscriptionDialog from '@/components/dashboard/dialogs/SubscriptionDialog'
import { useToast } from '@/hooks/use-toast'
import { sendNotification } from '@/ai/flows/send-notification-flow'


const statusColors: Record<Complaint['status'], string> = {
    open: "bg-red-100 text-red-800",
    "in-progress": "bg-yellow-100 text-yellow-800",
    resolved: "bg-green-100 text-green-800",
}

const noticeSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters long."),
  message: z.string().min(10, "Message must be at least 10 characters long."),
})
type NoticeFormValues = z.infer<typeof noticeSchema>

const ComplaintsView = () => {
    const dispatch = useAppDispatch()
    const { complaints } = useAppSelector(state => state.complaints)
    const { pgs } = useAppSelector(state => state.pgs)
    const { selectedPgId } = useAppSelector(state => state.app)

    const filteredComplaints = useMemo(() => {
        if (!selectedPgId) return complaints;
        return complaints.filter(c => c.pgId === selectedPgId);
    }, [complaints, selectedPgId]);

    const handleStatusChange = (complaintId: string, newStatus: Complaint['status']) => {
        const complaintToUpdate = complaints.find(c => c.id === complaintId)
        if (complaintToUpdate) {
            dispatch(updateComplaintAction({ ...complaintToUpdate, status: newStatus }))
        }
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Open Complaints</CardTitle>
                <CardDescription>
                    Showing complaints {selectedPgId ? `for ${pgs.find(p => p.id === selectedPgId)?.name}` : 'for all properties'}.
                </CardDescription>
            </CardHeader>
            <CardContent>
                {filteredComplaints.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground">No complaints here. Great job!</div>
                 ) : (
                    <>
                    {/* Desktop Table View */}
                    <div className="hidden md:block">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Property</TableHead>
                                    <TableHead>Guest</TableHead>
                                    <TableHead>Category</TableHead>
                                    <TableHead className="w-[40%]">Description</TableHead>
                                    <TableHead>Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredComplaints.map((complaint) => (
                                    <TableRow key={complaint.id}>
                                        <TableCell>{complaint.date}</TableCell>
                                        <TableCell>{complaint.pgName || pgs.find(p=>p.id === complaint.pgId)?.name}</TableCell>
                                        <TableCell>{complaint.guestName}</TableCell>
                                        <TableCell className="capitalize">{complaint.category}</TableCell>
                                        <TableCell className="truncate">{complaint.description}</TableCell>
                                        <TableCell>
                                            <Access feature="complaints" action="edit">
                                                <Select value={complaint.status} onValueChange={(value) => handleStatusChange(complaint.id, value as Complaint['status'])}>
                                                    <SelectTrigger className="w-[140px]">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {Object.keys(statusColors).map(status => (
                                                            <SelectItem key={status} value={status}>
                                                                <div className="flex items-center gap-2">
                                                                    <span className={cn("h-2 w-2 rounded-full", statusColors[status as Complaint['status']])} />
                                                                    <span className="capitalize">{status}</span>
                                                                </div>
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </Access>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                    {/* Mobile Card View */}
                    <div className="md:hidden grid gap-4">
                        {filteredComplaints.map((complaint) => (
                            <div key={complaint.id} className="p-4 border rounded-lg flex flex-col gap-3 bg-muted/20 dark:bg-muted/40">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="font-bold">{complaint.guestName}</p>
                                        <p className="text-sm text-muted-foreground">{complaint.pgName || pgs.find(p => p.id === complaint.pgId)?.name}</p>
                                    </div>
                                    <p className="text-sm text-muted-foreground">{complaint.date}</p>
                                </div>
                                <p className="text-sm">{complaint.description}</p>
                                <div className="flex justify-between items-center text-sm">
                                    <Badge variant="outline" className="capitalize">{complaint.category}</Badge>
                                    <Access feature="complaints" action="edit">
                                        <Select value={complaint.status} onValueChange={(value) => handleStatusChange(complaint.id, value as Complaint['status'])}>
                                            <SelectTrigger className="w-[140px] h-9">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {Object.keys(statusColors).map(status => (
                                                    <SelectItem key={status} value={status}>
                                                        <div className="flex items-center gap-2">
                                                            <span className={cn("h-2 w-2 rounded-full", statusColors[status as Complaint['status']])} />
                                                            <span className="capitalize">{status}</span>
                                                        </div>
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </Access>
                                </div>
                            </div>
                        ))}
                    </div>
                    </>
                 )}
            </CardContent>
        </Card>
    );
};

const NoticeBoardView = () => {
    const { guests } = useAppSelector(state => state.guests);
    const { selectedPgId } = useAppSelector(state => state.app);
    const { toast } = useToast();
    const [isNoticeDialogOpen, setIsNoticeDialogOpen] = useState(false);
    
    const form = useForm<NoticeFormValues>({
        resolver: zodResolver(noticeSchema),
        defaultValues: { title: '', message: '' },
    });

    const handleSendNotice = async (data: NoticeFormValues) => {
        const activeGuests = guests.filter(g => 
            !g.isVacated && g.userId && (!selectedPgId || g.pgId === selectedPgId)
        );

        if (activeGuests.length === 0) {
            toast({ variant: 'destructive', title: "No Guests", description: "There are no active guests to send this notice to."});
            return;
        }

        try {
            await Promise.all(activeGuests.map(guest => 
                sendNotification({
                    userId: guest.userId!,
                    title: data.title,
                    body: data.message,
                    link: '/tenants/my-pg'
                })
            ));
            toast({ title: "Notice Sent!", description: `Your notice has been sent to ${activeGuests.length} guest(s).` });
            setIsNoticeDialogOpen(false);
            form.reset();
        } catch (error) {
            console.error("Failed to send notice:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not send the notice. Please try again.' });
        }
    }

    return (
        <Dialog open={isNoticeDialogOpen} onOpenChange={setIsNoticeDialogOpen}>
            <Card>
                <CardHeader>
                    <CardTitle>Notice Board</CardTitle>
                    <CardDescription>
                       Send announcements and important information to all active guests.
                    </CardDescription>
                </CardHeader>
                <CardContent className="text-center">
                    <DialogTrigger asChild>
                         <Button>
                            <Send className="mr-2 h-4 w-4"/> Create a New Notice
                        </Button>
                    </DialogTrigger>
                </CardContent>
            </Card>

            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Send New Notice</DialogTitle>
                    <DialogDescription>
                        This will send a push notification to all active guests in the selected property.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSendNotice)} id="notice-form" className="space-y-4 pt-4">
                        <FormField control={form.control} name="title" render={({ field }) => (
                            <FormItem><FormLabel>Title</FormLabel><FormControl><Input placeholder="e.g., Important Water Update" {...field} /></FormControl><FormMessage /></FormItem>
                        )}/>
                         <FormField control={form.control} name="message" render={({ field }) => (
                            <FormItem><FormLabel>Message</FormLabel><FormControl><Textarea rows={5} placeholder="e.g., Please note that there will be no water supply tomorrow from 10 AM to 2 PM." {...field} /></FormControl><FormMessage /></FormItem>
                        )}/>
                    </form>
                </Form>
                 <DialogFooter>
                    <DialogClose asChild><Button type="button" variant="secondary">Cancel</Button></DialogClose>
                    <Button type="submit" form="notice-form">Send Notice</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

export default function ComplaintsDashboardPage() {
    const { isLoading } = useAppSelector(state => state.app)
    const { currentPlan } = useAppSelector(state => state.user)
    const [isSubDialogOpen, setIsSubDialogOpen] = useState(false)

    if (!currentPlan?.hasComplaints) {
         return (
             <>
                <SubscriptionDialog open={isSubDialogOpen} onOpenChange={setIsSubDialogOpen} />
                <Card>
                    <CardHeader>
                        <CardTitle>Complaints Management</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col items-center justify-center text-center p-8 bg-muted/50 rounded-lg border">
                            <ShieldAlert className="mx-auto h-12 w-12 text-primary" />
                            <h2 className="mt-4 text-xl font-semibold">Feature Not Available</h2>
                            <p className="mt-2 text-muted-foreground max-w-sm">The complaints management feature is not included in your current plan. Please upgrade to access this feature.</p>
                            <Button className="mt-4" onClick={() => setIsSubDialogOpen(true)}>Upgrade Plan</Button>
                        </div>
                    </CardContent>
                </Card>
             </>
        )
    }

    if (isLoading) {
        return (
            <div className="flex flex-col gap-8">
                 <div>
                    <Skeleton className="h-9 w-64 mb-2" />
                    <Skeleton className="h-5 w-80" />
                </div>
                <Card>
                    <CardHeader>
                       <div className="space-y-2">
                         <Skeleton className="h-7 w-48" />
                         <Skeleton className="h-5 w-72" />
                       </div>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {Array.from({ length: 5 }).map((_, i) => (
                                <Skeleton key={i} className="h-12 w-full" />
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
      <Access feature="complaints" action="view">
         <Tabs defaultValue="complaints" className="w-full space-y-6">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="complaints">Complaints</TabsTrigger>
                <TabsTrigger value="notice-board">Notice Board</TabsTrigger>
            </TabsList>
            <TabsContent value="complaints">
                <ComplaintsView />
            </TabsContent>
            <TabsContent value="notice-board">
                <NoticeBoardView />
            </TabsContent>
        </Tabs>
      </Access>
    )
}
