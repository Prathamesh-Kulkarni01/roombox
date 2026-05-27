'use client'

import React, { useState } from 'react';
import { 
  Building, Search, MapPin, CheckCircle, XCircle, 
  Map, Sparkles, Filter, ShieldAlert, Award, Star
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import type { PG, User } from '@/lib/types';

interface PropertiesProps {
  pendingPgs: PG[];
  allPgs?: PG[];
  onPropertyStatusUpdate: (pg: PG, status: 'active' | 'rejected') => Promise<void>;
  owners: User[];
}

export default function AdminProperties({ pendingPgs, allPgs = [], onPropertyStatusUpdate, owners }: PropertiesProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'pending' | 'all'>('pending');
  
  // Advanced filters state
  const [cityFilter, setCityFilter] = useState<string>('all');
  const [genderFilter, setGenderFilter] = useState<string>('all');

  // Compute unique cities across all listings to populate filter dropdown
  const uniqueCities = Array.from(new Set(allPgs.map(pg => pg.city).filter(Boolean)));

  const handleStatusChange = async (pg: PG, status: 'active' | 'rejected') => {
    const confirmation = window.confirm(`Are you sure you want to transition listing "${pg.name}" to status: ${status.toUpperCase()}?`);
    if (confirmation) {
      await onPropertyStatusUpdate(pg, status);
    }
  };

  const getOwnerName = (ownerId: string) => {
    const owner = owners.find(o => o.id === ownerId);
    return owner?.name || 'Unknown Landlord';
  };

  // Filter listings based on active tab, search query, city, and gender
  const filteredListings = (activeTab === 'pending' ? pendingPgs : allPgs).filter(pg => {
    const text = (pg.name || '').toLowerCase();
    const city = (pg.city || '').toLowerCase();
    const location = (pg.location || '').toLowerCase();
    const matchesSearch = text.includes(searchQuery.toLowerCase()) || 
                          city.includes(searchQuery.toLowerCase()) || 
                          location.includes(searchQuery.toLowerCase());

    const matchesCity = cityFilter === 'all' || pg.city === cityFilter;
    const matchesGender = genderFilter === 'all' || pg.gender === genderFilter;

    return matchesSearch && matchesCity && matchesGender;
  });

  return (
    <div className="space-y-6">
      {/* Property Controls Tabs Trigger row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Visual toggle buttons */}
        <div className="flex gap-1.5 border border-slate-800 p-1.5 rounded-xl bg-slate-950/60 backdrop-blur-md">
          <Button 
            variant={activeTab === 'pending' ? 'default' : 'ghost'} 
            size="sm" 
            onClick={() => setActiveTab('pending')}
            className={`text-xs font-bold px-4 py-2.5 rounded-lg ${activeTab === 'pending' ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Pending Approval ({pendingPgs.length})
          </Button>
          <Button 
            variant={activeTab === 'all' ? 'default' : 'ghost'} 
            size="sm" 
            onClick={() => setActiveTab('all')}
            className={`text-xs font-bold px-4 py-2.5 rounded-lg ${activeTab === 'all' ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
          >
            All Listings ({allPgs.length})
          </Button>
        </div>
      </div>

      <Card className="border border-slate-800 bg-slate-950/40 backdrop-blur-md rounded-2xl overflow-hidden">
        <CardHeader className="pb-3 border-b border-slate-900/60">
          <CardTitle className="flex items-center gap-2 text-sm font-extrabold text-slate-200">
            <Building className="text-violet-400 h-4.5 w-4.5" /> 
            {activeTab === 'pending' ? 'Properties Awaiting Moderation' : 'Complete Platform Hostel Registry'}
          </CardTitle>
          <CardDescription className="text-xs text-slate-400 font-medium">
            {activeTab === 'pending' 
              ? 'Review uploaded room structures, rent configurations, and location tags to approve listings.'
              : 'Audit published active hostels, inspect occupancy indicators, and modify listings status.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          
          {/* Advanced Multi-criteria Filtering Panel */}
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
              <Input
                placeholder="Filter by hostel name, city, or general address..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-slate-950/80 border-slate-800/80 focus:border-violet-500/50 rounded-xl h-10 text-xs font-semibold text-slate-200 placeholder:text-slate-500"
              />
            </div>
            
            <div className="flex flex-wrap items-center gap-2.5">
              {/* City Filter */}
              <div className="flex items-center gap-1.5 bg-slate-900/40 border border-slate-850 px-2.5 py-1.5 rounded-xl h-10">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">City:</span>
                <select 
                  value={cityFilter}
                  onChange={(e) => setCityFilter(e.target.value)}
                  className="bg-transparent border-0 text-slate-300 focus:outline-none text-xs font-bold cursor-pointer"
                >
                  <option className="bg-slate-950 text-slate-300" value="all">All Cities</option>
                  {uniqueCities.map(city => (
                    <option key={city} className="bg-slate-950 text-slate-300" value={city}>{city}</option>
                  ))}
                </select>
              </div>

              {/* Gender Filter */}
              <div className="flex items-center gap-1.5 bg-slate-900/40 border border-slate-850 px-2.5 py-1.5 rounded-xl h-10">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Gender:</span>
                <select 
                  value={genderFilter}
                  onChange={(e) => setGenderFilter(e.target.value)}
                  className="bg-transparent border-0 text-slate-300 focus:outline-none text-xs font-bold cursor-pointer"
                >
                  <option className="bg-slate-950 text-slate-300" value="all">All Genders</option>
                  <option className="bg-slate-950 text-slate-300" value="male">Male Only</option>
                  <option className="bg-slate-950 text-slate-300" value="female">Female Only</option>
                  <option className="bg-slate-950 text-slate-300" value="co-ed">Co-ed Mixed</option>
                </select>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-900 overflow-hidden bg-slate-950/20">
            <Table>
              <TableHeader className="bg-slate-950/80 border-b border-slate-900">
                <TableRow className="hover:bg-transparent border-slate-900">
                  <TableHead className="font-extrabold text-[10px] uppercase text-slate-400 tracking-wider h-11">Hostel Info & Landlord</TableHead>
                  <TableHead className="font-extrabold text-[10px] uppercase text-slate-400 tracking-wider h-11">Target Gender</TableHead>
                  <TableHead className="font-extrabold text-[10px] uppercase text-slate-400 tracking-wider h-11">Room Configuration</TableHead>
                  <TableHead className="font-extrabold text-[10px] uppercase text-slate-400 tracking-wider h-11">Listing Status</TableHead>
                  <TableHead className="font-extrabold text-[10px] uppercase text-slate-400 tracking-wider h-11 text-right">Moderation Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredListings.map((pg) => {
                  let statusBadge = (
                    <Badge variant="outline" className="text-[9px] px-2 py-0.5 border-emerald-500/25 text-emerald-400 bg-emerald-500/5 font-extrabold uppercase">Active</Badge>
                  );
                  if (pg.status === 'pending_approval') {
                    statusBadge = (
                      <Badge variant="outline" className="text-[9px] px-2 py-0.5 border-amber-500/25 text-amber-400 bg-amber-500/5 font-extrabold uppercase animate-pulse">Awaiting Review</Badge>
                    );
                  } else if (pg.status === 'rejected') {
                    statusBadge = (
                      <Badge variant="outline" className="text-[9px] px-2 py-0.5 border-rose-500/25 text-rose-400 bg-rose-500/5 font-extrabold uppercase">Rejected</Badge>
                    );
                  } else if (pg.status === 'suspended') {
                    statusBadge = (
                      <Badge variant="outline" className="text-[9px] px-2 py-0.5 border-slate-800 text-slate-400 bg-slate-900/5 font-extrabold uppercase">Suspended</Badge>
                    );
                  }

                  return (
                    <TableRow key={pg.id} className="border-slate-900 hover:bg-slate-900/20 transition-colors">
                      <TableCell className="py-3">
                        <div className="font-extrabold text-xs text-slate-200">{pg.name}</div>
                        <div className="flex items-center gap-1.5 text-[9px] text-slate-500 font-semibold mt-1">
                          <MapPin className="w-3.5 h-3.5 text-rose-500/80" /> {pg.location}, {pg.city}
                        </div>
                        <div className="text-[9px] text-slate-500 font-bold mt-0.5 flex items-center gap-1">
                          <span className="text-slate-600">Landlord:</span> {getOwnerName(pg.ownerId)}
                        </div>
                      </TableCell>
                      <TableCell className="py-3">
                        <Badge variant="outline" className="capitalize text-[9px] border-slate-800 text-violet-400 font-extrabold">
                          {pg.gender || 'co-ed'}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-3">
                        <div className="font-extrabold text-[11px] text-slate-300">Total Rooms: {pg.totalRooms || 0}</div>
                        <div className="text-[9px] text-slate-500 font-semibold mt-0.5">Total Beds: {pg.totalBeds || 0}</div>
                      </TableCell>
                      <TableCell className="py-3">
                        {statusBadge}
                      </TableCell>
                      <TableCell className="text-right py-3">
                        <div className="flex items-center justify-end gap-1.5">
                          {pg.status !== 'active' && (
                            <Button 
                              size="sm" 
                              onClick={() => handleStatusChange(pg, 'active')}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1 text-[10px] h-7 px-2.5 font-extrabold rounded-lg"
                            >
                              <CheckCircle className="w-3 h-3" /> Approve
                            </Button>
                          )}
                          {pg.status !== 'rejected' && (
                            <Button 
                              size="sm" 
                              variant="destructive"
                              onClick={() => handleStatusChange(pg, 'rejected')}
                              className="bg-rose-600 hover:bg-rose-700 text-white flex items-center gap-1 text-[10px] h-7 px-2.5 font-extrabold rounded-lg"
                            >
                              <XCircle className="w-3 h-3" /> Reject
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filteredListings.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-xs font-bold text-slate-500 py-8">
                      No matching properties registered in this queue filter.
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
