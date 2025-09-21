

'use client'

import { useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import type { Guest } from '@/lib/types';
import { format, parseISO } from 'date-fns';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface DepositManagementTabProps {
    guests: Guest[];
}

export default function DepositManagementTab({ guests }: DepositManagementTabProps) {
    const sortedGuests = useMemo(() => {
        return [...guests].sort((a, b) => (a.isVacated ? 1 : -1) - (b.isVacated ? 1 : -1) || new Date(b.moveInDate).getTime() - new Date(a.moveInDate).getTime());
    }, [guests]);

    if (guests.length === 0) {
        return <div className="text-center py-10 text-muted-foreground">No guests to display deposit information for.</div>;
    }

    return (
        <div className="w-full">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Guest Name</TableHead>
                        <TableHead>Property</TableHead>
                        <TableHead>Deposit Amount</TableHead>
                        <TableHead>Stay Status</TableHead>
                        <TableHead>Move-in Date</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {sortedGuests.map(guest => (
                        <TableRow key={guest.id}>
                            <TableCell className="font-medium">{guest.name}</TableCell>
                            <TableCell>{guest.pgName}</TableCell>
                            <TableCell>₹{(guest.depositAmount || 0).toLocaleString('en-IN')}</TableCell>
                            <TableCell>
                                <Badge variant={guest.isVacated ? 'outline' : 'default'}>
                                    {guest.isVacated ? 'Vacated' : guest.exitDate ? 'On Notice' : 'Active'}
                                </Badge>
                            </TableCell>
                            <TableCell>{format(parseISO(guest.moveInDate), 'do MMM, yyyy')}</TableCell>
                            <TableCell className="text-right">
                                <Button variant="link" size="sm" asChild>
                                    <Link href={`/dashboard/tenant-management/${guest.id}`}>View Profile</Link>
                                </Button>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
