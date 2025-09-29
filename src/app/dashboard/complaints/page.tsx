

'use client'

import { useState, useMemo, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAppDispatch, useAppSelector } from '@/lib/hooks'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ShieldAlert, Send, PlusCircle, Image as ImageIcon, XCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Complaint } from '@/lib/types'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose, DialogTrigger } from '@/components/ui/dialog'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { addOwnerComplaint, updateComplaint as updateComplaintAction } from '@/lib/slices/complaintsSlice'
import { canAccess } from '@/lib/permissions'
import Access from '@/components/ui/PermissionWrapper'
import { useToast } from '@/hooks/use-toast'
import { createAndSendNotification } from '@/lib/actions/notificationActions'
import { format, formatDistanceToNow } from 'date-fns'
import { ThumbsUp, Lightbulb } from 'lucide-react'
import { suggestComplaintSolution } from '@/ai/flows/suggest-complaint-solution'
import { Alert, AlertTitle } from '@/components/ui/alert'
import Image from 'next/image'
import { Switch } from '@/components/ui/switch'
import { uploadDataUriToStorage } from '@/lib/storage'

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

const ownerComplaintSchema = z.object({
  pgId: z.string().min(1, 'Please select a property.'),
  floorId: z.string().optional(),
  roomId: z.string().optional(),
  guestId: z.string().optional(),
  category: z.enum(['maintenance', 'cleanliness', 'wifi', 'food', 'other']),
  description: z.string().min(10, 'A detailed description is required.'),
  imageUrls: z.array(z.string()).optional(),
  isPublic: z.boolean().default(true),
});
type OwnerComplaintFormValues = z.infer<typeof ownerComplaintSchema>;


const ComplaintsView = () => {
    const dispatch = useAppDispatch();
    const { complaints } = useAppSelector(state => state.complaints);
    const { pgs } = useAppSelector(state => state.pgs);
    const { guests } = useAppSelector(state => state.guests);
    const { selectedPgId } = useAppSelector(state => state.app);
    const { currentUser } = useAppSelector(state => state.user);
    const { toast } = useToast();

    const [isOwnerComplaintDialogOpen, setIsOwnerComplaintDialogOpen] = useState(false);
    const [imagePreviews, setImagePreviews] = useState<string[]>([]);


    const form = useForm<OwnerComplaintFormValues>({
        resolver: zodResolver(ownerComplaintSchema),
        defaultValues: { 
          pgId: selectedPgId || (pgs.length > 0 ? pgs[0].id : undefined),
          isPublic: false,
          imageUrls: [],
        },
    });
    
    const selectedPgForForm = form.watch('pgId');
    const selectedFloorForForm = form.watch('floorId');
    const selectedRoomForForm = form.watch('roomId');

    const floorsInSelectedPg = useMemo(() => pgs.find(p => p.id === selectedPgForForm)?.floors || [], [pgs, selectedPgForForm]);
    const roomsInSelectedFloor = useMemo(() => floorsInSelectedPg.find(f => f.id === selectedFloorForForm)?.rooms || [], [floorsInSelectedPg, selectedFloorForForm]);
    const bedsInSelectedRoom = useMemo(() => roomsInSelectedFloor.find(r => r.id === selectedRoomForForm)?.beds || [], [roomsInSelectedFloor, selectedRoomForForm]);
    
    const guestsInSelectedRoom = useMemo(() => {
        if (!selectedRoomForForm) return [];
        const bedIdsInRoom = new Set(bedsInSelectedRoom.map(b => b.id));
        return guests.filter(g => g.bedId && bedIdsInRoom.has(g.bedId) && !g.isVacated);
    }, [guests, bedsInSelectedRoom, selectedRoomForForm]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if ((imagePreviews.length + files.length) > 3) {
            toast({ variant: 'destructive', title: 'Too many files', description: 'You can upload a maximum of 3 photos.' });
            return;
        }
        const newPreviews: string[] = [];
        const newImageUrls: string[] = [];
        files.forEach(file => {
            const reader = new FileReader();
            reader.onload = (event) => {
                const dataUri = event.target?.result as string;
                newPreviews.push(dataUri);
                newImageUrls.push(dataUri);
                if (newPreviews.length === files.length) {
                    setImagePreviews(prev => [...prev, ...newPreviews]);
                    form.setValue('imageUrls', [...(form.getValues('imageUrls') || []), ...newImageUrls], { shouldValidate: true });
                }
            };
            reader.readAsDataURL(file);
        });
    };
    
    const handleRemoveImage = (indexToRemove: number) => {
        setImagePreviews(prev => prev.filter((_, index) => index !== indexToRemove));
        const currentUrls = form.getValues('imageUrls') || [];
        form.setValue('imageUrls', currentUrls.filter((_, index) => index !== indexToRemove), { shouldValidate: true });
    };

    const handleOwnerComplaintSubmit = async (data: OwnerComplaintFormValues) => {
        if (!currentUser) return;

        try {
            const uploadedImageUrls = [];
            if (data.imageUrls && data.imageUrls.length > 0) {
                for (const dataUri of data.imageUrls) {
                    if (dataUri.startsWith('data:')) {
                        const url = await uploadDataUriToStorage(dataUri, `complaints/${currentUser.id}/${Date.now()}`);
                        uploadedImageUrls.push(url);
                    } else {
                        uploadedImageUrls.push(dataUri);
                    }
                }
            }

            const submissionData = {
                ...data,
                guestId: data.guestId === "none" ? undefined : data.guestId,
                imageUrls: uploadedImageUrls,
            };

            const resultAction = await dispatch(addOwnerComplaint(submissionData));
            
            if (addOwnerComplaint.fulfilled.match(resultAction)) {
                const newComplaint = resultAction.payload;
                if (newComplaint.guestId) {
                    const guest = guests.find(g => g.id === newComplaint.guestId);
                    if(guest?.userId) {
                        await createAndSendNotification({
                            ownerId: currentUser.id,
                            notification: {
                                type: 'complaint-update',
                                title: `Your manager logged a complaint`,
                                message: `An issue was logged for: "${newComplaint.description.substring(0, 50)}..."`,
                                link: '/tenants/complaints',
                                targetId: guest.userId,
                            }
                        });
                    }
                }
                toast({ title: 'Complaint Logged', description: 'The new issue has been added to the board.'});
                setIsOwnerComplaintDialogOpen(false);
                form.reset({ pgId: selectedPgId || pgs[0]?.id, isPublic: false, imageUrls: [] });
                setImagePreviews([]);
            } else {
                throw new Error(resultAction.payload as string || 'An unknown error occurred.');
            }
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Failed to log complaint', description: error.message });
        }
    };


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
      <Dialog open={isOwnerComplaintDialogOpen} onOpenChange={(open) => {
          setIsOwnerComplaintDialogOpen(open);
          if (!open) {
              setImagePreviews([]); // Clear previews on close
              form.reset({ pgId: selectedPgId || pgs[0]?.id, isPublic: false, imageUrls: [] });
          }
      }}>
        <Card>
            <CardHeader className="flex flex-row items-start justify-between">
                <div>
                  <CardTitle>Open Complaints</CardTitle>
                  <CardDescription>
                      Showing complaints {selectedPgId ? `for ${pgs.find(p => p.id === selectedPgId)?.name}` : 'for all properties'}.
                  </CardDescription>
                </div>
                <Access feature="complaints" action="add">
                    <DialogTrigger asChild>
                        <Button><PlusCircle className="mr-2 h-4 w-4"/>Raise Complaint</Button>
                    </DialogTrigger>
                </Access>
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
                                    <TableHead>Location</TableHead>
                                    <TableHead>Reported By</TableHead>
                                    <TableHead className="w-[30%]">Description</TableHead>
                                    <TableHead>Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredComplaints.map((complaint) => (
                                    <TableRow key={complaint.id}>
                                        <TableCell>{format(new Date(complaint.date), 'dd MMM, yyyy')}</TableCell>
                                        <TableCell>{complaint.pgName || pgs.find(p=>p.id === complaint.pgId)?.name}</TableCell>
                                        <TableCell className="text-xs">
                                          {complaint.floorId && <div>Floor: {pgs.flatMap(p=>p.floors || []).find(f=>f.id === complaint.floorId)?.name}</div>}
                                          {complaint.roomId && <div>Room: {pgs.flatMap(p=>p.floors || []).flatMap(f=>f.rooms).find(r=>r.id === complaint.roomId)?.name}</div>}
                                        </TableCell>
                                        <TableCell>{complaint.guestName}</TableCell>
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
                                    <p className="text-sm text-muted-foreground">{format(new Date(complaint.date), 'dd MMM')}</p>
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
        <DialogContent className="max-w-2xl">
            <DialogHeader>
                <DialogTitle>Raise a New Complaint</DialogTitle>
                <DialogDescription>Log an issue for a property, room, or specific guest.</DialogDescription>
            </DialogHeader>
            <Form {...form}>
                <form id="owner-complaint-form" onSubmit={form.handleSubmit(handleOwnerComplaintSubmit)} className="space-y-4 pt-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FormField control={form.control} name="pgId" render={({ field }) => (
                            <FormItem><FormLabel>Property</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent>{pgs.map(pg => <SelectItem key={pg.id} value={pg.id}>{pg.name}</SelectItem>)}</SelectContent></Select><FormMessage/></FormItem>
                        )}/>
                        <FormField control={form.control} name="floorId" render={({ field }) => (
                            <FormItem><FormLabel>Floor (Optional)</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent>{floorsInSelectedPg.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}</SelectContent></Select><FormMessage/></FormItem>
                        )}/>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FormField control={form.control} name="roomId" render={({ field }) => (
                            <FormItem><FormLabel>Room (Optional)</FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={!selectedFloorForForm}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent>{roomsInSelectedFloor.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}</SelectContent></Select><FormMessage/></FormItem>
                        )}/>
                        <FormField control={form.control} name="guestId" render={({ field }) => (
                            <FormItem><FormLabel>For Guest (Optional)</FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={!selectedRoomForForm}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent><SelectItem value="none">General / None</SelectItem>{guestsInSelectedRoom.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}</SelectContent></Select><FormMessage/></FormItem>
                        )}/>
                    </div>
                    <FormField control={form.control} name="category" render={({ field }) => (
                        <FormItem><FormLabel>Category</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent>{['maintenance', 'cleanliness', 'wifi', 'food', 'other'].map(c=><SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}</SelectContent></Select><FormMessage/></FormItem>
                    )}/>
                    <FormField control={form.control} name="description" render={({ field }) => (
                        <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea rows={4} placeholder="Describe the issue..." {...field}/></FormControl><FormMessage/></FormItem>
                    )}/>
                     <FormField
                        control={form.control}
                        name="imageUrls"
                        render={() => (
                            <FormItem>
                                <FormLabel>Upload Photos (Optional, max 3)</FormLabel>
                                <FormControl>
                                    <Input type="file" accept="image/*" multiple onChange={handleFileChange} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                         )}
                     />
                     {imagePreviews.length > 0 && (
                        <div className="flex gap-2 flex-wrap">
                            {imagePreviews.map((src, i) => (
                                <div key={i} className="relative w-20 h-20">
                                    <Image src={src} alt={`Preview ${i+1}`} fill sizes="80px" className="rounded-md object-cover border" />
                                    <Button
                                        type="button"
                                        variant="destructive"
                                        size="icon"
                                        className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                                        onClick={() => handleRemoveImage(i)}
                                    >
                                        <XCircle className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                     )}
                </form>
            </Form>
            <DialogFooter>
                <DialogClose asChild><Button variant="secondary">Cancel</Button></DialogClose>
                <Button type="submit" form="owner-complaint-form">Submit Complaint</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    );
};

const NoticeBoardView = () => {
    const { guests } = useAppSelector(state => state.guests);
    const { selectedPgId } = useAppSelector(state => state.app);
    const { currentUser } = useAppSelector(state => state.user);
    const { toast } = useToast();
    const [isNoticeDialogOpen, setIsNoticeDialogOpen] = useState(false);
    
    const form = useForm<NoticeFormValues>({
        resolver: zodResolver(noticeSchema),
        defaultValues: { title: '', message: '' },
    });

    const handleSendNotice = async (data: NoticeFormValues) => {
        if (!currentUser?.id) return;
        const activeGuests = guests.filter(g => 
            !g.isVacated && g.userId && (!selectedPgId || g.pgId === selectedPgId)
        );

        if (activeGuests.length === 0) {
            toast({ variant: 'destructive', title: "No Guests", description: "There are no active guests to send this notice to."});
            return;
        }

        try {
            await Promise.all(activeGuests.map(guest => 
                createAndSendNotification({
                    ownerId: currentUser.id,
                    notification: {
                        type: 'announcement',
                        title: data.title,
                        message: data.message,
                        link: '/tenants/my-pg',
                        targetId: guest.userId!
                    }
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
                <TabsTrigger value="complaints">
                    <span className="sm:hidden">Issues</span>
                    <span className="hidden sm:inline">Complaints</span>
                </TabsTrigger>
                <TabsTrigger value="notice-board">
                    <span className="sm:hidden">Notices</span>
                    <span className="hidden sm:inline">Notice Board</span>
                </TabsTrigger>
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
