'use client'

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { PlusCircle, MoreHorizontal, IndianRupee, Users, MapPin } from "lucide-react"
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

const genderBadgeColor = {
  male: 'bg-blue-100 text-blue-800',
  female: 'bg-pink-100 text-pink-800',
  'co-ed': 'bg-purple-100 text-purple-800',
};


export default function PgManagementPage() {
    const { pgs, isLoading } = useData();

    if (isLoading) {
        return (
            <div className="flex flex-col gap-8">
                 <div>
                    <Skeleton className="h-9 w-64 mb-2" />
                    <Skeleton className="h-5 w-80" />
                </div>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                       <div className="space-y-2">
                         <Skeleton className="h-7 w-24" />
                         <Skeleton className="h-5 w-32" />
                       </div>
                        <Skeleton className="h-10 w-32" />
                    </CardHeader>
                    <CardContent>
                        {/* Mobile skeleton */}
                        <div className="md:hidden space-y-4">
                        {Array.from({ length: 3 }).map((_, i) => (
                            <Skeleton key={i} className="h-28 w-full rounded-lg" />
                        ))}
                        </div>
                        {/* Desktop skeleton */}
                        <div className="hidden md:block space-y-2">
                        {Array.from({ length: 3 }).map((_, i) => (
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
                <h1 className="text-3xl font-bold font-headline">PG Management</h1>
                <p className="text-muted-foreground">Add, edit, and manage your PG listings.</p>
            </div>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Your PGs</CardTitle>
                        <CardDescription>You have {pgs.length} PGs.</CardDescription>
                    </div>
                    {/* Add PG Sheet component will be triggered here */}
                    <Button>
                        <PlusCircle className="mr-2 h-4 w-4" /> Add New PG
                    </Button>
                </CardHeader>
                <CardContent>
                    {/* Desktop Table View */}
                    <div className="hidden md:block">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Location</TableHead>
                                    <TableHead>Gender</TableHead>
                                    <TableHead>Occupancy</TableHead>
                                    <TableHead>Price Range</TableHead>
                                    <TableHead>
                                        <span className="sr-only">Actions</span>
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {pgs.map((pg) => (
                                    <TableRow key={pg.id}>
                                        <TableCell className="font-medium">{pg.name}</TableCell>
                                        <TableCell>{pg.location}</TableCell>
                                        <TableCell>
                                            <Badge className={cn("capitalize border-transparent", genderBadgeColor[pg.gender])}>
                                                {pg.gender}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>{pg.occupancy}/{pg.totalBeds}</TableCell>
                                        <TableCell className="flex items-center">
                                          <IndianRupee className="w-4 h-4 mr-1 text-muted-foreground"/>
                                          {pg.priceRange.min} - {pg.priceRange.max}
                                        </TableCell>
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
                                                    <DropdownMenuItem>Edit</DropdownMenuItem>
                                                    <DropdownMenuItem>View Tenants</DropdownMenuItem>
                                                    <DropdownMenuItem className="text-red-600">Delete</DropdownMenuItem>
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
                        {pgs.map((pg) => (
                            <div key={pg.id} className="p-4 border rounded-lg flex flex-col gap-3 bg-muted/20">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="font-bold">{pg.name}</p>
                                        <div className="text-sm text-muted-foreground flex items-center gap-1.5 mt-1">
                                            <MapPin className="w-3.5 h-3.5" />
                                            {pg.location}
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
                                            <DropdownMenuItem>Edit</DropdownMenuItem>
                                            <DropdownMenuItem>View Tenants</DropdownMenuItem>
                                            <DropdownMenuItem className="text-red-600">Delete</DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                                <div className="flex justify-between items-end text-sm">
                                    <div className="flex flex-col gap-2">
                                        <div className="flex items-center gap-2">
                                            <Users className="w-4 h-4 text-muted-foreground" />
                                            <span>{pg.occupancy}/{pg.totalBeds} Occupancy</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                             <IndianRupee className="w-4 h-4 text-muted-foreground"/>
                                             <span>{pg.priceRange.min} - {pg.priceRange.max}</span>
                                        </div>
                                    </div>
                                    <Badge className={cn("capitalize border-transparent", genderBadgeColor[pg.gender])}>
                                        {pg.gender}
                                    </Badge>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
