'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { IndianRupee, Plus, CheckCircle2 } from 'lucide-react';
import { StaffAdvance, PayrollRecord, Staff } from '@/lib/types';
import { fetchUnsettledAdvances, recordStaffAdvance, generateMonthlyPayroll, processPayroll, fetchPayrolls } from '@/lib/actions/payrollActions';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface StaffPayrollTabProps {
  staffMember: Staff;
  ownerId: string;
}

export default function StaffPayrollTab({ staffMember, ownerId }: StaffPayrollTabProps) {
  const [advances, setAdvances] = useState<StaffAdvance[]>([]);
  const [payrolls, setPayrolls] = useState<PayrollRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const [isAdvanceModalOpen, setIsAdvanceModalOpen] = useState(false);
  const [advanceAmount, setAdvanceAmount] = useState('');
  const [advanceReason, setAdvanceReason] = useState('');

  const [isProcessModalOpen, setIsProcessModalOpen] = useState(false);
  const [pendingPayroll, setPendingPayroll] = useState<PayrollRecord | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const adv = await fetchUnsettledAdvances(ownerId, staffMember.id);
      setAdvances(adv);
      
      const prl = await fetchPayrolls(ownerId, staffMember.id);
      setPayrolls(prl);
    } catch (error) {
      console.error(error);
      toast({ title: 'Error', description: 'Failed to load payroll data', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [ownerId, staffMember.id]);

  const handleRecordAdvance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!advanceAmount) return;

    try {
      await recordStaffAdvance(ownerId, staffMember.id, {
        amount: Number(advanceAmount),
        reason: advanceReason,
        date: new Date().toISOString(),
      });
      toast({ title: 'Success', description: 'Advance recorded successfully' });
      setIsAdvanceModalOpen(false);
      setAdvanceAmount('');
      setAdvanceReason('');
      loadData();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to record advance', variant: 'destructive' });
    }
  };

  const handleOpenProcessSalary = async () => {
    const currentMonth = format(new Date(), 'yyyy-MM');
    try {
      const generated = await generateMonthlyPayroll(ownerId, staffMember.id, currentMonth);
      setPendingPayroll(generated);
      setIsProcessModalOpen(true);
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to generate payroll preview', variant: 'destructive' });
    }
  };

  const handleConfirmSalary = async () => {
    if (!pendingPayroll) return;
    try {
      await processPayroll(ownerId, pendingPayroll.id);
      toast({ title: 'Success', description: 'Salary marked as paid' });
      setIsProcessModalOpen(false);
      loadData();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to process salary', variant: 'destructive' });
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground">Loading payroll data...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle>Current Unsettled Advances</CardTitle>
              <CardDescription>Money given mid-month to be deducted from next salary.</CardDescription>
            </div>
            <Button size="sm" onClick={() => setIsAdvanceModalOpen(true)}>
              <Plus className="w-4 h-4 mr-2" /> Add Advance
            </Button>
          </CardHeader>
          <CardContent>
            {advances.length === 0 ? (
              <div className="text-sm text-muted-foreground py-4">No unsettled advances.</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Reason</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {advances.map(adv => (
                      <TableRow key={adv.id}>
                        <TableCell>{format(new Date(adv.date), 'dd MMM yyyy')}</TableCell>
                        <TableCell className="font-medium text-red-500">-₹{adv.amount}</TableCell>
                        <TableCell>{adv.reason || 'N/A'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
            <div className="mt-4 p-3 bg-muted rounded-md flex justify-between font-semibold">
              <span>Total to Deduct:</span>
              <span className="text-red-500">
                -₹{advances.reduce((acc, curr) => acc + curr.amount, 0)}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Salary Processing</CardTitle>
            <CardDescription>Process salary for the current month.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 justify-center items-center py-8">
            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">Base Salary</p>
              <p className="text-3xl font-bold">₹{staffMember.salary.toLocaleString('en-IN')}</p>
            </div>
            <Button size="lg" className="w-full mt-4" onClick={handleOpenProcessSalary}>
              Process Current Month Salary
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Payroll History</CardTitle>
          <CardDescription>Past salary payouts.</CardDescription>
        </CardHeader>
        <CardContent>
          {payrolls.length === 0 ? (
            <div className="text-sm text-muted-foreground py-4 text-center">No payroll history found.</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Month</TableHead>
                    <TableHead>Base</TableHead>
                    <TableHead>Attendance Ded.</TableHead>
                    <TableHead>Advances Ded.</TableHead>
                    <TableHead>Final Payout</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payrolls.map(pr => (
                    <TableRow key={pr.id}>
                      <TableCell className="font-medium">{pr.month}</TableCell>
                      <TableCell>₹{pr.baseSalary}</TableCell>
                      <TableCell className="text-red-500">₹{pr.calculatedDeduction}</TableCell>
                      <TableCell className="text-red-500">₹{pr.advancesDeducted}</TableCell>
                      <TableCell className="font-bold text-green-600">₹{pr.finalPayout}</TableCell>
                      <TableCell>
                        {pr.status === 'paid' ? (
                          <Badge className="bg-green-100 text-green-800 hover:bg-green-100"><CheckCircle2 className="w-3 h-3 mr-1" /> Paid</Badge>
                        ) : (
                          <Badge variant="outline">Pending</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Advance Modal */}
      <Dialog open={isAdvanceModalOpen} onOpenChange={setIsAdvanceModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Staff Advance</DialogTitle>
            <DialogDescription>Money given mid-month will be auto-deducted from their next salary.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleRecordAdvance} className="space-y-4">
            <div className="space-y-2">
              <Label>Amount (₹) *</Label>
              <Input type="number" value={advanceAmount} onChange={e => setAdvanceAmount(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Reason (Optional)</Label>
              <Input value={advanceReason} onChange={e => setAdvanceReason(e.target.value)} placeholder="e.g., Medical emergency" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAdvanceModalOpen(false)}>Cancel</Button>
              <Button type="submit">Save Advance</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Process Salary Modal */}
      <Dialog open={isProcessModalOpen} onOpenChange={setIsProcessModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Process Salary - {pendingPayroll?.month}</DialogTitle>
            <DialogDescription>Review deductions before confirming payment.</DialogDescription>
          </DialogHeader>
          {pendingPayroll && (
            <div className="space-y-4 py-4">
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-muted-foreground">Base Salary:</span>
                <span className="font-medium">₹{pendingPayroll.baseSalary}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-muted-foreground">Attendance Days:</span>
                <span className="font-medium">{pendingPayroll.attendanceDays} days</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-muted-foreground">Absence Deduction:</span>
                <span className="text-red-500 font-medium">-₹{pendingPayroll.calculatedDeduction}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-muted-foreground">Unsettled Advances:</span>
                <span className="text-red-500 font-medium">-₹{pendingPayroll.advancesDeducted}</span>
              </div>
              <div className="flex justify-between items-center py-4 bg-muted/30 px-3 rounded-lg">
                <span className="font-bold text-lg">Final Payout:</span>
                <span className="font-bold text-2xl text-green-600">₹{pendingPayroll.finalPayout}</span>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsProcessModalOpen(false)}>Cancel</Button>
            <Button onClick={handleConfirmSalary} className="bg-green-600 hover:bg-green-700">Confirm & Mark Paid</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
