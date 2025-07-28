
'use client'

import { useMemo } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { Guest } from '@/lib/types';
import { Eye, CheckCircle, XCircle, Loader2, FileText } from 'lucide-react';
import { useRouter } from 'next/navigation';

const kycStatusMeta = {
    'not-started': { text: 'Not Started', color: 'bg-gray-100 text-gray-800' },
    'pending': { text: 'Pending Review', color: 'bg-yellow-100 text-yellow-800' },
    'verified': { text: 'Verified', color: 'bg-green-100 text-green-800' },
    'rejected': { text: 'Rejected', color: 'bg-red-100 text-red-800' },
};

interface KycManagementTabProps {
    guests: Guest[];
}

export default function KycManagementTab({ guests }: KycManagementTabProps) {
    const router = useRouter();

    const sortedGuests = useMemo(() => {
        const statusOrder = { 'pending': 1, 'not-started': 2, 'rejected': 3, 'verified': 4 };
        return [...guests].sort((a, b) => {
            const statusA = a.isVacated ? 5 : statusOrder[a.kycStatus];
            const statusB = b.isVacated ? 5 : statusOrder[b.kycStatus];
            return statusA - statusB;
        });
    }, [guests]);

    if (guests.length === 0) {
        return <div className="text-center py-10 text-muted-foreground">No guests to display KYC information for.</div>;
    }

    return (
        <div className="w-full">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Guest Name</TableHead>
                        <TableHead>Property</TableHead>
                        <TableHead>KYC Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {sortedGuests.map(guest => (
                        <TableRow key={guest.id} className={cn(guest.isVacated && 'opacity-50')}>
                            <TableCell className="font-medium">{guest.name}</TableCell>
                            <TableCell>{guest.pgName}</TableCell>
                            <TableCell>
                                <Badge className={cn("capitalize border-transparent", kycStatusMeta[guest.kycStatus].color)}>
                                    {guest.kycStatus === 'pending' && <Loader2 className="mr-1 h-3 w-3 animate-spin"/>}
                                    {guest.kycStatus === 'verified' && <CheckCircle className="mr-1 h-3 w-3"/>}
                                    {guest.kycStatus === 'rejected' && <XCircle className="mr-1 h-3 w-3"/>}
                                    {guest.kycStatus === 'not-started' && <FileText className="mr-1 h-3 w-3"/>}
                                    {kycStatusMeta[guest.kycStatus].text}
                                </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => router.push(`/dashboard/tenant-management/${guest.id}`)}
                                >
                                    <Eye className="mr-2 h-4 w-4" />
                                    View Details
                                </Button>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
