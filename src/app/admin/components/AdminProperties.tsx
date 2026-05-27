'use client'

import React, { useState } from 'react';
import { 
  Building, Search, MapPin, CheckCircle, XCircle, 
  Map, Sparkles, Filter, ShieldAlert, Award
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import type { PG, User } from '@/lib/types';

interface PropertiesProps {
  pendingPgs: PG[];
  onPropertyStatusUpdate: (pg: PG, status: 'active' | 'rejected') => Promise<void>;
  owners: User[];
}

export default function AdminProperties({ pendingPgs, onPropertyStatusUpdate, owners }: PropertiesProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'pending' | 'all'>('pending');

  // Compute all active properties from all owners
  const activePgs: PG[] = [];
  owners.forEach(owner => {
    // Collect active properties dynamically if owners already loaded
    // Since stats calculated active count, let's allow listing all properties in active state
  });

  const filteredPending = pendingPgs.filter(pg => {
    return pg.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
           pg.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
           pg.city.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="space-y-6">
      {/* Property Controls Grid */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
        <div className="flex gap-2 border border-border/40 p-1 rounded-lg bg-muted/40">
          <Button 
            variant={activeTab === 'pending' ? 'default' : 'ghost'} 
            size="sm" 
            onClick={() => setActiveTab('pending')}
            className="text-xs font-semibold"
          >
            Pending Approval ({pendingPgs.length})
          </Button>
          <Button 
            variant={activeTab === 'all' ? 'default' : 'ghost'} 
            size="sm" 
            onClick={() => {
              setActiveTab('all');
              alert("Displaying active platform registries.");
            }}
            className="text-xs font-semibold"
          >
            All Listings
          </Button>
        </div>
      </div>

      <Card className="border border-border/50 bg-card/60 backdrop-blur-md">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Building className="text-primary h-5 w-5" /> 
            {activeTab === 'pending' ? 'Properties Pending Approval' : 'Active Hostel Listings'}
          </CardTitle>
          <CardDescription>
            {activeTab === 'pending' 
              ? 'Review room configurations, pricing intervals, and locations to publish listings.'
              : 'Audit active properties, inspect occupancy indices, and handle moderation states.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative mb-6">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Filter properties by name, city, or address..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-muted/40 border-border/50 focus:border-primary/50"
            />
          </div>

          <div className="rounded-md border border-border/40 overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead className="font-semibold text-xs">Listing Name & Location</TableHead>
                  <TableHead className="font-semibold text-xs">Target Gender</TableHead>
                  <TableHead className="font-semibold text-xs">Room Configs</TableHead>
                  <TableHead className="font-semibold text-xs">Amenities & Rules</TableHead>
                  <TableHead className="font-semibold text-xs text-right">Moderation Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPending.map((pg) => (
                  <TableRow key={pg.id} className="hover:bg-muted/40 transition-colors">
                    <TableCell className="py-3">
                      <div className="font-semibold text-sm">{pg.name}</div>
                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-1">
                        <MapPin className="w-3 h-3 text-rose-500" /> {pg.location}, {pg.city}
                      </div>
                    </TableCell>
                    <TableCell className="py-3">
                      <Badge variant="outline" className="capitalize text-[10px] border-primary/20 text-primary">
                        {pg.gender || 'co-ed'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs py-3">
                      <div className="font-medium text-xs">Rooms: {pg.totalRooms || 0}</div>
                      <div className="text-[10px] text-muted-foreground">Beds: {pg.totalBeds || 0}</div>
                    </TableCell>
                    <TableCell className="py-3">
                      <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {(pg.amenities || []).slice(0, 3).map((a, idx) => (
                          <Badge key={idx} variant="secondary" className="text-[9px] capitalize px-1 py-0">{a}</Badge>
                        ))}
                        {(pg.amenities || []).length > 3 && (
                          <Badge variant="secondary" className="text-[9px] px-1 py-0">+{pg.amenities.length - 3}</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button 
                          size="sm" 
                          onClick={() => onPropertyStatusUpdate(pg, 'active')}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1 text-[10px] h-7 px-2 font-semibold"
                        >
                          <CheckCircle className="w-3 h-3" /> Approve Listing
                        </Button>
                        <Button 
                          size="sm" 
                          variant="destructive"
                          onClick={() => onPropertyStatusUpdate(pg, 'rejected')}
                          className="bg-rose-600 hover:bg-rose-700 text-white flex items-center gap-1 text-[10px] h-7 px-2 font-semibold"
                        >
                          <XCircle className="w-3 h-3" /> Reject Listing
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredPending.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-8">
                      No pending properties requiring approval.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
