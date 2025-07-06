'use client'

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { PlusCircle, MoreHorizontal } from "lucide-react"
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

const rentStatusColors = {
  paid: 'bg-green-100 text-green-800',
  unpaid: 'bg-red-100 text-red-800',
};

const kycStatusColors = {
  verified: 'bg-blue-100 text-blue-800',
  pending: 'bg-yellow-100 text-yellow-800',
  rejected: 'bg-orange-100 text-orange-800'
};

export default function TenantManagementPage() {
    const { tenants, isLoading } = useData();
    
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
            <div>
                <h1 className="text-3xl font-bold font-headline">Tenant Management</h1>
                <p className="text-muted-foreground">View, add, and manage tenants in your PGs.</p>
            </div>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>All Tenants</CardTitle>
                        <CardDescription>You are managing {tenants.length} tenants.</CardDescription>
                    </div>
                    {/* Add Tenant component will be triggered here */}
                    <Button>
                        <PlusCircle className="mr-2 h-4 w-4" /> Add New Tenant
                    </Button>
                </CardHeader>
                <CardContent>
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
                            {tenants.map((tenant) => (
                                <TableRow key={tenant.id}>
                                    <TableCell className="font-medium">{tenant.name}</TableCell>
                                    <TableCell>{tenant.pgName}</TableCell>
                                    <TableCell>
                                        <Badge className={cn("capitalize border-transparent", rentStatusColors[tenant.rentStatus])}>
                                            {tenant.rentStatus}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Badge className={cn("capitalize border-transparent", kycStatusColors[tenant.kycStatus])}>
                                            {tenant.kycStatus}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>{tenant.dueDate}</TableCell>
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
                                                <DropdownMenuItem>Edit Tenant</DropdownMenuItem>
                                                <DropdownMenuItem>View Details</DropdownMenuItem>
                                                {tenant.rentStatus === 'unpaid' && (
                                                    <DropdownMenuItem>Send Rent Reminder</DropdownMenuItem>
                                                )}
                                                <DropdownMenuItem className="text-red-600">Remove Tenant</DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    )
}
