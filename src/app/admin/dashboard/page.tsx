
'use client'

import { useEffect, useState } from 'react';
import { collection, getDocs, query, where, collectionGroup } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { User, Guest } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, Building, Wallet, IndianRupee } from 'lucide-react';

export default function AdminDashboardPage() {
    const [owners, setOwners] = useState<User[]>([]);
    const [stats, setStats] = useState({
        totalOwners: 0,
        totalProperties: 0,
        totalTenants: 0,
        totalRevenue: 0,
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch all users to get owners and their properties/tenants
                const usersSnapshot = await getDocs(collection(db, 'users'));
                const allUsers = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
                
                const ownerUsers = allUsers.filter(user => user.role === 'owner');
                setOwners(ownerUsers);
                
                // Aggregate stats
                let totalProperties = 0;
                let totalTenants = 0;
                let totalRevenue = 0;
                
                for (const owner of ownerUsers) {
                    const propertiesSnapshot = await getDocs(collection(db, 'users_data', owner.id, 'pgs'));
                    totalProperties += propertiesSnapshot.size;

                    const guestsSnapshot = await getDocs(collection(db, 'users_data', owner.id, 'guests'));
                    guestsSnapshot.forEach(doc => {
                        const guest = doc.data() as Guest;
                        if (!guest.isVacated) {
                            totalTenants++;
                        }
                        (guest.paymentHistory || []).forEach(payment => {
                            totalRevenue += payment.amount;
                        });
                    });
                }
                
                setStats({
                    totalOwners: ownerUsers.length,
                    totalProperties,
                    totalTenants,
                    totalRevenue,
                });

            } catch (error) {
                console.error("Error fetching admin data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const statCards = [
        { title: "Total Owners", value: stats.totalOwners, icon: Users },
        { title: "Total Properties", value: stats.totalProperties, icon: Building },
        { title: "Active Tenants", value: stats.totalTenants, icon: Users },
        { title: "Platform Revenue", value: `₹${stats.totalRevenue.toLocaleString('en-IN')}`, icon: IndianRupee },
    ];

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
            
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {statCards.map(card => (
                     <Card key={card.title}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
                            <card.icon className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            {loading ? <Skeleton className="h-8 w-2/3" /> : <div className="text-2xl font-bold">{card.value}</div>}
                        </CardContent>
                    </Card>
                ))}
            </div>

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
