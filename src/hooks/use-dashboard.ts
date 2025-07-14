
import { useState, useEffect, useMemo } from "react"
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { produce } from 'immer'

import { useAppDispatch, useAppSelector } from "@/lib/hooks"
import { useToast } from '@/hooks/use-toast'
import { generateRentReminder, type GenerateRentReminderInput } from '@/ai/flows/generate-rent-reminder'

import type { Guest, Bed, Room, PG, Floor, Complaint } from "@/lib/types"
import { format, addMonths } from "date-fns"
import { addGuest as addGuestAction, updateGuest as updateGuestAction } from "@/lib/slices/guestsSlice"
import { updatePg as updatePgAction } from "@/lib/slices/pgsSlice"

const addGuestSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters."),
    phone: z.string().regex(/^\d{10}$/, "Please enter a valid 10-digit phone number."),
    email: z.string().email("Please enter a valid email address."),
    rentAmount: z.coerce.number().min(1, "Rent amount is required."),
    depositAmount: z.coerce.number().min(0, "Deposit amount must be 0 or more."),
    moveInDate: z.date({ required_error: "A move-in date is required."}),
    kycDocument: z.any().optional()
})

const floorSchema = z.object({ name: z.string().min(2, "Floor name must be at least 2 characters.") })
const roomSchema = z.object({
  name: z.string().min(2, "Room name must be at least 2 characters."),
  rent: z.coerce.number().min(1, "Rent is required."),
  deposit: z.coerce.number().min(0, "Deposit is required."),
})
const bedSchema = z.object({ name: z.string().min(1, "Bed name/number is required.") })

const paymentSchema = z.object({
  amountPaid: z.coerce.number().min(0.01, "Payment amount must be greater than 0."),
  paymentMethod: z.enum(['cash', 'upi', 'in-app']),
});

interface UseDashboardProps {
  pgs: PG[];
  guests: Guest[];
}

export function useDashboard({ pgs, guests }: UseDashboardProps) {
  const dispatch = useAppAppDispatch();
  const { toast } = useToast()
  const { currentPlan } = useAppSelector(state => state.user)
  
  // States for guest dialog
  const [isAddGuestDialogOpen, setIsAddGuestDialogOpen] = useState(false);
  const [selectedBedForGuestAdd, setSelectedBedForGuestAdd] = useState<{ bed: Bed; room: Room; pg: PG } | null>(null);
  
  // States for layout editing
  const [isFloorDialogOpen, setIsFloorDialogOpen] = useState(false);
  const [isRoomDialogOpen, setIsRoomDialogOpen] = useState(false);
  const [isBedDialogOpen, setIsBedDialogOpen] = useState(false);
  const [floorToEdit, setFloorToEdit] = useState<Floor | null>(null);
  const [roomToEdit, setRoomToEdit] = useState<{ room: Room; floorId: string } | null>(null);
  const [bedToEdit, setBedToEdit] = useState<{ bed: Bed; roomId: string; floorId: string } | null>(null);
  const [selectedPgForFloorAdd, setSelectedPgForFloorAdd] = useState<PG | null>(null);
  const [selectedFloorForRoomAdd, setSelectedFloorForRoomAdd] = useState<{ floorId: string, pgId: string } | null>(null);
  const [selectedRoomForBedAdd, setSelectedRoomForBedAdd] = useState<{ floorId: string; roomId: string; pgId: string; } | null>(null);
  const [itemToDelete, setItemToDelete] = useState<{ type: 'floor' | 'room' | 'bed', ids: { pgId: string; floorId: string; roomId?: string; bedId?: string } } | null>(null)
  
  // States for guest actions
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [selectedGuestForPayment, setSelectedGuestForPayment] = useState<Guest | null>(null);
  const [isReminderDialogOpen, setIsReminderDialogOpen] = useState(false);
  const [reminderMessage, setReminderMessage] = useState('');
  const [isGeneratingReminder, setIsGeneratingReminder] = useState(false);
  const [selectedGuestForReminder, setSelectedGuestForReminder] = useState<Guest | null>(null);

  // Forms
  const addGuestForm = useForm<z.infer<typeof addGuestSchema>>({
    resolver: zodResolver(addGuestSchema),
    defaultValues: { name: '', phone: '', email: '', rentAmount: 0, depositAmount: 0 },
  });
  const floorForm = useForm<z.infer<typeof floorSchema>>({ resolver: zodResolver(floorSchema), defaultValues: { name: '' } });
  const roomForm = useForm<z.infer<typeof roomSchema>>({ resolver: zodResolver(roomSchema), defaultValues: { name: '', rent: 0, deposit: 0 } });
  const bedForm = useForm<z.infer<typeof bedSchema>>({ resolver: zodResolver(bedSchema), defaultValues: { name: '' } });
  const paymentForm = useForm<z.infer<typeof paymentSchema>>({
    resolver: zodResolver(paymentSchema),
    defaultValues: { paymentMethod: 'cash' }
  });

  // Effects for form resets
  useEffect(() => { if (floorToEdit) floorForm.reset({ name: floorToEdit.name }); else floorForm.reset({ name: '' }); }, [floorToEdit, floorForm]);
  useEffect(() => { if (roomToEdit) roomForm.reset({ name: roomToEdit.room.name, rent: roomToEdit.room.rent, deposit: roomToEdit.room.deposit }); else roomForm.reset({ name: '', rent: 0, deposit: 0 }); }, [roomToEdit, roomForm]);
  useEffect(() => { if (bedToEdit) bedForm.reset({ name: bedToEdit.bed.name }); else bedForm.reset({ name: '' }); }, [bedToEdit, bedForm]);
  useEffect(() => {
    if (selectedGuestForPayment) {
        const amountDue = selectedGuestForPayment.rentAmount - (selectedGuestForPayment.rentPaidAmount || 0);
        paymentForm.reset({ paymentMethod: 'cash', amountPaid: amountDue > 0 ? Number(amountDue.toFixed(2)) : 0 });
    }
  }, [selectedGuestForPayment, paymentForm]);

  // Handlers
  const handleOpenAddGuestDialog = (bed: Bed, room: Room, pg: PG) => {
    setSelectedBedForGuestAdd({ bed, room, pg });
    addGuestForm.reset({ rentAmount: room.rent, depositAmount: room.deposit });
    setIsAddGuestDialogOpen(true);
  };

  const handleAddGuestSubmit = (values: z.infer<typeof addGuestSchema>) => {
    if (!selectedBedForGuestAdd) return;
    const { pg, bed } = selectedBedForGuestAdd;
    
    const guestData: Omit<Guest, 'id'> = {
      name: values.name,
      phone: values.phone,
      email: values.email,
      pgId: pg.id,
      pgName: pg.name,
      bedId: bed.id,
      rentStatus: 'unpaid',
      rentPaidAmount: 0,
      dueDate: format(addMonths(new Date(values.moveInDate), 1), 'yyyy-MM-dd'),
      rentAmount: values.rentAmount,
      depositAmount: values.depositAmount,
      kycStatus: 'pending',
      moveInDate: format(values.moveInDate, 'yyyy-MM-dd'),
      noticePeriodDays: 30,
    };
    
    dispatch(addGuestAction(guestData));
    setIsAddGuestDialogOpen(false);
  };
  
  const handleOpenPaymentDialog = (guest: Guest) => {
    setSelectedGuestForPayment(guest);
    setIsPaymentDialogOpen(true);
  };

  const handlePaymentSubmit = (values: z.infer<typeof paymentSchema>) => {
      if (!selectedGuestForPayment) return;
      const guest = selectedGuestForPayment;
      const newTotalPaid = (guest.rentPaidAmount || 0) + values.amountPaid;
      let updatedGuest: Guest;
      if (newTotalPaid >= guest.rentAmount) {
          updatedGuest = { ...guest, rentStatus: 'paid', rentPaidAmount: 0, dueDate: format(addMonths(new Date(guest.dueDate), 1), 'yyyy-MM-dd') };
      } else {
          updatedGuest = { ...guest, rentStatus: 'partial', rentPaidAmount: newTotalPaid };
      }
      dispatch(updateGuestAction({updatedGuest}));
      setIsPaymentDialogOpen(false);
      setSelectedGuestForPayment(null);
  };

  const handleVacateBed = (guest: Guest) => {
    if (!guest || guest.exitDate) return;
    if (confirm(`This will immediately vacate the bed and clear the guest's dues. Continue?`)) {
        const pg = pgs.find(p => p.id === guest.pgId);
        if (!pg) return;

        const updatedPg = produce(pg, draft => {
            draft.occupancy = Math.max(0, draft.occupancy - 1);
            const floor = draft.floors?.find(f => f.rooms.some(r => r.beds.some(b => b.guestId === guest.id)));
            const room = floor?.rooms.find(r => r.beds.some(b => b.guestId === guest.id));
            const bed = room?.beds.find(b => b.guestId === guest.id);
            if (bed) {
                bed.guestId = null;
            }
        });

        // Set an exit date and clear pending dues for the guest
        const updatedGuest = { ...guest, exitDate: format(new Date(), 'yyyy-MM-dd'), rentStatus: 'paid', rentPaidAmount: guest.rentAmount };
        
        dispatch(updateGuestAction({ updatedGuest, updatedPg }));
    }
  };

  const handleOpenReminderDialog = async (guest: Guest) => {
    if (!guest || !currentPlan?.hasAiRentReminders) return
    setSelectedGuestForReminder(guest);
    setIsReminderDialogOpen(true)
    setIsGeneratingReminder(true)
    setReminderMessage('')

    try {
        const input: GenerateRentReminderInput = {
            guestName: guest.name,
            rentAmount: guest.rentAmount - (guest.rentPaidAmount || 0),
            dueDate: format(new Date(guest.dueDate), "do MMMM yyyy"),
            pgName: guest.pgName,
        }
        const result = await generateRentReminder(input)
        setReminderMessage(result.reminderMessage)
    } catch (error) {
        console.error("Failed to generate reminder", error)
        setReminderMessage("Sorry, we couldn't generate a reminder at this time. Please try again.")
    } finally {
        setIsGeneratingReminder(false)
    }
  }

  const getPgById = (pgId: string) => pgs.find(p => p.id === pgId);

  const handleFloorSubmit = (values: z.infer<typeof floorSchema>) => {
    const pg = floorToEdit ? getPgById(floorToEdit.pgId) : selectedPgForFloorAdd;
    if (!pg) return;
    const nextState = produce(pg, draft => {
      if (!draft.floors) draft.floors = [];
      if (floorToEdit) {
        const floor = draft.floors.find(f => f.id === floorToEdit.id);
        if (floor) floor.name = values.name;
      } else {
        draft.floors.push({ id: `floor-${Date.now()}`, name: values.name, rooms: [], pgId: pg.id });
      }
    });
    dispatch(updatePgAction(nextState));
    setIsFloorDialogOpen(false);
    setFloorToEdit(null);
    setSelectedPgForFloorAdd(null);
  };

  const handleRoomSubmit = (values: z.infer<typeof roomSchema>) => {
    const floorId = roomToEdit?.floorId || selectedFloorForRoomAdd?.floorId;
    const pgId = roomToEdit ? pgs.find(p => p.floors?.some(f => f.id === roomToEdit!.floorId))?.id : selectedFloorForRoomAdd?.pgId;
    if (!floorId || !pgId) return;
    const pg = pgs.find(p => p.id === pgId);
    if(!pg) return;
    const nextState = produce(pg, draft => {
        const floor = draft.floors?.find(f => f.id === floorId);
        if (!floor) return;
        if (roomToEdit) {
            const room = floor.rooms.find(r => r.id === roomToEdit.room.id);
            if(room) { room.name = values.name; room.rent = values.rent; room.deposit = values.deposit; }
        } else {
             floor.rooms.push({ id: `room-${Date.now()}`, name: values.name, rent: values.rent, deposit: values.deposit, beds: [] });
        }
    });
    dispatch(updatePgAction(nextState));
    setIsRoomDialogOpen(false);
    setRoomToEdit(null);
  };
  
  const handleBedSubmit = (values: z.infer<typeof bedSchema>) => {
    const floorId = bedToEdit?.floorId || selectedRoomForBedAdd?.floorId;
    const roomId = bedToEdit?.roomId || selectedRoomForBedAdd?.roomId;
    const pgId = bedToEdit ? pgs.find(p => p.floors?.some(f => f.id === bedToEdit!.floorId))?.id : selectedRoomForBedAdd?.pgId;
    if (!floorId || !roomId || !pgId) return;
    const pg = pgs.find(p => p.id === pgId);
    if(!pg) return;
    const nextState = produce(pg, draft => {
      const room = draft.floors?.find(f => f.id === floorId)?.rooms.find(r => r.id === roomId);
      if (!room) return;
      if (bedToEdit) {
        const bed = room.beds.find(b => b.id === bedToEdit.bed.id);
        if (bed) bed.name = values.name;
      } else {
        room.beds.push({ id: `bed-${Date.now()}`, name: values.name, guestId: null });
        draft.totalBeds = (draft.totalBeds || 0) + 1;
      }
    });
    dispatch(updatePgAction(nextState));
    setIsBedDialogOpen(false);
    setBedToEdit(null);
    setSelectedRoomForBedAdd(null);
  };

  const handleDelete = (type: 'floor' | 'room' | 'bed', ids: { pgId: string; floorId: string; roomId?: string; bedId?: string }) => {
    const pg = getPgById(ids.pgId);
    if (!pg) return;

    const hasGuests = (beds: Bed[]): boolean => {
        return beds.some(bed => guests.some(g => g.bedId === bed.id && !g.exitDate));
    }
    
    const nextState = produce(pg, draft => {
        const floorIndex = draft.floors?.findIndex(f => f.id === ids.floorId);
        if (floorIndex === undefined || floorIndex === -1 || !draft.floors) return;
        
        const floor = draft.floors[floorIndex];
        if (type === 'floor') {
            const floorHasGuests = floor.rooms.some(r => hasGuests(r.beds));
            if (floorHasGuests) {
                toast({ variant: 'destructive', title: "Cannot Delete", description: "This floor has occupied beds. Please vacate all guests first." });
                return;
            }
            draft.totalBeds -= floor?.rooms.reduce((acc, room) => acc + room.beds.length, 0) || 0;
            draft.floors.splice(floorIndex, 1);
        } else if (type === 'room' && ids.roomId) {
            const roomIndex = floor.rooms.findIndex(r => r.id === ids.roomId);
            if (roomIndex === -1) return;
            const room = floor.rooms[roomIndex];
            if (hasGuests(room.beds)) {
                 toast({ variant: 'destructive', title: "Cannot Delete", description: "This room has occupied beds. Please vacate all guests first." });
                return;
            }
            draft.totalBeds -= room?.beds.length || 0;
            floor.rooms.splice(roomIndex, 1);
        } else if (type === 'bed' && ids.roomId && ids.bedId) {
            const room = floor.rooms.find(r => r.id === ids.roomId);
            if (!room) return;
            const bedIndex = room.beds.findIndex(b => b.id === ids.bedId);
            if (bedIndex === -1) return;
            if (room.beds[bedIndex].guestId) {
                 toast({ variant: 'destructive', title: "Cannot Delete", description: "This bed is occupied. Please vacate the guest first." });
                return;
            }
            room.beds.splice(bedIndex, 1);
            draft.totalBeds -= 1;
        }
    });

    if(JSON.stringify(pg) !== JSON.stringify(nextState)) {
        dispatch(updatePgAction(nextState));
    }
  };
  
  const openAddFloorDialog = (pg: PG) => { setFloorToEdit(null); setSelectedPgForFloorAdd(pg); setIsFloorDialogOpen(true); };
  const openEditFloorDialog = (floor: Floor) => { setFloorToEdit(floor); setIsFloorDialogOpen(true); };
  const openAddRoomDialog = (floorId: string, pgId: string) => { setRoomToEdit(null); setSelectedFloorForRoomAdd({floorId, pgId}); setIsRoomDialogOpen(true); };
  const openEditRoomDialog = (room: Room, floorId: string) => { setRoomToEdit({room, floorId}); setIsRoomDialogOpen(true); };
  const openAddBedDialog = (floorId: string, roomId: string, pgId: string) => { setBedToEdit(null); setSelectedRoomForBedAdd({floorId, roomId, pgId}); setIsBedDialogOpen(true); };
  const openEditBedDialog = (bed: Bed, roomId: string, floorId: string) => { setBedToEdit({bed, roomId, floorId}); setIsBedDialogOpen(true); };

  return {
    isAddGuestDialogOpen, setIsAddGuestDialogOpen,
    isFloorDialogOpen, setIsFloorDialogOpen,
    isRoomDialogOpen, setIsRoomDialogOpen,
    isBedDialogOpen, setIsBedDialogOpen,
    isPaymentDialogOpen, setIsPaymentDialogOpen,
    isReminderDialogOpen, setIsReminderDialogOpen,
    selectedBedForGuestAdd,
    floorToEdit,
    roomToEdit,
    bedToEdit,
    selectedGuestForPayment,
    selectedGuestForReminder,
    reminderMessage,
    isGeneratingReminder,
    itemToDelete, setItemToDelete,
    addGuestForm,
    floorForm,
    roomForm,
    bedForm,
    paymentForm,
    handleOpenAddGuestDialog,
    handleAddGuestSubmit,
    handleOpenPaymentDialog,
    handlePaymentSubmit,
    handleVacateBed,
    handleOpenReminderDialog,
    handleFloorSubmit,
    handleRoomSubmit,
    handleBedSubmit,
    handleDelete,
    openAddFloorDialog,
    openEditFloorDialog,
    openAddRoomDialog,
    openEditRoomDialog,
    openAddBedDialog,
    openEditBedDialog,
  }
}

export type UseDashboardReturn = ReturnType<typeof useDashboard>;
