'use client'

import React, { useState } from 'react';
import { 
  Users, Search, UserCheck, ShieldAlert, Key, 
  Trash2, Mail, Phone, Eye, Star, UserMinus
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import type { User } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';

interface UsersProps {
  owners: User[];
  onUserStatusUpdate: (userId: string, status: 'active' | 'suspended') => Promise<void>;
  loading: boolean;
}

export default function AdminUsers({ owners, onUserStatusUpdate, loading }: UsersProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeRoleFilter, setActiveRoleFilter] = useState<'all' | 'active' | 'suspended' | 'pending'>('all');

  const filteredOwners = owners.filter(owner => {
    const matchesSearch = owner.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          owner.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          owner.phone?.includes(searchQuery);
    
    if (activeRoleFilter === 'all') return matchesSearch;
    if (activeRoleFilter === 'active') return matchesSearch && owner.status === 'active';
    if (activeRoleFilter === 'suspended') return matchesSearch && owner.status === 'suspended';
    if (activeRoleFilter === 'pending') return matchesSearch && owner.status === 'pending_approval';
    return matchesSearch;
  });

  return (
    <Card className="border border-border/50 bg-card/60 backdrop-blur-md">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Users className="text-primary h-5 w-5" /> Registered Platform Landlords
        </CardTitle>
        <CardDescription>Comprehensive registry of landlords, staff settings, and active controls.</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Search & Role Filters */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by owner name, email, or WhatsApp phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-muted/40 border-border/50 focus:border-primary/50"
            />
          </div>
          
          <div className="flex flex-wrap gap-2">
            <Button 
              variant={activeRoleFilter === 'all' ? 'default' : 'outline'} 
              size="sm" 
              onClick={() => setActiveRoleFilter('all')}
              className="text-xs font-semibold"
            >
              All Landlords
            </Button>
            <Button 
              variant={activeRoleFilter === 'active' ? 'default' : 'outline'} 
              size="sm" 
              onClick={() => setActiveRoleFilter('active')}
              className="text-xs font-semibold"
            >
              Active
            </Button>
            <Button 
              variant={activeRoleFilter === 'suspended' ? 'default' : 'outline'} 
              size="sm" 
              onClick={() => setActiveRoleFilter('suspended')}
              className="text-xs font-semibold text-rose-500 hover:text-rose-600 border-rose-500/20 hover:bg-rose-500/10"
            >
              Suspended
            </Button>
            <Button 
              variant={activeRoleFilter === 'pending' ? 'default' : 'outline'} 
              size="sm" 
              onClick={() => setActiveRoleFilter('pending')}
              className="text-xs font-semibold"
            >
              Pending Approval
            </Button>
          </div>
        </div>

        <div className="rounded-md border border-border/40 overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="font-semibold text-xs">Profile Details</TableHead>
                <TableHead className="font-semibold text-xs">Account Status</TableHead>
                <TableHead className="font-semibold text-xs">Subscription Tier</TableHead>
                <TableHead className="font-semibold text-xs">Registered</TableHead>
                <TableHead className="font-semibold text-xs text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOwners.map((owner) => (
                <TableRow key={owner.id} className="hover:bg-muted/40 transition-colors">
                  <TableCell className="py-3">
                    <div className="font-semibold flex items-center gap-2">
                      {owner.name} 
                      {owner.subscription?.status === 'trialing' && (
                        <Badge variant="secondary" className="text-[9px] uppercase px-1 py-0 border-primary/20">Trial</Badge>
                      )}
                    </div>
                    <div className="flex flex-col gap-0.5 text-[10px] text-muted-foreground mt-1">
                      <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {owner.email}</span>
                      <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {owner.phone || 'N/A'}</span>
                    </div>
                  </TableCell>
                  <TableCell className="py-3">
                    <Badge 
                      variant={owner.status === 'active' ? 'default' : 'secondary'}
                      className="text-[10px] font-semibold uppercase"
                    >
                      {owner.status?.replace('_', ' ') || 'N/A'}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-3">
                    <Badge variant="outline" className="capitalize text-[10px] border-primary/20 text-primary">
                      {owner.subscription?.planId || 'N/A'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground py-3">
                    {owner.createdAt ? formatDistanceToNow(new Date(owner.createdAt), { addSuffix: true }) : 'N/A'}
                  </TableCell>
                  <TableCell className="text-right py-3">
                    <div className="flex items-center justify-end gap-1.5">
                      {owner.status === 'suspended' ? (
                        <Button 
                          size="sm" 
                          onClick={() => onUserStatusUpdate(owner.id, 'active')}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1 text-[10px] h-7 px-2 font-semibold"
                        >
                          <UserCheck className="w-3 h-3" /> Reactivate
                        </Button>
                      ) : (
                        <Button 
                          size="sm" 
                          variant="destructive"
                          onClick={() => onUserStatusUpdate(owner.id, 'suspended')}
                          className="bg-rose-600 hover:bg-rose-700 text-white flex items-center gap-1 text-[10px] h-7 px-2 font-semibold"
                        >
                          <UserMinus className="w-3 h-3" /> Suspend
                        </Button>
                      )}
                      
                      {/* Secure Impersonation Mode Launcher */}
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => {
                          const actionReason = prompt("Please enter the diagnostic reason for owner impersonation:");
                          if (actionReason) {
                            alert(`God-Mode launching for target owner ${owner.name}. Impersonation session initialized.`);
                          }
                        }}
                        className="border-primary/20 text-primary hover:bg-primary/10 flex items-center gap-1 text-[10px] h-7 px-2 font-semibold"
                      >
                        <Key className="w-3 h-3" /> God Mode
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredOwners.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-8">
                    No matching landlord profiles found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
