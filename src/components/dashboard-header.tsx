'use client'

import { useData } from "@/context/data-provider"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { usePathname } from 'next/navigation'
import { Skeleton } from "@/components/ui/skeleton"
import Link from "next/link"
import { Button } from "./ui/button"

export default function DashboardHeader() {
    const { pgs, selectedPgId, setSelectedPgId, isLoading } = useData()
    const pathname = usePathname()
    
    const showSwitcherOn = [
        '/dashboard',
        '/dashboard/expense',
        '/dashboard/food'
    ]

    if (!showSwitcherOn.includes(pathname)) {
        return null
    }

    const handleValueChange = (pgId: string) => {
        if (setSelectedPgId && pgId) {
            setSelectedPgId(pgId)
        }
    }

    return (
        <header className="flex items-center gap-4 border-b bg-background px-4 sm:px-6 py-4">
            {isLoading ? (
                <Skeleton className="h-10 w-full sm:w-[280px]" />
            ) : pgs.length > 0 ? (
                <Select
                    value={selectedPgId || ''}
                    onValueChange={handleValueChange}
                >
                    <SelectTrigger className="w-full sm:w-[280px]">
                        <SelectValue placeholder="Select a PG to continue..." />
                    </SelectTrigger>
                    <SelectContent>
                        {pgs.map((pg) => (
                            <SelectItem key={pg.id} value={pg.id}>
                                {pg.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            ) : (
                <div className="flex items-center gap-4">
                    <p className="text-sm text-muted-foreground">No PGs found.</p>
                    <Button asChild size="sm" variant="outline">
                        <Link href="/dashboard/pg-management">Add your first PG</Link>
                    </Button>
                </div>
            )}
        </header>
    )
}
