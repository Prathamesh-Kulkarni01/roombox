'use client'

import React, { useMemo } from "react"
import { useRouter } from "next/navigation"
import Link from 'next/link'
import { useAppSelector } from "@/lib/hooks"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowRight, Loader2, MessageCircle } from "lucide-react"

import StatsCards, { DashboardStats, PendingDuesCard } from '@/components/dashboard/StatsCards'
import AddGuestDialog from '@/components/dashboard/dialogs/AddGuestDialog'
import PaymentDialog from '@/components/dashboard/dialogs/PaymentDialog'
import QuickActions from "@/components/dashboard/QuickActions"
import DashboardSkeleton from "@/components/dashboard/DashboardSkeleton"
import MassReminderDialog from "@/components/dashboard/dialogs/MassReminderDialog"
import { useDashboard } from '@/hooks/use-dashboard'
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Sparkles, Sun, Moon, CloudSun } from "lucide-react"
import Access from '@/components/ui/PermissionWrapper';
import { useToast } from "@/hooks/use-toast"
import {
  useGetPropertiesQuery,
  useGetGuestsQuery,
  useGetComplaintsQuery
} from "@/lib/api/apiSlice"
import type { PG, Guest, Complaint } from "@/lib/types"
import { formatBalanceBreakdown, getBalanceBreakdown } from "@/lib/ledger-utils"
import { sendMassPaymentReminders } from "@/lib/actions/notificationActions"

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
  } = useDashboard();

  const [isMassReminderDialogOpen, setIsMassReminderDialogOpen] = React.useState(false);
  const [guestsForReminder, setGuestsForReminder] = React.useState<any[]>([]);

  const stats: DashboardStats = useMemo(() => {
    const relevantPgs = selectedPgId && selectedPgId !== 'all' ? pgs.filter((p: PG) => p.id === selectedPgId) : pgs;
    const relevantGuests = selectedPgId && selectedPgId !== 'all' ? guests.filter((g: Guest) => g.pgId === selectedPgId) : guests;
    const relevantComplaints = selectedPgId && selectedPgId !== 'all' ? complaints.filter((c: Complaint) => c.pgId === selectedPgId) : complaints;

    const totalOccupancy = relevantGuests.filter((g: Guest) => !g.isVacated).length;
    const totalBeds = relevantPgs.reduce((sum: number, pg: PG) => sum + (pg.totalBeds || 0), 0);
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const revenue = relevantGuests
      .reduce((acc, g: Guest) => {
        const collectedThisMonth = (g.ledger || [])
          .filter(e => {
            if (e.type !== 'credit') return false;
            const date = new Date(e.date);
            return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
          })
          .reduce((s, e) => s + (e.amount || 0), 0);
        
        const collectedToday = (g.ledger || [])
          .filter(e => {
            const date = new Date(e.date);
            return e.type === 'credit' && 
                   date.getDate() === now.getDate() && 
                   date.getMonth() === currentMonth && 
                   date.getFullYear() === currentYear;
          })
          .reduce((s, e) => s + (e.amount || 0), 0);

        const breakdown = getBalanceBreakdown(g);
        
        return {
          collected: acc.collected + collectedThisMonth,
          collectedToday: acc.collectedToday + collectedToday,
          pending: acc.pending + breakdown.total,
          symbolicPending: acc.symbolicPending + (breakdown.symbolicRent + breakdown.symbolicDeposit),
        };
      }, { collected: 0, collectedToday: 0, pending: 0, symbolicPending: 0 });

    const newThisMonthCount = relevantGuests.filter((guest: Guest) => {
      if (!guest.moveInDate) return false;
      const joinDate = new Date(guest.moveInDate);
      return joinDate.getMonth() === currentMonth && joinDate.getFullYear() === currentYear;
    }).length;

    const openComplaintsCount = relevantComplaints.filter((c: Complaint) => c.status === 'open').length;

    return {
      occupancy: { total: totalBeds, occupied: totalOccupancy, newThisMonth: newThisMonthCount },
      complaints: { active: openComplaintsCount, severity: openComplaintsCount > 0 ? 'High' : 'Normal' },
      revenue: { 
        collected: revenue.collected, 
        expected: revenue.collected + revenue.pending, 
        collectedToday: revenue.collectedToday,
        symbolicPending: revenue.symbolicPending 
      },
      pendingDues: { 
        amount: revenue.pending,
        symbolicUnits: revenue.symbolicPending
      },
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
    const guestsWithDues = guests
      .filter((g: Guest) => !g.isVacated)
      .map(g => {
        const totalDebits = (g.ledger || []).filter(e => e.type === 'debit').reduce((s, e) => s + (e.amount || 0), 0);
        const totalCredits = (g.ledger || []).filter(e => e.type === 'credit').reduce((s, e) => s + (e.amount || 0), 0);
        return { ...g, balance: totalDebits - totalCredits };
      })
      .filter(g => g.balance > 0)
      .map(g => ({
        id: g.id,
        name: g.name,
        phone: g.phone,
        userId: g.userId,
        balance: g.balance,
        roomName: pgs.find(p => p.id === g.pgId)?.floors?.find(f => f.rooms.some(r => r.id === g.roomId))?.rooms.find(r => r.id === g.roomId)?.name || 'N/A'
      }));

    if (guestsWithDues.length === 0) {
      toast({ title: "All Settled!", description: "No guests have pending dues at the moment." });
      return;
    }

    setGuestsForReminder(guestsWithDues);
    setIsMassReminderDialogOpen(true);
  };

  const handleConfirmMassReminders = async (selectedGuests: any[]) => {
    toast({ title: "Sending Alerts", description: `Processing reminders for ${selectedGuests.length} guests...` });

    const result = await sendMassPaymentReminders({
      ownerId: currentUser!.id,
      guests: selectedGuests
    });

    if (result.success) {
      toast({
        title: "Alerts Sent Successfully",
        description: `WhatsApp: ${result.results?.whatsapp}, Push: ${result.results?.push} delivered.`
      });
    } else {
      toast({
        title: "Failed to send alerts",
        description: result.error || "An unknown error occurred",
        variant: "destructive"
      });
    }
  };


  if (isLoading) {
    return <DashboardSkeleton />;
  }

  const getTimeGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return { text: 'Good Morning', icon: <Sun className="w-5 h-5 text-amber-500" /> };
    if (hour < 17) return { text: 'Good Afternoon', icon: <CloudSun className="w-5 h-5 text-amber-500" /> };
    return { text: 'Good Evening', icon: <Moon className="w-5 h-5 text-indigo-500" /> };
  };

  const greeting = getTimeGreeting();

  return (
    <>
      <div className="flex flex-col gap-6 md:max-w-xl mx-auto md:mx-0 w-full pb-20 mt-4 md:mt-0">

        <div className="flex items-center justify-between mb-2 px-1">
          <div>
            <div className="flex items-center gap-2 mb-1">
              {greeting.icon}
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{greeting.text}</span>
            </div>
            <h2 className="text-2xl font-black tracking-tight flex items-center gap-2">
              Welcome, {currentUser?.name?.split(' ')[0] || 'Partner'}
              <Sparkles className="w-5 h-5 text-primary animate-pulse" />
            </h2>
            <p className="text-sm font-semibold text-muted-foreground mt-1">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <Avatar className="w-12 h-12 border-2 border-primary/20 shadow-sm ring-2 ring-background">
            <AvatarFallback className="bg-primary/5 text-primary text-sm font-black">
              {currentUser?.name?.slice(0, 2).toUpperCase() || 'HB'}
            </AvatarFallback>
          </Avatar>
        </div>

        <StatsCards
          stats={stats}
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
              />
            </div>

            <div className="pt-2">
              <PendingDuesCard 
                amount={stats.pendingDues.amount}
                symbolicUnits={stats.pendingDues.symbolicUnits}
                onSendReminders={handleSendMassReminder}
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
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          {(() => {
                            const breakdown = getBalanceBreakdown(guest);
                            const balance = breakdown.total;
                            const hasSymbolic = breakdown.symbolicRent > 0 || breakdown.symbolicDeposit > 0;

                            if (balance <= 0 && !hasSymbolic) {
                              return <span className="text-emerald-600 font-bold text-sm">₹{guest.rentAmount.toLocaleString('en-IN')}</span>;
                            } else {
                              return (
                                <div className="flex flex-col items-end">
                                  {balance > 0 && <span className="text-rose-600 font-black text-sm">₹{balance.toLocaleString('en-IN')} DUE</span>}
                                  {hasSymbolic && <span className="text-rose-600 font-black text-sm">{breakdown.symbolicRent + breakdown.symbolicDeposit} * {guest.symbolicRentValue || 'XXX'} DUE</span>}
                                  {formatBalanceBreakdown(guest) && (
                                    <span className="text-[10px] text-rose-600 font-bold uppercase tracking-tight">
                                      {formatBalanceBreakdown(guest)}
                                    </span>
                                  )}
                                  {guest.phone && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 mt-1"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        window.open(`https://wa.me/91${guest.phone}?text=Hi ${guest.name}, your rent of ₹${balance} for room ${pgs.find((p: PG) => p.id === guest.pgId)?.floors?.find(f => f.rooms.some(r => r.id === guest.roomId))?.rooms.find(r => r.id === guest.roomId)?.name || ''} is pending. Please pay at your earliest convenience.`, '_blank');
                                      }}
                                    >
                                      <MessageCircle className="w-5 h-5 fill-emerald-600/10" />
                                    </Button>
                                  )}
                                </div>
                              );
                            }
                          })()}
                        </div>
                      </div>
                    </li>
                  )) : (
                    <li className="p-6 text-center text-sm text-muted-foreground">No recent guests.</li>
                  )}
                </ul>
              </Card>
            </div>

            <div className="flex justify-center mt-6">
              <Button
                onClick={() => router.push(`/dashboard/pg-management/${!selectedPgId || selectedPgId === 'all' ? pgs[0]?.id : selectedPgId}`)}
                className="w-full bg-gradient-to-r from-primary to-indigo-600 hover:opacity-90 text-primary-foreground font-black shadow-xl py-7 rounded-2xl text-lg group transition-all"
              >
                Manage Rooms & Beds
                <ArrowRight className="ml-2 w-6 h-6 group-hover:translate-x-1 transition-transform" />
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

      <MassReminderDialog
        isOpen={isMassReminderDialogOpen}
        onOpenChange={setIsMassReminderDialogOpen}
        guests={guestsForReminder}
        whatsappCredits={currentUser?.subscription?.whatsappCredits || 0}
        whatsappEnabled={!!currentUser?.subscription?.premiumFeatures?.whatsapp?.enabled}
        onSend={handleConfirmMassReminders}
      />
    </>
  )
}
