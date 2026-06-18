"use client";

import { useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAppSelector } from "@/lib/hooks";
import { usePermissionsStore } from "@/lib/stores/configStores";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import RoomDialog from "@/components/dashboard/dialogs/RoomDialog";
import AddGuestDialog from "@/components/dashboard/dialogs/AddGuestDialog";
import PaymentDialog from "@/components/dashboard/dialogs/PaymentDialog";
import EditGuestDialog from "@/components/dashboard/dialogs/EditGuestDialog";
import ReminderDialog from "@/components/dashboard/dialogs/ReminderDialog";
import BulkAddDialog from "@/components/dashboard/dialogs/BulkAddDialog";
import TransferGuestDialog from "@/components/dashboard/dialogs/TransferGuestDialog";
import BedActionSheet from "@/components/dashboard/BedActionSheet";
import QuickAddSheet from "@/components/dashboard/QuickAddSheet";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { cn, getCurrentPlan } from "@/lib/utils";
import type { Guest } from "@/lib/types";
import {
  Building,
  BedDouble,
  PlusCircle,
  Trash2,
  Pencil,
  Plus,
  CheckCircle,
  UserPlus,
  Search,
  List,
  Grid,
  Filter,
  MoreHorizontal,
  History,
  Settings,
} from "lucide-react";
import { useDashboard } from "@/hooks/use-dashboard";
import { canAccess } from "@/lib/permissions";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import Access from "@/components/ui/PermissionWrapper";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { ActivityLogsList } from "@/components/activity/activity-logs-list";

// Constant for bed status colors and labels
const STATUS_STYLES = {
  EMPTY: {
    bg: "bg-[hsla(210,20%,98%,0.5)] dark:bg-[hsla(210,15%,12%,0.5)] backdrop-blur-md",
    border: "border-[hsla(210,10%,82%,0.4)] dark:border-[hsla(210,10%,25%,0.4)]",
    text: "text-[hsl(215,15%,45%)] dark:text-[hsl(215,10%,70%)]",
    icon: "text-[hsl(215,15%,55%)] dark:text-[hsl(215,10%,60%)]",
    badge: "bg-[hsla(215,15%,90%,0.8)] dark:bg-[hsla(215,10%,20%,0.8)] text-muted-foreground",
    shadow: "shadow-[0_2px_8px_rgba(148,163,184,0.05)]",
    selectedRing: "ring-2 ring-[hsl(210,10%,70%)] dark:ring-[hsl(210,10%,45%)]",
    selectedShadow: "shadow-[0_0_15px_-3px_rgba(148,163,184,0.3)]",
  },
  DUE: {
    bg: "bg-[hsla(343,95%,97%,0.95)] dark:bg-[hsla(343,45%,12%,0.75)] backdrop-blur-md",
    border: "border-[hsla(343,85%,65%,0.6)] dark:border-[hsla(343,75%,55%,0.6)]",
    text: "text-[hsl(343,85%,40%)] dark:text-[hsl(343,85%,80%)]",
    icon: "text-[hsl(343,80%,55%)]",
    badge: "bg-[hsl(343,75%,55%)] text-white shadow-lg shadow-rose-900/30",
    shadow: "shadow-[0_4px_12px_rgba(244,63,94,0.08)]",
    selectedRing: "ring-2 ring-[hsl(343,85%,55%)]",
    selectedShadow: "shadow-[0_0_20px_-3px_hsla(343,85%,65%,0.5)]",
  },
  PARTIAL: {
    bg: "bg-[hsla(35,95%,96%,0.95)] dark:bg-[hsla(35,45%,12%,0.75)] backdrop-blur-md",
    border: "border-[hsla(35,85%,60%,0.6)] dark:border-[hsla(35,75%,50%,0.6)]",
    text: "text-[hsl(35,90%,35%)] dark:text-[hsl(35,85%,80%)]",
    icon: "text-[hsl(35,85%,50%)]",
    badge: "bg-[hsl(35,85%,50%)] text-white",
    shadow: "shadow-[0_4px_12px_rgba(245,158,11,0.08)]",
    selectedRing: "ring-2 ring-[hsl(35,85%,50%)]",
    selectedShadow: "shadow-[0_0_20px_-3px_hsla(35,85%,60%,0.5)]",
  },
  PAID: {
    bg: "bg-[hsla(142,75%,96%,0.95)] dark:bg-[hsla(142,35%,12%,0.75)] backdrop-blur-md",
    border: "border-[hsla(142,65%,55%,0.6)] dark:border-[hsla(142,55%,45%,0.6)]",
    text: "text-[hsl(142,70%,32%)] dark:text-[hsl(142,70%,80%)]",
    icon: "text-[hsl(142,60%,48%)]",
    badge: "bg-[hsl(142,60%,48%)] text-white",
    shadow: "shadow-[0_4px_12px_rgba(16,185,129,0.08)]",
    selectedRing: "ring-2 ring-[hsl(142,65%,50%)]",
    selectedShadow: "shadow-[0_0_20px_-3px_hsla(142,65%,55%,0.5)]",
  },
  NOTICE: {
    bg: "bg-[hsla(250,90%,97%,0.95)] dark:bg-[hsla(250,45%,12%,0.75)] backdrop-blur-md",
    border: "border-[hsla(250,80%,65%,0.6)] dark:border-[hsla(250,65%,55%,0.6)]",
    text: "text-[hsl(250,85%,42%)] dark:text-[hsl(250,80%,82%)]",
    icon: "text-[hsl(250,75%,60%)]",
    badge: "bg-[hsl(250,75%,60%)] text-white shadow-md shadow-indigo-900/30",
    shadow: "shadow-[0_4px_12px_rgba(99,102,241,0.08)]",
    selectedRing: "ring-2 ring-[hsl(250,80%,60%)]",
    selectedShadow: "shadow-[0_0_20px_-3px_hsla(250,80%,65%,0.5)]",
  },
};

export default function RoomManagementPage() {
  const router = useRouter();
  const params = useParams();
  const {
    currentUser,
    featurePermissions,
    isRoomDialogOpen,
    setIsRoomDialogOpen,
    roomToEdit,
    isFloorDialogOpen,
    setIsFloorDialogOpen,
    floorToEdit,
    isBedDialogOpen,
    setIsBedDialogOpen,
    bedToEdit,
    isAddGuestDialogOpen,
    setIsAddGuestDialogOpen,
    selectedBedForGuestAdd,
    addGuestForm,
    handleAddGuestSubmit,
    isPaymentDialogOpen,
    setIsPaymentDialogOpen,
    selectedGuestForPayment,
    paymentForm,
    handlePaymentSubmit,
    isEditGuestDialogOpen,
    setIsEditGuestDialogOpen,
    guestToEdit,
    editGuestForm,
    handleEditGuestSubmit,
    guestToInitiateExit,
    setGuestToInitiateExit,
    handleConfirmInitiateExit,
    guestToExitImmediately,
    setGuestToExitImmediately,
    handleConfirmImmediateExit,
    isReminderDialogOpen,
    setIsReminderDialogOpen,
    selectedGuestForReminder,
    isGeneratingReminder,
    reminderMessage,
    setReminderMessage,
    handleOpenEditGuestDialog,
    handleOpenReminderDialog,
    roomForm,
    floorForm,
    bedForm,
    handleRoomSubmit,
    handleFloorSubmit,
    handleBedSubmit,
    handleRoomSubmit: wrappedHandleRoomSubmit,
    handleOpenRoomDialog,
    handleOpenFloorDialog,
    handleOpenBedDialog,
    handleOpenAddGuestDialog,
    handleOpenPaymentDialog,
    handleOpenBulkAddDialog,
    handleDelete,
    isUpdatingProperty,
    isBulkAddDialogOpen,
    setIsBulkAddDialogOpen,
    bulkAddType,
    bulkRoomForm,
    bulkBedForm,
    handleBulkRoomSubmit,
    handleBulkBedSubmit,
    isLoadingGuests,
    isRecordingPayment,
    isSavingRoom,
    isAddingGuest,
    isUpdatingGuest,
    isTransferDialogOpen,
    setIsTransferDialogOpen,
    guestToTransfer,
    handleOpenTransferDialog,
    handleTransferGuestSubmit,
    isTransferringGuest,
    pgs,
    guests,
    isLoadingPgs,
  } = useDashboard();

  const currentPlan = getCurrentPlan(currentUser);
  const pgId = params.pgId as string;
  const { toast } = useToast();

  const [isEditMode, setIsEditMode] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<
    "all" | "available" | "due" | "paid"
  >("all");

  // Bottom sheet state
  const [bedSheetGuestId, setBedSheetGuestId] = useState<string | null>(null);
  const bedSheetGuest = useMemo(() => {
    if (!bedSheetGuestId) return null;
    return guests.find((g) => g.id === bedSheetGuestId) || null;
  }, [bedSheetGuestId, guests]);

  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);

  const pg = useMemo(() => pgs.find((p) => p.id === pgId), [pgs, pgId]);

  // Optimize guest access via a map
  const guestMap = useMemo(() => {
    const map: Record<string, Guest> = {};
    guests.forEach((g) => {
      if (!g.isVacated && g.bedId) {
        map[g.bedId] = g;
      }
    });
    return map;
  }, [guests]);

  // Map for dues calculation
  const duesMap = useMemo(() => {
    const map: Record<string, number> = {};
    guests.forEach((g) => {
      if (!g.isVacated) {
        const totalDue = (g.ledger || []).reduce(
          (acc, entry) =>
            acc + (entry.type === "debit" ? entry.amount : -entry.amount),
          0,
        );
        map[g.id] = totalDue;
      }
    });
    return map;
  }, [guests]);

  const canAdd = canAccess(
    featurePermissions,
    currentUser?.role,
    "properties",
    "add",
  );
  const canEdit = canAccess(
    featurePermissions,
    currentUser?.role,
    "properties",
    "edit",
  );
  const canDelete = canAccess(
    featurePermissions,
    currentUser?.role,
    "properties",
    "delete",
  );
  const canEditProperty = canEdit;

  const permissions = useMemo(() => {
    if (!featurePermissions || !currentUser) return null;
    if (currentUser.role === "owner" || currentUser.role === "admin")
      return {
        add: true,
        edit: true,
        delete: true,
      };
    return (featurePermissions as any).properties;
  }, [featurePermissions, currentUser]);

  const canAddFloor = useMemo(() => {
    if (!pg || !permissions?.add) return false;
    return true;
  }, [pg, permissions]);

  if (!pg) {
    if (isLoadingPgs) {
      return (
        <div className="flex flex-col items-center justify-center h-full space-y-4">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="space-y-2 text-center">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-60" />
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <Building className="mx-auto h-16 w-16 text-muted-foreground" />
        <h2 className="mt-6 text-2xl font-semibold">Property Not Found</h2>
        <p className="mt-2 text-muted-foreground max-w-md">
          The property you are looking for does not exist or has been removed.
        </p>
        <Button asChild className="mt-6">
          <Link href="/dashboard">Go Back to Dashboard</Link>
        </Button>
      </div>
    );
  }

  const openAddFloor = () => {
    if (!canAddFloor) {
      toast({
        variant: "destructive",
        title: "Permission Denied",
        description: "You do not have permission to add new floors.",
      });
      return;
    }
    handleOpenFloorDialog(null, pg);
  };

  const getBedStatusBadge = (bed: any) => {
    const guest = guestMap[bed.id];

    // If we have a bed.guestId but no guest data yet, show loading OR assume occupied
    if (bed.guestId && !guest && isLoadingGuests)
      return (
        <Badge variant="outline" className="text-[10px] animate-pulse">
          LOADING...
        </Badge>
      );

    if (!guest)
      return (
        <Badge
          variant="outline"
          className="text-[hsl(215,15%,45%)] dark:text-[hsl(215,10%,70%)] bg-[hsla(215,15%,90%,0.4)] dark:bg-[hsla(215,10%,20%,0.4)] border-[hsla(215,15%,80%,0.3)] text-[10px] font-bold px-2 py-0.5 rounded-md"
        >
          EMPTY
        </Badge>
      );
    if (guest.exitDate)
      return (
        <Badge
          variant="outline"
          className="text-[hsl(250,85%,42%)] dark:text-[hsl(250,80%,82%)] bg-[hsla(250,90%,96%,0.95)] dark:bg-[hsla(250,45%,20%,0.8)] border-[hsla(250,80%,65%,0.4)] text-[10px] font-bold px-2 py-0.5 rounded-md animate-pulse"
        >
          🗓️ NOTICE
        </Badge>
      );
    if (guest.rentStatus === "unpaid")
      return (
        <Badge
          variant="outline"
          className="text-[hsl(343,85%,40%)] dark:text-[hsl(343,85%,80%)] bg-[hsla(343,90%,96%,0.95)] dark:bg-[hsla(343,45%,20%,0.8)] border-[hsla(343,85%,65%,0.4)] text-[10px] font-bold px-2 py-0.5 rounded-md"
        >
          DUE
        </Badge>
      );
    if (guest.rentStatus === "partial")
      return (
        <Badge
          variant="outline"
          className="text-[hsl(35,90%,35%)] dark:text-[hsl(35,85%,80%)] bg-[hsla(35,95%,95%,0.95)] dark:bg-[hsla(35,45%,20%,0.8)] border-[hsla(35,85%,60%,0.4)] text-[10px] font-bold px-2 py-0.5 rounded-md"
        >
          PARTIAL
        </Badge>
      );
    return (
      <Badge
        variant="outline"
        className="text-[hsl(142,70%,32%)] dark:text-[hsl(142,70%,80%)] bg-[hsla(142,75%,95%,0.95)] dark:bg-[hsla(142,35%,20%,0.8)] border-[hsla(142,65%,55%,0.4)] text-[10px] font-bold px-2 py-0.5 rounded-md"
      >
        PAID
      </Badge>
    );
  };

  const floorsToRender =
    activeTab === "all"
      ? pg.floors
      : pg.floors?.filter((f) => f.id === activeTab);
  const currentFloor = floorsToRender?.[0];

  return (
    <div className="flex flex-col md:max-w-2xl mx-auto md:mx-0 w-full h-[calc(100vh-120px)] md:h-[calc(100vh-80px)] pb-16 md:pb-0">
      <Tabs
        defaultValue="all"
        value={activeTab}
        onValueChange={setActiveTab}
        className="w-full flex flex-col h-full"
      >
        {/* Header Wrap (Not sticky anymore, just flex items at the top) */}
        <div className="flex-none pb-2 pt-2 -mx-4 px-4 sm:mx-0 sm:px-0">
          {/* Floor tabs */}
          <ScrollArea className="w-full border-b mb-4">
            <div className="flex items-center">
              <TabsList className="bg-transparent h-10 p-0 justify-start w-max">
                <TabsTrigger
                  value="all"
                  className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none data-[state=active]:bg-transparent pb-2 pt-2 px-4 shadow-none bg-transparent hover:text-primary transition-colors text-base font-semibold text-muted-foreground border-b-2 border-transparent"
                >
                  All Floors
                </TabsTrigger>
                {pg.floors?.map((floor) => (
                  <TabsTrigger
                    key={floor.id}
                    value={floor.id}
                    className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none data-[state=active]:bg-transparent pb-2 pt-2 px-4 shadow-none bg-transparent hover:text-primary transition-colors text-base font-semibold text-muted-foreground border-b-2 border-transparent"
                  >
                    {floor.name}
                  </TabsTrigger>
                ))}
                <TabsTrigger
                  value="activity"
                  className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none data-[state=active]:bg-transparent pb-2 pt-2 px-4 shadow-none bg-transparent hover:text-primary transition-colors text-base font-semibold text-muted-foreground border-b-2 border-transparent flex items-center gap-2"
                >
                  <History className="h-4 w-4" />
                  Activity
                </TabsTrigger>
                {canAdd && (
                  <button
                    onClick={openAddFloor}
                    className="rounded-none pb-2 pt-2 px-4 text-base font-semibold text-primary hover:bg-primary/5 transition-colors border-b-2 border-transparent flex items-center gap-1.5 shrink-0"
                  >
                    <Plus className="h-4 w-4" />
                    <span className="hidden xs:inline">Add Floor</span>
                  </button>
                )}
              </TabsList>
            </div>
          </ScrollArea>

          {/* Toolbar */}
          <div className="flex items-center gap-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search rooms or guests..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 bg-muted/40 border-none rounded-xl"
              />
            </div>

            {/* View mode toggle */}
            <div className="bg-muted p-1 rounded-xl flex items-center shrink-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode("list")}
                className={cn(
                  "px-2 rounded-lg h-8 transition-all",
                  viewMode === "list"
                    ? "bg-background shadow-sm"
                    : "text-muted-foreground",
                )}
              >
                <List className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode("grid")}
                className={cn(
                  "px-2 rounded-lg h-8 transition-all",
                  viewMode === "grid"
                    ? "bg-background shadow-sm"
                    : "text-muted-foreground",
                )}
              >
                <Grid className="w-4 h-4" />
              </Button>
            </div>

            {/* Filter */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant={filterStatus !== "all" ? "default" : "outline"}
                  size="icon"
                  className="rounded-xl border-dashed h-10 w-10 shrink-0"
                >
                  <Filter className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
                <DropdownMenuItem
                  onClick={() => setFilterStatus("all")}
                  className={
                    filterStatus === "all" ? "bg-primary/10 text-primary" : ""
                  }
                >
                  All Beds
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setFilterStatus("available")}
                  className={
                    filterStatus === "available"
                      ? "bg-primary/10 text-primary"
                      : ""
                  }
                >
                  🟡 Available / Empty
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setFilterStatus("due")}
                  className={
                    filterStatus === "due" ? "bg-primary/10 text-primary" : ""
                  }
                >
                  🔴 Rent Due
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setFilterStatus("paid")}
                  className={
                    filterStatus === "paid" ? "bg-primary/10 text-primary" : ""
                  }
                >
                  🟢 Rent Paid
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Settings button */}
            {canEditProperty && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.push(`/dashboard/pg-management/${pg.id}/settings`)}
                className="rounded-xl h-10 w-10 shrink-0 transition-colors bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20"
                title="Property Settings"
              >
                <Settings className="w-5 h-5" />
              </Button>
            )}

            {/* Edit mode toggle */}
            {canEditProperty && (
              <Button
                variant={isEditMode ? "secondary" : "ghost"}
                size="icon"
                onClick={() => setIsEditMode(!isEditMode)}
                className={cn(
                  "rounded-xl h-10 w-10 shrink-0 transition-colors",
                  isEditMode
                    ? "bg-secondary text-secondary-foreground"
                    : "bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20",
                )}
              >
                {isEditMode ? (
                  <CheckCircle className="w-5 h-5" />
                ) : (
                  <Pencil className="w-5 h-5" />
                )}
              </Button>
            )}
          </div>
        </div>

        {/* No floors empty state */}
        {(!pg.floors || pg.floors.length === 0) && (
          <div className="flex flex-col items-center justify-center p-10 bg-muted/20 border-2 border-dashed rounded-3xl text-center space-y-5 mt-4 flex-none">
            <div className="w-20 h-20 bg-primary/10 text-primary rounded-full flex items-center justify-center">
              <Building className="w-10 h-10" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold tracking-tight">
                No Floors Yet
              </h2>
              <p className="text-muted-foreground max-w-sm mx-auto">
                Tap the button below to add your first floor, then add rooms and
                assign guests.
              </p>
            </div>
            <Button
              onClick={openAddFloor}
              size="lg"
              className="rounded-2xl px-8 font-bold shadow-lg shadow-primary/20"
            >
              <Plus className="mr-2 h-5 w-5" /> Add First Floor
            </Button>
          </div>
        )}

        {/* Scrollable Floors content */}
        <div className="flex-1 overflow-y-auto pb-32 pr-2 -mx-2 px-2 scrollbar-thin">
          {activeTab === "activity" ? (
            <div className="p-2">
              <ActivityLogsList
                targetId={pgId}
                limit={10}
                emptyMessage="No activity history for this property."
              />
            </div>
          ) : (
            <>
              {floorsToRender?.map((floor) => (
                <div key={floor.id} className="space-y-5 mb-8">
                  {/* Floor header with actions */}
                  <div className="flex items-center justify-between">
                    {activeTab === "all" && (
                      <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
                        {floor.name}
                      </h3>
                    )}
                    {isEditMode && (
                      <div className="flex items-center gap-2 ml-auto">
                        {canEdit && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              handleOpenFloorDialog(floor as any, pg)
                            }
                            className="h-8 rounded-full px-3 text-xs font-semibold text-muted-foreground"
                          >
                            <Pencil className="w-3 h-3 mr-1.5" /> Rename
                          </Button>
                        )}
                        {canDelete && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              handleDelete("floor", {
                                floorId: floor.id,
                                pgId: pg.id,
                              })
                            }
                            className="h-8 rounded-full px-3 text-xs font-semibold text-red-500 hover:bg-red-500/10"
                          >
                            <Trash2 className="w-3 h-3 mr-1.5" /> Delete Floor
                          </Button>
                        )}
                      </div>
                    )}
                  </div>

                  {floor.rooms.length === 0 ? (
                    <div className="text-center py-10 bg-muted/20 rounded-2xl border-2 border-dashed">
                      <p className="text-muted-foreground font-medium mb-4">
                        No rooms on this floor yet.
                      </p>
                      {canAdd && (
                        <Button
                          onClick={() =>
                            handleOpenRoomDialog(null, floor.id, pg.id)
                          }
                          size="sm"
                          className="rounded-xl"
                        >
                          <PlusCircle className="mr-2 h-4 w-4" /> Add Room
                        </Button>
                      )}
                    </div>
                  ) : null}

                  {floor.rooms
                    .filter((room) => {
                      let roomMatches = true;
                      if (searchQuery) {
                        const lowerQuery = searchQuery.toLowerCase();
                        if (room.name.toLowerCase().includes(lowerQuery)) {
                          // matches
                        } else {
                          const hasGuest = room.beds.some((b) => {
                            const g = guestMap[b.id];
                            return (
                              g && g.name.toLowerCase().includes(lowerQuery)
                            );
                          });
                          if (!hasGuest) roomMatches = false;
                        }
                      }
                      if (roomMatches && filterStatus !== "all") {
                        const hasMatchingBed = room.beds.some((b) => {
                          const g = guestMap[b.id];
                          if (filterStatus === "available" && !g) return true;
                          if (
                            filterStatus === "due" &&
                            g &&
                            (g.rentStatus === "unpaid" ||
                              g.rentStatus === "partial")
                          )
                            return true;
                          if (
                            filterStatus === "paid" &&
                            g &&
                            g.rentStatus !== "unpaid" &&
                            g.rentStatus !== "partial"
                          )
                            return true;
                          return false;
                        });
                        if (!hasMatchingBed) roomMatches = false;
                      }
                      return roomMatches;
                    })
                    .map((room) => {
                      const occupiedBedsCount = room.beds.filter(
                        (b) =>
                          !!guestMap[b.id] || (b.guestId && isLoadingGuests),
                      ).length;
                      const emptyBeds = room.beds.length - occupiedBedsCount;
                      const isRoomEmpty =
                        emptyBeds === room.beds.length && room.beds.length > 0;
                      const forceDetailedView =
                        filterStatus !== "all" || searchQuery;

                      return (
                        <div key={room.id} className="space-y-3">
                          {/* Room header */}
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-bold text-base">
                                {room.name}
                              </h4>
                              <p className="text-xs text-muted-foreground">
                                {room.beds.length}-Sharing •{" "}
                                {room.amenities?.includes("ac")
                                  ? "❄️ AC"
                                  : "Non-AC"}
                              </p>
                            </div>
                            {isEditMode && (
                              <div className="flex items-center gap-1">
                                {canEdit && (
                                  <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => handleOpenRoomDialog(room)}
                                    className="h-8 rounded-full px-3 text-xs font-semibold"
                                  >
                                    <Pencil className="w-3 h-3 mr-1" /> Edit
                                  </Button>
                                )}
                                {canAdd && (
                                  <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={() =>
                                      handleOpenBedDialog(
                                        null,
                                        room.id,
                                        floor.id,
                                      )
                                    }
                                    className="h-8 rounded-full px-3 text-xs font-semibold"
                                  >
                                    <Plus className="w-3 h-3 mr-1" /> Bed
                                  </Button>
                                )}
                                {canAdd && (
                                  <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={() =>
                                      handleOpenBulkAddDialog(
                                        "beds",
                                        floor.id,
                                        room.id,
                                      )
                                    }
                                    className="h-8 rounded-full px-3 text-xs font-semibold"
                                  >
                                    Bulk
                                  </Button>
                                )}
                                {canDelete && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                      handleDelete("room", {
                                        floorId: floor.id,
                                        roomId: room.id,
                                        pgId: pg.id,
                                      })
                                    }
                                    className="h-8 rounded-full px-2 text-red-500 hover:bg-red-500/10"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </Button>
                                )}
                              </div>
                            )}
                          </div>

                          {viewMode === "list" ? (
                            /* LIST VIEW - PREMIUM CARDS WITH SMOOTH BORDERS & SCALE ANIMATIONS */
                            <div className="space-y-2.5">
                              {room.beds
                                .filter((b) => {
                                  const g = guestMap[b.id];
                                  if (
                                    searchQuery &&
                                    g &&
                                    !g.name
                                      .toLowerCase()
                                      .includes(searchQuery.toLowerCase())
                                  )
                                    return false;
                                  if (searchQuery && !g) return false;
                                  if (filterStatus !== "all") {
                                    if (filterStatus === "available" && g)
                                      return false;
                                    if (
                                      filterStatus === "due" &&
                                      (!g ||
                                        (g.rentStatus !== "unpaid" &&
                                          g.rentStatus !== "partial"))
                                    )
                                      return false;
                                    if (
                                      filterStatus === "paid" &&
                                      (!g ||
                                        g.rentStatus === "unpaid" ||
                                        g.rentStatus === "partial")
                                    )
                                      return false;
                                  }
                                  return true;
                                })
                                .map((bed) => {
                                  const guest = guestMap[bed.id];
                                  const isInitiallyOccupied =
                                    bed.guestId && !guest && isLoadingGuests;
                                  const totalDue = guest
                                    ? duesMap[guest.id] || 0
                                    : 0;
                                  const isSelected = guest && bedSheetGuestId === guest.id;

                                  let status: keyof typeof STATUS_STYLES =
                                    "EMPTY";
                                  if (guest) {
                                    if (guest.exitDate) status = "NOTICE";
                                    else if (guest.rentStatus === "unpaid")
                                      status = "DUE";
                                    else if (guest.rentStatus === "partial")
                                      status = "PARTIAL";
                                    else status = "PAID";
                                  }
                                  const style = STATUS_STYLES[status];

                                  return (
                                    <div
                                      key={bed.id}
                                      className={cn(
                                        "flex items-center justify-between p-4 rounded-2xl border transition-all duration-300 ease-out",
                                        style.bg,
                                        style.border,
                                        !isEditMode && !isInitiallyOccupied
                                          ? "cursor-pointer hover:-translate-y-0.5 hover:shadow-md active:scale-[0.985] group"
                                          : "",
                                        isSelected
                                          ? "ring-2 ring-primary ring-offset-2 dark:ring-offset-slate-900 scale-[1.015] shadow-md border-primary"
                                          : "",
                                      )}
                                      onClick={
                                        !isEditMode && !isInitiallyOccupied
                                          ? () =>
                                              guest
                                                ? setBedSheetGuestId(guest.id)
                                                : handleOpenAddGuestDialog(
                                                    bed,
                                                    room,
                                                    pg,
                                                  )
                                          : undefined
                                      }
                                    >
                                      <div className="flex items-center gap-3 min-w-0 flex-1">
                                        <div
                                          className={cn(
                                            "w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border transition-all shadow-sm",
                                            style.bg,
                                            style.border,
                                            style.icon,
                                            isSelected ? "scale-105" : "",
                                          )}
                                        >
                                          <BedDouble className="w-5 h-5" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                          {guest ? (
                                            <>
                                              <div className="flex items-center gap-2 flex-wrap">
                                                <p
                                                  className={cn(
                                                    "font-extrabold text-sm leading-tight tracking-tight",
                                                    style.text,
                                                  )}
                                                >
                                                  {guest.name}
                                                </p>
                                                {totalDue > 0 && (
                                                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50">
                                                    ₹{Math.round(totalDue)} Due
                                                  </span>
                                                )}
                                                {guest.exitDate && (
                                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-extrabold bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-900/50 animate-pulse">
                                                    🗓️ Exit: {new Date(guest.exitDate).toLocaleDateString('en-IN', {day: 'numeric', month: 'short'})}
                                                  </span>
                                                )}
                                              </div>
                                              <p className="text-[10px] text-muted-foreground mt-1 font-semibold">
                                                Bed {bed.name}
                                              </p>
                                            </>
                                          ) : isInitiallyOccupied ? (
                                            <div className="space-y-1.5 w-24">
                                              <Skeleton className="h-4 w-full rounded" />
                                              <Skeleton className="h-3 w-16 rounded" />
                                            </div>
                                          ) : (
                                            <>
                                              <p className="font-bold text-sm text-secondary-foreground/60">
                                                Empty Bed
                                              </p>
                                              <p className="text-[10px] text-muted-foreground font-semibold">
                                                Bed {bed.name}
                                              </p>
                                            </>
                                          )}
                                        </div>
                                      </div>

                                      <div className="flex items-center gap-2 shrink-0 ml-3">
                                        {!isEditMode &&
                                          getBedStatusBadge(bed)}

                                        {/* Edit mode controls */}
                                        {isEditMode && (
                                          <div className="flex gap-1">
                                            {canEdit && (
                                              <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-muted-foreground hover:bg-muted"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleOpenBedDialog(
                                                    bed,
                                                    room.id,
                                                    floor.id,
                                                  );
                                                }}
                                              >
                                                <Pencil className="w-4 h-4" />
                                              </Button>
                                            )}
                                            {canDelete && (
                                              <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-red-500 hover:bg-red-500/10"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleDelete("bed", {
                                                    floorId: floor.id,
                                                    roomId: room.id,
                                                    bedId: bed.id,
                                                    pgId: pg.id,
                                                  });
                                                }}
                                              >
                                                <Trash2 className="w-4 h-4" />
                                              </Button>
                                            )}
                                          </div>
                                        )}
                                        {/* Tap arrow hint for occupied, non-edit */}
                                        {guest && !isEditMode && (
                                          <MoreHorizontal className="w-4 h-4 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              {room.beds.length === 0 && (
                                <div className="p-8 text-center text-sm text-muted-foreground bg-muted/5 border border-dashed rounded-2xl">
                                  No beds added yet.
                                  {isEditMode && canAdd && (
                                    <button
                                      onClick={() =>
                                        handleOpenBedDialog(
                                          null,
                                          room.id,
                                          floor.id,
                                        )
                                      }
                                      className="ml-2 text-primary font-bold hover:underline"
                                    >
                                      Add bed
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          ) : (
                            /* GRID VIEW */
                            <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-3">
                              {room.beds
                                .filter((b) => {
                                  const g = guestMap[b.id];
                                  if (
                                    searchQuery &&
                                    g &&
                                    !g.name
                                      .toLowerCase()
                                      .includes(searchQuery.toLowerCase())
                                  )
                                    return false;
                                  if (searchQuery && !g) return false;
                                  if (filterStatus !== "all") {
                                    if (filterStatus === "available" && g)
                                      return false;
                                    if (
                                      filterStatus === "due" &&
                                      (!g ||
                                        (g.rentStatus !== "unpaid" &&
                                          g.rentStatus !== "partial"))
                                    )
                                      return false;
                                    if (
                                      filterStatus === "paid" &&
                                      (!g ||
                                        g.rentStatus === "unpaid" ||
                                        g.rentStatus === "partial")
                                    )
                                      return false;
                                  }
                                  return true;
                                })
                                .map((bed) => {
                                  const guest = guestMap[bed.id];
                                  const isInitiallyOccupied =
                                    bed.guestId && !guest && isLoadingGuests;
                                  const totalDue = guest
                                    ? duesMap[guest.id] || 0
                                    : 0;

                                  let status: keyof typeof STATUS_STYLES =
                                    "EMPTY";
                                  if (guest) {
                                    if (guest.exitDate) status = "NOTICE";
                                    else if (guest.rentStatus === "unpaid")
                                      status = "DUE";
                                    else if (guest.rentStatus === "partial")
                                      status = "PARTIAL";
                                    else status = "PAID";
                                  }
                                  const style = STATUS_STYLES[status];

                                  return (
                                    <Card
                                      key={bed.id}
                                      onClick={
                                        !isEditMode && !isInitiallyOccupied
                                          ? () =>
                                              guest
                                                ? setBedSheetGuestId(guest.id)
                                                : handleOpenAddGuestDialog(
                                                    bed,
                                                    room,
                                                    pg,
                                                  )
                                          : undefined
                                      }
                                      className={cn(
                                        "p-3 border shadow-sm rounded-2xl flex flex-col justify-between transition-all group",
                                        !isEditMode && !isInitiallyOccupied
                                          ? "active:scale-[0.97] cursor-pointer hover:shadow-md hover:border-primary/40"
                                          : "hover:border-primary/20",
                                        style.bg,
                                        style.border,
                                      )}
                                    >
                                      <div className="flex items-start justify-between mb-3">
                                        {guest ? (
                                          <Avatar className="h-10 w-10 border-2 border-white dark:border-slate-800 shadow-sm">
                                            <AvatarFallback
                                              className={cn(
                                                "font-bold text-sm",
                                                style.bg,
                                                style.text,
                                              )}
                                            >
                                              {guest.name
                                                .charAt(0)
                                                .toUpperCase()}
                                            </AvatarFallback>
                                          </Avatar>
                                        ) : isInitiallyOccupied ? (
                                          <Skeleton className="h-10 w-10 rounded-full" />
                                        ) : (
                                          <div className="w-10 h-10 rounded-xl bg-secondary/15 text-secondary flex items-center justify-center">
                                            <BedDouble className="w-5 h-5 opacity-40" />
                                          </div>
                                        )}
                                        {!isEditMode && getBedStatusBadge(bed)}
                                        {isEditMode && (
                                          <div className="flex gap-0.5">
                                            {canEdit && (
                                              <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-7 w-7 text-muted-foreground"
                                                onClick={() =>
                                                  handleOpenBedDialog(
                                                    bed,
                                                    room.id,
                                                    floor.id,
                                                  )
                                                }
                                              >
                                                <Pencil className="w-3 h-3" />
                                              </Button>
                                            )}
                                            {canDelete && (
                                              <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-7 w-7 text-red-500 hover:bg-red-500/10"
                                                onClick={() =>
                                                  handleDelete("bed", {
                                                    floorId: floor.id,
                                                    roomId: room.id,
                                                    bedId: bed.id,
                                                    pgId: pg.id,
                                                  })
                                                }
                                              >
                                                <Trash2 className="w-3 h-3" />
                                              </Button>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                      <div className="min-h-[46px]">
                                        <p className="text-[10px] font-bold text-muted-foreground/60 mb-0.5 uppercase tracking-tight">
                                          Bed {bed.name}
                                        </p>
                                        {guest ? (
                                          <>
                                            <p
                                              className={cn(
                                                "font-bold text-sm leading-tight line-clamp-1",
                                                style.text,
                                              )}
                                              title={guest.name}
                                            >
                                              {guest.name}
                                            </p>
                                            {totalDue > 0 && (
                                              <p className="text-[10px] font-bold text-red-600 mt-1">
                                                ₹{Math.round(totalDue)} Due
                                              </p>
                                            )}
                                          </>
                                        ) : isInitiallyOccupied ? (
                                          <div className="space-y-1.5 mt-1">
                                            <Skeleton className="h-3 w-16 rounded" />
                                            <Skeleton className="h-2 w-10 rounded" />
                                          </div>
                                        ) : (
                                          <p className="font-bold text-sm text-secondary-foreground/40 italic">
                                            Empty
                                          </p>
                                        )}
                                      </div>
                                    </Card>
                                  );
                                })}
                            </div>
                          )}

                          {/* Add room button in edit mode */}
                          {isEditMode && canAdd && (
                            <button
                              className="w-full flex items-center justify-center gap-2 p-3 rounded-2xl border-2 border-dashed border-muted-foreground/20 text-muted-foreground text-sm font-semibold hover:border-muted-foreground/40 hover:text-foreground transition-colors"
                              onClick={() =>
                                handleOpenRoomDialog(null, floor.id, pg.id)
                              }
                            >
                              <PlusCircle className="w-4 h-4" /> Add Room to{" "}
                              {floor.name}
                            </button>
                          )}
                        </div>
                      );
                    })}
                </div>
              ))}
            </>
          )}
          {activeTab === "activity" && (
            <div className="p-4">
              <ActivityLogsList targetId={pg.id} />
            </div>
          )}
        </div>
      </Tabs>

      {/* FAB - Floating Action Button (mobile only, bottom right) */}
      {canAdd && (
        <button
          onClick={() => setIsQuickAddOpen(true)}
          className="md:hidden fixed bottom-20 right-4 z-40 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-xl shadow-primary/30 flex items-center justify-center active:scale-90 transition-transform"
          aria-label="Quick Add"
        >
          <Plus className="w-7 h-7" />
        </button>
      )}

      {/* Bed Action Sheet (replaces popover) */}
      <BedActionSheet
        guest={bedSheetGuest}
        isOpen={!!bedSheetGuestId}
        onClose={() => setBedSheetGuestId(null)}
        handleOpenPaymentDialog={handleOpenPaymentDialog}
        handleOpenReminderDialog={handleOpenReminderDialog}
        handleOpenEditGuestDialog={handleOpenEditGuestDialog}
        handleOpenTransferDialog={handleOpenTransferDialog}
        setGuestToInitiateExit={setGuestToInitiateExit}
        setGuestToExitImmediately={setGuestToExitImmediately}
      />

      <TransferGuestDialog
        isOpen={isTransferDialogOpen}
        onOpenChange={setIsTransferDialogOpen}
        guest={guestToTransfer}
        isTransferring={isTransferringGuest}
        onTransfer={handleTransferGuestSubmit}
      />

      <QuickAddSheet
        isOpen={isQuickAddOpen}
        onClose={() => setIsQuickAddOpen(false)}
        canAddFloor={true} // Enable as requested: "should be enabled"
        canAdd={!!canAdd}
        onAddFloor={openAddFloor}
        onAddRoom={() =>
          handleOpenRoomDialog(
            null,
            activeTab !== "all" ? activeTab : pg.floors?.[0]?.id || "",
            pg.id,
          )
        }
        onBulkRooms={() =>
          handleOpenBulkAddDialog(
            "rooms",
            activeTab !== "all" ? activeTab : pg.floors?.[0]?.id || "",
          )
        }
        onAddGuest={() => setIsAddGuestDialogOpen(true)}
        floorName={
          activeTab !== "all"
            ? pg.floors?.find((f) => f.id === activeTab)?.name
            : undefined
        }
      />

      {/* DIALOGS */}
      <Access feature="properties" action="edit">
        <RoomDialog
          isRoomDialogOpen={isRoomDialogOpen}
          setIsRoomDialogOpen={setIsRoomDialogOpen}
          roomToEdit={roomToEdit}
          roomForm={roomForm}
          handleRoomSubmit={handleRoomSubmit}
          isSavingRoom={isSavingRoom}
          pg={pg}
          onOpenFloorDialog={() => handleOpenFloorDialog(null, pg)}
        />
        <Dialog open={isFloorDialogOpen} onOpenChange={setIsFloorDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {floorToEdit ? "Edit Floor" : "Add New Floor"}
              </DialogTitle>
            </DialogHeader>
            <Form {...floorForm}>
              <form
                onSubmit={floorForm.handleSubmit(handleFloorSubmit)}
                id="floor-form"
                className="space-y-4"
              >
                <FormField
                  control={floorForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Floor Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Ground Floor" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </form>
            </Form>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="secondary">Cancel</Button>
              </DialogClose>
              <Button
                type="submit"
                form="floor-form"
                disabled={!canAdd && !canEdit}
              >
                {floorToEdit ? "Save Changes" : "Add Floor"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <Dialog open={isBedDialogOpen} onOpenChange={setIsBedDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {bedToEdit ? "Edit Bed" : "Add New Bed"}
              </DialogTitle>
            </DialogHeader>
            <Form {...bedForm}>
              <form
                onSubmit={bedForm.handleSubmit(handleBedSubmit)}
                id="bed-form"
                className="space-y-4"
              >
                <FormField
                  control={bedForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bed Name / Number</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., A, B, 1, 2..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </form>
            </Form>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="secondary">Cancel</Button>
              </DialogClose>
              <Button
                type="submit"
                form="bed-form"
                disabled={!canAdd && !canEdit}
              >
                {bedToEdit ? "Save Changes" : "Add Bed"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </Access>

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

      <Access feature="guests" action="edit">
        <EditGuestDialog
          isEditGuestDialogOpen={isEditGuestDialogOpen}
          setIsEditGuestDialogOpen={setIsEditGuestDialogOpen}
          guestToEdit={guestToEdit}
          editGuestForm={editGuestForm}
          handleEditGuestSubmit={handleEditGuestSubmit}
          isUpdatingGuest={isUpdatingGuest}
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

      <Access feature="complaints" action="edit">
        <ReminderDialog
          isReminderDialogOpen={isReminderDialogOpen}
          setIsReminderDialogOpen={setIsReminderDialogOpen}
          selectedGuestForReminder={selectedGuestForReminder}
          isGeneratingReminder={isGeneratingReminder}
          reminderMessage={reminderMessage}
          setReminderMessage={setReminderMessage}
        />
      </Access>

      <AlertDialog
        open={!!guestToInitiateExit}
        onOpenChange={() => setGuestToInitiateExit(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Initiate Exit for {guestToInitiateExit?.name}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This starts a {guestToInitiateExit?.noticePeriodDays}-day notice
              period. The bed stays occupied until their exit date.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Access feature="guests" action="edit">
              <AlertDialogAction onClick={handleConfirmInitiateExit}>
                Confirm Exit
              </AlertDialogAction>
            </Access>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!guestToExitImmediately}
        onOpenChange={() => setGuestToExitImmediately(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Exit {guestToExitImmediately?.name} Immediately?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                <p>
                  This will immediately vacate the bed without a notice period.
                  This cannot be undone.
                </p>
                {guestToExitImmediately &&
                  (() => {
                    const depositAmount =
                      guestToExitImmediately.depositAmount || 0;
                    const currentBalance = (
                      guestToExitImmediately.ledger || []
                    ).reduce(
                      (acc, entry) =>
                        acc +
                        (entry.type === "debit" ? entry.amount : -entry.amount),
                      0,
                    );
                    const finalSettlementAmount =
                      depositAmount - currentBalance;

                    return (
                      <div className="bg-muted/40 p-4 rounded-xl border border-border/50 text-sm text-foreground backdrop-blur-sm">
                        <div className="flex justify-between py-1">
                          <span className="text-muted-foreground">
                            Security Deposit:
                          </span>
                          <span className="font-medium">
                            ₹{depositAmount.toLocaleString("en-IN")}
                          </span>
                        </div>
                        <div className="flex justify-between py-1">
                          <span className="text-muted-foreground">
                            Unpaid Balance (Dues):
                          </span>
                          <span className="font-medium">
                            ₹{currentBalance.toLocaleString("en-IN")}
                          </span>
                        </div>
                        <div className="h-px bg-border my-2" />
                        <div className="flex justify-between py-1 font-semibold">
                          <span>Final Settlement:</span>
                          <span
                            className={cn(
                              finalSettlementAmount > 0
                                ? "text-emerald-600 dark:text-emerald-400"
                                : finalSettlementAmount < 0
                                  ? "text-rose-600 dark:text-rose-400"
                                  : "",
                            )}
                          >
                            {finalSettlementAmount > 0
                              ? `Refund ₹${finalSettlementAmount.toLocaleString("en-IN")}`
                              : finalSettlementAmount < 0
                                ? `Owes ₹${Math.abs(finalSettlementAmount).toLocaleString("en-IN")}`
                                : `₹0`}
                          </span>
                        </div>
                      </div>
                    );
                  })()}

                <div className="flex items-center space-x-2 pt-2">
                  <Checkbox
                    id="sendWhatsAppPg"
                    defaultChecked={true}
                    onCheckedChange={(checked) => {
                      if (typeof window !== "undefined") {
                        (window as any).__sendWhatsAppOnExit = checked;
                      }
                    }}
                  />
                  <Label
                    htmlFor="sendWhatsAppPg"
                    className="text-sm cursor-pointer"
                  >
                    Send Settlement details via WhatsApp
                  </Label>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Access feature="guests" action="delete">
              <AlertDialogAction
                className="bg-destructive hover:bg-destructive/90"
                onClick={() => {
                  const sendWA =
                    typeof window !== "undefined"
                      ? (window as any).__sendWhatsAppOnExit !== false
                      : true;
                  handleConfirmImmediateExit(sendWA);
                }}
              >
                Confirm Vacate
              </AlertDialogAction>
            </Access>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <BulkAddDialog
        isOpen={isBulkAddDialogOpen}
        onOpenChange={setIsBulkAddDialogOpen}
        type={bulkAddType}
        pg={pg}
        bulkRoomForm={bulkRoomForm}
        bulkBedForm={bulkBedForm}
        handleBulkRoomSubmit={handleBulkRoomSubmit}
        handleBulkBedSubmit={handleBulkBedSubmit}
      />
    </div>
  );
}
