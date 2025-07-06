import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { complaints } from "@/lib/mock-data"
import { cn } from "@/lib/utils"


const statusColors = {
    open: "bg-red-100 text-red-800",
    "in-progress": "bg-yellow-100 text-yellow-800",
    resolved: "bg-green-100 text-green-800",
}

export default function ComplaintsPage() {
  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      <div className="grid gap-12 lg:grid-cols-5">
        <div className="lg:col-span-2">
            <Card>
                <CardHeader>
                <CardTitle>Raise a Complaint</CardTitle>
                <CardDescription>
                    Let us know what issue you are facing. We will resolve it soon.
                </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4">
                    <div className="grid gap-2">
                        <Label htmlFor="category">Category</Label>
                        <Select>
                        <SelectTrigger id="category">
                            <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="maintenance">Maintenance</SelectItem>
                            <SelectItem value="cleanliness">Cleanliness</SelectItem>
                            <SelectItem value="wifi">Wi-Fi</SelectItem>
                            <SelectItem value="food">Food</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                        </Select>
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                        id="description"
                        placeholder="Please describe the issue in detail"
                        />
                    </div>
                </CardContent>
                <CardFooter>
                    <Button className="w-full bg-primary hover:bg-primary/90">Submit Complaint</Button>
                </CardFooter>
            </Card>
        </div>
        <div className="lg:col-span-3">
            <h2 className="text-2xl font-bold font-headline mb-4">Your Complaint History</h2>
            <Card>
                <CardContent className="p-0">
                <Table>
                    <TableHeader>
                        <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {complaints.map((complaint) => (
                        <TableRow key={complaint.id}>
                            <TableCell>{complaint.date}</TableCell>
                            <TableCell className="capitalize">{complaint.category}</TableCell>
                            <TableCell className="max-w-[300px] truncate">{complaint.description}</TableCell>
                            <TableCell className="text-right">
                                <Badge className={cn("capitalize border-transparent", statusColors[complaint.status])}>
                                    {complaint.status}
                                </Badge>
                            </TableCell>
                        </TableRow>
                        ))}
                    </TableBody>
                </Table>
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  )
}
