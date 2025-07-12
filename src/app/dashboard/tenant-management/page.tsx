
'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { PlusCircle, MoreHorizontal, IndianRupee, User, ShieldCheck, Building } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { useAppSelector } from "@/lib/hooks"
import { Skeleton } from "@/components/ui/skeleton"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import type { Guest } from '@/lib/types'


const rentStatusColors: Record<Guest['rentStatus'], string> = {
  paid: 'bg-green-100 text-green-800',
  unpaid: 'bg-red-100 text-red-800',
  partial: 'bg-orange-100 text-orange-800',
};

const kycStatusColors: Record<Guest['kycStatus'], string> = {
  verified: 'bg-blue-100 text-blue-800',
  pending: 'bg-yellow-100 text-yellow-800',
  rejected: 'bg-orange-100 text-orange-800',
  'not-started': 'bg-gray-100 text-gray-800',
};

export default function GuestManagementPage() {
    const { guests } = useAppSelector(state => state.guests);
    const { pgs } = useAppSelector(state => state.pgs);
    const { isLoading, selectedPgId } = useAppSelector(state => state.app);
    
    const filteredGuests = useMemo(() => {
        if (!selectedPgId) return guests;
        return guests.filter(guest => guest.pgId === selectedPgId);
    }, [guests, selectedPgId]);

    if (isLoading) {
        return (
            <div className="flex flex-col gap-8">
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
                             <div key={i} className="p-4 border rounded-lg space-y-3">
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-3">
                                        <Skeleton className="h-10 w-10 rounded-full" />
                                        <div className="space-y-1">
                                            <Skeleton className="h-5 w-24" />
                                            <Skeleton className="h-4 w-16" />
                                        </div>
                                    </div>
                                    <Skeleton className="h-6 w-6" />
                                </div>
                                <div className="flex justify-between items-end">
                                    <div className="space-y-2">
                                        <Skeleton className="h-4 w-32" />
                                        <Skeleton className="h-4 w-24" />
                                    </div>
                                    <Skeleton className="h-6 w-16 rounded-full" />
                                </div>
                            </div>
                        ))}
                        </div>
                        {/* Desktop skeleton */}
                        <div className="hidden md:block space-y-2">
                            <Skeleton className="h-12 w-full rounded-md" />
                           {Array.from({ length: 4 }).map((_, i) => (
                             <Skeleton key={i} className="h-12 w-full" />
                           ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        )
    }

    if (pgs.length === 0) {
        return (
          <div className="flex items-center justify-center h-full min-h-[calc(100vh-250px)]">
              <div className="text-center p-8 bg-card rounded-lg border">
                  <Building className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h2 className="mt-4 text-xl font-semibold">Add a Property First</h2>
                  <p className="mt-2 text-muted-foreground max-w-sm">You need to add a property before you can manage guests.</p>
                  <Button asChild className="mt-4">
                    <Link href="/dashboard/pg-management">Add Property</Link>
                  </Button>
              </div>
          </div>
        )
    }

    return (
        <div className="flex flex-col gap-8">
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
                                                <TableCell className="font-medium">
                                                    <Link href={`/dashboard/tenant-management/${guest.id}`} className="hover:underline text-primary">
                                                        {guest.name}
                                                    </Link>
                                                </TableCell>
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
                                                            <DropdownMenuItem asChild>
                                                                <Link href={`/dashboard/tenant-management/${guest.id}`}>
                                                                    <User className="mr-2 h-4 w-4" /> View Profile
                                                                </Link>
                                                            </DropdownMenuItem>
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
                                                <p className="font-bold">
                                                  <Link href={`/dashboard/tenant-management/${guest.id}`} className="hover:underline text-primary">
                                                      {guest.name}
                                                  </Link>
                                                </p>
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
                                                    <DropdownMenuItem asChild>
                                                        <Link href={`/dashboard/tenant-management/${guest.id}`}>
                                                            <User className="mr-2 h-4 w-4" /> View Profile
                                                        </Link>
                                                    </DropdownMenuItem>
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
                                                <span>KYC: <span className={cn("capitalize font-medium", kycStatusColors[guest.kycStatus].replace('bg-','text-'))}>{guest.kycStatus.replace('-',' ')}</span></span>
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
