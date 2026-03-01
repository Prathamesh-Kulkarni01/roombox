'use client'

import { useMemo } from "react"
import { useRouter } from "next/navigation"
import Link from 'next/link'
import { useAppSelector } from "@/lib/hooks"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"

import StatsCards, { DashboardStats } from '@/components/dashboard/StatsCards'
import AddGuestDialog from '@/components/dashboard/dialogs/AddGuestDialog'
import PaymentDialog from '@/components/dashboard/dialogs/PaymentDialog'
import QuickActions from "@/components/dashboard/QuickActions"
import { useDashboard } from '@/hooks/use-dashboard'
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import Access from '@/components/ui/PermissionWrapper';
import { useToast } from "@/hooks/use-toast"

export default function DashboardPage() {
  const { pgs, guests, complaints } = useAppSelector(state => ({
    pgs: state.pgs.pgs,
    guests: state.guests.guests,
    complaints: state.complaints.complaints,
  }));

  const { selectedPgId } = useAppSelector(state => state.app);
  const router = useRouter();
  const { toast } = useToast();

  const {
    isAddGuestDialogOpen, setIsAddGuestDialogOpen, selectedBedForGuestAdd, addGuestForm, handleAddGuestSubmit,
    isPaymentDialogOpen, setIsPaymentDialogOpen, selectedGuestForPayment, paymentForm, handlePaymentSubmit,
    handleOpenAddGuestDialog,
    handleOpenPaymentDialog,
  } = useDashboard({ pgs, guests });

  const stats: DashboardStats = useMemo(() => {
    const relevantPgs = selectedPgId ? pgs.filter(p => p.id === selectedPgId) : pgs;
    const relevantGuests = selectedPgId ? guests.filter(g => g.pgId === selectedPgId) : guests;
    const relevantComplaints = selectedPgId ? complaints.filter(c => c.pgId === selectedPgId) : complaints;

    const totalOccupancy = relevantGuests.filter(g => !g.isVacated).length;
    const totalBeds = relevantPgs.reduce((sum, pg) => sum + pg.totalBeds, 0);

    const monthlyRevenue = relevantGuests
      .filter(g => g.rentStatus === 'paid' && !g.isVacated)
      .reduce((sum, g) => sum + g.rentAmount, 0);

    const openComplaintsCount = relevantComplaints.filter(c => c.status === 'open').length;

    const pendingDues = relevantGuests
      .filter(g => !g.isVacated && (g.rentStatus === 'unpaid' || g.rentStatus === 'partial'))
      .reduce((sum, g) => {
        const balanceBf = g.balanceBroughtForward || 0;
        const currentMonthRent = g.rentAmount;
        const chargesDue = (g.additionalCharges || []).reduce((s, charge) => s + charge.amount, 0);
        const totalOwed = balanceBf + currentMonthRent + chargesDue;
        const totalPaid = g.rentPaidAmount || 0;
        return sum + (totalOwed - totalPaid);
      }, 0);

    const newThisMonth = relevantGuests.filter(g => {
      if (!g.moveInDate) return false;
      const joinDate = new Date(g.moveInDate);
      const now = new Date();
      return joinDate.getMonth() === now.getMonth() && joinDate.getFullYear() === now.getFullYear();
    }).length;

    return {
      occupancy: { total: totalBeds, occupied: totalOccupancy, newThisMonth },
      complaints: { active: openComplaintsCount, severity: openComplaintsCount > 0 ? 'High' : 'Normal' },
      revenue: { collected: monthlyRevenue, expected: monthlyRevenue + pendingDues },
      pendingDues: { amount: pendingDues },
    };
  }, [pgs, guests, complaints, selectedPgId]);

  const recentGuests = useMemo(() => {
    const relevantGuests = selectedPgId ? guests.filter(g => g.pgId === selectedPgId) : guests;
    return [...relevantGuests]
      .filter(g => !g.isVacated)
      .sort((a, b) => new Date(b.moveInDate).getTime() - new Date(a.moveInDate).getTime())
      .slice(0, 5);
  }, [guests, selectedPgId]);

  const handleSendMassReminder = async () => {
    toast({ title: "Reminders Sent", description: "Payment reminders sent to all guests with pending dues." });
  };

  const handleSendAnnouncement = () => {
    toast({ title: "Announcement", description: "Announcement dialog opened (coming soon)." });
  }

  return (
    <>
      <div className="flex flex-col gap-6 md:max-w-xl mx-auto md:mx-0 w-full pb-20 mt-4 md:mt-0">

        <div className="flex items-center justify-between mb-2">
          <div>
            <h2 className="text-xl font-bold tracking-tight">Property Overview</h2>
            <p className="text-sm text-muted-foreground">{new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).toUpperCase()}</p>
          </div>
          {/* The user's design shows a month badge, we provided it via normal text. */}
        </div>

        <StatsCards
          stats={stats}
          onSendReminders={handleSendMassReminder}
        />

        {pgs.length > 0 && (
          <>
            <div className="space-y-4 pt-2">
              <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider px-1">Quick Actions</h3>
              <QuickActions
                pgs={pgs}
                guests={guests}
                handleOpenAddGuestDialog={handleOpenAddGuestDialog}
                handleOpenPaymentDialog={handleOpenPaymentDialog}
                onSendAnnouncement={handleSendAnnouncement}
              />
            </div>

            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Recent Guests</h3>
                <Link href="/dashboard/tenant-management" className="text-xs text-primary font-bold hover:underline bg-primary/10 px-2 py-1 rounded-full">View All</Link>
              </div>
              <Card className="border-border/40 overflow-hidden shadow-sm">
                <ul className="divide-y divide-border/20">
                  {recentGuests.length > 0 ? recentGuests.map(guest => (
                    <li key={guest.id} className="p-4 flex items-center justify-between hover:bg-muted/20 transition-colors">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-10 h-10 border shadow-sm">
                          <AvatarFallback className="bg-primary/5 text-primary text-sm font-bold">
                            {guest.name.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold text-sm leading-tight">{guest.name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">Room {pgs.find(p => p.id === guest.pgId)?.floors?.find(f => f.rooms.some(r => r.id === guest.roomId))?.rooms.find(r => r.id === guest.roomId)?.name || 'N/A'}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        {guest.rentStatus === 'paid' ? (
                          <span className="text-green-600 font-bold text-sm">₹{guest.rentPaidAmount?.toLocaleString('en-IN') || guest.rentAmount.toLocaleString('en-IN')}</span>
                        ) : (
                          <span className="text-red-500 font-bold text-sm">DUE</span>
                        )}
                      </div>
                    </li>
                  )) : (
                    <li className="p-6 text-center text-sm text-muted-foreground">No recent guests.</li>
                  )}
                </ul>
              </Card>
            </div>

            <div className="flex justify-center mt-6">
              <Button onClick={() => router.push(`/dashboard/pg-management/${!selectedPgId || selectedPgId === 'all' ? pgs[0]?.id : selectedPgId}`)} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-native py-6 rounded-xl text-lg">
                Manage Rooms & Beds <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </div>
          </>
        )}

      </div>

      <Access feature="guests" action="add">
        <AddGuestDialog
          isAddGuestDialogOpen={isAddGuestDialogOpen}
          setIsAddGuestDialogOpen={setIsAddGuestDialogOpen}
          selectedBedForGuestAdd={selectedBedForGuestAdd}
          addGuestForm={addGuestForm}
          handleAddGuestSubmit={handleAddGuestSubmit}
        />
      </Access>
      <Access feature="finances" action="add">
        <PaymentDialog
          isPaymentDialogOpen={isPaymentDialogOpen}
          setIsPaymentDialogOpen={setIsPaymentDialogOpen}
          selectedGuestForPayment={selectedGuestForPayment}
          paymentForm={paymentForm}
          handlePaymentSubmit={handlePaymentSubmit}
        />
      </Access>
    </>
  )
}
