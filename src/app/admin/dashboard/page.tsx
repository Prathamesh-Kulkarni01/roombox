
'use client'

import { useEffect, useState } from 'react';
import { collection, getDocs, query, where, collectionGroup, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { User, Guest, PG } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, Building, Wallet, IndianRupee, Hourglass, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

export default function AdminDashboardPage() {
    const [owners, setOwners] = useState<User[]>([]);
    const [pendingPgs, setPendingPgs] = useState<PG[]>([]);
    const [stats, setStats] = useState({
        totalOwners: 0,
        totalProperties: 0,
        totalTenants: 0,
        totalRevenue: 0,
    });
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    const fetchData = async () => {
        try {
            setLoading(true);
            const usersSnapshot = await getDocs(collection(db, 'users'));
            const allUsers = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
            
            const ownerUsers = allUsers.filter(user => user.role === 'owner');
            setOwners(ownerUsers);
            
            let totalProperties = 0;
            let totalTenants = 0;
            let totalRevenue = 0;
            let allPendingPgs: PG[] = [];
            
            for (const owner of ownerUsers) {
                const pgsSnapshot = await getDocs(collection(db, 'users_data', owner.id, 'pgs'));
                pgsSnapshot.forEach(pgDoc => {
                    const pg = pgDoc.data() as PG;
                    if (pg.status === 'active') {
                        totalProperties++;
                    } else if (pg.status === 'pending_approval') {
                        allPendingPgs.push(pg);
                    }
                });

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
            
            setPendingPgs(allPendingPgs);
            setStats({
                totalOwners: ownerUsers.length,
                totalProperties,
                totalTenants,
                totalRevenue,
            });

        } catch (error) {
            console.error("Error fetching admin data:", error);
            toast({ variant: 'destructive', title: "Error", description: "Could not fetch admin dashboard data." });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [toast]);
    
    const handleUserStatusUpdate = async (userId: string, status: 'active' | 'suspended') => {
        try {
            const userRef = doc(db, "users", userId);
            await updateDoc(userRef, { status });
            toast({ title: "Success", description: `User status updated to ${status}.`});
            fetchData(); // Refresh data
        } catch (error) {
            toast({ variant: 'destructive', title: "Error", description: "Failed to update user status."});
        }
    }

    const handlePropertyStatusUpdate = async (pg: PG, status: 'active' | 'rejected') => {
        try {
            const pgRef = doc(db, "users_data", pg.ownerId, "pgs", pg.id);
            await updateDoc(pgRef, { status });
            toast({ title: "Success", description: `Property status updated to ${status}.`});
            fetchData(); // Refresh data
        } catch (error) {
             toast({ variant: 'destructive', title: "Error", description: "Failed to update property status."});
        }
    }


    const statCards = [
        { title: "Total Owners", value: stats.totalOwners, icon: Users },
        { title: "Active Properties", value: stats.totalProperties, icon: Building },
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

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                 <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Hourglass className="text-primary"/> Owners Pending Approval</CardTitle>
                        <CardDescription>Review and approve new property owners.</CardDescription>
                    </CardHeader>
                    <CardContent>
                         {loading ? <Skeleton className="h-24 w-full" /> : (
                            <Table>
                                <TableBody>
                                    {owners.filter(o => o.status === 'pending_approval').map(owner => (
                                        <TableRow key={owner.id}>
                                            <TableCell>
                                                <div className="font-medium">{owner.name}</div>
                                                <div className="text-sm text-muted-foreground">{owner.email}</div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button size="sm" className="mr-2" onClick={() => handleUserStatusUpdate(owner.id, 'active')}><CheckCircle className="w-4 h-4 mr-2"/>Approve</Button>
                                                <Button size="sm" variant="destructive" onClick={() => handleUserStatusUpdate(owner.id, 'suspended')}><XCircle className="w-4 h-4 mr-2"/>Suspend</Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {owners.filter(o => o.status === 'pending_approval').length === 0 && <p className="text-sm text-center text-muted-foreground py-4">No pending owner approvals.</p>}
                                </TableBody>
                            </Table>
                         )}
                    </CardContent>
                </Card>

                 <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Hourglass className="text-primary"/> Properties Pending Approval</CardTitle>
                        <CardDescription>Review and approve new properties.</CardDescription>
                    </CardHeader>
                    <CardContent>
                         {loading ? <Skeleton className="h-24 w-full" /> : (
                             <Table>
                                <TableBody>
                                    {pendingPgs.map(pg => (
                                        <TableRow key={pg.id}>
                                            <TableCell>
                                                <div className="font-medium">{pg.name}</div>
                                                <div className="text-sm text-muted-foreground">{pg.location}, {pg.city}</div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button size="sm" className="mr-2" onClick={() => handlePropertyStatusUpdate(pg, 'active')}><CheckCircle className="w-4 h-4 mr-2"/>Approve</Button>
                                                <Button size="sm" variant="destructive" onClick={() => handlePropertyStatusUpdate(pg, 'rejected')}><XCircle className="w-4 h-4 mr-2"/>Reject</Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {pendingPgs.length === 0 && <p className="text-sm text-center text-muted-foreground py-4">No pending property approvals.</p>}
                                </TableBody>
                            </Table>
                         )}
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>All Property Owners</CardTitle>
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
                                    <TableHead>Account Status</TableHead>
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
                                             <Badge variant={owner.status === 'active' ? 'default' : 'secondary'} className="capitalize">
                                                {owner.status?.replace('_', ' ') || 'N/A'}
                                            </Badge>
                                        </TableCell>
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
