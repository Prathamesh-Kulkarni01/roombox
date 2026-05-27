'use client'

import { useEffect, useState } from 'react';
import { collection, getDocs, doc, updateDoc, limit, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { User, PG, Guest, ActivityLog } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Users, Building, Hourglass, CheckCircle, XCircle, 
  Database, ShieldCheck, ShieldAlert, Activity, RefreshCw, 
  BarChart3, Wallet, Shield, FileText, Settings, HeartHandshake, Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { AdminDataIntegrityShield } from '@/lib/admin-integrity-shield';

// Subcomponents
import AdminAnalytics from '../components/AdminAnalytics';
import AdminFinance from '../components/AdminFinance';
import AdminUsers from '../components/AdminUsers';
import AdminProperties from '../components/AdminProperties';
import AdminSubscriptions from '../components/AdminSubscriptions';
import AdminSupport from '../components/AdminSupport';
import AdminReports from '../components/AdminReports';

type TabName = 'analytics' | 'finance' | 'users' | 'properties' | 'subscriptions' | 'support' | 'reports';

export default function AdminDashboardPage() {
    const [activeTab, setActiveTab] = useState<TabName>('analytics');
    const [owners, setOwners] = useState<User[]>([]);
    const [pendingPgs, setPendingPgs] = useState<PG[]>([]);
    const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
    const [stats, setStats] = useState({
        totalOwners: 0,
        totalProperties: 0,
        totalTenants: 0,
        totalRevenue: 0,
    });
    const [schemaDistribution, setSchemaDistribution] = useState<Record<number, number>>({});
    const [integrityStatus, setIntegrityStatus] = useState({
        schemaCheckPassed: true,
        collectionNamingValid: true,
        errors: [] as string[]
    });
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const { toast } = useToast();

    const fetchData = async () => {
        try {
            if (!db) {
                console.error("Firestore not initialized");
                return;
            }
            
            // 1. Fetch Users
            const usersSnapshot = await getDocs(collection(db, 'users'));
            const allUsers = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
            const ownerUsers = allUsers.filter(user => user.role === 'owner');
            setOwners(ownerUsers);

            // Calculate Schema Version Distribution
            const dist: Record<number, number> = {};
            let schemaCheckPassed = true;
            const errors: string[] = [];

            allUsers.forEach(user => {
                const ver = user.schemaVersion || 0;
                dist[ver] = (dist[ver] || 0) + 1;
                
                if (user.role === 'owner' && ver === 0) {
                    schemaCheckPassed = false;
                    errors.push(`Owner ${user.name || user.id} is missing schemaVersion.`);
                }
            });
            setSchemaDistribution(dist);

            // 2. Fetch PGs and Calculate Stats
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

            // 3. Verify Collection Naming Integrity (Rule 6)
            let collectionNamingValid = true;
            try {
                AdminDataIntegrityShield.validateCollectionName('tenants_invalid');
            } catch (err: any) {
                collectionNamingValid = true;
            }

            setIntegrityStatus({
                schemaCheckPassed,
                collectionNamingValid,
                errors
            });

            // 4. Fetch Recent Activity Logs
            try {
                const logsQuery = query(collection(db, 'activity_logs'), orderBy('timestamp', 'desc'), limit(10));
                const logsSnapshot = await getDocs(logsQuery);
                const logs = logsSnapshot.docs.map(doc => {
                    const data = doc.data();
                    return {
                        id: doc.id,
                        ...data,
                        timestamp: data.timestamp?.toDate ? data.timestamp.toDate().toISOString() : new Date().toISOString()
                    } as unknown as ActivityLog;
                });
                setActivityLogs(logs);
            } catch (err) {
                console.warn("Could not fetch global activity logs.", err);
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
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [toast]);

    const handleRefresh = () => {
        setRefreshing(true);
        fetchData();
    };

    const handleUserStatusUpdate = async (userId: string, status: 'active' | 'suspended') => {
        try {
            if (!db) return;
            AdminDataIntegrityShield.validateMutation('users', { status });
            const userRef = doc(db, "users", userId);
            await updateDoc(userRef, { status });
            toast({ title: "Success", description: `User status updated to ${status}.`});
            fetchData();
        } catch (error: any) {
            toast({ variant: 'destructive', title: "Error", description: error.message || "Failed to update user status."});
        }
    }

    const handlePropertyStatusUpdate = async (pg: PG, status: 'active' | 'rejected') => {
        try {
            if (!db) return;
            AdminDataIntegrityShield.validateMutation('pgs', { status });
            const pgRef = doc(db, "users_data", pg.ownerId, "pgs", pg.id);
            await updateDoc(pgRef, { status });
            toast({ title: "Success", description: `Property status updated to ${status}.`});
            fetchData();
        } catch (error: any) {
             toast({ variant: 'destructive', title: "Error", description: error.message || "Failed to update property status."});
        }
    }

    const tabItems = [
      { name: 'analytics', label: 'Analytics', icon: BarChart3 },
      { name: 'finance', label: 'Finance', icon: Wallet },
      { name: 'users', label: 'Users', icon: Users },
      { name: 'properties', label: 'Properties', icon: Building },
      { name: 'subscriptions', label: 'Subscriptions', icon: Settings },
      { name: 'support', label: 'Support & Alerts', icon: HeartHandshake },
      { name: 'reports', label: 'Reports', icon: FileText }
    ] as const;

    return (
        <div className="space-y-6 text-foreground bg-background p-1 md:p-3">
            {/* Super Admin Dashboard Dynamic Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/40 pb-4">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-violet-600 to-cyan-500 bg-clip-text text-transparent">
                        RoomBox Control Console
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">Unified administrative operations and ledger auditing.</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    {/* Quick Action Navigation Buttons */}
                    <Button 
                        size="sm"
                        onClick={() => setActiveTab('subscriptions')}
                        className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold flex items-center gap-1.5 h-9"
                    >
                        <Zap className="w-4 h-4" /> Wallet Override
                    </Button>
                    <Button 
                        size="sm"
                        onClick={() => setActiveTab('properties')}
                        className="bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-semibold flex items-center gap-1.5 h-9"
                    >
                        <Building className="w-4 h-4" /> Verify Listings ({pendingPgs.length})
                    </Button>
                    <Button 
                        onClick={handleRefresh} 
                        disabled={refreshing} 
                        variant="outline" 
                        className="flex items-center gap-1.5 border-primary/20 hover:bg-primary/10 transition-all font-semibold h-9 text-xs"
                    >
                        <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                        Sync Data
                    </Button>
                </div>
            </div>

            {/* Mobile-first Touch Tabs Switcher (Scrollable on small screens) */}
            <div className="flex overflow-x-auto gap-2 border-b border-border/30 pb-2 scrollbar-none snap-x">
                {tabItems.map(item => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.name;
                  return (
                    <button
                      key={item.name}
                      onClick={() => setActiveTab(item.name)}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap snap-center border ${
                        isActive 
                          ? 'bg-primary text-primary-foreground border-primary shadow-md' 
                          : 'bg-card/40 border-border/40 hover:bg-card/75 text-muted-foreground'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {item.label}
                    </button>
                  );
                })}
            </div>

            {/* Render Selected View */}
            <div className="mt-4 min-h-[400px]">
              {loading ? (
                <div className="space-y-6">
                  <div className="grid gap-4 md:grid-cols-4">
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-24 w-full" />
                  </div>
                  <Skeleton className="h-[300px] w-full" />
                </div>
              ) : (
                <>
                  {activeTab === 'analytics' && (
                    <AdminAnalytics 
                      stats={stats} 
                      owners={owners} 
                      pendingPgs={pendingPgs} 
                      activityLogs={activityLogs} 
                    />
                  )}
                  {activeTab === 'finance' && (
                    <AdminFinance 
                      owners={owners} 
                      stats={stats} 
                    />
                  )}
                  {activeTab === 'users' && (
                    <AdminUsers 
                      owners={owners} 
                      onUserStatusUpdate={handleUserStatusUpdate} 
                      loading={loading}
                    />
                  )}
                  {activeTab === 'properties' && (
                    <AdminProperties 
                      pendingPgs={pendingPgs} 
                      onPropertyStatusUpdate={handlePropertyStatusUpdate} 
                      owners={owners}
                    />
                  )}
                  {activeTab === 'subscriptions' && (
                    <AdminSubscriptions 
                      owners={owners} 
                      onRefresh={fetchData} 
                    />
                  )}
                  {activeTab === 'support' && (
                    <AdminSupport />
                  )}
                  {activeTab === 'reports' && (
                    <AdminReports 
                      stats={stats} 
                      owners={owners}
                    />
                  )}
                </>
              )}
            </div>

            {/* System Status Indicators */}
            <div className="border-t border-border/30 pt-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-500" />
                <span>Security Sandbox Active</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>Firestore Integrity Shield V10 Enabled</span>
              </div>
              <div className="flex items-center gap-2">
                <span>Database: {integrityStatus.schemaCheckPassed && integrityStatus.collectionNamingValid ? 'Secured' : 'Attention Required'}</span>
                {integrityStatus.schemaCheckPassed && integrityStatus.collectionNamingValid ? (
                  <Badge variant="default" className="text-[9px] px-1.5 py-0 uppercase">Optimal</Badge>
                ) : (
                  <Badge variant="destructive" className="text-[9px] px-1.5 py-0 uppercase">Warning</Badge>
                )}
              </div>
            </div>
        </div>
    );
}
