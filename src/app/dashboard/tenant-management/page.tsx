'use client'

import { useMemo } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { PlusCircle, MoreHorizontal, IndianRupee, User, ShieldCheck } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { useData } from "@/context/data-provider"
import { Skeleton } from "@/components/ui/skeleton"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"


const rentStatusColors = {
  paid: 'bg-green-100 text-green-800',
  unpaid: 'bg-red-100 text-red-800',
};

const kycStatusColors = {
  verified: 'bg-blue-100 text-blue-800',
  pending: 'bg-yellow-100 text-yellow-800',
  rejected: 'bg-orange-100 text-orange-800'
};

export default function GuestManagementPage() {
    const { guests, isLoading, selectedPgId } = useData();
    
    const filteredGuests = useMemo(() => {
        if (!selectedPgId) return guests;
        return guests.filter(guest => guest.pgId === selectedPgId);
    }, [guests, selectedPgId]);

    if (isLoading) {
        return (
            <div className="flex flex-col gap-8">
                 <div>
                    <Skeleton className="h-9 w-72 mb-2" />
                    <Skeleton className="h-5 w-80" />
                </div>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                       <div className="space-y-2">
                         <Skeleton className="h-7 w-32" />
                         <Skeleton className="h-5 w-48" />
                       </div>
                        <Skeleton className="h-10 w-36" />
                    </CardHeader>
                    <CardContent>
                        {/* Mobile skeleton */}
                        <div className="md:hidden space-y-4">
                        {Array.from({ length: 3 }).map((_, i) => (
                            <Skeleton key={i} className="h-32 w-full rounded-lg" />
                        ))}
                        </div>
                        {/* Desktop skeleton */}
                        <div className="hidden md:block space-y-2">
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
            <div>
                <h1 className="text-3xl font-bold font-headline">Guest Management</h1>
                <p className="text-muted-foreground">View, add, and manage guests in your PGs.</p>
            </div>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>All Guests</CardTitle>
                        <CardDescription>You are managing {filteredGuests.length} guests.</CardDescription>
                    </div>
                    {/* Add Guest component will be triggered here */}
                    <Button>
                        <PlusCircle className="mr-2 h-4 w-4" /> Add New Guest
                    </Button>
                </CardHeader>
                <CardContent>
                     {filteredGuests.length === 0 ? (
                        <div className="text-center py-10 text-muted-foreground">No guests found for the selected PG.</div>
                     ) : (
                        <>
                            {/* Desktop Table View */}
                            <div className="hidden md:block">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Name</TableHead>
                                            <TableHead>PG Name</TableHead>
                                            <TableHead>Rent Status</TableHead>
                                            <TableHead>KYC Status</TableHead>
                                            <TableHead>Due Date</TableHead>
                                            <TableHead>
                                                <span className="sr-only">Actions</span>
                                            </TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredGuests.map((guest) => (
                                            <TableRow key={guest.id}>
                                                <TableCell className="font-medium">{guest.name}</TableCell>
                                                <TableCell>{guest.pgName}</TableCell>
                                                <TableCell>
                                                    <Badge className={cn("capitalize border-transparent", rentStatusColors[guest.rentStatus])}>
                                                        {guest.rentStatus}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge className={cn("capitalize border-transparent", kycStatusColors[guest.kycStatus])}>
                                                        {guest.kycStatus}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>{guest.dueDate}</TableCell>
                                                <TableCell>
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button aria-haspopup="true" size="icon" variant="ghost">
                                                                <MoreHorizontal className="h-4 w-4" />
                                                                <span className="sr-only">Toggle menu</span>
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                            <DropdownMenuItem>Edit Guest</DropdownMenuItem>
                                                            <DropdownMenuItem>View Details</DropdownMenuItem>
                                                            {guest.rentStatus === 'unpaid' && (
                                                                <DropdownMenuItem>Send Rent Reminder</DropdownMenuItem>
                                                            )}
                                                            <DropdownMenuItem className="text-red-600">Remove Guest</DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                            {/* Mobile Card View */}
                            <div className="md:hidden grid gap-4">
                                {filteredGuests.map((guest) => (
                                <div key={guest.id} className="p-4 border rounded-lg flex flex-col gap-3 bg-muted/20">
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-center gap-3">
                                            <Avatar>
                                                <AvatarImage src={`https://placehold.co/40x40.png?text=${guest.name.charAt(0)}`} />
                                                <AvatarFallback>{guest.name.charAt(0)}</AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <p className="font-bold">{guest.name}</p>
                                                <p className="text-sm text-muted-foreground">{guest.pgName}</p>
                                            </div>
                                        </div>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button aria-haspopup="true" size="icon" variant="ghost" className="-mr-2 -mt-2">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                        <span className="sr-only">Toggle menu</span>
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                    <DropdownMenuItem>Edit Guest</DropdownMenuItem>
                                                    <DropdownMenuItem>View Details</DropdownMenuItem>
                                                    {guest.rentStatus === 'unpaid' && (
                                                        <DropdownMenuItem>Send Rent Reminder</DropdownMenuItem>
                                                    )}
                                                    <DropdownMenuItem className="text-red-600">Remove Guest</DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                    </div>
                                    <div className="flex justify-between items-end text-sm">
                                        <div className="flex flex-col gap-2">
                                            <div className="flex items-center gap-2">
                                                <IndianRupee className="w-4 h-4 text-muted-foreground" />
                                                <span>Rent Due: {guest.dueDate}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <ShieldCheck className="w-4 h-4 text-muted-foreground"/>
                                                <span>KYC: <span className={cn("capitalize font-medium", kycStatusColors[guest.kycStatus].replace('bg-','text-'))}>{guest.kycStatus}</span></span>
                                            </div>
                                        </div>
                                        <Badge className={cn("capitalize border-transparent", rentStatusColors[guest.rentStatus])}>
                                            {guest.rentStatus}
                                        </Badge>
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
