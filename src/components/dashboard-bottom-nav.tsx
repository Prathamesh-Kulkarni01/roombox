"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  MoreHorizontal,
  Home,
  BookUser,
  MessageSquareWarning,
  CreditCard,
  ChevronRight,
  Wallet,
  Building,
  UserCircle,
  LogOut,
  LayoutGrid,
  BedDouble,
  Plus,
  LayoutDashboard,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { allNavItems } from "@/lib/navigation";
import { useAppSelector, useAppDispatch } from "@/lib/hooks";
import { useAccessibleNav } from "@/lib/hooks/use-accessible-nav";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "@/context/language-context";
import { logoutUser } from "@/lib/slices/userSlice";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import { Separator } from "./ui/separator";

export default function DashboardBottomNav() {
  const pathname = usePathname();
  const dispatch = useAppDispatch();
  const {
    accessibleNavGroups,
    isItemAccessible,
    isTrialEnded,
    hasNoProperties,
    currentUser,
    currentPlan,
    pgs,
  } = useAccessibleNav();
  const { complaints = [] } = useAppSelector((state) => state.complaints || {});
  const { guests = [] } = useAppSelector((state) => state.guests || {});
  const { selectedPgId } = useAppSelector((state) => state.app || {});
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const { t } = useTranslation();

  const unreadComplaints = complaints.filter((c) => c.status === "open").length;

  if (!currentUser) return null;

  const getInsight = (href: string) => {
    if (!currentUser || isTrialEnded || hasNoProperties) return undefined;

    const filteredGuests = selectedPgId
      ? guests.filter((g) => g.pgId === selectedPgId)
      : guests;
    const filteredComplaints = selectedPgId
      ? complaints.filter((c) => c.pgId === selectedPgId)
      : complaints;
    const filteredPgs = selectedPgId
      ? pgs.filter((p) => p.id === selectedPgId)
      : pgs;
    // ... (rest of getInsight stays same)
    if (href === "/dashboard/tenant-management") {
      const activeCount = (filteredGuests || []).filter(
        (g) => g && !g.isVacated,
      ).length;
      return activeCount > 0
        ? { label: String(activeCount), variant: "default" as const }
        : undefined;
    }
    if (href === "/dashboard/complaints") {
      const openCount = (filteredComplaints || []).filter(
        (c) => c && c.status === "open",
      ).length;
      return openCount > 0
        ? { label: String(openCount), variant: "destructive" as const }
        : undefined;
    }
    if (
      href === "/dashboard/pg-management" ||
      href.startsWith("/dashboard/pg-management/")
    ) {
      const totalRooms = (filteredPgs || []).reduce(
        (acc, p) => acc + (p?.totalRooms || 0),
        0,
      );
      return totalRooms > 0
        ? { label: String(totalRooms), variant: "secondary" as const }
        : undefined;
    }
    if (href === "/dashboard/rent-passbook") {
      const totalDues = (filteredGuests || []).reduce(
        (acc, g) => acc + (g?.balance || 0),
        0,
      );
      return totalDues > 0
        ? {
            label:
              totalDues >= 1000
                ? `${(totalDues / 1000).toFixed(1)}k`
                : String(totalDues),
            variant: "destructive" as const,
          }
        : undefined;
    }
    if (href === "/dashboard/wallet") {
      const balance = currentUser?.wallet?.balance || 0;
      return {
        label: `₹${balance}`,
        variant: balance < 100 ? "destructive" : ("default" as any),
      };
    }
    return undefined;
  };

  const mainNavItems = [
    {
      href: "/dashboard",
      label: "nav_dashboard_short",
      icon: LayoutDashboard,
      feature: "core",
    },
    {
      href: "/dashboard/pg-management/rooms",
      label: "manage_rooms_short",
      icon: BedDouble,
      feature: "properties",
    },
    {
      href: "/dashboard/rent-passbook",
      label: "nav_rentbook_short",
      icon: BookUser,
      feature: "finances",
    },
    {
      href: "/dashboard/complaints",
      label: "nav_complaints_short",
      icon: MessageSquareWarning,
      feature: "complaints",
    },
  ];

  const visibleItems = mainNavItems
    .filter((item) => isItemAccessible(item as any))
    .map((item) => {
      // Direct 'Rooms' link to selected property management page
      let resolvedHref = item.href;
      if (item.href === "/dashboard/pg-management/rooms") {
        const targetPgId = selectedPgId || (pgs.length > 0 ? pgs[0].id : null);
        resolvedHref = targetPgId
          ? `/dashboard/pg-management/${targetPgId}`
          : "/dashboard/pg-management";
      }

      return {
        ...item,
        href: resolvedHref,
        insight: getInsight(resolvedHref),
      };
    });

  const visibleHrefs = visibleItems.map((i) => i.href);
  const accessibleMoreNavGroups = accessibleNavGroups
    .map((group) => ({
      ...group,
      items: group.items.filter(
        (item) =>
          !visibleHrefs.includes(item.href) && item.href !== "/dashboard",
      ),
    }))
    .filter((group) => group.items.length > 0);

  const handleLinkClick = () => {
    setIsSheetOpen(false);
  };

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 glass border-t border-border/50 z-50 pb-safe">
      <nav className="grid grid-cols-5 h-16 items-center px-1">
        {visibleItems.map((item) => {
          const isActive =
            item.href === "/dashboard" ||
            item.href === "/dashboard/pg-management"
              ? pathname === item.href
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={handleLinkClick}
              className={cn(
                "flex flex-col items-center justify-center gap-1 text-muted-foreground transition-colors h-full relative z-10",
                isActive ? "text-primary" : "hover:text-primary",
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="bottomNavActive"
                  className="absolute inset-x-1 inset-y-1.5 bg-primary/10 rounded-xl -z-10"
                  initial={false}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}
              <motion.div whileTap={{ scale: 0.9 }} className="relative">
                {item.insight && (
                  <Badge
                    variant={item.insight.variant}
                    className={cn(
                      "absolute -top-2 -right-2 h-4 min-w-[1rem] px-1 flex items-center justify-center rounded-full text-[9px] border-2 border-background font-bold shadow-sm",
                    )}
                  >
                    {item.insight.label}
                  </Badge>
                )}
                <item.icon
                  className={cn("h-5 w-5", isActive && "text-primary")}
                />
              </motion.div>
              <span
                className={cn(
                  "text-[10px] font-semibold tracking-tight",
                  isActive && "text-primary",
                )}
              >
                {t(item.label as any)}
              </span>
            </Link>
          );
        })}

        <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
          <SheetTrigger asChild>
            <motion.button
              whileTap={{ scale: 0.9 }}
              className="flex flex-col items-center justify-center gap-1 text-muted-foreground transition-colors h-full hover:text-primary"
            >
              <MoreHorizontal className="h-5 w-5" />
              <span className="text-[10px] font-semibold tracking-tight">
                {t("more")}
              </span>
            </motion.button>
          </SheetTrigger>
          <SheetContent
            side="bottom"
            className="h-auto max-h-[90dvh] flex flex-col rounded-t-[2.5rem] p-0 border-t-0 glass pb-safe"
          >
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-12 h-1.5 bg-muted-foreground/20 rounded-full" />
            </div>

            <div className="px-6 py-5 flex items-center gap-4">
              <div className="relative">
                <Avatar className="h-14 w-14 border-2 border-background shadow-xl ring-1 ring-primary/10">
                  <AvatarImage
                    src={currentUser.avatarUrl}
                    alt={currentUser.name}
                  />
                  <AvatarFallback className="bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-black text-sm">
                    {(currentUser.name || "U").slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-500 border-2 border-background rounded-full shadow-lg" />
              </div>
              <div className="flex-1 overflow-hidden">
                <div className="flex items-center gap-2">
                  <h3 className="font-black text-xl tracking-tight truncate">
                    {currentUser.name}
                  </h3>
                  <Badge
                    variant="outline"
                    className="text-[9px] font-black uppercase tracking-tighter h-4 px-1.5 bg-primary/5 text-primary border-primary/20"
                  >
                    {currentPlan.name}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground font-bold mt-0.5 flex items-center gap-2">
                  {t(currentUser.role as any)}
                  <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                  <span className="truncate">{currentUser.email}</span>
                </p>
              </div>
            </div>

            <Separator className="bg-border/50" />

            <div className="flex-1 overflow-y-auto p-4 pt-2">
              {accessibleMoreNavGroups.map((group) => (
                <div key={group.title} className="py-2">
                  <h4 className="px-2 mb-2 text-sm font-semibold text-muted-foreground">
                    {t(group.title as any)}
                  </h4>
                  <div className="space-y-1">
                    {group.items.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={handleLinkClick}
                        className={cn(
                          "flex items-center gap-4 rounded-2xl p-4 text-left transition-all active:scale-[0.98]",
                          pathname.startsWith(item.href)
                            ? "bg-primary/10 text-primary shadow-inner"
                            : "text-foreground/80 hover:text-primary hover:bg-muted/50",
                        )}
                      >
                        <div
                          className={cn(
                            "flex items-center justify-center w-10 h-10 rounded-lg shrink-0",
                            pathname.startsWith(item.href)
                              ? "bg-primary/20 text-primary"
                              : "bg-muted text-muted-foreground",
                          )}
                        >
                          <item.icon className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-sm">
                            {t(item.label as any)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {t(item.description as any)}
                          </p>
                        </div>
                        <ChevronRight className="w-5 h-5 text-muted-foreground ml-auto" />
                      </Link>
                    ))}
                  </div>
                </div>
              ))}

              <div className="mt-4 mb-8">
                <Button
                  variant="destructive"
                  className="w-full justify-start gap-4 h-14 rounded-2xl shadow-lg shadow-destructive/10"
                  onClick={() => {
                    handleLinkClick();
                    dispatch(logoutUser());
                  }}
                >
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-white/20">
                    <LogOut className="h-5 w-5" />
                  </div>
                  <span className="font-bold">{t("logout")}</span>
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </nav>
    </div>
  );
}
