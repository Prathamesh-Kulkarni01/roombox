import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { pgs } from "@/lib/mock-data"
import { PlusCircle, MoreHorizontal, IndianRupee } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

const genderBadgeColor = {
  male: 'bg-blue-100 text-blue-800',
  female: 'bg-pink-100 text-pink-800',
  'co-ed': 'bg-purple-100 text-purple-800',
};


export default function PgManagementPage() {
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
                </CardContent>
            </Card>
        </div>
    )
}
