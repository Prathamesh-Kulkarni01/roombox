'use client'

import React, { useState } from 'react';
import { 
  Users, Search, UserCheck, ShieldAlert, Key, 
  Mail, Phone, Eye, Star, UserMinus, AlertTriangle, MessageSquare, ChevronDown, ChevronUp, Sparkles, Check, Trash2
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import type { User } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { startGodModeSession } from '@/components/GodModeGuard';
import { adminLogImpersonation, adminDeleteOwnerData, type AdminDeleteOwnerOptions } from '@/lib/actions/adminActions';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';


interface UsersProps {
  owners: User[];
  onUserStatusUpdate: (userId: string, status: 'active' | 'suspended') => Promise<void>;
  loading: boolean;
  currentAdminId?: string;
  currentAdminName?: string;
}


export default function AdminUsers({ owners, onUserStatusUpdate, loading, currentAdminId = '', currentAdminName = 'Admin' }: UsersProps) {

  const [searchQuery, setSearchQuery] = useState('');
  const [activeRoleFilter, setActiveRoleFilter] = useState<'all' | 'active' | 'suspended' | 'pending'>('all');
  const [expandedOwner, setExpandedOwner] = useState<string | null>(null);
  const { toast } = useToast();

  const toggleExpand = (ownerId: string) => {
    setExpandedOwner(expandedOwner === ownerId ? null : ownerId);
  };

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [ownerToDelete, setOwnerToDelete] = useState<User | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteOptions, setDeleteOptions] = useState<AdminDeleteOwnerOptions>({
    ownerAccount: true,
    properties: true,
    tenants: true,
    staff: true,
    expenses: true,
    notices: true,
    complaints: true,
  });

  const triggerDelete = (owner: User) => {
    setOwnerToDelete(owner);
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!ownerToDelete) return;
    setIsDeleting(true);
    try {
      const result = await adminDeleteOwnerData(
        currentAdminId,
        currentAdminName,
        ownerToDelete.id,
        ownerToDelete.name || ownerToDelete.email || 'Unknown',
        deleteOptions
      );
      if (result.success) {
        toast({ title: 'Owner Data Deleted', description: 'Selected data was permanently wiped.' });
        setDeleteModalOpen(false);
        window.location.reload(); 
      } else {
        toast({ variant: 'destructive', title: 'Deletion Failed', description: result.error });
      }
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Deletion Error', description: err.message });
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredOwners = owners.filter(owner => {
    const nameMatch = (owner.name || '').toLowerCase().includes(searchQuery.toLowerCase());
    const emailMatch = (owner.email || '').toLowerCase().includes(searchQuery.toLowerCase());
    const phoneMatch = (owner.phone || '').includes(searchQuery);
    const matchesSearch = nameMatch || emailMatch || phoneMatch;
    
    if (activeRoleFilter === 'all') return matchesSearch;
    if (activeRoleFilter === 'active') return matchesSearch && owner.status === 'active';
    if (activeRoleFilter === 'suspended') return matchesSearch && owner.status === 'suspended';
    if (activeRoleFilter === 'pending') return matchesSearch && (owner.status === 'pending_approval' || !owner.status);
    return matchesSearch;
  });

  const launchGodMode = async (owner: User) => {
    const diagnosticReason = prompt(`Enter diagnostic authorization reason to impersonate ${owner.name}:`);
    if (!diagnosticReason || diagnosticReason.trim() === '') {
      toast({ variant: 'destructive', title: 'Auth Canceled', description: 'Reason is required to launch God Mode.' });
      return;
    }

    try {
      // 1. Start the 30-min timed session
      const session = startGodModeSession(
        currentAdminId,
        currentAdminName,
        owner.id,
        owner.name || 'Owner'
      );

      // 2. Legacy keys for dashboard layout backwards-compat
      sessionStorage.setItem('impersonate_owner_id', owner.id);
      sessionStorage.setItem('impersonate_owner_name', owner.name || 'Owner');
      sessionStorage.setItem('impersonate_reason', diagnosticReason);
      sessionStorage.setItem('impersonate_admin_backup', 'active');

      // 3. Write immutable audit record (fire-and-forget; no await block on UI)
      if (currentAdminId) {
        adminLogImpersonation(
          currentAdminId,
          currentAdminName,
          owner.id,
          owner.name || owner.id,
          'IMPERSONATION_STARTED',
          session.sessionId
        ).catch(console.error);
      }

      toast({ title: 'God Mode Active', description: `Establishing proxy session for ${owner.name}... (30 min limit)` });

      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 800);
    } catch (err) {
      toast({ variant: 'destructive', title: 'Impersonation Failed', description: 'Storage access denied.' });
    }
  };


  // Get count helpers for badge indices
  const totalCount = owners.length;
  const activeCount = owners.filter(o => o.status === 'active').length;
  const suspendedCount = owners.filter(o => o.status === 'suspended').length;
  const pendingCount = owners.filter(o => o.status === 'pending_approval' || !o.status).length;

  return (
    <Card className="border border-slate-800 bg-slate-950/40 backdrop-blur-md rounded-2xl overflow-hidden">
      <CardHeader className="pb-3 border-b border-slate-900/60">
        <CardTitle className="flex items-center gap-2 text-sm font-extrabold text-slate-200">
          <Users className="text-violet-400 h-4.5 w-4.5 animate-pulse" /> 
          Ecosystem Owners & Landlords Registry
        </CardTitle>
        <CardDescription className="text-xs text-slate-400 font-medium">Verify credentials, instantly approve new landlords, dial phones directly, or trigger diagnostic God Mode.</CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        
        {/* Search & Filter tools */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
            <Input
              placeholder="Search by owner name, email, or WhatsApp number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-slate-950/80 border-slate-800/80 focus:border-violet-500/50 rounded-xl h-10 text-xs font-semibold text-slate-200 placeholder:text-slate-500"
            />
          </div>
          
          <div className="flex flex-wrap gap-1.5 bg-slate-900/60 border border-slate-800 p-1 rounded-xl">
            <Button 
              variant={activeRoleFilter === 'all' ? 'default' : 'ghost'} 
              size="sm" 
              onClick={() => setActiveRoleFilter('all')}
              className="text-[10px] font-extrabold h-7 px-3 rounded-lg text-slate-300"
            >
              All ({totalCount})
            </Button>
            <Button 
              variant={activeRoleFilter === 'active' ? 'default' : 'ghost'} 
              size="sm" 
              onClick={() => setActiveRoleFilter('active')}
              className="text-[10px] font-extrabold h-7 px-3 rounded-lg text-emerald-400"
            >
              Active ({activeCount})
            </Button>
            <Button 
              variant={activeRoleFilter === 'pending' ? 'default' : 'ghost'} 
              size="sm" 
              onClick={() => setActiveRoleFilter('pending')}
              className="text-[10px] font-extrabold h-7 px-3 rounded-lg text-amber-400"
            >
              Pending ({pendingCount})
            </Button>
            <Button 
              variant={activeRoleFilter === 'suspended' ? 'default' : 'ghost'} 
              size="sm" 
              onClick={() => setActiveRoleFilter('suspended')}
              className="text-[10px] font-extrabold h-7 px-3 rounded-lg text-rose-400 hover:bg-rose-500/5"
            >
              Suspended ({suspendedCount})
            </Button>
          </div>
        </div>

        {/* 1. Desktop View viewport (Table Layout) */}
        <div className="hidden md:block rounded-xl border border-slate-900 overflow-hidden bg-slate-950/20">
          <Table>
            <TableHeader className="bg-slate-950/80 border-b border-slate-900">
              <TableRow className="hover:bg-transparent border-slate-900">
                <TableHead className="font-extrabold text-[10px] uppercase text-slate-400 tracking-wider h-11">Profile Details</TableHead>
                <TableHead className="font-extrabold text-[10px] uppercase text-slate-400 tracking-wider h-11">Account Status</TableHead>
                <TableHead className="font-extrabold text-[10px] uppercase text-slate-400 tracking-wider h-11">Subscription Tier</TableHead>
                <TableHead className="font-extrabold text-[10px] uppercase text-slate-400 tracking-wider h-11">Registered</TableHead>
                <TableHead className="font-extrabold text-[10px] uppercase text-slate-400 tracking-wider h-11 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOwners.map((owner) => {
                const initials = (owner.name || 'OW').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
                const isSuspended = owner.status === 'suspended';
                const isPending = owner.status === 'pending_approval' || !owner.status;

                return (
                  <TableRow key={owner.id} className={`border-slate-900 hover:bg-slate-900/20 transition-colors ${isSuspended ? 'bg-rose-500/[0.02]' : isPending ? 'bg-amber-500/[0.01]' : ''}`}>
                    <TableCell className="py-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9 border border-slate-800">
                          <AvatarImage src={owner.avatarUrl} />
                          <AvatarFallback className="bg-gradient-to-tr from-slate-800 to-slate-700 text-slate-300 font-extrabold text-[11px]">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-extrabold text-xs text-slate-200 flex items-center gap-1.5 flex-wrap">
                            {owner.name} 
                            {owner.subscription?.status === 'trialing' && (
                              <Badge variant="outline" className="text-[8px] uppercase px-1.5 py-0 border-cyan-500/30 text-cyan-400 bg-cyan-500/5 font-black tracking-wider">Trial</Badge>
                            )}
                            {isPending && (
                              <Badge variant="outline" className="text-[8px] uppercase px-1.5 py-0 border-amber-500/35 text-amber-400 bg-amber-500/10 font-black tracking-wider flex items-center gap-1 animate-pulse">
                                Pending Approval
                              </Badge>
                            )}
                            {isSuspended && (
                              <Badge variant="outline" className="text-[8px] uppercase px-1.5 py-0 border-rose-500/35 text-rose-400 bg-rose-500/10 font-black tracking-wider flex items-center gap-1">
                                <AlertTriangle className="w-2.5 h-2.5" /> Suspended
                              </Badge>
                            )}
                          </div>
                          <div className="flex flex-col gap-0.5 text-[9px] text-slate-400 font-semibold mt-1">
                            <span className="flex items-center gap-1"><Mail className="w-3 h-3 text-slate-600" /> {owner.email}</span>
                            <span className="flex items-center gap-1"><Phone className="w-3 h-3 text-slate-600" /> {owner.phone || 'N/A'}</span>
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-3">
                      <Badge 
                        variant="outline"
                        className={`text-[9px] font-black uppercase px-2 py-0.5 border ${
                          owner.status === 'active' 
                            ? 'border-emerald-500/20 text-emerald-400 bg-emerald-500/5' 
                            : isSuspended
                            ? 'border-rose-500/20 text-rose-400 bg-rose-500/5'
                            : 'border-amber-500/20 text-amber-400 bg-amber-500/5'
                        }`}
                      >
                        {owner.status?.replace('_', ' ') || 'pending approval'}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-3">
                      <Badge variant="outline" className="capitalize text-[9px] border-slate-800 text-violet-400 font-extrabold">
                        {owner.subscription?.planId || 'N/A'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-[10px] font-semibold text-slate-500 py-3">
                      {owner.createdAt ? formatDistanceToNow(new Date(owner.createdAt), { addSuffix: true }) : 'N/A'}
                    </TableCell>
                    <TableCell className="text-right py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        {isPending ? (
                          <Button 
                            size="sm" 
                            onClick={() => onUserStatusUpdate(owner.id, 'active')}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1 text-[10px] h-7.5 px-3 font-extrabold rounded-lg shadow-md shadow-emerald-500/10 border border-emerald-500/20"
                          >
                            <UserCheck className="w-3 h-3 text-emerald-100" /> Instant Approve
                          </Button>
                        ) : isSuspended ? (
                          <Button 
                            size="sm" 
                            onClick={() => onUserStatusUpdate(owner.id, 'active')}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1 text-[10px] h-7.5 px-2.5 font-extrabold rounded-lg"
                          >
                            <UserCheck className="w-3 h-3" /> Reactivate
                          </Button>
                        ) : (
                          <Button 
                            size="sm" 
                            variant="destructive"
                            onClick={() => onUserStatusUpdate(owner.id, 'suspended')}
                            className="bg-rose-600 hover:bg-rose-700 text-white flex items-center gap-1 text-[10px] h-7.5 px-2.5 font-extrabold rounded-lg"
                          >
                            <UserMinus className="w-3 h-3" /> Suspend
                          </Button>
                        )}
                        
                        {/* Direct contact selectors */}
                        {owner.phone && (
                          <a href={`https://wa.me/91${owner.phone}`} target="_blank" rel="noopener noreferrer">
                            <Button 
                              size="sm" 
                              variant="outline"
                              className="border-slate-800 hover:bg-slate-900 text-emerald-400 hover:text-emerald-300 text-[10px] h-7.5 px-2 rounded-lg bg-transparent"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                            </Button>
                          </a>
                        )}

                        {/* Secure Impersonation Mode Launcher */}
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => launchGodMode(owner)}
                          className="border-violet-500/20 text-violet-400 hover:bg-violet-500/10 hover:text-violet-300 flex items-center gap-1 text-[10px] h-7.5 px-2.5 font-extrabold rounded-lg bg-transparent"
                        >
                          <Key className="w-3 h-3" /> God Mode
                        </Button>
                        
                        {/* Delete Owner Action */}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => triggerDelete(owner)}
                          className="border-rose-500/20 text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 flex items-center justify-center gap-1 text-[10px] h-7.5 px-2 rounded-lg bg-transparent"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filteredOwners.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-xs font-bold text-slate-500 py-8">
                    No matching landlord profiles registered in the system database.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* 2. Mobile-First Stacked Cards View viewport (Visible ONLY on mobile devices) */}
        <div className="md:hidden space-y-3">
          {filteredOwners.map((owner) => {
            const initials = (owner.name || 'OW').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
            const isSuspended = owner.status === 'suspended';
            const isPending = owner.status === 'pending_approval' || !owner.status;
            const isExpanded = expandedOwner === owner.id;

            return (
              <div 
                key={owner.id} 
                className={`border rounded-2xl p-4 bg-slate-950/60 backdrop-blur-md transition-all ${
                  isSuspended 
                    ? 'border-rose-500/20 shadow-lg shadow-rose-500/[0.01]' 
                    : isPending 
                    ? 'border-amber-500/30 shadow-lg shadow-amber-500/[0.01]' 
                    : 'border-slate-850'
                }`}
              >
                {/* Profile Header */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 border border-slate-800">
                      <AvatarImage src={owner.avatarUrl} />
                      <AvatarFallback className="bg-gradient-to-tr from-slate-800 to-slate-700 text-slate-300 font-extrabold text-[12px]">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h4 className="font-extrabold text-xs text-slate-100 flex items-center gap-1.5 flex-wrap">
                        {owner.name}
                        {owner.subscription?.status === 'trialing' && (
                          <Badge variant="outline" className="text-[7px] uppercase px-1 py-0 border-cyan-500/20 text-cyan-400 bg-cyan-500/5 font-black">Trial</Badge>
                        )}
                      </h4>
                      <div className="flex items-center gap-1.5 mt-1">
                        <Badge 
                          variant="outline"
                          className={`text-[8px] font-black uppercase px-1.5 py-0 border ${
                            owner.status === 'active' 
                              ? 'border-emerald-500/20 text-emerald-400 bg-emerald-500/5' 
                              : isSuspended
                              ? 'border-rose-500/20 text-rose-400 bg-rose-500/5'
                              : 'border-amber-500/20 text-amber-400 bg-amber-500/5 animate-pulse'
                          }`}
                        >
                          {owner.status?.replace('_', ' ') || 'pending approval'}
                        </Badge>
                        <Badge variant="outline" className="capitalize text-[8px] border-slate-800 text-violet-400 font-extrabold px-1.5 py-0">
                          {owner.subscription?.planId || 'Standard'}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <button 
                    onClick={() => toggleExpand(owner.id)}
                    className="p-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-400"
                  >
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>

                {/* Instant Mobile Call & WhatsApp Triggers */}
                <div className="grid grid-cols-2 gap-2 mt-4">
                  {owner.phone ? (
                    <>
                      <a href={`tel:${owner.phone}`} className="w-full">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="w-full text-[10px] h-9 font-extrabold rounded-xl border-slate-800 bg-slate-900/40 text-slate-300 flex items-center justify-center gap-1.5"
                        >
                          <Phone className="w-3.5 h-3.5 text-slate-400" /> Direct Call
                        </Button>
                      </a>
                      <a href={`https://wa.me/91${owner.phone}`} target="_blank" rel="noopener noreferrer" className="w-full">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="w-full text-[10px] h-9 font-extrabold rounded-xl border-emerald-500/20 bg-emerald-500/5 text-emerald-400 flex items-center justify-center gap-1.5"
                        >
                          <MessageSquare className="w-3.5 h-3.5 text-emerald-400 animate-pulse" /> WhatsApp Chat
                        </Button>
                      </a>
                    </>
                  ) : (
                    <div className="col-span-2 text-center text-[10px] text-slate-500 font-bold bg-slate-900/30 py-2 rounded-xl">
                      No phone number cataloged for direct dial
                    </div>
                  )}
                </div>

                {/* Expanded Details section */}
                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-slate-900 text-[10px] font-semibold text-slate-400 space-y-2 bg-slate-950/20 p-3 rounded-xl border border-slate-900/60 animate-in fade-in slide-in-from-top-1 duration-200">
                    <div className="flex items-center justify-between">
                      <span>Email Account:</span>
                      <span className="text-slate-200 font-extrabold select-all">{owner.email || 'N/A'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Registered Date:</span>
                      <span className="text-slate-200 font-extrabold">
                        {owner.createdAt ? formatDistanceToNow(new Date(owner.createdAt), { addSuffix: true }) : 'N/A'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Wallet Balance:</span>
                      <span className="text-emerald-400 font-black">₹{owner.wallet?.balance ?? 0}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>WhatsApp Refills:</span>
                      <span className="text-cyan-400 font-black">{owner.subscription?.whatsappCredits ?? 0}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Database Schema:</span>
                      <Badge variant="outline" className="text-[8px] py-0 px-1 border-slate-800 text-slate-400">V{owner.schemaVersion || 0}</Badge>
                    </div>
                  </div>
                )}

                {/* High Priority Direct Action buttons */}
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-900/60">
                  {isPending ? (
                    <Button 
                      size="sm" 
                      onClick={() => onUserStatusUpdate(owner.id, 'active')}
                      className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-[10px] h-9 rounded-xl shadow-lg shadow-emerald-500/10 border border-emerald-500/20"
                    >
                      <UserCheck className="w-3.5 h-3.5 mr-1" /> Instant Approve
                    </Button>
                  ) : isSuspended ? (
                    <Button 
                      size="sm" 
                      onClick={() => onUserStatusUpdate(owner.id, 'active')}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[10px] h-9 rounded-xl"
                    >
                      <UserCheck className="w-3.5 h-3.5 mr-1" /> Reactivate Owner
                    </Button>
                  ) : (
                    <Button 
                      size="sm" 
                      variant="destructive"
                      onClick={() => onUserStatusUpdate(owner.id, 'suspended')}
                      className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-[10px] h-9 rounded-xl"
                    >
                      <UserMinus className="w-3.5 h-3.5 mr-1" /> Suspend
                    </Button>
                  )}

                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => launchGodMode(owner)}
                    className="border-violet-500/20 text-violet-400 bg-slate-900/20 font-extrabold text-[10px] h-9 rounded-xl flex-1 hover:bg-violet-500/10 hover:text-violet-300"
                  >
                    <Key className="w-3.5 h-3.5 mr-1" /> God Mode
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => triggerDelete(owner)}
                    className="border-rose-500/20 text-rose-400 bg-slate-900/20 font-extrabold text-[10px] h-9 px-3 rounded-xl hover:bg-rose-500/10 hover:text-rose-300"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            );
          })}

          {filteredOwners.length === 0 && (
            <div className="text-center text-xs font-bold text-slate-500 py-12 bg-slate-950/20 border border-slate-900 rounded-2xl">
              <Users className="w-8 h-8 mx-auto text-slate-700 mb-2 animate-pulse" />
              No matching landlord accounts in search query filters.
            </div>
          )}
        </div>

      </CardContent>

      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent className="bg-slate-950 border-slate-800 text-slate-200">
          <DialogHeader>
            <DialogTitle className="text-rose-400">Wipe Owner Data</DialogTitle>
            <DialogDescription className="text-slate-400 text-xs">
              This action is destructive and cannot be undone. Select which records to permanently delete for <strong className="text-white">{ownerToDelete?.name || ownerToDelete?.email}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="flex items-center space-x-3">
              <Checkbox id="opt-account" checked={deleteOptions.ownerAccount} onCheckedChange={(c) => setDeleteOptions(prev => ({...prev, ownerAccount: !!c}))} />
              <label htmlFor="opt-account" className="text-sm font-medium">Owner Account & Auth</label>
            </div>
            <div className="flex items-center space-x-3">
              <Checkbox id="opt-properties" checked={deleteOptions.properties} onCheckedChange={(c) => setDeleteOptions(prev => ({...prev, properties: !!c}))} />
              <label htmlFor="opt-properties" className="text-sm font-medium">Properties, Rooms & Beds</label>
            </div>
            <div className="flex items-center space-x-3">
              <Checkbox id="opt-tenants" checked={deleteOptions.tenants} onCheckedChange={(c) => setDeleteOptions(prev => ({...prev, tenants: !!c}))} />
              <label htmlFor="opt-tenants" className="text-sm font-medium">Tenants / Guests</label>
            </div>
            <div className="flex items-center space-x-3">
              <Checkbox id="opt-staff" checked={deleteOptions.staff} onCheckedChange={(c) => setDeleteOptions(prev => ({...prev, staff: !!c}))} />
              <label htmlFor="opt-staff" className="text-sm font-medium">Staff Members</label>
            </div>
            <div className="flex items-center space-x-3">
              <Checkbox id="opt-expenses" checked={deleteOptions.expenses} onCheckedChange={(c) => setDeleteOptions(prev => ({...prev, expenses: !!c}))} />
              <label htmlFor="opt-expenses" className="text-sm font-medium">Expenses</label>
            </div>
            <div className="flex items-center space-x-3">
              <Checkbox id="opt-complaints" checked={deleteOptions.complaints} onCheckedChange={(c) => setDeleteOptions(prev => ({...prev, complaints: !!c}))} />
              <label htmlFor="opt-complaints" className="text-sm font-medium">Complaints</label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteModalOpen(false)} disabled={isDeleting} className="border-slate-800 text-slate-300 hover:bg-slate-900">
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={isDeleting} className="bg-rose-600 hover:bg-rose-700">
              {isDeleting ? 'Wiping...' : 'Confirm Wipe'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
