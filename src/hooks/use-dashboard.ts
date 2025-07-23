

import { useState, useEffect, useMemo, useTransition } from "react"
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { produce } from 'immer'

import { useAppDispatch, useAppSelector } from "@/lib/hooks"
import { useToast } from '@/hooks/use-toast'
import { generateRentReminder, type GenerateRentReminderInput } from '@/ai/flows/generate-rent-reminder'

import type { Guest, Bed, Room, PG, Floor, Payment } from "@/lib/types"
import { format, addMonths, parseISO } from "date-fns"
import { addGuest as addGuestAction, updateGuest as updateGuestAction, initiateGuestExit, vacateGuest as vacateGuestAction, addSharedChargeToRoom } from "@/lib/slices/guestsSlice"
import { updatePg as updatePgAction } from "@/lib/slices/pgsSlice"

import { roomSchema } from "@/lib/actions/roomActions"

const addGuestSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters."),
    phone: z.string().regex(/^\d{10}$/, "Please enter a valid 10-digit phone number."),
    email: z.string().email("Please enter a valid email address."),
    rentAmount: z.coerce.number().min(1, "Rent amount is required."),
    depositAmount: z.coerce.number().min(0, "Deposit amount must be 0 or more."),
    moveInDate: z.date({ required_error: "A move-in date is required."}),
    kycDocument: z.any().optional()
})

const editGuestSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters."),
    phone: z.string().regex(/^\d{10}$/, "Please enter a valid 10-digit phone number."),
    email: z.string().email("Please enter a valid email address."),
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
  const { currentPlan } = useAppSelector(state => state.user)
  const [isSavingRoom, startRoomTransition] = useTransition();

  
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
  const [roomForSharedCharge, setRoomForSharedCharge] = useState<Room | null>(null);


  const addGuestForm = useForm<z.infer<typeof addGuestSchema>>({
    resolver: zodResolver(addGuestSchema),
    defaultValues: { name: '', phone: '', email: '', rentAmount: 0, depositAmount: 0 },
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
  const roomForm = useForm<z.infer<typeof roomSchema>>({ resolver: zodResolver(roomSchema) });
  const sharedChargeForm = useForm<z.infer<typeof sharedChargeSchema>>({ resolver: zodResolver(sharedChargeSchema) });


  useEffect(() => { if (floorToEdit) floorForm.reset({ name: floorToEdit.name }); else floorForm.reset({ name: '' }); }, [floorToEdit, floorForm]);
  useEffect(() => { if (bedToEdit) bedForm.reset({ name: bedToEdit.bed.name }); else bedForm.reset({ name: '' }); }, [bedToEdit, bedForm]);
  useEffect(() => { 
    if(roomToEdit) roomForm.reset(roomToEdit);
    else roomForm.reset({ rent: 0, deposit: 0, amenities: [], beds: [] });
  }, [roomToEdit, roomForm]);

  useEffect(() => {
    if (guestToEdit) {
        editGuestForm.reset({
            name: guestToEdit.name,
            phone: guestToEdit.phone,
            email: guestToEdit.email,
        });
    }
  }, [guestToEdit, editGuestForm]);

  useEffect(() => {
    if (selectedGuestForPayment) {
        const baseDue = selectedGuestForPayment.rentAmount - (selectedGuestForPayment.rentPaidAmount || 0);
        const chargesDue = (selectedGuestForPayment.additionalCharges || []).reduce((sum, charge) => sum + charge.amount, 0);
        const totalDue = baseDue + chargesDue;
        paymentForm.reset({ paymentMethod: 'cash', amountPaid: totalDue > 0 ? Number(totalDue.toFixed(2)) : 0 });
    }
  }, [selectedGuestForPayment, paymentForm]);

  const handleOpenAddGuestDialog = (bed: Bed, room: Room, pg: PG) => {
    setSelectedBedForGuestAdd({ bed, room, pg });
    addGuestForm.reset({ rentAmount: room.rent, depositAmount: room.deposit });
    setIsAddGuestDialogOpen(true);
  };
  
  const handleOpenEditGuestDialog = (guest: Guest) => {
    setGuestToEdit(guest);
    setIsEditGuestDialogOpen(true);
  };

  const handleAddGuestSubmit = async (values: z.infer<typeof addGuestSchema>) => {
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
    
    try {
        await dispatch(addGuestAction(guestData)).unwrap();
        setIsAddGuestDialogOpen(false);
    } catch (error: any) {
        toast({
            variant: "destructive",
            title: "Could not add guest",
            description: error || "An unexpected error occurred."
        })
    }
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
    const paymentRecord: Payment = {
        id: `pay-${Date.now()}`,
        date: new Date().toISOString(),
        amount: values.amountPaid,
        method: values.paymentMethod,
        forMonth: format(parseISO(guest.dueDate), 'MMMM yyyy'),
    };

    const updatedGuest = produce(guest, draft => {
        let amountPaid = values.amountPaid;

        if (!draft.paymentHistory) draft.paymentHistory = [];
        draft.paymentHistory.push(paymentRecord);
        
        let mutableCharges = JSON.parse(JSON.stringify(draft.additionalCharges || []));
        
        for (const charge of mutableCharges) {
            if (amountPaid <= 0) break;
            const amountToClear = Math.min(amountPaid, charge.amount);
            charge.amount -= amountToClear;
            amountPaid -= amountToClear;
        }
        draft.additionalCharges = mutableCharges.filter(c => c.amount > 0);

        draft.rentPaidAmount = (draft.rentPaidAmount || 0) + amountPaid;
        
        const totalDueAfterPayment = draft.rentAmount - (draft.rentPaidAmount || 0) + (draft.additionalCharges?.reduce((sum, c) => sum + c.amount, 0) || 0);

        if (totalDueAfterPayment <= 0) {
            draft.rentStatus = 'paid';
            draft.balanceBroughtForward = (draft.balanceBroughtForward || 0) + Math.abs(totalDueAfterPayment);
            draft.rentPaidAmount = 0;
            draft.additionalCharges = [];
            draft.dueDate = format(addMonths(new Date(draft.dueDate), 1), 'yyyy-MM-dd');
        } else {
            draft.rentStatus = 'partial';
        }
    });
    
    dispatch(updateGuestAction({ updatedGuest }));
    setIsPaymentDialogOpen(false);
    setSelectedGuestForPayment(null);
  };

  const handleOpenSharedChargeDialog = (room: Room) => {
      setRoomForSharedCharge(room);
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
            roomId: roomForSharedCharge.id,
            description: values.description,
            totalAmount: totalAmount
        }));
        
        toast({ title: 'Shared Charge Added', description: `The charge for "${values.description}" has been added to guests in room ${roomForSharedCharge.name}.` });
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
  const getFloorById = (pgId: string, floorId: string) => getPgById(pgId)?.floors?.find(f => f.id === floorId);

  const handleFloorSubmit = (values: z.infer<typeof floorSchema>>) => {
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
  };
  
  const processRoomSubmit = (values: z.infer<typeof roomSchema>>) => {
    startRoomTransition(async () => {
        const pgId = roomToEdit ? roomToEdit.pgId : selectedLocationForRoomAdd?.pgId;
        const floorId = roomToEdit ? roomToEdit.floorId : selectedLocationForRoomAdd?.floorId;
        if(!pgId || !floorId) return;
        
        const pg = getPgById(pgId);
        if(!pg) return;

        const nextState = produce(pg, draft => {
            const floor = draft.floors?.find(f => f.id === floorId);
            if (!floor) return;
            if (roomToEdit) {
                const roomIndex = floor.rooms.findIndex(r => r.id === roomToEdit.id);
                if (roomIndex !== -1) floor.rooms[roomIndex] = { ...floor.rooms[roomIndex], ...values, rent: values.monthlyRent, deposit: values.securityDeposit, name: values.roomTitle };
            } else {
                const newRoom = { id: `room-${Date.now()}`, ...values, pgId: pg.id, floorId, beds: [], rent: values.monthlyRent, deposit: values.securityDeposit, name: values.roomTitle };
                floor.rooms.push(newRoom);
            }
        });
        await dispatch(updatePgAction(nextState)).unwrap();
        toast({ title: roomToEdit ? 'Room Updated' : 'Room Added', description: `The room has been successfully ${roomToEdit ? 'updated' : 'added'}.`})
        setIsRoomDialogOpen(false);
    });
  }
  const handleRoomSubmit = roomForm.handleSubmit(processRoomSubmit);

  const handleBedSubmit = (values: z.infer<typeof bedSchema>>) => {
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
  };

  const handleDelete = (type: 'floor' | 'room' | 'bed', ids: { pgId: string; floorId: string; roomId?: string; bedId?: string }) => {
    const pg = getPgById(ids.pgId);
    if (!pg) return;

    const hasGuests = (beds: Bed[]): boolean => {
        return beds.some(bed => guests.some(g => g.id === bed.guestId && !g.exitDate));
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
    addGuestForm, editGuestForm, roomForm, floorForm, bedForm, paymentForm, sharedChargeForm,
    handleOpenAddGuestDialog, handleAddGuestSubmit,
    handleOpenEditGuestDialog, handleEditGuestSubmit,
    handleOpenPaymentDialog, handlePaymentSubmit,
    handleOpenSharedChargeDialog, handleSharedChargeSubmit,
    handleOpenReminderDialog,
    handleRoomSubmit, handleFloorSubmit, handleBedSubmit,
    handleOpenRoomDialog, openAddFloorDialog, openEditFloorDialog, handleOpenBedDialog,
    handleDelete,
    isSavingRoom
  }
}

export type UseDashboardReturn = ReturnType<typeof useDashboard>;
