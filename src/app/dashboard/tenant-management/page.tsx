"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  PlusCircle,
  MoreHorizontal,
  IndianRupee,
  User,
  ShieldCheck,
  Building,
  History,
  Pencil,
  Upload,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useAppSelector } from "@/lib/hooks";
import { usePermissionsStore } from "@/lib/stores/configStores";
import { canAccess } from "@/lib/permissions";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Guest } from "@/lib/types";
import { format } from "date-fns";
import Access from "@/components/ui/PermissionWrapper";
import KycManagementTab from "@/components/dashboard/KycManagementTab";
import TenantCsvUploader from "@/components/tenant-csv-uploader";
import { useDashboard } from "@/hooks/use-dashboard";
import AddGuestDialog from "@/components/dashboard/dialogs/AddGuestDialog";
import EditGuestDialog from "@/components/dashboard/dialogs/EditGuestDialog";
import { formatBalanceBreakdown } from "@/lib/ledger-utils";

const rentStatusColors: Record<Guest["rentStatus"], string> = {
  paid: "bg-green-100 text-green-800",
  unpaid: "bg-red-100 text-red-800",
  partial: "bg-orange-100 text-orange-800",
};

const kycStatusColors: Record<Guest["kycStatus"], string> = {
  verified: "bg-blue-100 text-blue-800",
  pending: "bg-yellow-100 text-yellow-800",
  rejected: "bg-orange-100 text-orange-800",
  "not-started": "bg-gray-100 text-gray-800",
};

interface GuestListProps {
  guests: Guest[];
  onEdit: (guest: Guest) => void;
  canEdit: boolean;
}

const safeFormatDate = (
  dateValue: string | undefined | null,
  fmt: string,
): string => {
  if (!dateValue) return "N/A";
  try {
    const d = new Date(dateValue);
    if (isNaN(d.getTime())) return "N/A";
    return format(d, fmt);
  } catch {
    return "N/A";
  }
};

const GuestList = ({ guests, onEdit, canEdit }: GuestListProps) => {
  if (guests.length === 0) {
    return (
      <div className="text-center py-10 text-muted-foreground">
        No guests found.
      </div>
    );
  }

  return (
    <>
      {/* Desktop Table View */}
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>PG Name</TableHead>
              <TableHead>Rent Status</TableHead>
              <TableHead>KYC Status</TableHead>
              <TableHead>Due Date / Exit Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {guests.map((guest) => (
              <TableRow key={guest.id}>
                <TableCell className="font-medium">
                  <Link
                    href={`/dashboard/tenant-management/${guest.id}`}
                    className="hover:underline text-primary"
                  >
                    {guest.name}
                  </Link>
                </TableCell>
                <TableCell>{guest.pgName}</TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <Badge
                      className={cn(
                        "capitalize border-transparent w-fit",
                        rentStatusColors[guest.rentStatus],
                      )}
                    >
                      {guest.rentStatus}
                    </Badge>
                    {formatBalanceBreakdown(guest) && (
                      <span className="text-[10px] text-rose-600 font-bold uppercase mt-1 leading-tight">
                        {formatBalanceBreakdown(guest)}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge
                    className={cn(
                      "capitalize border-transparent",
                      kycStatusColors[guest.kycStatus || "not-started"],
                    )}
                  >
                    {(guest.kycStatus || "not-started").replace("-", " ")}
                  </Badge>
                </TableCell>
                <TableCell>
                  {guest.isVacated
                    ? safeFormatDate(guest.exitDate, "do MMM, yyyy")
                    : safeFormatDate(guest.dueDate, "do MMM, yyyy")}
                </TableCell>
                <TableCell>
                  <Badge variant={guest.isVacated ? "destructive" : "default"}>
                    {guest.isVacated ? "Vacated" : "Active"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button aria-haspopup="true" size="icon" variant="ghost">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Toggle menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuItem asChild>
                        <Link href={`/dashboard/tenant-management/${guest.id}`}>
                          <User className="mr-2 h-4 w-4" /> View Profile
                        </Link>
                      </DropdownMenuItem>
                      {canEdit && (
                        <DropdownMenuItem onClick={() => onEdit(guest)}>
                          <Pencil className="mr-2 h-4 w-4" /> Edit Guest
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {/* Mobile Card View */}
      <div className="md:hidden grid gap-4">
        {guests.map((guest) => (
          <Sheet key={guest.id}>
            <SheetTrigger asChild>
              <div className="p-3 border rounded-lg flex flex-col gap-2 bg-muted/20 cursor-pointer active:scale-[0.98] transition-transform">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage
                        src={`https://placehold.co/32x32.png?text=${guest.name?.charAt(0) || "G"}`}
                      />
                      <AvatarFallback>
                        {guest.name?.charAt(0) || "G"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-bold text-sm text-primary">
                        {guest.name}
                      </p>
                      <p className="text-[10px] text-muted-foreground leading-tight">
                        {guest.pgName}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex justify-between items-end text-sm">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <IndianRupee className="w-4 h-4 text-muted-foreground" />
                      <div className="flex flex-col">
                        <span>
                          {guest.isVacated
                            ? `Exited on ${safeFormatDate(guest.exitDate, "do MMM")}`
                            : `Rent Due: ${safeFormatDate(guest.dueDate, "do MMM")}`}
                        </span>
                        {formatBalanceBreakdown(guest) && (
                          <span className="text-[10px] text-rose-600 font-bold uppercase">
                            Due: {formatBalanceBreakdown(guest)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-muted-foreground" />
                      <span>
                        KYC:{" "}
                        <span
                          className={cn(
                            "capitalize font-medium",
                            kycStatusColors[
                              guest.kycStatus || "not-started"
                            ]?.replace("bg-", "text-"),
                          )}
                        >
                          {(guest.kycStatus || "not-started").replace("-", " ")}
                        </span>
                      </span>
                    </div>
                  </div>
                  <Badge
                    className={cn(
                      "capitalize border-transparent",
                      guest.isVacated
                        ? "bg-destructive"
                        : rentStatusColors[guest.rentStatus],
                    )}
                  >
                    {guest.isVacated ? "Vacated" : guest.rentStatus}
                  </Badge>
                </div>
              </div>
            </SheetTrigger>
            <SheetContent
              side="bottom"
              className="h-auto max-h-[85dvh] rounded-t-[1.5rem] p-4 pb-safe flex flex-col gap-2 border-t-0 bg-background/95 backdrop-blur-xl"
            >
              <SheetHeader className="pb-2">
                <SheetTitle className="text-left">Actions</SheetTitle>
              </SheetHeader>
              <div className="flex flex-col gap-1">
                <SheetClose asChild>
                  <Button
                    variant="ghost"
                    className="justify-start font-normal h-12 text-base w-full"
                    asChild
                  >
                    <Link href={`/dashboard/tenant-management/${guest.id}`}>
                      <User className="mr-3 h-5 w-5 text-muted-foreground" />{" "}
                      View Profile
                    </Link>
                  </Button>
                </SheetClose>
                {canEdit && (
                  <SheetClose asChild>
                    <Button
                      variant="ghost"
                      className="justify-start font-normal h-12 text-base w-full"
                      onClick={() => onEdit(guest)}
                    >
                      <Pencil className="mr-3 h-5 w-5 text-muted-foreground" />{" "}
                      Edit Guest
                    </Button>
                  </SheetClose>
                )}
              </div>
            </SheetContent>
          </Sheet>
        ))}
      </div>
    </>
  );
};

export default function GuestManagementPage() {
  const dashboard = useDashboard();
  const {
    guests,
    pgs,
    isAppLoading: isLoading,
    initialDataLoaded,
    selectedPgId,
    currentUser,
    addGuestForm,
    handleAddGuestSubmit,
    handleOpenEditGuestDialog,
    handleOpenGeneralAddGuestDialog,
    featurePermissions,
  } = dashboard;

  const [isCsvUploaderOpen, setIsCsvUploaderOpen] = useState(false);
  const PAGE_SIZE = 20;
  const [visibleActiveCount, setVisibleActiveCount] = useState(PAGE_SIZE);
  const [visibleExitedCount, setVisibleExitedCount] = useState(PAGE_SIZE);

  const [activeGuests, exitedGuests] = useMemo(() => {
    const active: Guest[] = [];
    const exited: Guest[] = [];
    const source = selectedPgId
      ? guests.filter((g) => g.pgId === selectedPgId)
      : guests;

    source.forEach((guest) => {
      if (guest.isVacated) {
        exited.push(guest);
      } else {
        active.push(guest);
      }
    });

    return [active, exited];
  }, [guests, selectedPgId]);

  const canEditGuests = useMemo(() => {
    return canAccess(featurePermissions, currentUser?.role, "guests", "edit");
  }, [featurePermissions, currentUser]);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-7 w-32" />
              <Skeleton className="h-5 w-48" />
            </div>
            <Skeleton className="h-10 w-36" />
          </CardHeader>
          <CardContent>
            {/* Mobile skeleton */}
            <div className="md:hidden space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="p-4 border rounded-lg space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="space-y-1">
                        <Skeleton className="h-5 w-24" />
                        <Skeleton className="h-4 w-16" />
                      </div>
                    </div>
                    <Skeleton className="h-6 w-6" />
                  </div>
                  <div className="flex justify-between items-end">
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                    <Skeleton className="h-6 w-16 rounded-full" />
                  </div>
                </div>
              ))}
            </div>
            {/* Desktop skeleton */}
            <div className="hidden md:block space-y-2">
              <Skeleton className="h-12 w-full rounded-md" />
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (pgs.length === 0) {
    return (
      <div className="flex items-center justify-center h-full min-h-[calc(100vh-250px)]">
        <div className="text-center p-8 bg-card rounded-lg border">
          <Building className="mx-auto h-12 w-12 text-muted-foreground" />
          <h2 className="mt-4 text-xl font-semibold">Add a Property First</h2>
          <p className="mt-2 text-muted-foreground max-w-sm">
            You need to add a property before you can manage guests.
          </p>
          <Button asChild className="mt-4">
            <Link href="/dashboard/pg-management">Add Property</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Access feature="guests" action="view">
      <div className="flex flex-col gap-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex flex-col gap-0.5">
              <CardTitle className="text-lg md:text-2xl">
                Guest Management
              </CardTitle>
              <CardDescription className="hidden md:block">
                You are managing {guests.length} total guests.
              </CardDescription>
            </div>
            <Access feature="guests" action="add">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsCsvUploaderOpen(true)}
                >
                  <Upload className="md:mr-2 h-4 w-4" />
                  <span className="hidden md:inline">Import CSV</span>
                </Button>
                <Button size="sm" onClick={handleOpenGeneralAddGuestDialog}>
                  <PlusCircle className="md:mr-2 h-4 w-4" />
                  <span className="hidden md:inline">Add New Guest</span>
                  <span className="md:hidden">Add</span>
                </Button>
              </div>
            </Access>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="active-guests" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="active-guests">Active Guests</TabsTrigger>
                <TabsTrigger value="exited-guests">Guest History</TabsTrigger>
              </TabsList>
              <TabsContent value="active-guests" className="mt-4 space-y-4">
                <GuestList
                  guests={activeGuests.slice(0, visibleActiveCount)}
                  onEdit={handleOpenEditGuestDialog}
                  canEdit={canEditGuests}
                />
                {activeGuests.length > visibleActiveCount && (
                  <div className="flex justify-center pt-4">
                    <Button
                      variant="outline"
                      onClick={() =>
                        setVisibleActiveCount((prev) => prev + PAGE_SIZE)
                      }
                    >
                      Load More ({activeGuests.length - visibleActiveCount}{" "}
                      remaining)
                    </Button>
                  </div>
                )}
              </TabsContent>
              <TabsContent value="exited-guests" className="mt-4 space-y-4">
                <GuestList
                  guests={exitedGuests.slice(0, visibleExitedCount)}
                  onEdit={handleOpenEditGuestDialog}
                  canEdit={canEditGuests}
                />
                {exitedGuests.length > visibleExitedCount && (
                  <div className="flex justify-center pt-4">
                    <Button
                      variant="outline"
                      onClick={() =>
                        setVisibleExitedCount((prev) => prev + PAGE_SIZE)
                      }
                    >
                      Load More ({exitedGuests.length - visibleExitedCount}{" "}
                      remaining)
                    </Button>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      <TenantCsvUploader
        open={isCsvUploaderOpen}
        onOpenChange={setIsCsvUploaderOpen}
        onSuccess={() => window.location.reload()}
      />

      <AddGuestDialog {...dashboard} />

      <EditGuestDialog {...dashboard} />
    </Access>
  );
}
