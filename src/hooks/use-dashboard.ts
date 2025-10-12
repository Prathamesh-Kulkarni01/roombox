

'use client';

import { useState, useEffect, useMemo, useTransition } from "react"
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { produce } from 'immer'

import { useAppDispatch, useAppSelector } from "@/lib/hooks"
import { useToast } from '@/hooks/use-toast'
import { useConfetti } from "@/context/confetti-provider"

import type { Guest, Bed, Room, PG, Floor, AdditionalCharge, Payment, RentCycleUnit, LedgerEntry } from "@/lib/types"
import { format, addMonths, addDays, addHours, addMinutes, addWeeks } from "date-fns"
import { addGuest as addGuestAction, updateGuest as updateGuestAction, initiateGuestExit, vacateGuest as vacateGuestAction, addSharedChargeToRoom } from "@/lib/slices/guestsSlice"
import { updatePg as updatePgAction } from "@/lib/slices/pgsSlice"

import { roomSchema, type RoomFormValues } from "@/lib/actions/roomActions"
import { sanitizeObjectForFirebase, calculateFirstDueDate } from "@/lib/utils"

const addGuestSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters."),
    phone: z.string().regex(/^\d{10}$/, "Please enter a valid 10-digit phone number."),
    email: z.string().email("Please enter a valid email address."),
    rentAmount: z.coerce.number().min(1, "Rent amount is required."),
    depositAmount: z.coerce.number().min(0, "Deposit amount must be 0 or more."),
    moveInDate: z.date({ required_error: "A move-in date is required."}),
    rentCycleUnit: z.enum(['minutes', 'hours', 'days', 'weeks', 'months']),
    rentCycleValue: z.coerce.number().min(1, 'Cycle value must be at least 1.'),
    kycDocument: z.any().optional()
})

const editGuestSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters."),
    phone: z.string().regex(/^\d{10}$/, "Please enter a valid 10-digit phone number."),
    email: z.string().email("Please enter a valid email address."),
    rentCycleUnit: z.enum(['minutes', 'hours', 'days', 'weeks', 'months']),
    rentCycleValue: z.coerce.number().min(1, 'Cycle value must be at least 1.'),
});


const floorSchema = z.object({ name: z.string().min(2, "Floor name must be at least 2 characters.") })
const bedSchema = z.object({ name: z.string().min(1, "Bed name/number is required.") })

const paymentSchema = z.object({
  amountPaid: z.coerce.number().min(0.01, "Payment amount must be greater than 0."),
  paymentMethod: z.enum(['cash', 'upi', 'in-app']),
});

const sharedChargeSchema = z.object({
    description: z.string().min(3, "Description is required."),
    totalAmount: z.coerce.number().min(1, "Total amount must be greater than 0.").optional(),
    unitCost: z.coerce.number().optional(),
    units: z.coerce.number().optional(),
});

interface UseDashboardProps {
  pgs: PG[];
  guests: Guest[];
}

export function useDashboard({ pgs, guests }: UseDashboardProps) {
  const dispatch = useAppDispatch();
  const { toast } = useToast()
  const { chargeTemplates } = useAppSelector(state => state.chargeTemplates);
  const { currentPlan, currentUser } = useAppSelector(state => state.user)
  const [isSavingRoom, startRoomTransition] = useTransition();
  const { showConfetti } = useConfetti();

  
  const [isAddGuestDialogOpen, setIsAddGuestDialogOpen] = useState(false);
  const [isEditGuestDialogOpen, setIsEditGuestDialogOpen] = useState(false);
  const [selectedBedForGuestAdd, setSelectedBedForGuestAdd] = useState<{ bed: Bed; room: Room; pg: PG } | null>(null);
  
  const [isFloorDialogOpen, setIsFloorDialogOpen] = useState(false);
  const [isBedDialogOpen, setIsBedDialogOpen] = useState(false);
  const [isRoomDialogOpen, setIsRoomDialogOpen] = useState(false);
  
  const [floorToEdit, setFloorToEdit] = useState<Floor | null>(null);
  const [bedToEdit, setBedToEdit] = useState<{ bed: Bed; roomId: string; floorId: string } | null>(null);
  const [roomToEdit, setRoomToEdit] = useState<Room | null>(null);
  const [guestToEdit, setGuestToEdit] = useState<Guest | null>(null);
  const [selectedPgForFloorAdd, setSelectedPgForFloorAdd] = useState<PG | null>(null);
  const [selectedLocationForRoomAdd, setSelectedLocationForRoomAdd] = useState<{ floorId: string; pgId: string; } | null>(null);
  const [selectedRoomForBedAdd, setSelectedRoomForBedAdd] = useState<{ floorId: string; roomId: string; } | null>(null);

  const [itemToDelete, setItemToDelete] = useState<{ type: 'floor' | 'room' | 'bed', ids: { pgId: string; floorId: string; roomId?: string; bedId?: string } } | null>(null)
  
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [selectedGuestForPayment, setSelectedGuestForPayment] = useState<Guest | null>(null);
  const [isReminderDialogOpen, setIsReminderDialogOpen] = useState(false);
  const [reminderMessage, setReminderMessage] = useState('');
  const [isGeneratingReminder, setIsGeneratingReminder] = useState(false);
  const [selectedGuestForReminder, setSelectedGuestForReminder] = useState<Guest | null>(null);
  const [guestToInitiateExit, setGuestToInitiateExit] = useState<Guest | null>(null);
  const [guestToExitImmediately, setGuestToExitImmediately] = useState<Guest | null>(null);
  const [isSharedChargeDialogOpen, setIsSharedChargeDialogOpen] = useState(false);
  const [roomForSharedCharge, setRoomForSharedCharge] = useState<{ room: Room, guests: Guest[] } | null>(null);


  const addGuestForm = useForm<z.infer<typeof addGuestSchema>>({
    resolver: zodResolver(addGuestSchema),
    defaultValues: { 
        name: '', phone: '', email: '', rentAmount: 0, depositAmount: 0,
        rentCycleUnit: 'months', rentCycleValue: 1,
     },
  });
  const editGuestForm = useForm<z.infer<typeof editGuestSchema>>({
    resolver: zodResolver(editGuestSchema),
  });
  const floorForm = useForm<z.infer<typeof floorSchema>>({ resolver: zodResolver(floorSchema), defaultValues: { name: '' } });
  const bedForm = useForm<z.infer<typeof bedSchema>>({ resolver: zodResolver(bedSchema), defaultValues: { name: '' } });
  const paymentForm = useForm<z.infer<typeof paymentSchema>>({
    resolver: zodResolver(paymentSchema),
    defaultValues: { paymentMethod: 'cash' }
  });
  const roomForm = useForm<RoomFormValues>({ 
    resolver: zodResolver(roomSchema),
    defaultValues: {
        amenities: [],
        rules: [],
        preferredTenants: [],
        meals: [],
        images: [],
        available: true,
        availableFrom: new Date(),
        monthlyRent: 0,
        securityDeposit: 0,
        lockInMonths: 0,
        acCharge: { included: false, charge: 0},
        maintenanceCharges: 0,
        foodIncluded: false,
        laundryServices: false,
    }
  });
  const sharedChargeForm = useForm<z.infer<typeof sharedChargeSchema>>({ resolver: zodResolver(sharedChargeSchema) });


  useEffect(() => { if (floorToEdit) floorForm.reset({ name: floorToEdit.name }); else floorForm.reset({ name: '' }); }, [floorToEdit, floorForm]);
  useEffect(() => { if (bedToEdit) bedForm.reset({ name: bedToEdit.bed.name }); else bedForm.reset({ name: '' }); }, [bedToEdit, bedForm]);
  
  useEffect(() => {
    if (guestToEdit) {
        editGuestForm.reset({
            name: guestToEdit.name,
            phone: guestToEdit.phone,
            email: guestToEdit.email,
            rentCycleUnit: guestToEdit.rentCycleUnit || 'months',
            rentCycleValue: guestToEdit.rentCycleValue || 1,
        });
    }
  }, [guestToEdit, editGuestForm]);

  useEffect(() => {
    if (selectedGuestForPayment) {
        const balanceBf = selectedGuestForPayment.balanceBroughtForward || 0;
        const currentMonthRent = selectedGuestForPayment.rentAmount;
        const chargesDue = (selectedGuestForPayment.additionalCharges || []).reduce((sum, charge) => sum + charge.amount, 0);
        
        const total = balanceBf + currentMonthRent + chargesDue - (selectedGuestForPayment.rentPaidAmount || 0);
        paymentForm.reset({ paymentMethod: 'cash', amountPaid: total > 0 ? Number(total.toFixed(2)) : 0 });
    }
  }, [selectedGuestForPayment, paymentForm]);

  const handleOpenAddGuestDialog = (bed: Bed, room: Room, pg: PG) => {
    setSelectedBedForGuestAdd({ bed, room, pg });
    addGuestForm.reset({
      name: '',
      phone: '',
      email: '',
      rentAmount: room.rent,
      depositAmount: room.deposit,
      moveInDate: new Date(),
      rentCycleUnit: 'months',
      rentCycleValue: 1,
    });
    setIsAddGuestDialogOpen(true);
  };
  
  const handleOpenEditGuestDialog = (guest: Guest) => {
    setGuestToEdit(guest);
    setIsEditGuestDialogOpen(true);
  };

  const handleAddGuestSubmit = (values: z.infer<typeof addGuestSchema>) => {
    if (!selectedBedForGuestAdd) return;

    const { pg, bed } = selectedBedForGuestAdd;
    const moveInDate = new Date(values.moveInDate);
    const firstDueDate = calculateFirstDueDate(moveInDate, values.rentCycleUnit, values.rentCycleValue, moveInDate.getDate());

    const initialRentEntry: LedgerEntry = {
        id: `rent-${Date.now()}`,
        date: moveInDate.toISOString(),
        type: 'debit',
        description: `First Rent Cycle`,
        amount: values.rentAmount,
    };
    
    const guestData: Omit<Guest, 'id'> = {
      name: values.name,
      phone: values.phone,
      email: values.email,
      pgId: pg.id,
      pgName: pg.name,
      bedId: bed.id,
      rentStatus: 'unpaid',
      rentPaidAmount: 0,
      dueDate: firstDueDate.toISOString(),
      rentAmount: values.rentAmount,
      depositAmount: values.depositAmount,
      kycStatus: 'not-started',
      moveInDate: moveInDate.toISOString(),
      noticePeriodDays: 30,
      rentCycleUnit: values.rentCycleUnit,
      rentCycleValue: values.rentCycleValue,
      billingAnchorDay: moveInDate.getDate(),
      isVacated: false,
      ledger: [initialRentEntry],
    };
    
    dispatch(addGuestAction(guestData));
    setIsAddGuestDialogOpen(false);
    showConfetti({ particleCount: 150, spread: 80 });
  };

  const handleEditGuestSubmit = (values: z.infer<typeof editGuestSchema>) => {
    if (!guestToEdit) return;
    const updatedGuest = { ...guestToEdit, ...values };
    dispatch(updateGuestAction({ updatedGuest }));
    setIsEditGuestDialogOpen(false);
  };
  
  const handleOpenPaymentDialog = (guest: Guest) => {
    setSelectedGuestForPayment(guest);
    setIsPaymentDialogOpen(true);
  };

  const handlePaymentSubmit = (values: z.infer<typeof paymentSchema>) => {
      if (!selectedGuestForPayment) return;
      
      const guest = selectedGuestForPayment;
      
      const newPayment: Payment = {
          id: `pay-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          date: new Date().toISOString(),
          amount: values.amountPaid,
          method: values.paymentMethod,
          forMonth: format(new Date(guest.dueDate), 'MMMM yyyy'),
      };

      const ledgerEntry: LedgerEntry = {
          id: `credit-${newPayment.id}`,
          date: newPayment.date,
          type: 'credit',
          description: `Rent payment via ${values.paymentMethod}`,
          amount: values.amountPaid
      };

      const updatedGuest = produce(guest, draft => {
          if (!draft.ledger) draft.ledger = [];
          if (!draft.paymentHistory) draft.paymentHistory = [];
          
          draft.ledger.push(ledgerEntry);
          draft.paymentHistory.push(newPayment);

          const totalDebits = draft.ledger.filter(e => e.type === 'debit').reduce((sum, e) => sum + e.amount, 0);
          const totalCredits = draft.ledger.filter(e => e.type === 'credit').reduce((sum, e) => sum + e.amount, 0);
          const newBalance = totalDebits - totalCredits;
          
          if (newBalance <= 0) {
              draft.rentStatus = 'paid';
              draft.rentPaidAmount = 0; // Reset for next cycle
              // Reconciliation will add next month's rent debit and advance the due date.
              // We leave the old due date for reconciliation logic to process correctly based on payment date.
          } else {
              draft.rentStatus = 'partial';
              draft.rentPaidAmount = (draft.rentPaidAmount || 0) + values.amountPaid;
          }
      });
      
      dispatch(updateGuestAction({ updatedGuest }));
      setIsPaymentDialogOpen(false);
      setSelectedGuestForPayment(null);
  };


  const handleOpenSharedChargeDialog = (room: Room) => {
      const roomGuests = guests.filter(g => room.beds.some(b => b.id === g.bedId));
      setRoomForSharedCharge({ room, guests: roomGuests });
      setIsSharedChargeDialogOpen(true);
  };

    const handleSharedChargeSubmit = (values: z.infer<typeof sharedChargeSchema>) => {
        if (!roomForSharedCharge) return;
        const template = chargeTemplates.find(t => t.name === values.description);
        let totalAmount = values.totalAmount;
        
        if(template?.calculation === 'unit'){
            totalAmount = (values.units || 0) * (template.unitCost || 0);
        }

        if (!totalAmount || totalAmount <= 0) {
            toast({ variant: 'destructive', title: 'Invalid Amount', description: 'Total charge amount must be greater than zero.' });
            return;
        }

        dispatch(addSharedChargeToRoom({
            roomId: roomForSharedCharge.room.id,
            description: values.description,
            totalAmount: totalAmount
        }));
        
        toast({ title: 'Shared Charge Added', description: `The charge for "${values.description}" has been added to guests in room ${roomForSharedCharge.room.name}.` });
        setIsSharedChargeDialogOpen(false);
    };

  const handleConfirmInitiateExit = () => {
    if (!guestToInitiateExit) return;
    dispatch(initiateGuestExit(guestToInitiateExit.id));
    setGuestToInitiateExit(null);
  };
  
  const handleConfirmImmediateExit = () => {
    if (!guestToExitImmediately) return;
    dispatch(vacateGuestAction(guestToExitImmediately.id));
    setGuestToExitImmediately(null);
  };

  const handleOpenReminderDialog = async (guest: Guest) => {
    if (!guest || !currentUser) {
        setReminderMessage("Cannot generate reminder: guest or user data is missing.");
        setIsReminderDialogOpen(true);
        return;
    };
    setSelectedGuestForReminder(guest);
    setIsGeneratingReminder(true);
    setIsReminderDialogOpen(true);
    setReminderMessage("Generating payment link...");

    const balanceBf = guest.balanceBroughtForward || 0;
    const currentMonthRent = guest.rentAmount;
    const chargesDue = (guest.additionalCharges || []).reduce((sum, charge) => sum + charge.amount, 0);
    const totalDue = balanceBf + currentMonthRent + chargesDue - (guest.rentPaidAmount || 0);

    try {
        const response = await fetch('/api/generate-payment-link', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ guestId: guest.id, ownerId: currentUser.id }),
        });

        const result = await response.json();

        if (!result.success) {
            throw new Error(result.error || 'Failed to generate token.');
        }

        const paymentLink = `${window.location.origin}/pay/${result.token}`;

        const message = `Hi ${guest.name}, this is a friendly reminder for your rent payment for ${guest.pgName}.

Total Amount Due: ₹${totalDue.toLocaleString('en-IN')}
Due Date: ${format(new Date(guest.dueDate), "do MMMM yyyy")}

You can pay securely by clicking the link below:
${paymentLink}

Thank you!`;
        setReminderMessage(message);

    } catch (error: any) {
        console.error("Payment link generation error:", error);
        setReminderMessage("Could not generate a secure payment link. Please check server configuration and try again.");
    } finally {
        setIsGeneratingReminder(false);
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
    showConfetti({ particleCount: 50, spread: 60, startVelocity: 20 });
  };
  
  const processRoomSubmit = (values: RoomFormValues) => {
    startRoomTransition(async () => {
        const pgId = roomToEdit ? roomToEdit.pgId : selectedLocationForRoomAdd?.pgId;
        const floorId = roomToEdit ? roomToEdit.floorId : selectedLocationForRoomAdd?.floorId;
        if(!pgId || !floorId) return;
        
        const pg = getPgById(pgId);
        if(!pg) return;

        const nextState = produce(pg, draft => {
            const floor = draft.floors?.find(f => f.id === floorId);
            if (!floor) return;

            const cleanValues = sanitizeObjectForFirebase(values);

            if (roomToEdit) {
                const roomIndex = floor.rooms.findIndex(r => r.id === roomToEdit.id);
                if (roomIndex !== -1) {
                    floor.rooms[roomIndex] = { 
                      ...floor.rooms[roomIndex], 
                      ...cleanValues, 
                      rent: values.monthlyRent || 0, 
                      deposit: values.securityDeposit || 0, 
                      name: values.roomTitle
                    };
                }
            } else {
                const newRoom: Room = { 
                  id: `room-${Date.now()}`, 
                  ...cleanValues, 
                  pgId, 
                  floorId, 
                  beds: [], 
                  rent: values.monthlyRent || 0, 
                  deposit: values.securityDeposit || 0, 
                  name: values.roomTitle
                };
                floor.rooms.push(newRoom);
            }
        });
        await dispatch(updatePgAction(nextState)).unwrap();
        toast({ title: roomToEdit ? 'Room Updated' : 'Room Added', description: `The room has been successfully ${roomToEdit ? 'updated' : 'added'}.`})
        setIsRoomDialogOpen(false);
        showConfetti({ particleCount: 100, spread: 70 });
    });
  }
  const handleRoomSubmit = roomForm.handleSubmit(processRoomSubmit);

  const handleBedSubmit = (values: z.infer<typeof bedSchema>) => {
    const floorId = bedToEdit?.floorId || selectedRoomForBedAdd?.floorId;
    const roomId = bedToEdit?.roomId || selectedRoomForBedAdd?.roomId;
    const pg = pgs.find(p => p.floors?.some(f => f.id === floorId));
    if (!floorId || !roomId || !pg) return;
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
    showConfetti({ particleCount: 30, spread: 50, startVelocity: 10, decay: 0.9 });
  };

  const handleDelete = (type: 'floor' | 'room' | 'bed', ids: { pgId: string; floorId: string; roomId?: string; bedId?: string }) => {
    const pg = getPgById(ids.pgId);
    if (!pg) return;

    // This helper function checks if any bed has an *active* guest.
    const hasActiveGuests = (beds: Bed[]): boolean => {
        return beds.some(bed => {
            if (!bed.guestId) return false;
            const guest = guests.find(g => g.id === bed.guestId);
            // An active guest is one who exists and is NOT marked as vacated.
            return guest && !guest.isVacated;
        });
    }
    
    const nextState = produce(pg, draft => {
        const floorIndex = draft.floors?.findIndex(f => f.id === ids.floorId);
        if (floorIndex === undefined || floorIndex === -1 || !draft.floors) return;
        
        const floor = draft.floors[floorIndex];
        if (type === 'floor') {
            const allBedsInFloor = floor.rooms.flatMap(r => r.beds);
            if (hasActiveGuests(allBedsInFloor)) {
                toast({ variant: 'destructive', title: "Cannot Delete", description: "This floor has active guests. Please vacate all guests first." });
                return;
            }
            draft.totalBeds -= allBedsInFloor.length;
            draft.floors.splice(floorIndex, 1);
        } else if (type === 'room' && ids.roomId) {
            const roomIndex = floor.rooms.findIndex(r => r.id === ids.roomId);
            if (roomIndex === -1) return;
            const roomToDelete = floor.rooms[roomIndex];
            if (hasActiveGuests(roomToDelete.beds)) {
                 toast({ variant: 'destructive', title: "Cannot Delete", description: "This room has active guests. Please vacate all guests first." });
                return;
            }
            draft.totalBeds -= roomToDelete.beds.length;
            floor.rooms.splice(roomIndex, 1);
        } else if (type === 'bed' && ids.roomId && ids.bedId) {
            const room = floor.rooms.find(r => r.id === ids.roomId);
            if (!room) return;
            const bedIndex = room.beds.findIndex(b => b.id === ids.bedId);
            if (bedIndex === -1) return;
            const bedToDelete = room.beds[bedIndex];
             if (hasActiveGuests([bedToDelete])) {
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
  
  const handleOpenRoomDialog = (room: Room | null, floorId?: string, pgId?: string) => {
      setRoomToEdit(room);
      if(!room && floorId && pgId) {
          setSelectedLocationForRoomAdd({ floorId, pgId });
      }
      setIsRoomDialogOpen(true);
  }
  
  const openAddFloorDialog = (pg: PG) => {
    if (currentPlan && (currentPlan.floorLimit === 'unlimited' || (pg.floors?.length || 0) < currentPlan.floorLimit)) {
        handleOpenFloorDialog(null, pg);
    } else {
        toast({ variant: 'destructive', title: 'Floor Limit Reached', description: 'Please upgrade your plan to add more floors.'});
    }
  };

  const handleOpenFloorDialog = (floor: Floor | null, pg?: PG) => { 
      setFloorToEdit(floor); 
      if (!floor && pg) setSelectedPgForFloorAdd(pg); 
      setIsFloorDialogOpen(true); 
  };
  
  const openEditFloorDialog = (floor: Floor) => handleOpenFloorDialog(floor);
  
  const handleOpenBedDialog = (bed: Bed | null, roomId: string, floorId: string) => {
    setBedToEdit(bed ? {bed, roomId, floorId} : null); 
    if(!bed) setSelectedRoomForBedAdd({floorId, roomId});
    setIsBedDialogOpen(true); 
  };
  
  return {
    isAddGuestDialogOpen, setIsAddGuestDialogOpen,
    isEditGuestDialogOpen, setIsEditGuestDialogOpen,
    isRoomDialogOpen, setIsRoomDialogOpen,
    isFloorDialogOpen, setIsFloorDialogOpen,
    isBedDialogOpen, setIsBedDialogOpen,
    isPaymentDialogOpen, setIsPaymentDialogOpen,
    isReminderDialogOpen, setIsReminderDialogOpen,
    isSharedChargeDialogOpen, setIsSharedChargeDialogOpen,
    selectedBedForGuestAdd,
    floorToEdit, bedToEdit, roomToEdit, guestToEdit,
    selectedGuestForPayment, selectedGuestForReminder,
    roomForSharedCharge,
    reminderMessage, isGeneratingReminder,
    itemToDelete, setItemToDelete,
    guestToInitiateExit, setGuestToInitiateExit,
    handleConfirmInitiateExit,
    guestToExitImmediately, setGuestToExitImmediately,
    handleConfirmImmediateExit,
    addGuestForm,
    editGuestForm,
    roomForm, floorForm, bedForm, paymentForm, sharedChargeForm,
    handleOpenAddGuestDialog, handleAddGuestSubmit,
    handleOpenEditGuestDialog, handleEditGuestSubmit,
    handleOpenPaymentDialog, handlePaymentSubmit,
    handleOpenSharedChargeDialog, handleSharedChargeSubmit,
    handleOpenReminderDialog,
    handleRoomSubmit, handleFloorSubmit, handleBedSubmit,
    handleOpenRoomDialog, openAddFloorDialog, openEditFloorDialog, handleOpenBedDialog,
    handleDelete,
    handleOpenFloorDialog,
    isSavingRoom,
    setReminderMessage,
  }
}

export type UseDashboardReturn = ReturnType<typeof useDashboard>;

  

    

    

    
