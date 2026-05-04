"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import DashboardSidebar from "@/components/dashboard-sidebar";
import DashboardBottomNav from "@/components/dashboard-bottom-nav";
import { Skeleton } from "@/components/ui/skeleton";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { useTranslation } from "@/context/language-context";
import Header from "@/components/header";
import { Card } from "@/components/ui/card";
import { isAfter, parseISO, differenceInDays } from "date-fns";
import { Button } from "@/components/ui/button";
import type { UserRole } from "@/lib/types";
import Link from "next/link";
import { ShieldAlert, Star, Crown } from "lucide-react";
import { logoutUser } from "@/lib/slices/userSlice";
import InstallForceOverlay from "@/components/InstallForceOverlay";
import { useRouteGuard } from "@/hooks/useRouteGuard";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();
  const { currentUser } = useAppSelector((state) => state.user);
  const { isLoading } = useAppSelector((state) => state.app);
  const router = useRouter();
  const pathname = usePathname();

  // Enforce route-level permissions for staff users
  useRouteGuard();

  const allowedDashboardRoles: UserRole[] = [
    "owner",
    "manager",
    "cook",
    "cleaner",
    "security",
    "other",
  ];

  useEffect(() => {
    if (isLoading) return;

    if (!currentUser) {
      router.replace("/login");
      return;
    }

    if (currentUser.role === "admin") {
      router.replace("/admin/dashboard");
    } else if (currentUser.role === "unassigned") {
      router.replace("/complete-profile");
    } else if (currentUser.role === "owner" && !currentUser.isOnboarded) {
      router.replace("/complete-profile");
    } else if (currentUser.role === "tenant") {
      router.replace("/tenants/my-pg");
    } else if (!allowedDashboardRoles.includes(currentUser.role)) {
      router.replace("/login");
    }
  }, [isLoading, currentUser, router]);

  if (
    isLoading ||
    !currentUser ||
    !allowedDashboardRoles.includes(currentUser.role)
  ) {
    return (
      <div className="flex min-h-[calc(100vh-56px)]">
        <div className="w-64 flex-col border-r bg-muted hidden md:flex p-4">
          <Skeleton className="h-8 w-3/4 mb-6" />
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
        <main className="flex-1 p-4 bg-muted/40">
          <Skeleton className="h-full w-full" />
        </main>
      </div>
    );
  }

  const isOwner = currentUser?.role === "owner";

  return (
    <>
      <div className="flex min-h-[calc(100vh-56px)]">
        <DashboardSidebar />
        <div className="flex flex-1 flex-col overflow-auto">
          <main className="flex-1 p-4 pb-20 md:pb-4 overflow-x-hidden">
            {children}
          </main>
        </div>
        <DashboardBottomNav />
      </div>
      <InstallForceOverlay />
    </>
  );
}
