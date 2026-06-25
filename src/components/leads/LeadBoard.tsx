'use client';

import { useEffect, useState } from 'react';
import { Lead, LeadStatus } from '@/lib/types';
import { fetchLeadsForOwner, updateLeadStatus, deleteLead } from '@/lib/actions/leadActions';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Phone, Calendar, MoreVertical, Plus, Edit2, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import AddLeadSheet from './AddLeadSheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from 'date-fns';

const STATUS_COLUMNS: { id: LeadStatus; label: string; color: string }[] = [
  { id: 'new', label: 'New Inquiry', color: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
  { id: 'contacted', label: 'Contacted', color: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' },
  { id: 'visited', label: 'Visited', color: 'bg-purple-500/10 text-purple-500 border-purple-500/20' },
  { id: 'negotiation', label: 'Negotiation', color: 'bg-orange-500/10 text-orange-500 border-orange-500/20' },
  { id: 'converted', label: 'Converted', color: 'bg-green-500/10 text-green-500 border-green-500/20' },
  { id: 'lost', label: 'Lost', color: 'bg-red-500/10 text-red-500 border-red-500/20' }
];

export default function LeadBoard({ ownerId }: { ownerId: string }) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | undefined>();
  const [draggedLead, setDraggedLead] = useState<string | null>(null);
  const { toast } = useToast();

  const loadLeads = async () => {
    try {
      const data = await fetchLeadsForOwner(ownerId);
      setLeads(data);
    } catch (error) {
      console.error("Failed to load leads", error);
      toast({ title: 'Error', description: 'Failed to load leads', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLeads();
  }, [ownerId]);

  const handleDragStart = (e: React.DragEvent, leadId: string) => {
    setDraggedLead(leadId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, newStatus: LeadStatus) => {
    e.preventDefault();
    if (!draggedLead) return;

    const leadToUpdate = leads.find(l => l.id === draggedLead);
    if (!leadToUpdate || leadToUpdate.status === newStatus) {
      setDraggedLead(null);
      return;
    }

    // Optimistic UI update
    setLeads(prev => prev.map(l => l.id === draggedLead ? { ...l, status: newStatus } : l));

    try {
      await updateLeadStatus(ownerId, draggedLead, newStatus);
      toast({ title: 'Status updated', description: `Lead moved to ${newStatus}` });
    } catch (error) {
      console.error("Failed to update status", error);
      toast({ title: 'Error', description: 'Failed to update lead status', variant: 'destructive' });
      // Revert on error
      loadLeads(); 
    }
    setDraggedLead(null);
  };

  const handleDelete = async (leadId: string) => {
    if (!confirm('Are you sure you want to delete this lead?')) return;
    try {
      await deleteLead(ownerId, leadId);
      setLeads(prev => prev.filter(l => l.id !== leadId));
      toast({ title: 'Success', description: 'Lead deleted' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to delete lead', variant: 'destructive' });
    }
  };

  if (loading) return <div className="animate-pulse h-64 bg-muted rounded-xl"></div>;

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Button onClick={() => { setSelectedLead(undefined); setIsSheetOpen(true); }} className="gap-2">
          <Plus className="w-4 h-4" /> Add Lead
        </Button>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4 snap-x">
        {STATUS_COLUMNS.map(col => {
          const colLeads = leads.filter(l => l.status === col.id);
          return (
            <div 
              key={col.id} 
              className="flex-shrink-0 w-80 bg-surface-container/30 border border-border/40 rounded-xl p-3 flex flex-col snap-center"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, col.id)}
            >
              <div className="flex items-center justify-between mb-3 px-1">
                <h3 className="font-semibold text-sm">{col.label}</h3>
                <Badge variant="outline" className="text-xs bg-background/50">{colLeads.length}</Badge>
              </div>

              <div className="flex-1 flex flex-col gap-2 min-h-[200px]">
                {colLeads.map(lead => (
                  <Card 
                    key={lead.id} 
                    className="cursor-grab active:cursor-grabbing border-border/50 hover:border-primary/30 transition-colors"
                    draggable
                    onDragStart={(e) => handleDragStart(e, lead.id)}
                  >
                    <CardHeader className="p-3 pb-0 flex flex-row items-start justify-between space-y-0">
                      <div className="space-y-1">
                        <CardTitle className="text-sm font-medium leading-none">{lead.name}</CardTitle>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Phone className="w-3 h-3" /> {lead.phone}
                        </p>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-6 w-6 -mr-2">
                            <MoreVertical className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => { setSelectedLead(lead); setIsSheetOpen(true); }}>
                            <Edit2 className="w-4 h-4 mr-2" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-red-500" onClick={() => handleDelete(lead.id)}>
                            <Trash2 className="w-4 h-4 mr-2" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </CardHeader>
                    <CardContent className="p-3 pt-2">
                      {lead.expectedRent && (
                        <div className="text-xs font-medium text-primary mb-1">
                          Expected Rent: ₹{lead.expectedRent}
                        </div>
                      )}
                      {lead.nextFollowUpDate && (
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar className="w-3 h-3" /> Follow up: {format(new Date(lead.nextFollowUpDate), 'MMM d, yyyy')}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
                {colLeads.length === 0 && (
                  <div className="flex-1 border-2 border-dashed border-border/30 rounded-lg flex items-center justify-center text-xs text-muted-foreground/50">
                    Drop here
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <AddLeadSheet 
        isOpen={isSheetOpen} 
        onClose={() => setIsSheetOpen(false)} 
        ownerId={ownerId} 
        onSuccess={loadLeads}
        existingLead={selectedLead}
      />
    </div>
  );
}
