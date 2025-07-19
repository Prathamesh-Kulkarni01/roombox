
'use client'

import { useState, useMemo, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAppDispatch, useAppSelector } from '@/lib/hooks'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { ThumbsUp, PlusCircle, Lightbulb, Image as ImageIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { useToast } from '@/hooks/use-toast'
import type { Complaint } from '@/lib/types'
import { formatDistanceToNow } from 'date-fns'
import { addComplaint as addComplaintAction, updateComplaint as updateComplaintAction } from '@/lib/slices/complaintsSlice'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { suggestComplaintSolution } from '@/ai/flows/suggest-complaint-solution'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import Image from 'next/image'

const complaintSchema = z.object({
  category: z.enum(['maintenance', 'cleanliness', 'wifi', 'food', 'other'], {
    required_error: "Please select a category.",
  }),
  description: z.string().min(10, "Please provide a detailed description (min. 10 characters)."),
  imageUrls: z.array(z.string()).optional(),
  isPublic: z.boolean().default(true),
})
type ComplaintFormValues = z.infer<typeof complaintSchema>

const statusColors: Record<Complaint['status'], string> = {
    open: "bg-red-100 text-red-800",
    "in-progress": "bg-yellow-100 text-yellow-800",
    resolved: "bg-green-100 text-green-800",
}

export default function TenantComplaintsPage() {
    const { toast } = useToast()
    const dispatch = useAppDispatch()
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [suggestion, setSuggestion] = useState<string>('')
    const [isSuggesting, setIsSuggesting] = useState(false)
    const [imagePreviews, setImagePreviews] = useState<string[]>([]);
    
    const { complaints } = useAppSelector(state => state.complaints)
    const { currentUser } = useAppSelector(state => state.user)
    const { guests } = useAppSelector(state => state.guests)

    const currentGuest = useMemo(() => {
        if (!currentUser || !currentUser.guestId) return null;
        return guests.find(g => g.id === currentUser.guestId);
    }, [currentUser, guests]);

    const pgComplaints = useMemo(() => {
        if (!currentGuest) return []
        return complaints
            .filter(c => c.pgId === currentGuest.pgId && (c.isPublic || c.guestId === currentGuest.id))
            .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    }, [complaints, currentGuest])

    const form = useForm<ComplaintFormValues>({
        resolver: zodResolver(complaintSchema),
        defaultValues: { description: '', isPublic: true, imageUrls: [] },
    })

    const complaintDescription = form.watch('description');
    const complaintCategory = form.watch('category');

    useEffect(() => {
        const handler = setTimeout(async () => {
            if (complaintDescription && complaintDescription.length > 20 && complaintCategory) {
                setIsSuggesting(true);
                try {
                    const result = await suggestComplaintSolution({
                        description: complaintDescription,
                        category: complaintCategory,
                    });
                    setSuggestion(result.suggestion);
                } catch (error) {
                    console.error("AI suggestion failed", error);
                } finally {
                    setIsSuggesting(false);
                }
            } else {
                setSuggestion('');
            }
        }, 1000); // Debounce for 1 second

        return () => clearTimeout(handler);
    }, [complaintDescription, complaintCategory]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length > 3) {
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
                    setImagePreviews(newPreviews);
                    form.setValue('imageUrls', newImageUrls, { shouldValidate: true });
                }
            };
            reader.readAsDataURL(file);
        });
    };
    
    const onSubmit = async (data: ComplaintFormValues) => {
        if (!currentGuest) {
            toast({ title: "Error", description: "Could not identify current guest.", variant: "destructive"})
            return;
        }
        dispatch(addComplaint(data))
        toast({ title: "Complaint Submitted", description: "Your complaint has been sent to the property manager." })
        form.reset()
        setImagePreviews([])
        setIsDialogOpen(false)
    }

    const handleUpvote = (complaint: Complaint) => {
        if (complaint.guestId === currentGuest?.id) {
            toast({ variant: 'destructive', description: "You cannot upvote your own complaint." });
            return;
        }
        dispatch(updateComplaint({ ...complaint, upvotes: (complaint.upvotes || 0) + 1}))
        toast({ title: "Upvoted!", description: "The manager will see that this is a common issue."})
    }

    return (
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">Complaint Board</h1>
                        <p className="text-muted-foreground">View and raise issues in your property.</p>
                    </div>
                    <DialogTrigger asChild>
                        <Button>
                            <PlusCircle className="mr-2 h-4 w-4" /> Raise Complaint
                        </Button>
                    </DialogTrigger>
                </div>

                <div className="space-y-4">
                    {pgComplaints.length > 0 ? pgComplaints.map(c => (
                        <Card key={c.id} className="overflow-hidden">
                            <CardContent className="p-4 flex flex-col gap-3">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="font-semibold capitalize">{c.category} Issue</p>
                                        <p className="text-xs text-muted-foreground">Raised by {c.guestId === currentGuest?.id ? 'You' : c.guestName} &bull; {formatDistanceToNow(new Date(c.date), { addSuffix: true })}</p>
                                    </div>
                                    <Badge className={cn("capitalize border-transparent", statusColors[c.status])}>{c.status}</Badge>
                                </div>
                                <p className="text-sm text-muted-foreground">{c.description}</p>
                                {c.imageUrls && c.imageUrls.length > 0 && c.guestId === currentGuest?.id && (
                                     <div className="flex gap-2">
                                        {c.imageUrls.map((url, i) => (
                                            <Image key={i} src={url} alt={`Complaint photo ${i+1}`} width={80} height={80} className="rounded-md object-cover"/>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                            <CardFooter className="bg-muted/40 p-2 flex justify-end gap-2">
                               {c.isPublic && (
                                <Button variant="ghost" size="sm" onClick={() => handleUpvote(c)} disabled={c.guestId === currentGuest?.id || c.status === 'resolved'}>
                                    <ThumbsUp className="mr-2 h-4 w-4"/> Upvote {c.upvotes && c.upvotes > 0 ? `(${c.upvotes})` : ''}
                                </Button>
                               )}
                            </CardFooter>
                        </Card>
                    )) : (
                        <div className="text-center py-16 text-muted-foreground border-2 border-dashed rounded-lg">
                            <p className="font-semibold">No complaints yet!</p>
                            <p className="text-sm">Looks like everything is running smoothly.</p>
                        </div>
                    )}
                </div>
            </div>

            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Raise a New Complaint</DialogTitle>
                    <DialogDescription>Let the property manager know about an issue you're facing. Please be as detailed as possible.</DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} id="complaint-form" className="space-y-4 pt-4">
                         <FormField control={form.control} name="category" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Category</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Select a category" /></SelectTrigger></FormControl>
                                    <SelectContent>
                                        <SelectItem value="maintenance">Maintenance</SelectItem>
                                        <SelectItem value="cleanliness">Cleanliness</SelectItem>
                                        <SelectItem value="wifi">Wi-Fi</SelectItem>
                                        <SelectItem value="food">Food</SelectItem>
                                        <SelectItem value="other">Other</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="description" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Description</FormLabel>
                                <FormControl><Textarea rows={5} placeholder="Please describe the issue in detail" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                         )} />
                         {suggestion && !isSuggesting && (
                             <Alert>
                                <Lightbulb className="h-4 w-4" />
                                <AlertTitle>Quick Suggestion</AlertTitle>
                                <AlertDescription>{suggestion}</AlertDescription>
                             </Alert>
                         )}
                         <FormField control={form.control} name="imageUrls" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Upload Photos (Optional)</FormLabel>
                                <FormControl>
                                    <Input type="file" accept="image/*" multiple onChange={handleFileChange} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                         )} />
                         {imagePreviews.length > 0 && (
                            <div className="flex gap-2">
                                {imagePreviews.map((src, i) => (
                                    <Image key={i} src={src} alt={`Preview ${i+1}`} width={60} height={60} className="rounded-md object-cover border" />
                                ))}
                            </div>
                         )}
                         <FormField control={form.control} name="isPublic" render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                                <div className="space-y-0.5">
                                    <FormLabel>Make Public</FormLabel>
                                    <FormDescription>Allow other tenants to see and upvote this complaint.</FormDescription>
                                </div>
                                <FormControl>
                                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                                </FormControl>
                            </FormItem>
                         )} />
                    </form>
                </Form>
                 <DialogFooter>
                    <DialogClose asChild><Button type="button" variant="ghost">Cancel</Button></DialogClose>
                    <Button type="submit" form="complaint-form">Submit Complaint</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
