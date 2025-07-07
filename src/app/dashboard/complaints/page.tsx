
'use client'

import { useMemo } from 'react'
import { useAppDispatch, useAppSelector } from '@/lib/hooks'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ShieldAlert } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Complaint } from '@/lib/types'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { updateComplaint as updateComplaintAction } from '@/lib/slices/complaintsSlice'

const statusColors: Record<Complaint['status'], string> = {
    open: "bg-red-100 text-red-800",
    "in-progress": "bg-yellow-100 text-yellow-800",
    resolved: "bg-green-100 text-green-800",
}

export default function ComplaintsDashboardPage() {
    const dispatch = useAppDispatch()
    const { complaints } = useAppSelector(state => state.complaints)
    const { pgs } = useAppSelector(state => state.pgs)
    const { isLoading, selectedPgId } = useAppSelector(state => state.app)
    const { currentPlan } = useAppSelector(state => state.user)

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

    if (!currentPlan?.hasComplaints) {
         return (
          <div className="flex items-center justify-center h-full">
              <div className="text-center p-8 bg-card rounded-lg border">
                  <ShieldAlert className="mx-auto h-12 w-12 text-primary" />
                  <h2 className="mt-4 text-xl font-semibold">Feature Not Available</h2>
                  <p className="mt-2 text-muted-foreground max-w-sm">The complaints management feature is not included in your current plan. Please upgrade to access this feature.</p>
                  <Button className="mt-4">Upgrade Plan</Button>
              </div>
          </div>
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
        <div className="flex flex-col gap-8">
            <Card>
                <CardHeader>
                    <CardTitle>Open Complaints</CardTitle>
                    <CardDescription>
                        Showing complaints {selectedPgId ? `for ${pgs.find(p => p.id === selectedPgId)?.name}` : 'for all PGs'}.
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
                                        <TableHead>PG</TableHead>
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
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                        {/* Mobile Card View */}
                        <div className="md:hidden grid gap-4">
                            {filteredComplaints.map((complaint) => (
                                <div key={complaint.id} className="p-4 border rounded-lg flex flex-col gap-3 bg-muted/20">
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
                                    </div>
                                </div>
                            ))}
                        </div>
                        </>
                     )}
                </CardContent>
            </Card>
        </div>
    )
}
