'use client';

import { useState, useEffect } from 'react';
import { useAccessibleNav } from '@/lib/hooks/use-accessible-nav';
import { useAppSelector } from '@/lib/hooks';
import { UtilityReading } from '@/lib/types';
import { fetchUtilityReadingsForPg, billUtilityToRoom } from '@/lib/actions/utilityActions';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Zap, Plus, Droplet } from 'lucide-react';
import UtilityReadingModal from '@/components/utilities/UtilityReadingModal';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

export default function UtilitiesPage() {
  const { currentUser } = useAccessibleNav();
  const { selectedPgId } = useAppSelector(state => state.app);
  const { pgs } = useAppSelector(state => state.pgs);
  const [readings, setReadings] = useState<UtilityReading[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [billingReadingId, setBillingReadingId] = useState<string | null>(null);
  const { toast } = useToast();

  const ownerId = currentUser?.role === 'owner' || currentUser?.role === 'admin' 
    ? currentUser.id 
    : currentUser?.ownerId;

  const currentPg = pgs?.find(p => p.id === selectedPgId);
  const pgRooms = currentPg?.floors?.flatMap(f => f.rooms) || [];

  const loadReadings = async () => {
    if (!ownerId || !selectedPgId) return;
    setLoading(true);
    try {
      const data = await fetchUtilityReadingsForPg(ownerId, selectedPgId);
      setReadings(data);
    } catch (error) {
      console.error(error);
      toast({ title: 'Error', description: 'Failed to load utility readings', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReadings();
  }, [ownerId, selectedPgId]);

  const handleBillToRoom = async (readingId: string) => {
    if (!ownerId) return;
    setBillingReadingId(readingId);
    try {
      await billUtilityToRoom(ownerId, readingId);
      toast({ title: 'Success', description: 'Bill successfully split and added to guest ledgers' });
      loadReadings();
    } catch (error: any) {
      console.error(error);
      toast({ title: 'Error', description: error.message || 'Failed to bill room', variant: 'destructive' });
    } finally {
      setBillingReadingId(null);
    }
  };

  if (!ownerId || !selectedPgId) {
    return <div className="p-6">Please select a property first.</div>;
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-[1200px] mx-auto">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary font-headline flex items-center gap-2">
            <Zap className="w-8 h-8" /> Utilities & Sub-Billing
          </h1>
          <p className="text-muted-foreground mt-1">Record meter readings and automatically charge tenants.</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" /> Record Reading
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Meter Readings</CardTitle>
          <CardDescription>All utility recordings for {currentPg?.name}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Room</TableHead>
                  <TableHead>Utility</TableHead>
                  <TableHead className="text-right">Usage (Units)</TableHead>
                  <TableHead className="text-right">Total Cost</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {readings.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground h-32">
                      No meter readings recorded yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  readings.map(reading => {
                    const usage = reading.currentReading - reading.previousReading;
                    return (
                      <TableRow key={reading.id}>
                        <TableCell>{format(new Date(reading.readingDate), 'MMM d, yyyy')}</TableCell>
                        <TableCell className="font-medium">{reading.roomName}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5 capitalize">
                            {reading.utilityType === 'electricity' ? <Zap className="w-3 h-3 text-yellow-500" /> : <Droplet className="w-3 h-3 text-blue-500" />}
                            {reading.utilityType}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {usage}
                          <span className="text-[10px] text-muted-foreground block">
                            ({reading.previousReading} → {reading.currentReading})
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-medium text-primary">₹{reading.totalAmount}</TableCell>
                        <TableCell className="text-center">
                          {reading.isBilled ? (
                            <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">Billed</Badge>
                          ) : (
                            <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">Unbilled</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {!reading.isBilled && (
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => handleBillToRoom(reading.id)}
                              disabled={billingReadingId === reading.id}
                            >
                              {billingReadingId === reading.id ? 'Billing...' : 'Bill to Room'}
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <UtilityReadingModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        ownerId={ownerId}
        pgId={selectedPgId}
        rooms={pgRooms}
        onSuccess={loadReadings}
      />
    </div>
  );
}
