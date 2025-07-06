'use client'

import { useState, useMemo, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useData } from '@/context/data-provider'
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Wallet, UtensilsCrossed, Wrench, PlusCircle, IndianRupee, User, Droplets, Lightbulb, Wifi, Sparkles, Bug, Flame, Building } from "lucide-react"
import { cn } from "@/lib/utils"
import { format, startOfMonth, isWithinInterval } from 'date-fns'
import type { Expense } from '@/lib/types'
import { Skeleton } from '@/components/ui/skeleton'

const expenseSchema = z.object({
  pgId: z.string().min(1, "Please select a PG"),
  category: z.enum(['food', 'maintenance', 'utilities', 'salary', 'other']),
  amount: z.coerce.number().min(1, "Amount must be greater than 0"),
  description: z.string().min(3, "Description is too short").max(100, "Description is too long"),
  date: z.string().refine((date) => !isNaN(Date.parse(date)), { message: "Invalid date" }),
})

type ExpenseFormValues = z.infer<typeof expenseSchema>
type ExpenseCategory = ExpenseFormValues['category']

const categoryMeta: Record<ExpenseCategory, { icon: React.ElementType, color: string }> = {
    food: { icon: UtensilsCrossed, color: "bg-green-100 text-green-800" },
    maintenance: { icon: Wrench, color: "bg-blue-100 text-blue-800" },
    utilities: { icon: Wallet, color: "bg-orange-100 text-orange-800" },
    salary: { icon: User, color: "bg-purple-100 text-purple-800" },
    other: { icon: Wallet, color: "bg-gray-100 text-gray-800" },
}

const quickAddItems: { label: string; icon: React.ElementType; category: ExpenseCategory, description: string }[] = [
    { label: "Water Bill", icon: Droplets, category: "utilities", description: "Monthly water bill" },
    { label: "Electricity Bill", icon: Lightbulb, category: "utilities", description: "Monthly electricity bill" },
    { label: "Internet Bill", icon: Wifi, category: "utilities", description: "Monthly internet bill" },
    { label: "Gas Cylinder", icon: Flame, category: "utilities", description: "Gas cylinder refill" },
    { label: "Cleaning", icon: Sparkles, category: "maintenance", description: "Cleaning supplies" },
    { label: "Repairs", icon: Wrench, category: "maintenance", description: "Minor repairs" },
    { label: "Pest Control", icon: Bug, category: "maintenance", description: "Pest control service" },
    { label: "Staff Salary", icon: User, category: "salary", description: "Monthly staff salary" },
    { label: "Groceries", icon: UtensilsCrossed, category: "food", description: "Weekly groceries" },
]


export default function ExpensePage() {
    const { pgs, expenses, addExpense, isLoading, selectedPgId } = useData()
    const [isDialogOpen, setIsDialogOpen] = useState(false)

    const form = useForm<ExpenseFormValues>({
        resolver: zodResolver(expenseSchema),
        defaultValues: {
            date: format(new Date(), 'yyyy-MM-dd'),
            pgId: selectedPgId || undefined,
        },
    })

    useEffect(() => {
        const defaultPgId = selectedPgId || (pgs.length > 0 ? pgs[0].id : undefined);
        form.reset({
            ...form.getValues(),
            pgId: defaultPgId,
            date: format(new Date(), 'yyyy-MM-dd'),
        });
    }, [selectedPgId, pgs, form]);
    
    const handleQuickAdd = (item: typeof quickAddItems[0]) => {
        const defaultPgId = selectedPgId || (pgs.length > 0 ? pgs[0].id : undefined);
        form.reset({
            date: format(new Date(), 'yyyy-MM-dd'),
            category: item.category,
            description: item.description,
            pgId: defaultPgId,
        })
        setIsDialogOpen(true)
    }
    
    const openAddExpenseDialog = () => {
       const defaultPgId = selectedPgId || (pgs.length > 0 ? pgs[0].id : undefined);
       form.reset({
            date: format(new Date(), 'yyyy-MM-dd'),
            pgId: defaultPgId,
        });
        setIsDialogOpen(true);
    }

    const onSubmit = (data: ExpenseFormValues) => {
        const selectedPg = pgs.find(pg => pg.id === data.pgId)
        if (!selectedPg) return

        addExpense({ ...data, pgName: selectedPg.name });
        const defaultPgId = selectedPgId || (pgs.length > 0 ? pgs[0].id : undefined);
        form.reset({
            date: format(new Date(), 'yyyy-MM-dd'),
            pgId: defaultPgId,
        });
        setIsDialogOpen(false);
    }
    
    const filteredExpenses = useMemo(() => {
        if (!selectedPgId) return expenses;
        return expenses.filter(exp => exp.pgId === selectedPgId);
    }, [expenses, selectedPgId]);


    const { totalExpenses, foodExpenses, otherExpenses } = useMemo(() => {
        const now = new Date()
        const startOfThisMonth = startOfMonth(now)
        
        const monthlyExpenses = filteredExpenses.filter(exp => 
            isWithinInterval(new Date(exp.date), { start: startOfThisMonth, end: now })
        )

        const total = monthlyExpenses.reduce((sum, exp) => sum + exp.amount, 0)
        const food = monthlyExpenses
            .filter(exp => exp.category === 'food')
            .reduce((sum, exp) => sum + exp.amount, 0)
        
        return {
            totalExpenses: total,
            foodExpenses: food,
            otherExpenses: total - food,
        }
    }, [filteredExpenses])

    if (isLoading) {
       return (
         <div className="flex flex-col gap-8">
            <div>
                <Skeleton className="h-9 w-64 mb-2" />
                <Skeleton className="h-5 w-80" />
            </div>
            <div className="grid gap-4 md:grid-cols-3">
                <Skeleton className="h-28 w-full rounded-lg" />
                <Skeleton className="h-28 w-full rounded-lg" />
                <Skeleton className="h-28 w-full rounded-lg" />
            </div>
             <Card>
                <CardHeader>
                    <Skeleton className="h-8 w-48" />
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
    
    if (pgs.length === 0) {
        return (
          <div className="flex items-center justify-center h-full">
              <div className="text-center">
                  <Building className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h2 className="mt-4 text-xl font-semibold">No PGs Found</h2>
                  <p className="mt-2 text-muted-foreground">Please add a PG to start managing expenses.</p>
              </div>
          </div>
        )
    }

    const stats = [
        { title: "Total Expenses (This Month)", value: totalExpenses, icon: Wallet },
        { title: "Food Expenses (This Month)", value: foodExpenses, icon: UtensilsCrossed },
        { title: "Other Expenses (This Month)", value: otherExpenses, icon: Wrench },
    ]

    return (
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <div className="flex flex-col gap-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold font-headline flex items-center gap-2">
                        <Wallet className="w-8 h-8 text-primary" /> Expense Tracking
                    </h1>
                    <p className="text-muted-foreground">Keep track of all your PG-related expenses.</p>
                </div>
            </div>


            <div className="grid gap-4 md:grid-cols-3">
                {stats.map(stat => (
                    <Card key={stat.title}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                            <stat.icon className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold flex items-center">
                              <IndianRupee className="h-6 w-6 mr-1" />
                              {stat.value.toLocaleString('en-IN')}
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

             <Card>
                <CardHeader>
                    <CardTitle>Quick Add Expense</CardTitle>
                    <CardDescription>Quickly log common expenses.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {quickAddItems.map(item => (
                        <button
                            key={item.label}
                            onClick={() => handleQuickAdd(item)}
                            className="flex flex-col items-center justify-center gap-2 p-4 border rounded-lg bg-card hover:bg-muted/50 transition-colors text-center"
                        >
                            <item.icon className="w-6 h-6 text-primary" />
                            <span className="text-sm font-medium">{item.label}</span>
                        </button>
                    ))}
                </CardContent>
            </Card>


            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Recent Expenses</CardTitle>
                        <CardDescription>A log of your most recent expenses{selectedPgId ? ` for ${pgs.find(p=>p.id === selectedPgId)?.name}` : ' for all PGs'}.</CardDescription>
                    </div>
                     <Button onClick={openAddExpenseDialog}>
                        <PlusCircle className="mr-2 h-4 w-4" /> Add Expense
                    </Button>
                </CardHeader>
                <CardContent>
                    {/* Desktop Table View */}
                    <div className="hidden md:block">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>PG</TableHead>
                                    <TableHead>Category</TableHead>
                                    <TableHead>Description</TableHead>
                                    <TableHead className="text-right">Amount</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredExpenses.slice(0, 10).map((expense) => {
                                    const meta = categoryMeta[expense.category]
                                    return (
                                    <TableRow key={expense.id}>
                                        <TableCell>{format(new Date(expense.date), 'dd MMM, yyyy')}</TableCell>
                                        <TableCell>{expense.pgName}</TableCell>
                                        <TableCell>
                                            <Badge className={cn("capitalize border-transparent", meta.color)}>
                                                <meta.icon className="w-3 h-3 mr-1.5" />
                                                {expense.category}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="max-w-[300px] truncate">{expense.description}</TableCell>
                                        <TableCell className="text-right font-medium">₹{expense.amount.toLocaleString('en-IN')}</TableCell>
                                    </TableRow>
                                )})}
                            </TableBody>
                        </Table>
                    </div>
                     {/* Mobile Card View */}
                    <div className="md:hidden grid gap-4">
                        {filteredExpenses.slice(0, 10).map((expense) => {
                            const meta = categoryMeta[expense.category]
                            return (
                                <div key={expense.id} className="p-4 border rounded-lg flex flex-col gap-3 bg-muted/20">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="font-bold truncate max-w-[200px]">{expense.description}</p>
                                            <p className="text-sm text-muted-foreground">{expense.pgName}</p>
                                        </div>
                                        <p className="font-semibold text-lg shrink-0">₹{expense.amount.toLocaleString('en-IN')}</p>
                                    </div>
                                    <div className="flex justify-between items-end text-sm">
                                         <Badge className={cn("capitalize border-transparent", meta.color)}>
                                            <meta.icon className="w-3 h-3 mr-1.5" />
                                            {expense.category}
                                        </Badge>
                                        <p className="text-muted-foreground">{format(new Date(expense.date), 'dd MMM, yyyy')}</p>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                     {filteredExpenses.length === 0 && (
                        <div className="text-center py-10 text-muted-foreground">No expenses logged yet.</div>
                     )}
                </CardContent>
            </Card>
        </div>
        <DialogContent className="sm:max-w-md">
            <DialogHeader>
                <DialogTitle>Add New Expense</DialogTitle>
                <DialogDescription>Log a new expense for one of your PGs.</DialogDescription>
            </DialogHeader>
            <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                 <FormField
                    control={form.control}
                    name="pgId"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>PG</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                            <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a PG" />
                            </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                            {pgs.map(pg => <SelectItem key={pg.id} value={pg.id}>{pg.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Category</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                            <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a category" />
                            </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                {Object.keys(categoryMeta).map(cat => (
                                    <SelectItem key={cat} value={cat} className="capitalize">{cat}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Amount</FormLabel>
                        <FormControl>
                            <Input type="number" placeholder="e.g., 5000" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                            <Textarea placeholder="e.g., Monthly milk delivery" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Date</FormLabel>
                        <FormControl>
                            <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                <DialogFooter>
                    <DialogClose asChild>
                        <Button type="button" variant="secondary">Cancel</Button>
                    </DialogClose>
                    <Button type="submit">Add Expense</Button>
                </DialogFooter>
            </form>
            </Form>
        </DialogContent>
        </Dialog>
    )
}
