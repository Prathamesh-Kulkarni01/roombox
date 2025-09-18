
'use client'

import { useEffect, useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { User } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow } from 'date-fns';

export default function AdminDashboardPage() {
    const [owners, setOwners] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchOwners = async () => {
            try {
                const q = query(collection(db, 'users'), where('role', '==', 'owner'));
                const querySnapshot = await getDocs(q);
                const ownersData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
                setOwners(ownersData);
            } catch (error) {
                console.error("Error fetching owners:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchOwners();
    }, []);

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
            
            <Card>
                <CardHeader>
                    <CardTitle>Property Owners</CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="space-y-2">
                           <Skeleton className="h-12 w-full" />
                           <Skeleton className="h-12 w-full" />
                           <Skeleton className="h-12 w-full" />
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead>Subscription</TableHead>
                                    <TableHead>Joined</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {owners.map(owner => (
                                    <TableRow key={owner.id}>
                                        <TableCell className="font-medium">{owner.name}</TableCell>
                                        <TableCell>{owner.email}</TableCell>
                                        <TableCell>
                                            <Badge variant={owner.subscription?.status === 'active' || owner.subscription?.status === 'trialing' ? 'default' : 'secondary'} className="capitalize">
                                                {owner.subscription?.status || 'N/A'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>{owner.createdAt ? formatDistanceToNow(new Date(owner.createdAt), { addSuffix: true }) : 'N/A'}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
