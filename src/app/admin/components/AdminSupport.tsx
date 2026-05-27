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

export default function AdminSupport() {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
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
      console.warn("Could not fetch support complaints directly from root level. Might need composite indexes.", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaints();
  }, []);

  const handleResolveComplaint = async (complaintId: string) => {
    try {
      if (!db) return;
      const ref = doc(db, 'complaints', complaintId);
      await updateDoc(ref, { status: 'resolved' });
      toast({ title: "Complaint Resolved", description: "Successfully updated support ticket state." });
      fetchComplaints();
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
  const standardTickets = complaints.filter(c => !isHighPriority(c));

  return (
    <div className="space-y-6">
      {/* High Priority Alerts Panel */}
      {highPriorityTickets.length > 0 && (
        <Card className="border border-rose-500/20 bg-rose-950/20 backdrop-blur-md">
          <CardHeader>
            <CardTitle className="text-rose-500 flex items-center gap-2 text-md">
              <ShieldAlert className="h-5 w-5 animate-pulse" /> Critical Platform Support Alerts
            </CardTitle>
            <CardDescription className="text-rose-400/80">These complaints contain safety-sensitive keywords and require immediate landlord follow-up.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {highPriorityTickets.map(ticket => (
              <div key={ticket.id} className="flex items-start justify-between border-b border-rose-500/10 pb-3 last:border-0 last:pb-0">
                <div>
                  <div className="flex items-center gap-2 font-bold text-rose-400 text-sm">
                    <AlertTriangle className="w-4 h-4 text-rose-500" /> [{ticket.category}] Raised by {ticket.guestName || 'Tenant'}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 max-w-[500px]">{ticket.description}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="destructive" className="text-[9px] font-bold">EMERGENCY</Badge>
                  {ticket.status !== 'resolved' && (
                    <Button 
                      size="sm" 
                      onClick={() => handleResolveComplaint(ticket.id)}
                      className="bg-rose-700 hover:bg-rose-800 text-white text-[9px] h-6 px-2"
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
      <Card className="border border-border/50 bg-card/60 backdrop-blur-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="text-primary h-5 w-5" /> 
            Active Support Log & Resolution Queue
          </CardTitle>
          <CardDescription>Review and track unresolved renter complaints, maintenance requests, and food reviews.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-border/40 overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead className="font-semibold text-xs">Renter & PG</TableHead>
                  <TableHead className="font-semibold text-xs">Category</TableHead>
                  <TableHead className="font-semibold text-xs">Issue Description</TableHead>
                  <TableHead className="font-semibold text-xs">Status</TableHead>
                  <TableHead className="font-semibold text-xs text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {complaints.map((ticket) => (
                  <TableRow key={ticket.id} className="hover:bg-muted/40 transition-colors">
                    <TableCell className="py-3">
                      <div className="font-semibold text-xs">{ticket.guestName || 'Owner reported'}</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">PG ID: {ticket.pgId}</div>
                    </TableCell>
                    <TableCell className="py-3">
                      <Badge variant="outline" className="capitalize border-primary/20 text-primary text-[10px]">
                        {ticket.category}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground py-3 max-w-[200px] truncate">
                      {ticket.description}
                    </TableCell>
                    <TableCell className="py-3">
                      <Badge 
                        variant={ticket.status === 'resolved' ? 'default' : 'secondary'}
                        className="text-[9px] uppercase font-semibold"
                      >
                        {ticket.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right py-3">
                      {ticket.status !== 'resolved' ? (
                        <Button 
                          size="sm" 
                          onClick={() => handleResolveComplaint(ticket.id)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] h-7 px-2 font-semibold"
                        >
                          <CheckCircle className="w-3.5 h-3.5 mr-1" /> Mark Resolved
                        </Button>
                      ) : (
                        <span className="text-[10px] text-muted-foreground font-semibold flex items-center justify-end gap-1"><CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> Done</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {complaints.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-8">
                      No unresolved tenant support issues in queue.
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
