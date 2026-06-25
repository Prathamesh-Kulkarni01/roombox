"use client";

import { useEffect, useState } from "react";
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
import { logoutUser, setCurrentUser } from "@/lib/slices/userSlice";
import InstallForceOverlay from "@/components/InstallForceOverlay";
import { useRouteGuard } from "@/hooks/useRouteGuard";
import { useClientAutomation } from "@/hooks/useClientAutomation";
import GodModeGuard, { getActiveGodModeSession, clearGodModeSession } from "@/components/GodModeGuard";
import type { GodModeSession } from "@/components/GodModeGuard";
import { adminLogImpersonation } from "@/lib/actions/adminActions";


export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useClientAutomation();
  const dispatch = useAppDispatch();
  const { t } = useTranslation();
  const { currentUser } = useAppSelector((state) => state.user);
  const { isLoading } = useAppSelector((state) => state.app);
  const router = useRouter();
  const pathname = usePathname();
  const [impersonating, setImpersonating] = useState(false);
  const [godModeSession, setGodModeSession] = useState<GodModeSession | null>(null);


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

  // Intercept and Hijack session for Admin God Mode Impersonation
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const impOwnerId = sessionStorage.getItem('impersonate_owner_id');
    const impOwnerName = sessionStorage.getItem('impersonate_owner_name');
    
    if (currentUser && currentUser.role === 'admin' && impOwnerId) {
      console.log(`[Impersonation Engine] Intercepting Admin Session for Target Owner: ${impOwnerId}`);
      dispatch(setCurrentUser({
        ...currentUser,
        id: impOwnerId,
        name: impOwnerName || 'Impersonated Owner',
        role: 'owner',
        isOnboarded: true,
      }));
      setImpersonating(true);
      // Load the typed session for the timer guard
      setGodModeSession(getActiveGodModeSession());
    } else if (currentUser && currentUser.role === 'owner' && impOwnerId) {
      setImpersonating(true);
      setGodModeSession(getActiveGodModeSession());
    }

  }, [currentUser, dispatch]);

  useEffect(() => {
    if (isLoading) return;

    if (!currentUser) {
      router.replace("/login");
      return;
    }

    // Bypass redirect if impersonation storage flag is present
    const isImpersonatingActive = typeof window !== 'undefined' && !!sessionStorage.getItem('impersonate_owner_id');
    if (isImpersonatingActive) {
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

  const handleExitImpersonation = (expired?: boolean) => {
    // Write audit record for session end
    const session = getActiveGodModeSession();
    if (session && session.adminId) {
      adminLogImpersonation(
        session.adminId,
        session.adminName,
        session.targetOwnerId,
        session.targetOwnerName,
        expired ? 'IMPERSONATION_EXPIRED' : 'IMPERSONATION_ENDED',
        session.sessionId
      ).catch(console.error);
    }

    clearGodModeSession();
    sessionStorage.removeItem('impersonate_owner_id');
    sessionStorage.removeItem('impersonate_owner_name');
    sessionStorage.removeItem('impersonate_reason');
    sessionStorage.removeItem('impersonate_admin_backup');
    
    window.location.href = '/admin/dashboard';
  };


  if (
    isLoading ||
    !currentUser ||
    (!allowedDashboardRoles.includes(currentUser.role) && !impersonating)
  ) {
    return (
      <div className="flex min-h-[calc(100vh-56px)] bg-slate-950">
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

  const impersonatedOwnerName = typeof window !== 'undefined' ? sessionStorage.getItem('impersonate_owner_name') : null;

  return (
    <>
      {impersonating && godModeSession && (
        <GodModeGuard session={godModeSession} onExit={handleExitImpersonation} />
      )}
      {/* Fallback banner for impersonation without a typed session (legacy) */}
      {impersonating && !godModeSession && (
        <div className="w-full bg-gradient-to-r from-amber-600 via-rose-600 to-violet-600 text-white text-[11px] md:text-xs font-black py-2.5 px-4 flex items-center justify-between gap-4 sticky top-0 z-50 shadow-md">
          <span className="px-1.5 py-0.5 rounded bg-black/35 animate-pulse text-[9px] border border-white/20">⚠️ GOD MODE ACTIVE</span>
          <Button onClick={() => handleExitImpersonation(false)} size="sm" className="bg-white hover:bg-slate-100 text-slate-950 font-extrabold text-[10px] h-7 px-3.5 rounded-lg">
            Exit God Mode
          </Button>
        </div>
      )}

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
