

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
import { useTranslation } from "@/context/language-context"

import type { Guest, Bed, Room, PG, Floor, AdditionalCharge, Payment, RentCycleUnit, LedgerEntry } from "@/lib/types"
import { format, addMonths, addDays, addHours, addMinutes, addWeeks } from "date-fns"
import { 
  setOptimisticGuest, 
  removeOptimisticGuest 
} from "@/lib/slices/guestsSlice";
import { 
  setOptimisticPg, 
  removeOptimisticPg 
} from "@/lib/slices/pgsSlice";
import {
  useGetGuestsQuery,
  useGetPropertiesQuery,
  useUpdateGuestMutation,
  useDeleteGuestMutation,
  useAddGuestMutation,
  useInitiateGuestExitMutation,
  useVacateGuestMutation,
  useAddSharedRoomChargeMutation,
  useRecordGuestPaymentMutation,
  useUpdatePropertyMutation,
  useDeletePropertyMutation,
  useTransferGuestMutation,
  useGetComplaintsQuery,
  useUpdateComplaintMutation,
} from "@/lib/api/apiSlice"
import { roomSchema, type RoomFormValues } from "@/lib/actions/roomActions"
import { sanitizeObjectForFirebase } from "@/lib/utils"
import { getBalanceBreakdown } from "@/lib/ledger-utils"
import { auth } from "@/lib/firebase"
import { getCurrentPlan } from "@/lib/utils"

const addGuestSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  phone: z.string().regex(/^\d{10}$/, "Please enter a valid 10-digit phone number."),
  email: z.string().email("Please enter a valid email address.").optional().or(z.literal('')),
  amountType: z.enum(['numeric', 'symbolic']).default('numeric'),
  rentAmount: z.coerce.number().min(0).optional().or(z.literal('')),
  depositAmount: z.coerce.number().min(0).optional().or(z.literal('')),
  symbolicRentValue: z.string().optional(),
  symbolicDepositValue: z.string().optional(),
  moveInDate: z.date({ required_error: "A move-in date is required." }),
  rentCycleUnit: z.enum(['minutes', 'hours', 'days', 'weeks', 'months']),
  rentCycleValue: z.coerce.number().min(1, 'Cycle value must be at least 1.'),
  kycDocument: z.any().optional(),
  // Used when no bed is pre-selected (opened from All Guests page)
  pgId: z.string().optional(),
  roomId: z.string().optional(),
  bedId: z.string().optional(),
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
  amountType: z.enum(['numeric', 'symbolic']).default('numeric'),
  amountPaid: z.coerce.number().min(0).optional(),
  symbolicValue: z.string().optional(),
  paymentMethod: z.enum(['cash', 'upi', 'in-app', 'direct_upi', 'gateway']),
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

export function useDashboard() {
  const dispatch = useAppDispatch();
  const { toast } = useToast()
  const { t } = useTranslation();

  const { pgs: rawPgs, optimisticPgs } = useAppSelector((state) => state.pgs);
  const { featurePermissions } = usePermissionsStore();
  const {  currentUser } = useAppSelector(state => state.user)
  const { showConfetti } = useConfetti();
  const { isLoading: isLoadingPgs, refetch: refetchPgs } = useGetPropertiesQuery(undefined);
  const { isLoading: isLoadingGuests, refetch: refetchGuests } = useGetGuestsQuery(undefined);
  const { isLoading: isLoadingComplaints } = useGetComplaintsQuery(undefined, { skip: !currentUser?.id });
  const { guests: rawGuests, optimisticGuests } = useAppSelector(state => state.guests);
  const { complaints } = useAppSelector((state) => state.complaints);
  const { isLoading: isAppLoading, initialDataLoaded, selectedPgId } = useAppSelector(state => state.app);

  const pgs = useMemo(() => {
    const merged = [...rawPgs];
    Object.values(optimisticPgs).forEach(optPg => {
      const idx = merged.findIndex(p => p.id === optPg.id);
      if (idx !== -1) merged[idx] = optPg;
      else merged.push(optPg);
    });
    return merged;
  }, [rawPgs, optimisticPgs]);

  const guests = useMemo(() => {
    const merged = [...rawGuests];
    Object.values(optimisticGuests).forEach(optGuest => {
      const idx = merged.findIndex(g => g.id === optGuest.id);
      if (idx !== -1) merged[idx] = optGuest;
      else merged.push(optGuest);
    });
    return merged;
  }, [rawGuests, optimisticGuests]);

  // RTK Query Mutations
  const [addGuest, { isLoading: isAddingGuest }] = useAddGuestMutation();
  const [updateGuest, { isLoading: isUpdatingGuest }] = useUpdateGuestMutation();
  const [deleteGuest, { isLoading: isDeletingGuest }] = useDeleteGuestMutation();
  const [initiateExit, { isLoading: isInitiatingExit }] = useInitiateGuestExitMutation();
  const [vacateGuest, { isLoading: isVacatingGuest }] = useVacateGuestMutation();
  const [addSharedCharge, { isLoading: isAddingSharedCharge }] = useAddSharedRoomChargeMutation();
  const [recordPayment, { isLoading: isRecordingPayment }] = useRecordGuestPaymentMutation();
  const [updateProperty, { isLoading: isUpdatingProperty }] = useUpdatePropertyMutation();
  const [deleteProperty, { isLoading: isDeletingProperty }] = useDeletePropertyMutation();
  const [saveRoom, { isLoading: isSavingRoom }] = useUpdatePropertyMutation();
  const [transferGuest, { isLoading: isTransferringGuest }] = useTransferGuestMutation();
  const [updateComplaint, { isLoading: isUpdatingComplaint }] = useUpdateComplaintMutation();


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
  const [selectedGuestForPaymentId, setSelectedGuestForPaymentId] = useState<string | null>(null);
  const selectedGuestForPayment = useMemo(() => {
    if (!selectedGuestForPaymentId) return null;
    return guests.find(g => g.id === selectedGuestForPaymentId) || null;
  }, [selectedGuestForPaymentId, guests]);

  const [selectedGuestForReminderId, setSelectedGuestForReminderId] = useState<string | null>(null);
  const selectedGuestForReminder = useMemo(() => {
    if (!selectedGuestForReminderId) return null;
    return guests.find(g => g.id === selectedGuestForReminderId) || null;
  }, [selectedGuestForReminderId, guests]);

  const [isReminderDialogOpen, setIsReminderDialogOpen] = useState(false);
  const [reminderMessage, setReminderMessage] = useState('');
  const [isGeneratingReminder, setIsGeneratingReminder] = useState(false);

  const [guestToInitiateExit, setGuestToInitiateExit] = useState<Guest | null>(null);
  const [guestToExitImmediately, setGuestToExitImmediately] = useState<Guest | null>(null);
  const [isSharedChargeDialogOpen, setIsSharedChargeDialogOpen] = useState(false);
  const [roomForSharedCharge, setRoomForSharedCharge] = useState<{ room: Room, guests: Guest[] } | null>(null);
  const [isTransferDialogOpen, setIsTransferDialogOpen] = useState(false);
  const [guestToTransfer, setGuestToTransfer] = useState<Guest | null>(null);


  const addGuestForm = useForm<z.infer<typeof addGuestSchema>>({
    resolver: zodResolver(addGuestSchema),
    defaultValues: {
      name: '', phone: '', email: '', amountType: 'numeric', rentAmount: 0, depositAmount: 0,
      symbolicRentValue: 'XXX', symbolicDepositValue: 'YYY',
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
    defaultValues: { amountType: 'numeric', paymentMethod: 'cash', amountPaid: 0, symbolicValue: 'XXX' }
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
      if (selectedGuestForPayment.amountType === 'symbolic') {
        paymentForm.reset({ 
          amountType: 'symbolic', 
          paymentMethod: 'cash', 
          symbolicValue: selectedGuestForPayment.symbolicRentValue || 'XXX',
          amountPaid: 0 
        });
      } else {
        const totalDue = (selectedGuestForPayment.ledger || []).reduce((acc, entry) => acc + (entry.type === 'debit' ? entry.amount : -entry.amount), 0);
        paymentForm.reset({ 
          amountType: 'numeric', 
          paymentMethod: 'cash', 
          amountPaid: totalDue > 0 ? Number(totalDue.toFixed(2)) : 0,
          symbolicValue: undefined
        });
      }
    }
  }, [selectedGuestForPayment, paymentForm]);

  const handleOpenAddGuestDialog = (bed: Bed, room: Room, pg: PG) => {
    setSelectedBedForGuestAdd({ bed, room, pg });
    addGuestForm.reset({
      name: '',
      phone: '',
      email: '',
      amountType: room.amountType || 'numeric',
      rentAmount: room.amountType === 'symbolic' ? 0 : room.rent,
      depositAmount: room.amountType === 'symbolic' ? 0 : room.deposit,
      symbolicRentValue: room.amountType === 'symbolic' ? (room.symbolicRentValue || 'XXX') : 'XXX',
      symbolicDepositValue: room.amountType === 'symbolic' ? (room.symbolicDepositValue || 'YYY') : 'YYY',
      moveInDate: new Date(),
      rentCycleUnit: 'months',
      rentCycleValue: 1,
    });
    setIsAddGuestDialogOpen(true);
  };

  const handleOpenGeneralAddGuestDialog = () => {
    setSelectedBedForGuestAdd(null);
    addGuestForm.reset({
      name: '',
      phone: '',
      email: '',
      amountType: 'numeric',
      rentAmount: 0,
      depositAmount: 0,
      symbolicRentValue: 'XXX',
      symbolicDepositValue: 'YYY',
      moveInDate: new Date(),
      rentCycleUnit: 'months',
      rentCycleValue: 1,
      pgId: '',
      roomId: '',
      bedId: '',
    });
    setIsAddGuestDialogOpen(true);
  };

  const handleOpenEditGuestDialog = (guest: Guest) => {
    setGuestToEdit(guest);
    setIsEditGuestDialogOpen(true);
  };

  const handleOpenPaymentDialog = (guest: Guest) => {
    setSelectedGuestForPaymentId(guest.id);
    setIsPaymentDialogOpen(true);
  };

  const handleOpenSharedChargeDialog = (room: Room) => {
    const guestsInRoom = guests.filter(g => g.roomId === room.id && !g.isVacated);
    setRoomForSharedCharge({ room, guests: guestsInRoom });
    setIsSharedChargeDialogOpen(true);
    sharedChargeForm.reset({ description: '', totalAmount: 0 });
  };

  const handleOpenTransferDialog = (guest: Guest) => {
    setGuestToTransfer(guest);
    setIsTransferDialogOpen(true);
  };

  const handleAddGuestSubmit = async (values: z.infer<typeof addGuestSchema>) => {
    if (!currentUser) return;

    // Resolve pg/bed from either pre-selected (from bed UI) or from form dropdowns (from All Guests page)
    let resolvedPg: PG | undefined;
    let resolvedBedId: string | undefined;

    if (selectedBedForGuestAdd) {
      resolvedPg = selectedBedForGuestAdd.pg;
      resolvedBedId = selectedBedForGuestAdd.bed.id;
    } else {
      // Opened from All Guests page — use form-selected pgId/roomId/bedId
      if (!values.pgId || !values.roomId || !values.bedId) {
        toast({ variant: 'destructive', title: 'Missing Selection', description: 'Please select a Property, Room, and Bed.' });
        return;
      }
      resolvedPg = pgs.find(p => p.id === values.pgId);
      if (!resolvedPg) { toast({ variant: 'destructive', title: 'Error', description: 'Selected property not found.' }); return; }
      resolvedBedId = values.bedId;
    }

      const ownerId = currentUser?.role === 'owner' ? currentUser.id : currentUser?.ownerId;
      if (!ownerId) return;

      // Check tenant limit
      const plan = getCurrentPlan(currentUser);
      // Use user-specific limit if set, otherwise plan limit, otherwise fallback to 10 for trial
      const tenantLimit = currentUser?.subscription?.trialTenantLimit ?? plan.tenantLimit ?? (plan.id === 'trial' ? 10 : Infinity);
      const maxTenants = tenantLimit === 'unlimited' ? Infinity : tenantLimit;
      
      const activeTenantsCount = guests.filter(g => !g.isVacated).length;
      
      // If we're at or above limit, block addition
      if (activeTenantsCount >= maxTenants) {
        toast({
          variant: 'destructive',
          title: t('limit_reached'),
          description: t('tenant_limit_reached_desc', { tenants: maxTenants })
        });
        return;
      }
  
      const tempGuestId = 'pending-' + Date.now();

      try {
        // Close immediately for perceived speed
        setIsAddGuestDialogOpen(false);
        
        // 1. Optimistic update for the PG to show bed as occupied
        const nextPgState = produce(resolvedPg, draft => {
          draft.updatedAt = new Date().toISOString();
          draft.occupancy = (draft.occupancy || 0) + 1;
          draft.floors?.forEach(f => f.rooms.forEach(r => r.beds.forEach(b => {
            if (b.id === resolvedBedId) {
              b.guestId = tempGuestId; // Use temp ID to link to optimistic guest
            }
          })));
        });
        dispatch(setOptimisticPg(nextPgState));
  
        // 2. Optimistic update for the Guest itself
        const optimisticGuest: Guest = {
          id: tempGuestId,
          name: values.name,
          phone: values.phone,
          email: values.email || '',
          pgId: resolvedPg!.id,
          pgName: resolvedPg!.name,
          bedId: resolvedBedId!,
          roomId: values.roomId || '',
          amountType: values.amountType,
          rentAmount: values.amountType === 'numeric' ? (values.rentAmount || 0) : 0,
          depositAmount: values.amountType === 'numeric' ? (values.depositAmount || 0) : 0,
          symbolicRentValue: values.amountType === 'symbolic' ? values.symbolicRentValue : undefined,
          symbolicDepositValue: values.amountType === 'symbolic' ? values.symbolicDepositValue : undefined,
          rentStatus: 'unpaid',
          dueDate: values.moveInDate.toISOString(),
          kycStatus: 'not-started',
          moveInDate: values.moveInDate.toISOString(),
          noticePeriodDays: 0,
          rentCycleUnit: values.rentCycleUnit,
          rentCycleValue: values.rentCycleValue,
          billingAnchorDay: values.moveInDate.getDate(),
          isVacated: false,
          status: 'active',
          ledger: [],
          paymentHistory: [],
          balance: 0,
          pending: true,
          updatedAt: new Date().toISOString()
        };
        dispatch(setOptimisticGuest(optimisticGuest));

        const savingToast = toast({ 
          title: 'Saving...', 
          description: `Adding ${values.name} to the property...`,
        });
  
        const result = await addGuest({
          name: values.name,
          phone: values.phone,
          email: values.email || '',
          pgId: resolvedPg!.id,
          pgName: resolvedPg!.name,
          bedId: resolvedBedId!,
          amountType: values.amountType,
          rentAmount: values.amountType === 'numeric' ? (values.rentAmount || 0) : 0,
          deposit: values.amountType === 'numeric' ? (values.depositAmount || 0) : 0,
          symbolicRentValue: values.amountType === 'symbolic' ? values.symbolicRentValue : undefined,
          symbolicDepositValue: values.amountType === 'symbolic' ? values.symbolicDepositValue : undefined,
          joinDate: values.moveInDate.toISOString(),
          rentCycleUnit: values.rentCycleUnit,
          rentCycleValue: values.rentCycleValue,
      }).unwrap();

      if (result.success) {
        savingToast.dismiss();
        
        let successDescription = `${values.name} has been successfully added.`;
        if (result.guest && (result.guest as any)._defaultPassword) {
          successDescription += `\nDefault Password: ${(result.guest as any)._defaultPassword}`;
        }

        toast({ title: 'Success!', description: successDescription });
        showConfetti({ particleCount: 150, spread: 80 });
        
        // Immediate clearing as fallback, but reconciliation should handle it faster
        dispatch(removeOptimisticPg(resolvedPg!.id));
        dispatch(removeOptimisticGuest(tempGuestId));
      }
    } catch (err: any) {
      dispatch(removeOptimisticPg(resolvedPg!.id));
      dispatch(removeOptimisticGuest(tempGuestId));
      console.error('Failed to add guest:', err);
      toast({ 
        variant: 'destructive', 
        title: 'Error Adding Guest', 
        description: err.data?.error || 'Failed to add guest. Please try again.' 
      });
    }
  };
  
  const handleDeleteGuest = async (guestId: string) => {
    if (!currentUser) return;
    const guest = guests.find(g => g.id === guestId);
    if (!guest) return;

    try {
      const guestName = guest.name;
      const pgId = guest.pgId;
      const bedId = guest.bedId;

      // 1. Optimistic removal from guests list
      dispatch(removeOptimisticGuest(guestId));

      // 2. Optimistic update for PG (clear bed)
      const pg = pgs.find(p => p.id === pgId);
      if (pg) {
        const nextPg = produce(pg, draft => {
          draft.updatedAt = new Date().toISOString();
          draft.floors?.forEach(f => f.rooms.forEach(r => r.beds.forEach(b => {
            if (b.id === bedId) b.guestId = null;
          })));
        });
        dispatch(setOptimisticPg(nextPg));
      }

      const deletingToast = toast({ title: 'Deleting...', description: `Permanently deleting ${guestName}...` });

      await deleteGuest({ guestId }).unwrap();

      deletingToast.dismiss();
      toast({ title: 'Guest Deleted', description: `${guestName} has been permanently removed.` });

      // reconciliation will handle it, but safety immediate removal
      if (pgId) dispatch(removeOptimisticPg(pgId));
    } catch (err: any) {
      console.error('Failed to delete guest:', err);
      toast({ 
        variant: 'destructive', 
        title: 'Delete Failed', 
        description: err.data?.error || 'Failed to delete guest.' 
      });
      // Note: we don't easily "restore" a deleted guest from here because we already removed it from state.
      // But on next snapshot sync, it will reappear if it still exists in DB.
    }
  };

  const handleEditGuestSubmit = async (values: z.infer<typeof editGuestSchema>) => {
    if (!guestToEdit || !currentUser) return;
    const ownerId = currentUser.role === 'owner' ? currentUser.id : currentUser.ownerId;
    if (!ownerId) return;

    try {
      setIsEditGuestDialogOpen(false);
      const optimisticGuest = { 
        ...guestToEdit, 
        ...values,
        updatedAt: new Date().toISOString()
      };
      dispatch(setOptimisticGuest(optimisticGuest));
      
      const savingToast = toast({ title: 'Saving...', description: `Updating ${guestToEdit.name}...` });
      
      await updateGuest({
        guestId: guestToEdit.id,
        updates: values,
      }).unwrap();
      
      savingToast.dismiss();
      toast({ title: 'Guest Updated' });
      // Reconciliation will handle clearing, but we add a safety immediate removal
      dispatch(removeOptimisticGuest(guestToEdit.id));
    } catch (err: any) {
      dispatch(removeOptimisticGuest(guestToEdit.id));
      console.error('Failed to update guest:', err);
      toast({ 
        variant: 'destructive', 
        title: 'Update Failed', 
        description: err.data?.error || 'Failed to update guest.' 
      });
    }
  };

  const handleTransferGuestSubmit = async (values: {
    newPgId: string;
    newBedId: string;
    newRoomId: string;
    newRoomName: string;
    newRentAmount?: number;
    newDepositAmount?: number;
    shouldProrate?: boolean;
    prorationAmount?: number;
  }) => {
    if (!guestToTransfer || !currentUser) return;
    const ownerId = currentUser.role === 'owner' ? currentUser.id : currentUser.ownerId;
    if (!ownerId) return;

    try {
      setIsTransferDialogOpen(false);
      const guestName = guestToTransfer.name;
      const oldPgId = guestToTransfer.pgId;
      const oldBedId = guestToTransfer.bedId;
      const { newPgId, newBedId } = values;

      // 1. Update guest optimistically
      const optimisticGuest = { 
        ...guestToTransfer, 
        pgId: newPgId, 
        bedId: newBedId,
        pgName: pgs.find(p => p.id === newPgId)?.name || guestToTransfer.pgName
      };
      dispatch(setOptimisticGuest(optimisticGuest));

      // 2. Update PGs optimistically
      const oldPg = pgs.find(p => p.id === oldPgId);
      const newPg = pgs.find(p => p.id === newPgId);

      if (oldPg) {
        const nextOldPg = produce(oldPg, draft => {
          draft.updatedAt = new Date().toISOString();
          draft.floors?.forEach(f => f.rooms.forEach(r => r.beds.forEach(b => {
            if (b.id === oldBedId) b.guestId = null;
          })));
        });
        dispatch(setOptimisticPg(nextOldPg));
      }

      if (newPg) {
        const nextNewPg = produce(newPg, draft => {
          draft.updatedAt = new Date().toISOString();
          draft.floors?.forEach(f => f.rooms.forEach(r => r.beds.forEach(b => {
            if (b.id === newBedId) b.guestId = guestToTransfer.id;
          })));
        });
        dispatch(setOptimisticPg(nextNewPg));
      }

      const savingToast = toast({ title: 'Transferring...', description: `Moving ${guestName}...` });

      await transferGuest({
        guestId: guestToTransfer.id,
        ...values,
      }).unwrap();

      savingToast.dismiss();
      setGuestToTransfer(null);
      toast({ title: 'Guest Transferred Successfully' });
      showConfetti({ particleCount: 100, spread: 70 });

      dispatch(removeOptimisticGuest(guestToTransfer.id));
      if (oldPgId) dispatch(removeOptimisticPg(oldPgId));
      dispatch(removeOptimisticPg(newPgId));
    } catch (err: any) {
      dispatch(removeOptimisticGuest(guestToTransfer.id));
      if (guestToTransfer.pgId) dispatch(removeOptimisticPg(guestToTransfer.pgId));
      dispatch(removeOptimisticPg(values.newPgId));
      console.error('Failed to transfer guest:', err);
      toast({ 
        variant: 'destructive', 
        title: 'Transfer Failed', 
        description: err.data?.error || 'Failed to transfer guest.' 
      });
    }
  };

  const handlePaymentSubmit = async (values: z.infer<typeof paymentSchema>) => {
    if (!selectedGuestForPayment || !currentUser) return;
    const ownerId = currentUser.role === 'owner' ? currentUser.id : currentUser.ownerId;
    if (!ownerId) return;

    try {
      setIsPaymentDialogOpen(false);
      const guestId = selectedGuestForPayment.id;
      const guestName = selectedGuestForPayment.name;

      // Optimistic update: add a ledger entry
      const newEntry: LedgerEntry = {
        id: `opt-pay-${Date.now()}`,
        type: 'credit',
        amount: values.amountType === 'numeric' ? (values.amountPaid || 0) : 0,
        description: `Payment via ${values.paymentMethod}${values.amountType === 'symbolic' ? ` (${values.symbolicValue})` : ''}`,
        date: new Date().toISOString()
      };

      const optimisticGuest = {
        ...selectedGuestForPayment,
        ledger: [...(selectedGuestForPayment.ledger || []), newEntry],
        updatedAt: new Date().toISOString()
      };
      dispatch(setOptimisticGuest(optimisticGuest));

      const savingToast = toast({ title: 'Recording Payment...', description: `Recording payment for ${guestName}...` });

      await recordPayment({
        guest: selectedGuestForPayment,
        amountType: values.amountType,
        amount: values.amountType === 'numeric' ? (values.amountPaid || 0) : 0,
        symbolicValue: values.amountType === 'symbolic' ? values.symbolicValue : undefined,
        method: values.paymentMethod,
      }).unwrap();

      savingToast.dismiss();
      toast({ title: "Payment Recorded" });
      setSelectedGuestForPaymentId(null);

      dispatch(removeOptimisticGuest(guestId));
    } catch (err: any) {
      if (selectedGuestForPayment) dispatch(removeOptimisticGuest(selectedGuestForPayment.id));
      console.error('Failed to record payment:', err);
      toast({ 
        variant: 'destructive', 
        title: 'Payment Failed', 
        description: err.data?.error || 'Failed to record payment.' 
      });
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
      setIsSharedChargeDialogOpen(false);
      const roomId = roomForSharedCharge.room.id;
      const guestIds = roomForSharedCharge.guests.map(g => g.id);

      // Optimistic update for each guest in the room
      roomForSharedCharge.guests.forEach(guest => {
        const newEntry: LedgerEntry = {
          id: `opt-charge-${Date.now()}-${guest.id}`,
          type: 'debit',
          amount: finalAmount!,
          description: description,
          date: new Date().toISOString()
        };
        const optimisticGuest = {
          ...guest,
          ledger: [...(guest.ledger || []), newEntry],
          updatedAt: new Date().toISOString()
        };
        dispatch(setOptimisticGuest(optimisticGuest));
      });

      const savingToast = toast({ title: 'Adding Charge...', description: `Adding shared charge to room ${roomForSharedCharge.room.name}...` });

      await addSharedCharge({
        roomId,
        description,
        amount: finalAmount,
      }).unwrap();

      savingToast.dismiss();
      toast({ title: 'Shared Charge Added', description: `Added to guests in room ${roomForSharedCharge.room.name}.` });
      sharedChargeForm.reset();

      guestIds.forEach(id => dispatch(removeOptimisticGuest(id)));
    } catch (err: any) {
      roomForSharedCharge.guests.forEach(g => dispatch(removeOptimisticGuest(g.id)));
      console.error('Failed to add shared charge:', err);
      toast({ variant: 'destructive', title: 'Error', description: err.data?.error || 'Failed to add shared charge.' });
    }
  };

  const handleConfirmInitiateExit = async () => {
    if (!guestToInitiateExit || !currentUser) return;
    const ownerId = currentUser.role === 'owner' ? currentUser.id : currentUser.ownerId;
    if (!ownerId) return;

    try {
      const guestId = guestToInitiateExit.id;
      const guestName = guestToInitiateExit.name;
      setGuestToInitiateExit(null);

      // Optimistic update
      const optimisticGuest = { 
        ...guestToInitiateExit, 
        exitInitiated: true,
        exitDate: new Date().toISOString(), // Fallback exit date for UI
        updatedAt: new Date().toISOString()
      };
      dispatch(setOptimisticGuest(optimisticGuest));

      const savingToast = toast({ title: 'Initiating Exit...', description: `Setting exit date for ${guestName}...` });

      await initiateExit({
        guestId,
      }).unwrap();

      savingToast.dismiss();
      toast({ title: 'Exit Initiated' });

      dispatch(removeOptimisticGuest(guestId));
    } catch (err: any) {
      if (guestToInitiateExit) dispatch(removeOptimisticGuest(guestToInitiateExit.id));
      console.error('Failed to initiate exit:', err);
      toast({ variant: 'destructive', title: 'Error', description: err.data?.error || 'Failed to initiate exit.' });
    }
  };

  const handleConfirmImmediateExit = async (sendWhatsApp: boolean = false) => {
    if (!guestToExitImmediately || !currentUser) return;
    const ownerId = currentUser.role === 'owner' ? currentUser.id : currentUser.ownerId;
    if (!ownerId) return;

    try {
      const guestName = guestToExitImmediately.name;
      const guestId = guestToExitImmediately.id;
      const pgId = guestToExitImmediately.pgId;
      const bedId = guestToExitImmediately.bedId;
      
      setGuestToExitImmediately(null);

      // 1. Update guest optimistically
      const optimisticGuest = { 
        ...guestToExitImmediately, 
        isVacated: true,
        updatedAt: new Date().toISOString()
      };
      dispatch(setOptimisticGuest(optimisticGuest));

      // 2. Update PG optimistically
      const pg = pgs.find(p => p.id === pgId);
      if (pg) {
        const nextPg = produce(pg, draft => {
          draft.updatedAt = new Date().toISOString();
          draft.floors?.forEach(f => f.rooms.forEach(r => r.beds.forEach(b => {
            if (b.id === bedId) b.guestId = null;
          })));
        });
        dispatch(setOptimisticPg(nextPg));
      }

      const savingToast = toast({ title: 'Vacating Guest...', description: `Marking ${guestName} as vacated...` });

      await vacateGuest({
        guestId,
        sendWhatsApp
      }).unwrap();

      savingToast.dismiss();
      toast({ title: 'Guest Vacated', description: `${guestName} has been marked as vacated.` });

      dispatch(removeOptimisticGuest(guestId));
      if (pgId) dispatch(removeOptimisticPg(pgId));
    } catch (err: any) {
      if (guestToExitImmediately) {
        dispatch(removeOptimisticGuest(guestToExitImmediately.id));
        if (guestToExitImmediately.pgId) dispatch(removeOptimisticPg(guestToExitImmediately.pgId));
      }
      console.error('Failed to vacate guest:', err);
      toast({ variant: 'destructive', title: 'Error', description: err.data?.error || 'Failed to vacate guest.' });
    }
  };

  const handleOpenReminderDialog = async (guest: Guest) => {
    if (!guest || !currentUser) {
      setReminderMessage("Cannot generate reminder: guest or user data is missing.");
      setIsReminderDialogOpen(true);
      return;
    };
    setSelectedGuestForReminderId(guest.id);
    setIsGeneratingReminder(true);
    setIsReminderDialogOpen(true);
    setReminderMessage("Generating payment link...");

    const breakdown = getBalanceBreakdown(guest);
    const balanceStr = breakdown.symbolic || (guest.amountType === 'symbolic' ? 'No Dues' : '₹0');

    try {
      const token = await auth?.currentUser?.getIdToken();
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

Total Amount Due: ${balanceStr}
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
      draft.updatedAt = new Date().toISOString();
    });

    if (currentUser) {
      // Optimistic update
      dispatch(setOptimisticPg(nextState));
      
      const savingToast = toast({ title: 'Saving...', description: `${floorToEdit ? 'Updating' : 'Adding'} floor...` });
      updateProperty({
        pgId: pg.id,
        updates: nextState
      }).unwrap().then(() => {
        savingToast.dismiss();
        toast({ title: floorToEdit ? 'Floor Updated' : 'Floor Added' });
        dispatch(removeOptimisticPg(pg.id));
      }).catch((err) => {
        dispatch(removeOptimisticPg(pg.id));
        savingToast.dismiss();
        toast({ variant: 'destructive', title: 'Error', description: err.data?.error || 'Failed to save floor.' });
      });
    }

    setIsFloorDialogOpen(false);
    showConfetti({ particleCount: 50, spread: 60, startVelocity: 20 });
  };

  const processRoomSubmit = async (values: RoomFormValues) => {
    const formFloorId = values.floorId;
    const pgId = roomToEdit ? roomToEdit.pgId : selectedLocationForRoomAdd?.pgId;
    const floorId = formFloorId || (roomToEdit ? roomToEdit.floorId : selectedLocationForRoomAdd?.floorId);
    if (!pgId || !floorId) {
      toast({ variant: 'destructive', title: 'Error', description: 'Floor or Property information missing.' });
      return;
    }

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
      draft.updatedAt = new Date().toISOString();
    });
    if (currentUser) {
      setIsRoomDialogOpen(false);
      // Optimistic update
      dispatch(setOptimisticPg(nextState));

      const savingToast = toast({ title: 'Saving...', description: `${roomToEdit ? 'Updating' : 'Adding'} room...` });

      try {
        await updateProperty({
          pgId,
          updates: nextState
        }).unwrap();

        savingToast.dismiss();
        toast({ title: roomToEdit ? 'Room Updated' : 'Room Added', description: `The room has been successfully ${roomToEdit ? 'updated' : 'added'}.` });
        showConfetti({ particleCount: 100, spread: 70 });
        dispatch(removeOptimisticPg(pg.id));
      } catch (err: any) {
        dispatch(removeOptimisticPg(pg.id));
        savingToast.dismiss();
        toast({ variant: 'destructive', title: 'Error', description: err.data?.error || 'Failed to save room.' });
      }
    }
  };
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
      draft.updatedAt = new Date().toISOString();
    });
    if (currentUser) {
      // Optimistic update
      dispatch(setOptimisticPg(nextState));

      const savingToast = toast({ title: 'Saving...', description: `${bedToEdit ? 'Updating' : 'Adding'} bed...` });
      updateProperty({
        pgId: pg.id,
        updates: nextState
      }).unwrap().then(() => {
        savingToast.dismiss();
        toast({ title: bedToEdit ? 'Bed Updated' : 'Bed Added' });
        dispatch(removeOptimisticPg(pg.id));
      }).catch((err) => {
        dispatch(removeOptimisticPg(pg.id));
        savingToast.dismiss();
        toast({ variant: 'destructive', title: 'Error', description: err.data?.error || 'Failed to save bed.' });
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
      draft.updatedAt = new Date().toISOString();
    });

    if (currentUser) {
      setIsBulkAddDialogOpen(false);
      // Optimistic update
      dispatch(setOptimisticPg(nextState));

      const savingToast = toast({ title: 'Creating Rooms...', description: `Adding ${endNumber - startNumber + 1} rooms to ${pg.name}...` });

      try {
        await updateProperty({
          pgId: pg.id,
          updates: nextState
        }).unwrap();

        savingToast.dismiss();
        toast({ title: 'Success', description: `Successfully added ${endNumber - startNumber + 1} rooms.` });
        showConfetti({ particleCount: 100, spread: 70 });
        dispatch(removeOptimisticPg(pg.id));
      } catch (err: any) {
        dispatch(removeOptimisticPg(pg.id));
        savingToast.dismiss();
        toast({ variant: 'destructive', title: 'Error', description: err.data?.error || 'Failed to add rooms.' });
      }
    }
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
      draft.updatedAt = new Date().toISOString();
    });

    if (currentUser) {
      setIsBulkAddDialogOpen(false);
      // Optimistic update
      dispatch(setOptimisticPg(nextState));

      const targetRoom = pg.floors?.find(f => f.id === floorId)?.rooms.find(r => r.id === roomId);
      const savingToast = toast({ title: 'Creating Beds...', description: `Adding ${count} beds to ${targetRoom?.name || 'room'}...` });

      try {
        await updateProperty({
          pgId: pg.id,
          updates: nextState
        }).unwrap();

        savingToast.dismiss();
        toast({ title: 'Success', description: `Successfully added ${count} beds.` });
        showConfetti({ particleCount: 50, spread: 60 });
        dispatch(removeOptimisticPg(pg.id));
      } catch (err: any) {
        dispatch(removeOptimisticPg(pg.id));
        savingToast.dismiss();
        toast({ variant: 'destructive', title: 'Error', description: err.data?.error || 'Failed to add beds.' });
      }
    }
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
      draft.updatedAt = new Date().toISOString();
    });

    if (JSON.stringify(pg) !== JSON.stringify(nextState)) {
      if (currentUser) {
        // Optimistic update
        dispatch(setOptimisticPg(nextState));

        const savingToast = toast({ title: 'Deleting...', description: `Removing ${type} from ${pg.name}...` });
        updateProperty({
          pgId: pg.id,
          updates: nextState
        }).unwrap().then(() => {
          savingToast.dismiss();
          toast({ title: `${type.charAt(0).toUpperCase() + type.slice(1)} Deleted` });
          dispatch(removeOptimisticPg(pg.id));
        }).catch((err) => {
          dispatch(removeOptimisticPg(pg.id));
          savingToast.dismiss();
          toast({ variant: 'destructive', title: 'Error', description: err.data?.error || `Failed to delete ${type}.` });
        });
      }
    }
  };

  const handleOpenRoomDialog = (room: Room | null, floorId?: string, pgId?: string) => {
    setRoomToEdit(room);
    if (room) {
      roomForm.reset({
        ...room,
        roomTitle: room.name,
        monthlyRent: room.rent,
        securityDeposit: room.deposit,
        floorId: room.floorId
      });
    } else if (floorId && pgId) {
      setSelectedLocationForRoomAdd({ floorId, pgId });
      roomForm.reset({
        ...roomForm.getValues(),
        floorId: floorId
      });
    }
    setIsRoomDialogOpen(true);
  }

  const openAddFloorDialog = (pg: PG) => {
    handleOpenFloorDialog(null, pg);
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
    handleOpenAddGuestDialog,
    handleOpenGeneralAddGuestDialog,
    handleAddGuestSubmit,
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
    updateProperty,
    isDeletingProperty,
    isTransferringGuest,
    isTransferDialogOpen, setIsTransferDialogOpen,
    guestToTransfer, handleOpenTransferDialog,
    handleTransferGuestSubmit,
    isUpdatingComplaint,
    pgs,
    guests,
    complaints,
    isLoadingPgs,
    isLoadingGuests,
    isLoadingComplaints,
    isAppLoading,
    initialDataLoaded,
    refetchPgs,
    refetchGuests,
    deleteProperty,
    selectedPgId,
    currentUser,
    featurePermissions
  }
}

export type UseDashboardReturn = ReturnType<typeof useDashboard>;

