

'use client';

import { useState, useEffect, useMemo, useTransition } from "react"
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { produce } from 'immer'

import { useAppDispatch, useAppSelector } from "@/lib/hooks"
import { useChargeTemplatesStore } from "@/lib/stores/configStores"
import { usePermissionsStore } from "@/lib/stores/configStores"
import { useToast } from '@/hooks/use-toast'
import { useConfetti } from "@/context/confetti-provider"

import type { Guest, Bed, Room, PG, Floor, AdditionalCharge, Payment, RentCycleUnit, LedgerEntry } from "@/lib/types"
import { format, addMonths, addDays, addHours, addMinutes, addWeeks } from "date-fns"
import {
  useGetGuestsQuery,
  useGetPropertiesQuery,
  useUpdateGuestMutation,
  useAddGuestMutation,
  useInitiateGuestExitMutation,
  useVacateGuestMutation,
  useAddSharedRoomChargeMutation,
  useRecordGuestPaymentMutation,
  useUpdatePropertyMutation
} from "@/lib/api/apiSlice"
import { roomSchema, type RoomFormValues } from "@/lib/actions/roomActions"
import { sanitizeObjectForFirebase } from "@/lib/utils"

const addGuestSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  phone: z.string().regex(/^\d{10}$/, "Please enter a valid 10-digit phone number."),
  email: z.string().email("Please enter a valid email address.").optional().or(z.literal('')),
  rentAmount: z.coerce.number().min(1, "Rent amount is required."),
  depositAmount: z.coerce.number().min(0, "Deposit amount must be 0 or more."),
  moveInDate: z.date({ required_error: "A move-in date is required." }),
  rentCycleUnit: z.enum(['minutes', 'hours', 'days', 'weeks', 'months']),
  rentCycleValue: z.coerce.number().min(1, 'Cycle value must be at least 1.'),
  kycDocument: z.any().optional()
})

const editGuestSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  phone: z.string().regex(/^\d{10}$/, "Please enter a valid 10-digit phone number."),
  email: z.string().email("Please enter a valid email address.").optional().or(z.literal('')),
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

const bulkRoomSchema = z.object({
  floorId: z.string().min(1, "Please select a floor"),
  startNumber: z.coerce.number().min(1, "Start number is required"),
  endNumber: z.coerce.number().min(1, "End number is required"),
  bedsPerRoom: z.coerce.number().min(1, "At least 1 bed per room").max(10),
  roomPrefix: z.string().optional().default(""),
  rent: z.coerce.number().min(0).optional().default(0),
  deposit: z.coerce.number().min(0).optional().default(0),
});

const bulkBedSchema = z.object({
  roomId: z.string().min(1, "Please select a room"),
  count: z.coerce.number().min(1, "At least 1 bed").max(20),
  bedPrefix: z.string().optional().default("B"),
});

export function useDashboard(pgId?: string) {
  const dispatch = useAppDispatch();
  const { toast } = useToast()

  const { pgs } = useAppSelector((state) => state.pgs);
  const { featurePermissions } = usePermissionsStore();
  const { currentPlan, currentUser } = useAppSelector(state => state.user)
  const [isTransitioningRoom, startRoomTransition] = useTransition();
  const { showConfetti } = useConfetti();
  const { isLoading: isLoadingGuests } = useGetGuestsQuery(undefined);
  const { guests } = useAppSelector(state => state.guests);

  // RTK Query Mutations
  const [addGuest, { isLoading: isAddingGuest }] = useAddGuestMutation();
  const [updateGuest, { isLoading: isUpdatingGuest }] = useUpdateGuestMutation();
  const [initiateExit, { isLoading: isInitiatingExit }] = useInitiateGuestExitMutation();
  const [vacateGuest, { isLoading: isVacatingGuest }] = useVacateGuestMutation();
  const [addSharedCharge, { isLoading: isAddingSharedCharge }] = useAddSharedRoomChargeMutation();
  const [recordPayment, { isLoading: isRecordingPayment }] = useRecordGuestPaymentMutation();
  const [updateProperty, { isLoading: isUpdatingProperty }] = useUpdatePropertyMutation();
  const [saveRoom, { isLoading: isSavingRoom }] = useUpdatePropertyMutation();


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

  const [isBulkAddDialogOpen, setIsBulkAddDialogOpen] = useState(false);
  const [bulkAddType, setBulkAddType] = useState<'rooms' | 'beds'>('rooms');

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
      roomType: 'double',
      gender: 'unisex',
      category: 'standard',
      lockInMonths: 0,
      acCharge: { included: false, charge: 0 },
      maintenanceCharges: 0,
      foodIncluded: false,
      laundryServices: false,
    }
  });
  const bulkRoomForm = useForm<z.infer<typeof bulkRoomSchema>>({
    resolver: zodResolver(bulkRoomSchema),
    defaultValues: { bedsPerRoom: 2, roomPrefix: '', rent: 0, deposit: 0 }
  });
  const bulkBedForm = useForm<z.infer<typeof bulkBedSchema>>({
    resolver: zodResolver(bulkBedSchema),
    defaultValues: { count: 1, bedPrefix: 'B' }
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
      const totalDue = (selectedGuestForPayment.ledger || []).reduce((acc, entry) => acc + (entry.type === 'debit' ? entry.amount : -entry.amount), 0);
      paymentForm.reset({ paymentMethod: 'cash', amountPaid: totalDue > 0 ? Number(totalDue.toFixed(2)) : 0 });
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

  const handleOpenPaymentDialog = (guest: Guest) => {
    setSelectedGuestForPayment(guest);
    setIsPaymentDialogOpen(true);
  };

  const handleOpenSharedChargeDialog = (room: Room, guestsInRoom: Guest[]) => {
    setRoomForSharedCharge({ room, guests: guestsInRoom });
    setIsSharedChargeDialogOpen(true);
    sharedChargeForm.reset({ description: '', totalAmount: 0 });
  };

  const handleAddGuestSubmit = async (values: z.infer<typeof addGuestSchema>) => {
    if (!selectedBedForGuestAdd || !currentUser) return;

    const { pg, bed } = selectedBedForGuestAdd;
    const ownerId = currentUser.role === 'owner' ? currentUser.id : currentUser.ownerId;
    if (!ownerId) return;

    try {
      const result = await addGuest({
        name: values.name,
        phone: values.phone,
        email: values.email || '',
        pgId: pg.id,
        pgName: pg.name,
        bedId: bed.id,
        rentAmount: values.rentAmount,
        depositAmount: values.depositAmount,
        joinDate: values.moveInDate.toISOString(),
        rentCycleUnit: values.rentCycleUnit,
        rentCycleValue: values.rentCycleValue,
      }).unwrap();

      if (result.success) {
        toast({ title: 'Success!', description: `${values.name} has been successfully added.` });
        setIsAddGuestDialogOpen(false);
        showConfetti({ particleCount: 150, spread: 80 });
      }
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err.data?.error || 'Failed to add guest.' });
    }
  };

  const handleEditGuestSubmit = async (values: z.infer<typeof editGuestSchema>) => {
    if (!guestToEdit || !currentUser) return;
    const ownerId = currentUser.role === 'owner' ? currentUser.id : currentUser.ownerId;
    if (!ownerId) return;

    try {
      await updateGuest({
        guestId: guestToEdit.id,
        updates: values,
      }).unwrap();
      setIsEditGuestDialogOpen(false);
      toast({ title: 'Guest Updated' });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err.data?.error || 'Failed to update guest.' });
    }
  };

  const handlePaymentSubmit = async (values: z.infer<typeof paymentSchema>) => {
    if (!selectedGuestForPayment || !currentUser) return;
    const ownerId = currentUser.role === 'owner' ? currentUser.id : currentUser.ownerId;
    if (!ownerId) return;

    try {
      await recordPayment({
        guest: selectedGuestForPayment,
        amount: values.amountPaid,
        method: values.paymentMethod,
      }).unwrap();

      toast({ title: "Payment Recorded" });
      setIsPaymentDialogOpen(false);
      setSelectedGuestForPayment(null);
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err.data?.error || 'Failed to record payment.' });
    }
  };

  const handleSharedChargeSubmit = async (values: z.infer<typeof sharedChargeSchema>) => {
    if (!roomForSharedCharge || !currentUser) return;
    const ownerId = currentUser.role === 'owner' ? currentUser.id : currentUser.ownerId;
    if (!ownerId) return;

    const { description, totalAmount, units, unitCost } = values;
    let finalAmount = totalAmount;

    if (typeof units === 'number' && typeof unitCost === 'number') {
      finalAmount = units * unitCost;
    }

    if (!finalAmount || finalAmount <= 0) {
      toast({ variant: 'destructive', title: 'Invalid Amount', description: 'Calculated charge amount must be greater than zero.' });
      return;
    }

    try {
      await addSharedCharge({
        roomId: roomForSharedCharge.room.id,
        description,
        amount: finalAmount,
      }).unwrap();

      toast({ title: 'Shared Charge Added', description: `Added to guests in room ${roomForSharedCharge.room.name}.` });
      setIsSharedChargeDialogOpen(false);
      sharedChargeForm.reset();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err.data?.error || 'Failed to add shared charge.' });
    }
  };

  const handleConfirmInitiateExit = async () => {
    if (!guestToInitiateExit || !currentUser) return;
    const ownerId = currentUser.role === 'owner' ? currentUser.id : currentUser.ownerId;
    if (!ownerId) return;

    try {
      await initiateExit({
        guestId: guestToInitiateExit.id,
      }).unwrap();
      setGuestToInitiateExit(null);
      toast({ title: 'Exit Initiated' });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err.data?.error || 'Failed to initiate exit.' });
    }
  };

  const handleConfirmImmediateExit = async (sendWhatsApp: boolean = false) => {
    if (!guestToExitImmediately || !currentUser) return;
    const ownerId = currentUser.role === 'owner' ? currentUser.id : currentUser.ownerId;
    if (!ownerId) return;

    try {
      await vacateGuest({
        guestId: guestToExitImmediately.id,
        sendWhatsApp
      }).unwrap();
      setGuestToExitImmediately(null);
      toast({ title: 'Guest Vacated' });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err.data?.error || 'Failed to vacate guest.' });
    }
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

    const totalDue = (guest.ledger || []).reduce((acc, entry) => acc + (entry.type === 'debit' ? entry.amount : -entry.amount), 0);

    try {
      const token = await (window as any).firebaseAuth?.currentUser?.getIdToken();
      const response = await fetch('/api/generate-payment-link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ guestId: guest.id }),
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
    if (currentUser) {
      updateProperty({
        pgId: pg.id,
        updates: nextState
      });
    }

    setIsFloorDialogOpen(false);
    showConfetti({ particleCount: 50, spread: 60, startVelocity: 20 });
  };

  const processRoomSubmit = (values: RoomFormValues) => {
    startRoomTransition(async () => {
      const pgId = roomToEdit ? roomToEdit.pgId : selectedLocationForRoomAdd?.pgId;
      const floorId = roomToEdit ? roomToEdit.floorId : selectedLocationForRoomAdd?.floorId;
      if (!pgId || !floorId) return;

      const pg = getPgById(pgId);
      if (!pg) return;

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
      if (currentUser) {
        await updateProperty({
          pgId,
          updates: nextState
        }).unwrap();
      }

      toast({ title: roomToEdit ? 'Room Updated' : 'Room Added', description: `The room has been successfully ${roomToEdit ? 'updated' : 'added'}.` })
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
    if (currentUser) {
      updateProperty({
        pgId: pg.id,
        updates: nextState
      });
    }

    setIsBedDialogOpen(false);
    showConfetti({ particleCount: 30, spread: 50, startVelocity: 10 });
  };

  const handleBulkRoomSubmit = async (values: z.infer<typeof bulkRoomSchema>, pgId: string) => {
    const pg = getPgById(pgId);
    if (!pg) return;

    const { startNumber, endNumber, floorId, bedsPerRoom, roomPrefix, rent, deposit } = values;
    if (startNumber > endNumber) {
      toast({ variant: 'destructive', title: 'Invalid Range', description: 'Start number cannot be greater than end number.' });
      return;
    }

    const nextState = produce(pg, draft => {
      const floor = draft.floors?.find(f => f.id === floorId);
      if (!floor) return;

      for (let i = startNumber; i <= endNumber; i++) {
        const roomId = `room-${Date.now()}-${i}`;
        const beds: Bed[] = [];
        for (let j = 1; j <= bedsPerRoom; j++) {
          beds.push({ id: `bed-${roomId}-${j}`, name: `${j}`, guestId: null });
        }

        floor.rooms.push({
          id: roomId,
          name: `${roomPrefix}${i}`,
          beds,
          rent: rent || 0,
          deposit: deposit || 0,
          floorId,
          pgId: pg.id,
          amenities: [],
        });
        draft.totalBeds = (draft.totalBeds || 0) + bedsPerRoom;
      }
    });

    if (currentUser) {
      await updateProperty({
        pgId: pg.id,
        updates: nextState
      }).unwrap();
    }

    setIsBulkAddDialogOpen(false);
    toast({ title: 'Success', description: `Successfully added ${endNumber - startNumber + 1} rooms.` });
    showConfetti({ particleCount: 100, spread: 70 });
  };

  const handleBulkBedSubmit = async (values: z.infer<typeof bulkBedSchema>, pgId: string, floorId: string) => {
    const pg = getPgById(pgId);
    if (!pg) return;

    const { roomId, count, bedPrefix } = values;

    const nextState = produce(pg, draft => {
      const room = draft.floors?.find(f => f.id === floorId)?.rooms.find(r => r.id === roomId);
      if (!room) return;

      const currentCount = room.beds.length;
      for (let i = 1; i <= count; i++) {
        room.beds.push({
          id: `bed-${room.id}-${Date.now()}-${i}`,
          name: `${bedPrefix}${currentCount + i}`,
          guestId: null
        });
      }
      draft.totalBeds = (draft.totalBeds || 0) + count;
    });

    if (currentUser) {
      await updateProperty({
        pgId: pg.id,
        updates: nextState
      }).unwrap();
    }

    setIsBulkAddDialogOpen(false);
    toast({ title: 'Success', description: `Successfully added ${count} beds.` });
    showConfetti({ particleCount: 50, spread: 60 });
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

    if (JSON.stringify(pg) !== JSON.stringify(nextState)) {
      if (currentUser) {
        updateProperty({
          pgId: pg.id,
          updates: nextState
        });
      }
    }
  };

  const handleOpenRoomDialog = (room: Room | null, floorId?: string, pgId?: string) => {
    setRoomToEdit(room);
    if (!room && floorId && pgId) {
      setSelectedLocationForRoomAdd({ floorId, pgId });
    }
    setIsRoomDialogOpen(true);
  }

  const openAddFloorDialog = (pg: PG) => {
    const floorLimit = currentPlan?.floorLimit || 0;
    if (currentPlan && (floorLimit === 'unlimited' || (pg.floors?.length || 0) < Number(floorLimit))) {
      handleOpenFloorDialog(null, pg);
    } else {
      toast({ variant: 'destructive', title: 'Floor Limit Reached', description: 'Please upgrade your plan to add more floors.' });
    }
  };

  const handleOpenFloorDialog = (floor: Floor | null, pg?: PG) => {
    setFloorToEdit(floor);
    if (!floor && pg) setSelectedPgForFloorAdd(pg);
    setIsFloorDialogOpen(true);
  };

  const openEditFloorDialog = (floor: Floor) => handleOpenFloorDialog(floor);

  const handleOpenBedDialog = (bed: Bed | null, roomId: string, floorId: string) => {
    setBedToEdit(bed ? { bed, roomId, floorId } : null);
    if (!bed) setSelectedRoomForBedAdd({ floorId, roomId });
    setIsBedDialogOpen(true);
  };

  const handleOpenBulkAddDialog = (type: 'rooms' | 'beds', floorId?: string, roomId?: string) => {
    setBulkAddType(type);
    if (type === 'rooms' && floorId) {
      bulkRoomForm.reset({ floorId, bedsPerRoom: 2, startNumber: 101, endNumber: 110 });
    } else if (type === 'beds' && roomId) {
      bulkBedForm.reset({ roomId, count: 1, bedPrefix: 'B' });
    }
    setIsBulkAddDialogOpen(true);
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
    isBulkAddDialogOpen, setIsBulkAddDialogOpen,
    bulkAddType,
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
    handleBulkRoomSubmit, handleBulkBedSubmit,
    handleOpenRoomDialog, openAddFloorDialog, openEditFloorDialog, handleOpenBedDialog,
    handleOpenBulkAddDialog,
    handleDelete,
    handleOpenFloorDialog,
    isSavingRoom,
    setReminderMessage,
    bulkRoomForm,
    bulkBedForm,
    isAddingGuest,
    isUpdatingGuest,
    isInitiatingExit,
    isVacatingGuest,
    isAddingSharedCharge,
    isRecordingPayment,
    isUpdatingProperty,
    isLoadingGuests,
    isSavingRoom,
  }
}

export type UseDashboardReturn = ReturnType<typeof useDashboard>;

