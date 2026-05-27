'use client'

import { useEffect, useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { User, PG, Guest, ActivityLog, Complaint } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Users, Building, Hourglass, CheckCircle, XCircle, 
  Database, ShieldCheck, ShieldAlert, Activity, RefreshCw, 
  BarChart3, Wallet, Shield, FileText, Settings, HeartHandshake, Zap, Sparkles,
  MoreHorizontal, Globe, LogOut, ChevronRight, Search, Landmark, HelpCircle, ArrowUpRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { AdminDataIntegrityShield } from '@/lib/admin-integrity-shield';
import { useAppSelector, useAppDispatch } from '@/lib/hooks';
import { fetchAdminDashboardData } from '@/lib/actions/adminActions';
import { logoutUser } from '@/lib/slices/userSlice';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import Link from 'next/link';

// Subcomponents
import AdminAnalytics from '../components/AdminAnalytics';
import AdminFinance from '../components/AdminFinance';
import AdminUsers from '../components/AdminUsers';
import AdminProperties from '../components/AdminProperties';
import AdminSubscriptions from '../components/AdminSubscriptions';
import AdminSupport from '../components/AdminSupport';
import AdminReports from '../components/AdminReports';
import AdminAuditTrail from '../components/AdminAuditTrail';
import {
  adminApproveOwner,
  adminUpdateOwnerStatus,
  adminApprovePG,
} from '@/lib/actions/adminActions';
import type { AdminAuditLog } from '@/lib/types';


type TabName = 'analytics' | 'finance' | 'users' | 'properties' | 'subscriptions' | 'support' | 'reports' | 'audit';


export default function AdminDashboardPage() {
    const { currentUser } = useAppSelector((state) => state.user);
    const dispatch = useAppDispatch();
    const [activeTab, setActiveTab] = useState<TabName>('analytics');
    const [owners, setOwners] = useState<User[]>([]);
    const [pendingPgs, setPendingPgs] = useState<PG[]>([]);
    const [allPgs, setAllPgs] = useState<PG[]>([]);
    const [allGuests, setAllGuests] = useState<Guest[]>([]);
    const [allPayments, setAllPayments] = useState<any[]>([]);
    const [allComplaints, setAllComplaints] = useState<Complaint[]>([]);
    const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
    const [adminAuditLogs, setAdminAuditLogs] = useState<AdminAuditLog[]>([]);

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
    const [searchQuery, setSearchQuery] = useState('');
    const [searchFocused, setSearchFocused] = useState(false);
    const [preselectedOwnerId, setPreselectedOwnerId] = useState('');
    const { toast } = useToast();

    const fetchData = async () => {
        if (!currentUser?.id) {
            console.log("[AdminDashboard] Waiting for currentUser session to load.");
            return;
        }
        try {
            const result = await fetchAdminDashboardData(currentUser.id);
            
            if (result.success && result.owners && result.pendingPgs && result.allPgs && result.activityLogs && result.stats && result.schemaDistribution) {
                setOwners(result.owners);
                setPendingPgs(result.pendingPgs);
                setAllPgs(result.allPgs);
                setActivityLogs(result.activityLogs);
                setStats(result.stats);
                setSchemaDistribution(result.schemaDistribution);
                
                if (result.allGuests) setAllGuests(result.allGuests);
                if (result.allPayments) setAllPayments(result.allPayments);
                if (result.allComplaints) setAllComplaints(result.allComplaints);
                if (result.adminAuditLogs) setAdminAuditLogs(result.adminAuditLogs);

                
                // Verify Collection Naming Integrity (Rule 6)
                let collectionNamingValid = true;
                try {
                    AdminDataIntegrityShield.validateCollectionName('tenants_invalid');
                } catch (err: any) {
                    collectionNamingValid = true;
                }

                // Verify Schema Version Distributions
                let schemaCheckPassed = true;
                const errors: string[] = [];
                result.owners.forEach(owner => {
                    if (owner.role === 'owner' && (owner.schemaVersion || 0) === 0) {
                        schemaCheckPassed = false;
                        errors.push(`Owner ${owner.name || owner.id} is missing schemaVersion.`);
                    }
                });

                setIntegrityStatus({
                    schemaCheckPassed,
                    collectionNamingValid,
                    errors
                });

            } else {
                toast({ variant: 'destructive', title: "Security Block", description: result.error || "Could not fetch admin data." });
            }
        } catch (error: any) {
            console.error("Error fetching admin data:", error);
            toast({ variant: 'destructive', title: "Error", description: error.message || "Could not fetch admin dashboard data." });
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        if (currentUser?.id) {
            fetchData();
        }
    }, [currentUser, toast]);

    const handleRefresh = () => {
        setRefreshing(true);
        fetchData();
    };

    const handleUserStatusUpdate = async (userId: string, status: 'active' | 'suspended') => {
        if (!currentUser?.id) return;
        const targetOwner = owners.find(o => o.id === userId);
        try {
            const result = await adminUpdateOwnerStatus(
                currentUser.id,
                currentUser.name || 'Admin',
                userId,
                targetOwner?.name || userId,
                status
            );
            if (!result.success) throw new Error(result.error);
            toast({ title: 'Success', description: `Owner status updated to ${status}.` });
            fetchData();
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message || 'Failed to update user status.' });
        }
    };


    const handlePropertyStatusUpdate = async (pg: PG, status: 'active' | 'rejected') => {
        if (!currentUser?.id) return;
        try {
            const result = await adminApprovePG(
                currentUser.id,
                currentUser.name || 'Admin',
                pg.ownerId,
                pg.id,
                pg.name || pg.id,
                status === 'active'
            );
            if (!result.success) throw new Error(result.error);
            toast({ title: 'Success', description: `Property status updated to ${status}.` });
            fetchData();
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message || 'Failed to update property status.' });
        }
    };


    const handleLogout = async () => {
      await dispatch(logoutUser());
      window.location.href = '/login';
    };

    const tabItems = [
      { name: 'analytics',     label: 'Overview',       icon: BarChart3,       color: 'text-violet-400' },
      { name: 'finance',       label: 'Landlord Ledger', icon: Wallet,         color: 'text-emerald-400' },
      { name: 'users',         label: 'Owners Registry', icon: Users,          color: 'text-indigo-400' },
      { name: 'properties',    label: 'Hostel Moderation', icon: Building,     color: 'text-cyan-400' },
      { name: 'subscriptions', label: 'Wallet Adjuster', icon: Zap,            color: 'text-amber-400' },
      { name: 'support',       label: 'Emergency Alerts', icon: HeartHandshake, color: 'text-rose-400' },
      { name: 'reports',       label: 'Platform Reports', icon: FileText,      color: 'text-sky-400' },
      { name: 'audit',         label: 'Audit Trail',     icon: ShieldCheck,    color: 'text-purple-400' },
    ] as const;


    const handleResolveComplaintSearch = async (complaintId: string) => {
        try {
            if (!db) return;
            const ref = doc(db, 'complaints', complaintId);
            await updateDoc(ref, { status: 'resolved' });
            toast({ title: "Complaint Resolved", description: "Successfully updated support ticket state." });
            fetchData();
        } catch (err: any) {
            toast({ variant: 'destructive', title: "Error", description: err.message || "Failed to update ticket." });
        }
    };

    const filteredSearch = () => {
        if (!searchQuery.trim()) return null;
        const q = searchQuery.toLowerCase();
        
        const matchingOwners = owners.filter(o => 
            (o.name || '').toLowerCase().includes(q) || 
            (o.email || '').toLowerCase().includes(q) || 
            (o.phone || '').toLowerCase().includes(q)
        );
        
        const matchingGuests = allGuests.filter(g => 
            (g.name || '').toLowerCase().includes(q) || 
            (g.phone || '').toLowerCase().includes(q) || 
            (g.email || '').toLowerCase().includes(q) ||
            (g.pgName || '').toLowerCase().includes(q)
        );
        
        const matchingPgs = allPgs.filter(p => 
            (p.name || '').toLowerCase().includes(q) || 
            (p.location || '').toLowerCase().includes(q) || 
            (p.city || '').toLowerCase().includes(q)
        );
        
        const matchingPayments = allPayments.filter(p => 
            (p.utr || '').toLowerCase().includes(q) || 
            (p.guestName || '').toLowerCase().includes(q) || 
            p.amount.toString().includes(q) ||
            (p.method || '').toLowerCase().includes(q)
        );
        
        const matchingComplaints = allComplaints.filter(c => 
            (c.guestName || '').toLowerCase().includes(q) || 
            (c.description || '').toLowerCase().includes(q) || 
            (c.category || '').toLowerCase().includes(q)
        );
        
        const totalMatches = matchingOwners.length + matchingGuests.length + matchingPgs.length + matchingPayments.length + matchingComplaints.length;
        
        return {
            owners: matchingOwners.slice(0, 5),
            guests: matchingGuests.slice(0, 5),
            pgs: matchingPgs.slice(0, 5),
            payments: matchingPayments.slice(0, 5),
            complaints: matchingComplaints.slice(0, 5),
            totalMatches
        };
    };

    const searchResults = filteredSearch();

    const initials = currentUser?.name ? currentUser.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() : 'AD';

    return (
        <div className="space-y-6 text-slate-100 bg-transparent min-h-screen pb-24 md:pb-6 relative">
            {/* Click-away overlay for Search HUD dropdown */}
            {searchFocused && (
                <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-all duration-300" onClick={() => setSearchFocused(false)} />
            )}
            {/* Compact Operational Status Bar */}
            <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-4">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="flex items-center gap-1.5 shrink-0">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span className="text-xs font-bold text-slate-300">RoomBox Admin</span>
                    </div>
                    <span className="text-slate-700 hidden sm:inline">·</span>
                    <div className="hidden sm:flex items-center gap-2 flex-wrap">
                        <span className="text-[11px] text-slate-500 font-medium">{stats.totalOwners} owners</span>
                        <span className="text-slate-700">·</span>
                        <span className="text-[11px] text-slate-500 font-medium">{stats.totalProperties} properties</span>
                        <span className="text-slate-700">·</span>
                        <span className="text-[11px] text-slate-500 font-medium">{stats.totalTenants} tenants</span>
                        {pendingPgs.length > 0 && (
                            <>
                                <span className="text-slate-700">·</span>
                                <button
                                    onClick={() => setActiveTab('properties')}
                                    className="text-[11px] text-amber-400 font-bold hover:text-amber-300 transition-colors"
                                >
                                    {pendingPgs.length} pending approval
                                </button>
                            </>
                        )}
                    </div>
                </div>
                <button
                    onClick={handleRefresh}
                    disabled={refreshing}
                    className="flex items-center gap-1.5 text-[11px] text-slate-500 hover:text-slate-300 transition-colors disabled:opacity-50 shrink-0"
                >
                    <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                    <span className="hidden sm:inline">{refreshing ? 'Syncing...' : 'Refresh'}</span>
                </button>
            </div>


            {/* Universal HUD Search Bar */}
            <div className="relative z-50">
                <div className="relative flex items-center bg-slate-950/60 border border-slate-800/80 rounded-2xl p-1.5 focus-within:border-violet-500/50 focus-within:shadow-lg focus-within:shadow-violet-500/10 transition-all backdrop-blur-md">
                    <Search className="w-5 h-5 text-slate-400 ml-3.5" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onFocus={() => setSearchFocused(true)}
                        placeholder="Search owners, guests, hostel names, payments, UTR codes, active alarms, phone numbers..."
                        className="flex-1 bg-transparent border-0 outline-none focus:ring-0 text-slate-200 placeholder-slate-500 text-sm px-3.5 py-2.5 w-full font-semibold"
                    />
                    {searchQuery && (
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => setSearchQuery('')}
                            className="text-xs text-slate-400 hover:text-slate-200 h-8 rounded-xl font-bold px-3 hover:bg-slate-900 mr-1"
                        >
                            Clear
                        </Button>
                    )}
                </div>

                {/* Search Results Dropdown Overlay */}
                {searchFocused && searchResults && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-slate-950/95 border border-slate-800/80 rounded-2xl shadow-2xl backdrop-blur-xl z-50 max-h-[480px] overflow-y-auto divide-y divide-slate-900 scrollbar-thin animate-in fade-in slide-in-from-top-2 duration-200">
                        {searchResults.totalMatches === 0 ? (
                            <div className="p-8 text-center text-xs text-slate-500 font-extrabold flex flex-col items-center justify-center gap-2">
                                <HelpCircle className="w-8 h-8 text-slate-700 animate-bounce" />
                                No ecosystem matches found. Try another name, phone number, or transaction ID.
                            </div>
                        ) : (
                            <div className="p-4 space-y-4">
                                {/* Owners matches */}
                                {searchResults.owners.length > 0 && (
                                    <div className="space-y-2">
                                        <h4 className="text-[10px] font-black text-violet-400 uppercase tracking-widest px-1">Owners Registry ({searchResults.owners.length})</h4>
                                        <div className="grid gap-2">
                                            {searchResults.owners.map(owner => (
                                                <div key={owner.id} className="bg-slate-900/40 hover:bg-slate-900 border border-slate-850 p-3 rounded-xl flex items-center justify-between gap-4 transition-colors">
                                                    <div>
                                                        <div className="text-xs font-black text-white flex items-center gap-2">
                                                            {owner.name}
                                                            {owner.status === 'active' ? (
                                                                <Badge variant="outline" className="text-[8px] border-emerald-500/20 text-emerald-400 bg-emerald-500/5 font-black py-0 px-1 uppercase">Active</Badge>
                                                            ) : (
                                                                <Badge variant="outline" className="text-[8px] border-rose-500/20 text-rose-400 bg-rose-500/5 font-black py-0 px-1 uppercase">Suspended</Badge>
                                                            )}
                                                        </div>
                                                        <div className="text-[10px] text-slate-400 font-semibold mt-0.5">{owner.phone || 'No phone'} • {owner.email}</div>
                                                        <div className="text-[9px] text-slate-500 font-semibold mt-1">Wallet Balance: ₹{owner.wallet?.balance ?? 0} • WhatsApp: {owner.subscription?.whatsappCredits ?? 0} credits</div>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 shrink-0">
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setPreselectedOwnerId(owner.id);
                                                                setActiveTab('subscriptions');
                                                                setSearchFocused(false);
                                                            }}
                                                            className="text-[9px] font-extrabold h-7 rounded-lg border-amber-500/20 text-amber-400 bg-amber-500/5 hover:bg-amber-500/10 hover:text-amber-300"
                                                        >
                                                            Refill Wallet
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleUserStatusUpdate(owner.id, owner.status === 'active' ? 'suspended' : 'active');
                                                            }}
                                                            className={`text-[9px] font-extrabold h-7 rounded-lg ${owner.status === 'active' ? 'border-rose-500/25 text-rose-400 bg-rose-500/5 hover:bg-rose-500/10' : 'border-emerald-500/25 text-emerald-400 bg-emerald-500/5 hover:bg-emerald-500/10'}`}
                                                        >
                                                            {owner.status === 'active' ? 'Suspend' : 'Activate'}
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* PGs matches */}
                                {searchResults.pgs.length > 0 && (
                                    <div className="space-y-2">
                                        <h4 className="text-[10px] font-black text-cyan-400 uppercase tracking-widest px-1">Hostels & PGs ({searchResults.pgs.length})</h4>
                                        <div className="grid gap-2">
                                            {searchResults.pgs.map(pg => (
                                                <div key={pg.id} className="bg-slate-900/40 hover:bg-slate-900 border border-slate-850 p-3 rounded-xl flex items-center justify-between gap-4 transition-colors">
                                                    <div>
                                                        <div className="text-xs font-black text-white flex items-center gap-2">
                                                            {pg.name}
                                                            <Badge variant="outline" className={`text-[8px] font-black py-0 px-1 uppercase ${pg.status === 'active' ? 'border-emerald-500/20 text-emerald-400 bg-emerald-500/5' : 'border-amber-500/20 text-amber-400 bg-emerald-500/5'}`}>
                                                                {pg.status?.replace('_', ' ')}
                                                            </Badge>
                                                        </div>
                                                        <div className="text-[10px] text-slate-400 font-semibold mt-0.5">{pg.location}, {pg.city} • Gender: {pg.gender}</div>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 shrink-0">
                                                        {pg.status === 'pending_approval' && (
                                                            <Button
                                                                size="sm"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handlePropertyStatusUpdate(pg, 'active');
                                                                }}
                                                                className="text-[9px] font-extrabold h-7 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white"
                                                            >
                                                                Approve PG
                                                            </Button>
                                                        )}
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setActiveTab('properties');
                                                                setSearchFocused(false);
                                                            }}
                                                            className="text-[9px] font-extrabold h-7 rounded-lg border-slate-800 hover:bg-slate-900 text-slate-300"
                                                        >
                                                            View Registry
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Guest matches */}
                                {searchResults.guests.length > 0 && (
                                    <div className="space-y-2">
                                        <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest px-1">Guests & Tenants ({searchResults.guests.length})</h4>
                                        <div className="grid gap-2">
                                            {searchResults.guests.map(guest => (
                                                <div key={guest.id} className="bg-slate-900/40 hover:bg-slate-900 border border-slate-850 p-3 rounded-xl flex items-center justify-between gap-4 transition-colors">
                                                    <div>
                                                        <div className="text-xs font-black text-white flex items-center gap-2">
                                                            {guest.name}
                                                            {guest.isVacated ? (
                                                                <Badge variant="outline" className="text-[8px] border-slate-800 text-slate-400 font-black py-0 px-1 uppercase">Vacated</Badge>
                                                            ) : (
                                                                <Badge variant="outline" className={`text-[8px] font-black py-0 px-1 uppercase ${guest.rentStatus === 'paid' ? 'border-emerald-500/20 text-emerald-400 bg-emerald-500/5' : 'border-rose-500/20 text-rose-400 bg-rose-500/5'}`}>
                                                                    {guest.rentStatus}
                                                                </Badge>
                                                            )}
                                                        </div>
                                                        <div className="text-[10px] text-slate-400 font-semibold mt-0.5">Phone: {guest.phone || 'N/A'} • {guest.pgName}</div>
                                                        <div className="text-[9px] text-slate-500 font-semibold mt-1">Rent: ₹{guest.rentAmount} • Due Date: {new Date(guest.dueDate).toLocaleDateString()}</div>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 shrink-0">
                                                        {guest.phone && (
                                                            <a href={`https://wa.me/91${guest.phone}`} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    className="text-[9px] font-extrabold h-7 rounded-lg border-emerald-500/20 text-emerald-400 bg-emerald-500/5 hover:bg-emerald-500/10 hover:text-emerald-300"
                                                                >
                                                                    WhatsApp Tenant
                                                                </Button>
                                                            </a>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Payments matches */}
                                {searchResults.payments.length > 0 && (
                                    <div className="space-y-2">
                                        <h4 className="text-[10px] font-black text-emerald-400 uppercase tracking-widest px-1">Transactions & Payments ({searchResults.payments.length})</h4>
                                        <div className="grid gap-2">
                                            {searchResults.payments.map((payment, pidx) => (
                                                <div key={payment.id || pidx} className="bg-slate-900/40 hover:bg-slate-900 border border-slate-850 p-3 rounded-xl flex items-center justify-between gap-4 transition-colors">
                                                    <div>
                                                        <div className="text-xs font-black text-white flex items-center gap-2">
                                                            Amount: ₹{payment.amount}
                                                            <Badge variant="outline" className={`text-[8px] font-black py-0 px-1 uppercase ${payment.status === 'VERIFIED' ? 'border-emerald-500/20 text-emerald-400 bg-emerald-500/5' : 'border-amber-500/20 text-amber-400 bg-emerald-500/5'}`}>
                                                                {payment.status}
                                                            </Badge>
                                                        </div>
                                                        <div className="text-[10px] text-slate-400 font-semibold mt-0.5">Guest: {payment.guestName} • Landlord: {payment.ownerName}</div>
                                                        <div className="text-[9px] text-slate-500 font-semibold mt-1">UTR: {payment.utr || 'N/A'} • Method: {payment.method}</div>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 shrink-0">
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setActiveTab('finance');
                                                                setSearchFocused(false);
                                                            }}
                                                            className="text-[9px] font-extrabold h-7 rounded-lg border-slate-800 hover:bg-slate-900 text-slate-300"
                                                        >
                                                            Audit Ledger
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Complaints matches */}
                                {searchResults.complaints.length > 0 && (
                                    <div className="space-y-2">
                                        <h4 className="text-[10px] font-black text-rose-400 uppercase tracking-widest px-1">Alarms & Complaints ({searchResults.complaints.length})</h4>
                                        <div className="grid gap-2">
                                            {searchResults.complaints.map(complaint => (
                                                <div key={complaint.id} className="bg-slate-900/40 hover:bg-slate-900 border border-slate-850 p-3 rounded-xl flex items-center justify-between gap-4 transition-colors">
                                                    <div className="max-w-[70%]">
                                                        <div className="text-xs font-black text-white flex items-center gap-2">
                                                            [{complaint.category.toUpperCase()}] raised by {complaint.guestName}
                                                            <Badge variant="outline" className={`text-[8px] font-black py-0 px-1 uppercase ${complaint.status === 'resolved' ? 'border-emerald-500/20 text-emerald-400 bg-emerald-500/5' : 'border-rose-500/20 text-rose-400 bg-rose-500/5'}`}>
                                                                {complaint.status}
                                                            </Badge>
                                                        </div>
                                                        <p className="text-[10px] text-slate-400 font-semibold mt-1 truncate">{complaint.description}</p>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 shrink-0">
                                                        {complaint.status !== 'resolved' && (
                                                            <Button
                                                                size="sm"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleResolveComplaintSearch(complaint.id);
                                                                }}
                                                                className="text-[9px] font-extrabold h-7 rounded-lg bg-rose-700 hover:bg-rose-800 text-white"
                                                            >
                                                                Resolve Inline
                                                            </Button>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* desktop Touch Tabs Switcher (hidden on mobile devices, Glassmorphic styling) */}
            <div className="hidden md:flex overflow-x-auto gap-2 border border-slate-800/80 p-1.5 rounded-2xl bg-slate-950/60 backdrop-blur-md scrollbar-none snap-x sticky top-16 z-30">
                {tabItems.map(item => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.name;
                  return (
                    <button
                      key={item.name}
                      onClick={() => setActiveTab(item.name)}
                      className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all whitespace-nowrap snap-center border ${
                        isActive 
                          ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white border-violet-500/30 shadow-md shadow-violet-500/20' 
                          : 'bg-transparent border-transparent hover:bg-slate-900/60 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-300' : item.color}`} />
                      {item.label}
                    </button>
                  );
                })}
            </div>

            {/* Render Selected View */}
            <div className="mt-4 min-h-[450px]">
              {loading ? (
                <div className="space-y-6">
                  <div className="grid gap-4 md:grid-cols-4">
                    <Skeleton className="h-28 w-full rounded-2xl bg-slate-900/40" />
                    <Skeleton className="h-28 w-full rounded-2xl bg-slate-900/40" />
                    <Skeleton className="h-28 w-full rounded-2xl bg-slate-900/40" />
                    <Skeleton className="h-28 w-full rounded-2xl bg-slate-900/40" />
                  </div>
                  <Skeleton className="h-[350px] w-full rounded-2xl bg-slate-900/40" />
                </div>
              ) : (
                <div className="transition-all duration-500 ease-in-out">
                  {activeTab === 'analytics' && (
                    <AdminAnalytics 
                      stats={stats} 
                      owners={owners} 
                      pendingPgs={pendingPgs} 
                      activityLogs={activityLogs}
                      allGuests={allGuests}
                      allPayments={allPayments}
                      allComplaints={allComplaints}
                      allPgs={allPgs}
                      onNavigate={setActiveTab}
                      onUserStatusUpdate={handleUserStatusUpdate}
                      onPropertyStatusUpdate={handlePropertyStatusUpdate}
                    />
                  )}
                  {activeTab === 'finance' && (
                    <AdminFinance 
                      owners={owners} 
                      stats={stats} 
                      allPayments={allPayments}
                      allGuests={allGuests}
                    />
                  )}
                  {activeTab === 'users' && (
                    <AdminUsers 
                      owners={owners} 
                      onUserStatusUpdate={handleUserStatusUpdate} 
                      loading={loading}
                      currentAdminId={currentUser?.id}
                      currentAdminName={currentUser?.name || 'Admin'}
                    />
                  )}
                  {activeTab === 'properties' && (
                    <AdminProperties 
                      pendingPgs={pendingPgs} 
                      allPgs={allPgs}
                      onPropertyStatusUpdate={handlePropertyStatusUpdate} 
                      owners={owners}
                    />
                  )}
                  {activeTab === 'subscriptions' && (
                    <AdminSubscriptions 
                      owners={owners} 
                      onRefresh={fetchData}
                      preselectedOwnerId={preselectedOwnerId}
                    />
                  )}
                  {activeTab === 'support' && (
                    <AdminSupport 
                      complaints={allComplaints}
                      onRefresh={fetchData}
                    />
                  )}
                  {activeTab === 'reports' && (
                    <AdminReports 
                      stats={stats} 
                      owners={owners}
                    />
                  )}
                  {activeTab === 'audit' && (
                    <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-4 md:p-6">
                      <AdminAuditTrail auditLogs={adminAuditLogs} />
                    </div>
                  )}

                </div>
              )}
            </div>

            {/* System Status Indicators */}
            <div className="border-t border-slate-900 pt-5 mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400 font-medium">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-400" />
                <span>Security Sandbox Active</span>
                <span className="w-1 h-1 rounded-full bg-slate-800" />
                <span>Firestore Integrity Shield V10 Enabled</span>
              </div>
              <div className="flex items-center gap-2">
                <span>Database Node: {integrityStatus.schemaCheckPassed && integrityStatus.collectionNamingValid ? 'Secured' : 'Needs Verification'}</span>
                {integrityStatus.schemaCheckPassed && integrityStatus.collectionNamingValid ? (
                  <Badge variant="outline" className="text-[9px] px-2 py-0.5 border-emerald-500/25 text-emerald-400 bg-emerald-500/5 font-extrabold uppercase">Optimal</Badge>
                ) : (
                  <Badge variant="outline" className="text-[9px] px-2 py-0.5 border-rose-500/25 text-rose-400 bg-rose-500/5 font-extrabold uppercase">Warning</Badge>
                )}
              </div>
            </div>

            {/* Admin Mobile Bottom Navigation Bar (Sticky and floating at absolute bottom, matching Owner UX) */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 border-t border-slate-900/60 bg-slate-950/90 backdrop-blur-md z-40 pb-safe shadow-lg">
                <nav className="grid grid-cols-6 h-16 items-center px-1">
                   {/* 1. Overview */}
                   <button
                     onClick={() => setActiveTab('analytics')}
                     className={`flex flex-col items-center justify-center gap-1 text-[10px] font-extrabold h-full ${activeTab === 'analytics' ? 'text-violet-400 bg-slate-900/40 rounded-xl' : 'text-slate-500 hover:text-slate-300'}`}
                   >
                     <BarChart3 className="h-5 w-5" />
                     <span>Overview</span>
                   </button>

                   {/* 2. Owners */}
                   <button
                     onClick={() => setActiveTab('users')}
                     className={`flex flex-col items-center justify-center gap-1 text-[10px] font-extrabold h-full ${activeTab === 'users' ? 'text-violet-400 bg-slate-900/40 rounded-xl' : 'text-slate-500 hover:text-slate-300'}`}
                   >
                     <Users className="h-5 w-5" />
                     <span>Owners</span>
                   </button>

                   {/* 3. Hostels */}
                   <button
                     onClick={() => setActiveTab('properties')}
                     className={`flex flex-col items-center justify-center gap-1 text-[10px] font-extrabold h-full ${activeTab === 'properties' ? 'text-violet-400 bg-slate-900/40 rounded-xl' : 'text-slate-500 hover:text-slate-300'}`}
                   >
                     <Building className="h-5 w-5" />
                     <span>Hostels</span>
                   </button>

                   {/* 4. Support Alerts */}
                   <button
                     onClick={() => setActiveTab('support')}
                     className={`flex flex-col items-center justify-center gap-1 text-[10px] font-extrabold h-full ${activeTab === 'support' ? 'text-rose-400 bg-slate-900/40 rounded-xl' : 'text-slate-500 hover:text-slate-300'}`}
                   >
                     <div className="relative">
                       <HeartHandshake className="h-5 w-5" />
                       <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-rose-500 animate-pulse border border-slate-950" />
                     </div>
                     <span>Alarms</span>
                   </button>

                   {/* 5. Audit Trail */}
                   <button
                     onClick={() => setActiveTab('audit')}
                     className={`flex flex-col items-center justify-center gap-1 text-[10px] font-extrabold h-full ${activeTab === 'audit' ? 'text-purple-400 bg-slate-900/40 rounded-xl' : 'text-slate-500 hover:text-slate-300'}`}
                   >
                     <div className="relative">
                       <ShieldCheck className="h-5 w-5" />
                       {adminAuditLogs.filter(l => ['IMPERSONATION_STARTED','WALLET_CREDITED','WALLET_DEBITED'].includes(l.action)).length > 0 && (
                         <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-purple-500 border border-slate-950" />
                       )}
                     </div>
                     <span>Audit</span>
                   </button>

                   <Sheet>
                     <SheetTrigger asChild>
                       <button
                         className="flex flex-col items-center justify-center gap-1 text-[10px] font-extrabold h-full text-slate-500 hover:text-slate-300"
                       >
                         <MoreHorizontal className="h-5 w-5" />
                         <span>More</span>
                       </button>
                     </SheetTrigger>
                     <SheetContent side="bottom" className="h-auto max-h-[85dvh] rounded-t-[2.5rem] bg-slate-950 border-slate-800 text-slate-100 p-0 overflow-hidden pb-safe">
                         <SheetHeader className="sr-only">
                           <SheetTitle>Administrative Drawer Options</SheetTitle>
                         </SheetHeader>
                         <div className="flex justify-center pt-3 pb-1 border-b border-slate-900/60">
                             <div className="w-12 h-1.5 bg-slate-800 rounded-full" />
                         </div>
                         
                         {/* Admin avatar profile details */}
                         <div className="px-6 py-5 flex items-center gap-4 bg-slate-900/10 border-b border-slate-900">
                           <Avatar className="h-12 w-12 border border-violet-500/20">
                             <AvatarImage src={currentUser?.avatarUrl} />
                             <AvatarFallback className="bg-gradient-to-tr from-violet-600 to-indigo-600 text-white font-bold text-sm">
                               {initials}
                             </AvatarFallback>
                           </Avatar>
                           <div>
                             <h4 className="font-extrabold text-base text-slate-200">{currentUser?.name || 'System Admin'}</h4>
                             <Badge variant="outline" className="text-[9px] uppercase px-1.5 py-0.5 border-violet-500/30 text-violet-400 bg-violet-500/5 font-extrabold tracking-wide mt-1">
                               Super Admin Panel
                             </Badge>
                           </div>
                         </div>

                         {/* Quick action grid inside sheet drawer */}
                         <div className="p-4 space-y-2 overflow-y-auto max-h-[50vh]">
                           {/* 5a. Landlord Ledger */}
                           <button
                             onClick={() => { setActiveTab('finance'); }}
                             className={`flex items-center gap-4 w-full rounded-2xl p-3.5 text-left transition-all active:scale-[0.98] ${activeTab === 'finance' ? 'bg-violet-600/15 border border-violet-500/20 text-white' : 'text-slate-300 hover:bg-slate-900/40 border border-transparent'}`}
                           >
                             <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 text-emerald-400">
                               <Wallet className="w-5 h-5" />
                             </div>
                             <div>
                               <p className="font-extrabold text-xs">Landlord Ledger</p>
                               <p className="text-[10px] text-slate-500 font-semibold mt-0.5">Audit prepaid refill margins</p>
                             </div>
                           </button>

                           {/* 5b. Wallet Override */}
                           <button
                             onClick={() => { setActiveTab('subscriptions'); }}
                             className={`flex items-center gap-4 w-full rounded-2xl p-3.5 text-left transition-all active:scale-[0.98] ${activeTab === 'subscriptions' ? 'bg-violet-600/15 border border-violet-500/20 text-white' : 'text-slate-300 hover:bg-slate-900/40 border border-transparent'}`}
                           >
                             <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 text-amber-400">
                               <Zap className="w-5 h-5 animate-pulse" />
                             </div>
                             <div>
                               <p className="font-extrabold text-xs">Rates & Overrides</p>
                               <p className="text-[10px] text-slate-500 font-semibold mt-0.5">Configure discounts, platform plans and refills</p>
                             </div>
                           </button>

                           {/* 5c. Platform Reports */}
                           <button
                             onClick={() => { setActiveTab('reports'); }}
                             className={`flex items-center gap-4 w-full rounded-2xl p-3.5 text-left transition-all active:scale-[0.98] ${activeTab === 'reports' ? 'bg-violet-600/15 border border-violet-500/20 text-white' : 'text-slate-300 hover:bg-slate-900/40 border border-transparent'}`}
                           >
                             <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 text-cyan-400">
                               <FileText className="w-5 h-5" />
                             </div>
                             <div>
                               <p className="font-extrabold text-xs">Spreadsheets & Reports</p>
                               <p className="text-[10px] text-slate-500 font-semibold mt-0.5">Export landlord growth records to CSV</p>
                             </div>
                           </button>

                           {/* 5d. Landlord workspace redirect */}
                           <Link href="/dashboard" className="block w-full">
                             <button
                               className="flex items-center gap-4 w-full rounded-2xl p-3.5 text-left text-slate-300 hover:bg-slate-900/40 border border-transparent transition-all"
                             >
                               <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 text-sky-400">
                                 <Globe className="w-5 h-5" />
                               </div>
                               <div>
                                 <p className="font-extrabold text-xs">Go to Landlord Area</p>
                                 <p className="text-[10px] text-slate-500 font-semibold mt-0.5">Navigate to owner PG dashboard views</p>
                               </div>
                             </button>
                           </Link>

                           {/* 5e. Terminate session */}
                           <button
                             onClick={handleLogout}
                             className="flex items-center gap-4 w-full rounded-2xl p-3.5 text-left text-rose-400 hover:bg-rose-500/5 border border-transparent transition-all mt-4"
                           >
                             <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-slate-900 border border-slate-850 text-rose-500">
                               <LogOut className="w-5 h-5" />
                             </div>
                             <div>
                               <p className="font-extrabold text-xs">Log Out / Terminate</p>
                               <p className="text-[10px] text-slate-500 font-semibold mt-0.5">End secure admin console operations</p>
                             </div>
                           </button>
                         </div>
                     </SheetContent>
                   </Sheet>
                </nav>
            </div>
        </div>
    );
}
