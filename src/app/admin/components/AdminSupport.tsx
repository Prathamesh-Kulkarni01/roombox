'use client'

import React, { useEffect, useState } from 'react';
import { 
  ShieldAlert, Eye, MessageSquare, AlertCircle, CheckCircle, 
  MapPin, Clock, Filter, AlertTriangle
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Complaint } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';

interface SupportProps {
  complaints?: Complaint[];
  onRefresh?: () => void;
}

export default function AdminSupport({ complaints: propComplaints, onRefresh }: SupportProps) {
  const [complaints, setComplaints] = useState<Complaint[]>(propComplaints || []);
  const [loading, setLoading] = useState(!propComplaints);
  const { toast } = useToast();

  const fetchComplaints = async () => {
    try {
      setLoading(true);
      if (!db) return;
      const snapshot = await getDocs(collection(db, 'complaints'));
      const list = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date || new Date().toISOString()
      } as Complaint));
      setComplaints(list);
    } catch (err) {
      console.warn("Could not fetch support complaints directly from root level. Might need indexes.", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (propComplaints) {
      setComplaints(propComplaints);
      setLoading(false);
    } else {
      fetchComplaints();
    }
  }, [propComplaints]);

  const handleResolveComplaint = async (complaintId: string) => {
    try {
      if (!db) return;
      const ref = doc(db, 'complaints', complaintId);
      await updateDoc(ref, { status: 'resolved' });
      toast({ title: "Complaint Resolved", description: "Successfully updated support ticket state." });
      if (onRefresh) {
        onRefresh();
      } else {
        fetchComplaints();
      }
    } catch (err: any) {
      toast({ variant: 'destructive', title: "Error", description: err.message || "Failed to update ticket." });
    }
  };

  // Find priority issues (e.g. fire, theft, water leak, safety)
  const isHighPriority = (c: Complaint) => {
    const text = (c.description || '').toLowerCase();
    return text.includes('fire') || text.includes('theft') || text.includes('harass') || text.includes('water leak') || text.includes('safety') || text.includes('emergency');
  };

  const highPriorityTickets = complaints.filter(isHighPriority);

  return (
    <div className="space-y-6">
      {/* High Priority Alerts Panel */}
      {highPriorityTickets.length > 0 && (
        <Card className="border border-rose-500/20 bg-rose-950/10 backdrop-blur-md rounded-2xl overflow-hidden shadow-lg shadow-rose-500/[0.02]">
          <CardHeader className="pb-3 border-b border-rose-950/20">
            <CardTitle className="text-rose-400 flex items-center gap-2 text-sm font-extrabold tracking-tight">
              <ShieldAlert className="h-4.5 w-4.5 text-rose-500 animate-pulse" /> Critical Platform Support Alerts
            </CardTitle>
            <CardDescription className="text-xs text-rose-400/70 font-medium">These complaints contain safety-sensitive keywords and require immediate landlord follow-up.</CardDescription>
          </CardHeader>
          <CardContent className="pt-5 space-y-4">
            {highPriorityTickets.map(ticket => (
              <div key={ticket.id} className="flex items-start justify-between border-b border-rose-500/10 pb-3.5 last:border-0 last:pb-0 gap-4">
                <div>
                  <div className="flex items-center gap-2 font-black text-rose-400 text-xs">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-500" /> [{ticket.category}] Raised by {ticket.guestName || 'Tenant'}
                  </div>
                  <p className="text-[11px] text-slate-400 font-semibold mt-1 leading-relaxed max-w-[500px]">{ticket.description}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="outline" className="text-[8px] font-black uppercase px-2 py-0.5 border-rose-500/30 text-rose-400 bg-rose-500/10">EMERGENCY</Badge>
                  {ticket.status !== 'resolved' && (
                    <Button 
                      size="sm" 
                      onClick={() => handleResolveComplaint(ticket.id)}
                      className="bg-rose-700 hover:bg-rose-800 text-white font-extrabold text-[9px] h-6 px-2.5 rounded-lg border border-rose-600/30 shadow"
                    >
                      Resolve
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Main Support Registry */}
      <Card className="border border-slate-800 bg-slate-950/40 backdrop-blur-md rounded-2xl overflow-hidden">
        <CardHeader className="pb-3 border-b border-slate-900/60">
          <CardTitle className="flex items-center gap-2 text-sm font-extrabold text-slate-200">
            <MessageSquare className="text-violet-400 h-4.5 w-4.5" /> 
            Active Support Log & Resolution Queue
          </CardTitle>
          <CardDescription className="text-xs text-slate-400 font-medium">Review and track unresolved renter complaints, maintenance requests, and food reviews.</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="rounded-xl border border-slate-900 overflow-hidden bg-slate-950/20">
            <Table>
              <TableHeader className="bg-slate-950/80 border-b border-slate-900">
                <TableRow className="hover:bg-transparent border-slate-900">
                  <TableHead className="font-extrabold text-[10px] uppercase text-slate-400 tracking-wider h-11">Renter & PG</TableHead>
                  <TableHead className="font-extrabold text-[10px] uppercase text-slate-400 tracking-wider h-11">Category</TableHead>
                  <TableHead className="font-extrabold text-[10px] uppercase text-slate-400 tracking-wider h-11">Issue Description</TableHead>
                  <TableHead className="font-extrabold text-[10px] uppercase text-slate-400 tracking-wider h-11">Status</TableHead>
                  <TableHead className="font-extrabold text-[10px] uppercase text-slate-400 tracking-wider h-11 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {complaints.map((ticket) => (
                  <TableRow key={ticket.id} className="border-slate-900 hover:bg-slate-900/20 transition-colors">
                    <TableCell className="py-3">
                      <div className="font-extrabold text-xs text-slate-200">{ticket.guestName || 'Owner reported'}</div>
                      <div className="text-[9px] text-slate-500 font-semibold mt-0.5">PG ID: {ticket.pgId}</div>
                    </TableCell>
                    <TableCell className="py-3">
                      <Badge variant="outline" className="capitalize border-slate-800 text-violet-400 font-extrabold text-[9px] px-2 py-0.5">
                        {ticket.category}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-slate-400 font-medium py-3 max-w-[200px] truncate">
                      {ticket.description}
                    </TableCell>
                    <TableCell className="py-3">
                      <Badge 
                        variant="outline"
                        className={`text-[9px] font-black uppercase px-2 py-0.5 border ${
                          ticket.status === 'resolved' 
                            ? 'border-emerald-500/25 text-emerald-400 bg-emerald-500/5' 
                            : 'border-slate-800 text-slate-400'
                        }`}
                      >
                        {ticket.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right py-3">
                      {ticket.status !== 'resolved' ? (
                        <Button 
                          size="sm" 
                          onClick={() => handleResolveComplaint(ticket.id)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1 text-[10px] h-7.5 px-2.5 font-extrabold rounded-lg"
                        >
                          <CheckCircle className="w-3.5 h-3.5 mr-1" /> Resolve
                        </Button>
                      ) : (
                        <span className="text-[10px] text-slate-500 font-extrabold flex items-center justify-end gap-1"><CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> Resolved</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {complaints.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-xs font-bold text-slate-500 py-8">
                      No unresolved tenant support issues in the database queue.
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
