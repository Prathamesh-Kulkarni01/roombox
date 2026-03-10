'use client'

import React, { useMemo } from "react"
import { useRouter } from "next/navigation"
import Link from 'next/link'
import { useAppSelector } from "@/lib/hooks"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowRight, Loader2 } from "lucide-react"

import StatsCards, { DashboardStats } from '@/components/dashboard/StatsCards'
import AddGuestDialog from '@/components/dashboard/dialogs/AddGuestDialog'
import PaymentDialog from '@/components/dashboard/dialogs/PaymentDialog'
import QuickActions from "@/components/dashboard/QuickActions"
import { useDashboard } from '@/hooks/use-dashboard'
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import Access from '@/components/ui/PermissionWrapper';
import { useToast } from "@/hooks/use-toast"
import {
  useGetPropertiesQuery,
  useGetGuestsQuery,
  useGetComplaintsQuery
} from "@/lib/api/apiSlice"
import type { PG, Guest, Complaint } from "@/lib/types"

export default function DashboardPage() {
  const { currentUser } = useAppSelector(state => state.user);
  const { selectedPgId } = useAppSelector(state => state.app);
  const router = useRouter();
  const { toast } = useToast();

  // RTK Query hooks
  const { data: pgsData, isLoading: isLoadingPgs } = useGetPropertiesQuery(undefined, {
    skip: !currentUser?.id
  });
  const { data: guestsData, isLoading: isLoadingGuests } = useGetGuestsQuery(undefined, {
    skip: !currentUser?.id
  });
  const { data: complaintsData, isLoading: isLoadingComplaints } = useGetComplaintsQuery(undefined, {
    skip: !currentUser?.id
  });

  const pgs = pgsData?.buildings || [];
  const guests = guestsData?.guests || [];
  const complaints = complaintsData?.complaints || [];
  const isLoading = isLoadingPgs || isLoadingGuests || isLoadingComplaints;

  const {
    isAddGuestDialogOpen, setIsAddGuestDialogOpen, selectedBedForGuestAdd, addGuestForm, handleAddGuestSubmit,
    isPaymentDialogOpen, setIsPaymentDialogOpen, selectedGuestForPayment, paymentForm, handlePaymentSubmit,
    handleOpenAddGuestDialog,
    handleOpenPaymentDialog,
    isAddingGuest,
    isRecordingPayment,
  } = useDashboard({ pgs, guests });

  const stats: DashboardStats = useMemo(() => {
    const relevantPgs = selectedPgId && selectedPgId !== 'all' ? pgs.filter((p: PG) => p.id === selectedPgId) : pgs;
    const relevantGuests = selectedPgId && selectedPgId !== 'all' ? guests.filter((g: Guest) => g.pgId === selectedPgId) : guests;
    const relevantComplaints = selectedPgId && selectedPgId !== 'all' ? complaints.filter((c: Complaint) => c.pgId === selectedPgId) : complaints;

    const totalOccupancy = relevantGuests.filter((g: Guest) => !g.isVacated).length;
    const totalBeds = relevantPgs.reduce((sum: number, pg: PG) => sum + (pg.totalBeds || 0), 0);

    const monthlyRevenue = relevantGuests
      .filter((g: Guest) => !g.isVacated)
      .reduce((sum: number, g: Guest) => {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const collectedThisMonth = (g.ledger || [])
          .filter(e => e.type === 'credit' && new Date(e.date) >= startOfMonth)
          .reduce((s, e) => s + (e.amount || 0), 0);
        return sum + collectedThisMonth;
      }, 0);

    const openComplaintsCount = relevantComplaints.filter((c: Complaint) => c.status === 'open').length;

    const pendingDues = relevantGuests
      .filter((g: Guest) => !g.isVacated)
      .reduce((sum: number, g: Guest) => {
        const totalDebits = (g.ledger || []).filter(e => e.type === 'debit').reduce((s, e) => s + (e.amount || 0), 0);
        const totalCredits = (g.ledger || []).filter(e => e.type === 'credit').reduce((s, e) => s + (e.amount || 0), 0);
        const balance = totalDebits - totalCredits;
        return sum + (balance > 0 ? balance : 0);
      }, 0);

    const newThisMonth = relevantGuests.filter((g: Guest) => {
      if (!g.moveInDate) return false;
      const joinDate = new Date(g.moveInDate);
      const now = new Date();
      return joinDate.getMonth() === now.getMonth() && joinDate.getFullYear() === now.getFullYear();
    }).length;

    const rentCollectedToday = relevantGuests.reduce((sum, g: Guest) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayPayments = (g.ledger || [])
        .filter(e => e.type === 'credit' && new Date(e.date) >= today)
        .reduce((s, e) => s + (e.amount || 0), 0);
      return sum + todayPayments;
    }, 0);

    return {
      occupancy: { total: totalBeds, occupied: totalOccupancy, newThisMonth },
      complaints: { active: openComplaintsCount, severity: openComplaintsCount > 0 ? 'High' : 'Normal' },
      revenue: { collected: monthlyRevenue, expected: monthlyRevenue + pendingDues, collectedToday: rentCollectedToday },
      pendingDues: { amount: pendingDues },
    };
  }, [pgs, guests, complaints, selectedPgId]);

  const recentGuests = useMemo(() => {
    const relevantGuests = selectedPgId && selectedPgId !== 'all' ? guests.filter((g: Guest) => g.pgId === selectedPgId) : guests;
    return [...relevantGuests]
      .filter((g: Guest) => !g.isVacated)
      .sort((a, b) => new Date(b.moveInDate || 0).getTime() - new Date(a.moveInDate || 0).getTime())
      .slice(0, 5);
  }, [guests, selectedPgId]);

  const handleSendMassReminder = async () => {
    toast({ title: "Reminders Sent", description: "Payment reminders sent to all guests with pending dues." });
  };

  const handleSendAnnouncement = () => {
    toast({ title: "Announcement", description: "Announcement dialog opened (coming soon)." });
  }

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-6 md:max-w-xl mx-auto md:mx-0 w-full pb-20 mt-4 md:mt-0">

        <div className="flex items-center justify-between mb-2">
          <div>
            <h2 className="text-xl font-bold tracking-tight">Property Overview</h2>
            <p className="text-sm text-muted-foreground">{new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).toUpperCase()}</p>
          </div>
        </div>

        <StatsCards
          stats={stats}
          onSendReminders={handleSendMassReminder}
        />

        {pgs.length > 0 ? (
          <>
            <div className="space-y-4 pt-2">
              <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider px-1">Quick Actions</h3>
              <QuickActions
                pgs={selectedPgId && selectedPgId !== 'all' ? pgs.filter(p => p.id === selectedPgId) : pgs}
                guests={selectedPgId && selectedPgId !== 'all' ? guests.filter(g => g.pgId === selectedPgId) : guests}
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
                  {recentGuests.length > 0 ? recentGuests.map((guest: Guest) => (
                    <li key={guest.id} className="p-4 flex items-center justify-between hover:bg-muted/20 transition-colors">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-10 h-10 border shadow-sm">
                          <AvatarFallback className="bg-primary/5 text-primary text-sm font-bold">
                            {guest.name.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold text-sm leading-tight">{guest.name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">Room {pgs.find((p: PG) => p.id === guest.pgId)?.floors?.find(f => f.rooms.some(r => r.id === guest.roomId))?.rooms.find(r => r.id === guest.roomId)?.name || 'N/A'}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        {(() => {
                          const totalDebits = (guest.ledger || []).filter(e => e.type === 'debit').reduce((s, e) => s + (e.amount || 0), 0);
                          const totalCredits = (guest.ledger || []).filter(e => e.type === 'credit').reduce((s, e) => s + (e.amount || 0), 0);
                          const balance = totalDebits - totalCredits;

                          if (balance <= 0) {
                            return <span className="text-green-600 font-bold text-sm">₹{guest.rentAmount.toLocaleString('en-IN')}</span>;
                          } else {
                            return (
                              <div className="flex flex-col items-end">
                                <span className="text-red-500 font-bold text-sm">₹{balance.toLocaleString('en-IN')} DUE</span>
                              </div>
                            );
                          }
                        })()}
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
        ) : (
          <div className="flex flex-col items-center justify-center p-12 text-center bg-card border rounded-3xl shadow-sm gap-4">
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center">
              <ArrowRight className="w-10 h-10 text-primary" />
            </div>
            <div>
              <h3 className="text-xl font-bold">Get Started</h3>
              <p className="text-muted-foreground max-w-xs mt-2 text-sm leading-relaxed">Add your first property to start managing floors, rooms, and guests efficiently.</p>
            </div>
            <Button asChild className="w-full max-w-xs py-6 rounded-xl font-bold text-lg shadow-native mt-2">
              <Link href="/dashboard/pg-management">Add Property Now</Link>
            </Button>
          </div>
        )}

      </div>

      <Access feature="guests" action="add">
        <AddGuestDialog
          isAddGuestDialogOpen={isAddGuestDialogOpen}
          setIsAddGuestDialogOpen={setIsAddGuestDialogOpen}
          selectedBedForGuestAdd={selectedBedForGuestAdd}
          addGuestForm={addGuestForm}
          handleAddGuestSubmit={handleAddGuestSubmit}
          isAddingGuest={isAddingGuest}
        />
      </Access>
      <Access feature="finances" action="add">
        <PaymentDialog
          isPaymentDialogOpen={isPaymentDialogOpen}
          setIsPaymentDialogOpen={setIsPaymentDialogOpen}
          selectedGuestForPayment={selectedGuestForPayment}
          paymentForm={paymentForm}
          handlePaymentSubmit={handlePaymentSubmit}
          isRecordingPayment={isRecordingPayment}
        />
      </Access>
    </>
  )
}
