

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
import { ShieldAlert, Send, PlusCircle, Image as ImageIcon, XCircle, Users, Home, Building as BuildingIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Complaint } from '@/lib/types'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose, DialogTrigger } from '@/components/ui/dialog'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { addOwnerComplaint } from '@/lib/slices/complaintsSlice'
import { canAccess } from '@/lib/permissions'
import Access from '@/components/ui/PermissionWrapper'
import { useToast } from '@/hooks/use-toast'
import { createAndSendNotification } from '@/lib/actions/notificationActions'
import { formatDistanceToNow } from 'date-fns'
import { ThumbsUp, Lightbulb } from 'lucide-react'
import { suggestComplaintSolution } from '@/ai/flows/suggest-complaint-solution'
import { Alert, AlertTitle } from '@/components/ui/alert'
import Image from 'next/image'
import { Switch } from '@/components/ui/switch'
import { uploadDataUriToStorage } from '@/lib/storage'
import MultiSelect from '@/components/dashboard/add-room/MultiSelect'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'

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
  pgIds: z.array(z.string()).min(1, 'Please select at least one property.'),
  targetType: z.enum(['general', 'specific']).default('general'),
  roomIds: z.array(z.string()).optional(),
  guestIds: z.array(z.string()).optional(),
  category: z.enum(['maintenance', 'cleanliness', 'wifi', 'food', 'other']),
  description: z.string().min(10, 'A detailed description is required.'),
  imageUrls: z.array(z.string()).optional(),
  isPublic: z.boolean().default(true),
});
type OwnerComplaintFormValues = z.infer<typeof ownerComplaintSchema>;

const ComplaintsView = ({onRaiseComplaintClick}: {onRaiseComplaintClick: () => void}) => {
    const dispatch = useAppDispatch();
    const { complaints } = useAppSelector(state => state.complaints);
    const { pgs } = useAppSelector(state => state.pgs);
    const { selectedPgId } = useAppSelector(state => state.app);
    const { currentUser } = useAppSelector(state => state.user);

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
            <CardHeader className="flex flex-row items-start justify-between">
                <div>
                  <CardTitle>Open Complaints</CardTitle>
                  <CardDescription>
                      Showing complaints {selectedPgId ? `for ${pgs.find(p => p.id === selectedPgId)?.name}` : 'for all properties'}.
                  </CardDescription>
                </div>
                <Access feature="complaints" action="add">
                    <Button onClick={onRaiseComplaintClick}><PlusCircle className="mr-2 h-4 w-4"/>Raise Complaint</Button>
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
                                        <TableCell>{new Date(complaint.date).toLocaleDateString()}</TableCell>
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
                                    <p className="text-sm text-muted-foreground">{formatDistanceToNow(new Date(complaint.date), { addSuffix: true })}</p>
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
    const { isLoading, selectedPgId } = useAppSelector(state => state.app)
    const { pgs } = useAppSelector(state => state.pgs);
    const { guests } = useAppSelector(state => state.guests);
    const { currentUser } = useAppSelector(state => state.user);
    const dispatch = useAppDispatch();
    const { toast } = useToast();

    const [isOwnerComplaintDialogOpen, setIsOwnerComplaintDialogOpen] = useState(false);
    const [imagePreviews, setImagePreviews] = useState<string[]>([]);
    
    const form = useForm<OwnerComplaintFormValues>({
        resolver: zodResolver(ownerComplaintSchema),
        defaultValues: {
          pgIds: selectedPgId ? [selectedPgId] : [],
          targetType: 'general',
          isPublic: false,
          imageUrls: [],
        },
    });

    const { watch, setValue } = form;
    const selectedPgIds = watch('pgIds', []);
    const targetType = watch('targetType');

    const pgOptions = useMemo(() => pgs.map(pg => ({ id: pg.id, label: pg.name })), [pgs]);

    const roomOptions = useMemo(() => {
        return pgs
            .filter(pg => selectedPgIds.includes(pg.id))
            .flatMap(pg => pg.floors?.flatMap(f => f.rooms.map(r => ({ id: r.id, label: `${r.name} (${pg.name})` }))) || []);
    }, [pgs, selectedPgIds]);

    const guestOptions = useMemo(() => {
        return guests
            .filter(g => selectedPgIds.includes(g.pgId) && !g.isVacated)
            .map(g => ({ id: g.id, label: `${g.name} (${g.pgName})` }));
    }, [guests, selectedPgIds]);


    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if ((imagePreviews.length + files.length) > 3) {
            toast({ variant: 'destructive', title: 'Too many files', description: 'You can upload a maximum of 3 photos.' });
            return;
        }
        const newPreviews: string[] = [];
        files.forEach(file => {
            const reader = new FileReader();
            reader.onload = (event) => {
                const dataUri = event.target?.result as string;
                newPreviews.push(dataUri);
                if (newPreviews.length === files.length) {
                    setImagePreviews(prev => [...prev, ...newPreviews]);
                    setValue('imageUrls', [...(form.getValues('imageUrls') || []), ...newPreviews], { shouldValidate: true });
                }
            };
            reader.readAsDataURL(file);
        });
    };
    
    const handleRemoveImage = (indexToRemove: number) => {
        setImagePreviews(prev => prev.filter((_, index) => index !== indexToRemove));
        const currentUrls = form.getValues('imageUrls') || [];
        setValue('imageUrls', currentUrls.filter((_, index) => index !== indexToRemove), { shouldValidate: true });
    };

    const handleOwnerComplaintSubmit = async (data: OwnerComplaintFormValues) => {
        if (!currentUser) return;
    
        try {
            let uploadedImageUrls: string[] = [];
            if (data.imageUrls && data.imageUrls.length > 0) {
                 uploadedImageUrls = await Promise.all(
                    data.imageUrls.map(uri => {
                        if (uri.startsWith('data:')) {
                            return uploadDataUriToStorage(uri, `complaints/${currentUser.id}/${Date.now()}`);
                        }
                        return Promise.resolve(uri);
                    })
                );
            }
    
            const submissionData = {
                ...data,
                imageUrls: uploadedImageUrls,
            };
    
            const resultAction = await dispatch(addOwnerComplaint(submissionData));
            
            if (addOwnerComplaint.fulfilled.match(resultAction)) {
                toast({ title: 'Complaint(s) Logged', description: 'The new issue has been added to the board.'});
                setIsOwnerComplaintDialogOpen(false);
                form.reset({ pgIds: selectedPgId ? [selectedPgId] : [], targetType: 'general', isPublic: false, imageUrls: [] });
                setImagePreviews([]);
            } else {
                throw new Error(resultAction.payload as string || 'An unknown error occurred.');
            }
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Failed to log complaint', description: error.message });
        }
    };
    
    const handleRaiseComplaintClick = () => {
        form.reset({
            pgIds: selectedPgId ? [selectedPgId] : [],
            targetType: 'general',
            roomIds: [],
            guestIds: [],
            category: undefined,
            description: '',
            imageUrls: [],
            isPublic: false
        });
        setImagePreviews([]);
        setIsOwnerComplaintDialogOpen(true);
    };

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
                <ComplaintsView onRaiseComplaintClick={handleRaiseComplaintClick} />
            </TabsContent>
            <TabsContent value="notice-board">
                <NoticeBoardView />
            </TabsContent>
        </Tabs>
         <Dialog open={isOwnerComplaintDialogOpen} onOpenChange={setIsOwnerComplaintDialogOpen}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Raise a New Complaint</DialogTitle>
                    <DialogDescription>Log an issue for one or more properties, rooms, or guests.</DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form id="owner-complaint-form" onSubmit={form.handleSubmit(handleOwnerComplaintSubmit)} className="space-y-4 pt-4">
                        <FormField
                            control={form.control}
                            name="pgIds"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Select Properties</FormLabel>
                                    <MultiSelect options={pgOptions} selected={field.value} onChange={field.onChange} placeholder="Choose properties..."/>
                                    <FormMessage/>
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="targetType"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Complaint For?</FormLabel>
                                    <RadioGroup onValueChange={field.onChange} value={field.value} className="flex gap-4">
                                        <FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="general" /></FormControl><FormLabel className="font-normal flex items-center gap-2"><BuildingIcon className="w-4 h-4"/>General / Property-wide</FormLabel></FormItem>
                                        <FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="specific" /></FormControl><FormLabel className="font-normal flex items-center gap-2"><Users className="w-4 h-4"/>Specific Rooms/Guests</FormLabel></FormItem>
                                    </RadioGroup>
                                </FormItem>
                            )}
                        />
                         {targetType === 'specific' && (
                             <div className="pl-4 border-l-2 space-y-4">
                                 <FormField
                                    control={form.control}
                                    name="roomIds"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Select Rooms (Optional)</FormLabel>
                                            <MultiSelect options={roomOptions} selected={field.value || []} onChange={field.onChange} placeholder="Choose rooms..."/>
                                            <FormMessage/>
                                        </FormItem>
                                    )}
                                />
                                 <FormField
                                    control={form.control}
                                    name="guestIds"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Select Guests (Optional)</FormLabel>
                                            <MultiSelect options={guestOptions} selected={field.value || []} onChange={field.onChange} placeholder="Choose guests..."/>
                                            <FormMessage/>
                                        </FormItem>
                                    )}
                                />
                             </div>
                        )}
                        <FormField control={form.control} name="category" render={({ field }) => (
                            <FormItem><FormLabel>Category</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select a category..."/></SelectTrigger></FormControl><SelectContent>{['maintenance', 'cleanliness', 'wifi', 'food', 'other'].map(c=><SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}</SelectContent></Select><FormMessage/></FormItem>
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
                                        <Image src={src} alt={`Preview ${i+1}`} layout="fill" objectFit="cover" className="rounded-md border" />
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
      </Access>
    )
}
