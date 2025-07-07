
'use client'

import { useState, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useData } from '@/context/data-provider'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, ThumbsUp, MessageSquarePlus, Send } from "lucide-react"
import { cn } from "@/lib/utils"
import { useToast } from '@/hooks/use-toast'
import type { Complaint } from '@/lib/types'
import { formatDistanceToNow } from 'date-fns'

const complaintSchema = z.object({
  category: z.enum(['maintenance', 'cleanliness', 'wifi', 'food', 'other']),
  description: z.string().min(10, "Please provide a detailed description (min. 10 characters)."),
})
type ComplaintFormValues = z.infer<typeof complaintSchema>

const statusColors: Record<Complaint['status'], string> = {
    open: "bg-red-100 text-red-800",
    "in-progress": "bg-yellow-100 text-yellow-800",
    resolved: "bg-green-100 text-green-800",
}

export default function TenantComplaintsPage() {
    const { toast } = useToast()
    const { complaints, currentGuest, addComplaint, updateComplaint } = useData()

    const pgComplaints = useMemo(() => {
        if (!currentGuest) return []
        return complaints.filter(c => c.pgId === currentGuest.pgId).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    }, [complaints, currentGuest])

    const form = useForm<ComplaintFormValues>({
        resolver: zodResolver(complaintSchema),
        defaultValues: { description: '' },
    })
    
    const onSubmit = (data: ComplaintFormValues) => {
        addComplaint(data)
        toast({ title: "Complaint Submitted", description: "Your complaint has been sent to the PG manager." })
        form.reset()
    }

    const handleUpvote = (complaint: Complaint) => {
        updateComplaint({ ...complaint, upvotes: (complaint.upvotes || 0) + 1})
        toast({ title: "Upvoted!", description: "The manager will see that this is a common issue."})
    }

    return (
        <div className="grid gap-8 lg:grid-cols-3 items-start">
            <div className="lg:col-span-1 flex flex-col gap-8 sticky top-20">
                <Card>
                    <CardHeader>
                        <CardTitle>Raise a Complaint</CardTitle>
                        <CardDescription>Facing an issue? Let us know.</CardDescription>
                    </CardHeader>
                    <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)}>
                        <CardContent className="grid gap-4">
                            <FormField control={form.control} name="category" render={({ field }) => (
                                <FormItem><FormLabel>Category</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Select a category" /></SelectTrigger></FormControl>
                                    <SelectContent><SelectItem value="maintenance">Maintenance</SelectItem><SelectItem value="cleanliness">Cleanliness</SelectItem><SelectItem value="wifi">Wi-Fi</SelectItem><SelectItem value="food">Food</SelectItem><SelectItem value="other">Other</SelectItem></SelectContent>
                                    </Select><FormMessage />
                                </FormItem>
                            )} />
                             <FormField control={form.control} name="description" render={({ field }) => (
                                <FormItem><FormLabel>Description</FormLabel>
                                <FormControl><Textarea placeholder="Please describe the issue in detail" {...field} /></FormControl>
                                <FormMessage />
                                </FormItem>
                             )} />
                        </CardContent>
                        <CardFooter>
                            <Button type="submit" className="w-full"><MessageSquarePlus/> Submit Complaint</Button>
                        </CardFooter>
                    </form>
                    </Form>
                </Card>
                 <Card className="bg-destructive/10 border-destructive/30">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-destructive"><AlertTriangle/> Emergency</CardTitle>
                        <CardDescription className="text-destructive/80">For urgent issues like fire, medical, or security emergencies.</CardDescription>
                    </CardHeader>
                    <CardFooter>
                        <Button variant="destructive" className="w-full">Contact Manager Immediately</Button>
                    </CardFooter>
                </Card>
            </div>
            <div className="lg:col-span-2">
                <h2 className="text-2xl font-bold mb-4">PG Complaint Board</h2>
                <div className="space-y-4">
                    {pgComplaints.length > 0 ? pgComplaints.map(c => (
                        <Card key={c.id}>
                            <CardContent className="p-4 flex flex-col gap-3">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="font-semibold capitalize">{c.category} Issue</p>
                                        <p className="text-xs text-muted-foreground">Raised by {c.guestId === currentGuest?.id ? 'You' : c.guestName} &bull; {formatDistanceToNow(new Date(c.date), { addSuffix: true })}</p>
                                    </div>
                                    <Badge className={cn("capitalize border-transparent", statusColors[c.status])}>{c.status}</Badge>
                                </div>
                                <p className="text-sm text-muted-foreground">{c.description}</p>
                            </CardContent>
                            <CardFooter className="bg-muted/40 p-2 flex justify-end gap-2">
                                <Button variant="ghost" size="sm" onClick={() => handleUpvote(c)} disabled={c.guestId === currentGuest?.id || c.status === 'resolved'}>
                                    <ThumbsUp className="mr-2"/> Upvote {c.upvotes && c.upvotes > 0 ? `(${c.upvotes})` : ''}
                                </Button>
                                <Button variant="ghost" size="sm" disabled={c.status === 'resolved'}>
                                    <Send className="mr-2" /> Remind Manager
                                </Button>
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
        </div>
    )
}
