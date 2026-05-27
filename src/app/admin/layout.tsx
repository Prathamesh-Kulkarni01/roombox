"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAppSelector, useAppDispatch } from "@/lib/hooks";
import { logoutUser } from "@/lib/slices/userSlice";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Shield,
  Menu,
  LogOut,
  Home,
  BarChart3,
  Users,
  Building,
  Settings,
  HeartHandshake,
  FileText,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { currentUser } = useAppSelector((state) => state.user);
  const { isLoading } = useAppSelector((state) => state.app);
  const router = useRouter();
  const pathname = usePathname();
  const dispatch = useAppDispatch();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && (!currentUser || currentUser.role !== "admin")) {
      router.replace("/login");
    }
  }, [isLoading, currentUser, router]);

  const handleLogout = async () => {
    await dispatch(logoutUser());
    router.push("/login");
  };

  if (isLoading || !currentUser || currentUser.role !== "admin") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 p-4">
        <div className="space-y-4 w-full max-w-md text-center">
          <Shield className="h-12 w-12 text-primary animate-pulse mx-auto" />
          <p className="text-sm text-muted-foreground animate-pulse">
            Initializing RoomBox Secure Console...
          </p>
          <Skeleton className="h-8 w-full rounded-lg bg-card/40" />
        </div>
      </div>
    );
  }

  const navLinks = [
    { href: "/admin/dashboard", label: "Console Home", icon: Home },
  ];

  const adminInitials = currentUser.name
    ? currentUser.name
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
    : "AD";

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-slate-950 border-r border-slate-800 text-slate-100">
      {/* Brand Header */}
      <div className="flex h-16 items-center px-6 border-b border-slate-900 bg-slate-950/80 backdrop-blur-md">
        <Link
          href="/admin/dashboard"
          className="flex items-center gap-2.5 font-extrabold text-primary"
        >
          <div className="p-1.5 rounded-lg bg-gradient-to-tr from-violet-600 to-cyan-500 shadow-md shadow-violet-500/25">
            <Shield className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
            RoomBox <span className="font-light text-cyan-400">Admin</span>
          </span>
        </Link>
      </div>

      {/* Admin Identity Card */}
      <div className="p-4 border-b border-slate-900 bg-slate-900/10">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-900/40 border border-slate-800/60 backdrop-blur-md">
          <Avatar className="h-10 w-10 border border-violet-500/35 ring-2 ring-violet-500/10">
            <AvatarImage src={currentUser.avatarUrl} />
            <AvatarFallback className="bg-gradient-to-tr from-violet-600 to-indigo-600 text-white font-bold text-xs">
              {adminInitials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-bold text-slate-100 truncate">
              {currentUser.name || "System Admin"}
            </h4>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <Badge
                variant="outline"
                className="text-[9px] px-1.5 py-0 border-violet-500/30 text-violet-400 bg-violet-500/5 font-extrabold tracking-wide uppercase"
              >
                Super Admin
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 py-4 overflow-y-auto px-3 space-y-1">
        {navLinks.map((link) => {
          const Icon = link.icon;
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                isActive
                  ? "bg-gradient-to-r from-violet-600/90 to-indigo-600/90 text-white shadow-md shadow-violet-500/15 border-l-4 border-l-cyan-400"
                  : "text-slate-400 hover:text-slate-100 hover:bg-slate-900/60"
              }`}
            >
              <span className="flex items-center gap-3">
                <Icon
                  className={`w-4 h-4 ${isActive ? "text-cyan-400" : "text-slate-400"}`}
                />
                {link.label}
              </span>
              <ChevronRight
                className={`w-3.5 h-3.5 transition-transform ${isActive ? "text-white" : "text-slate-600"}`}
              />
            </Link>
          );
        })}
      </div>

      {/* Footer Controls */}
      <div className="p-4 border-t border-slate-900 space-y-2 bg-slate-900/10">
        <Link href="/dashboard" className="w-full" passHref>
          <Button
            variant="outline"
            size="sm"
            className="w-full bg-transparent border-slate-800 hover:bg-slate-900 text-slate-300 hover:text-white transition-all text-xs font-bold h-9"
          >
            <Home className="w-3.5 h-3.5 mr-2 text-cyan-400" />
            Landlord Workspace
          </Button>
        </Link>
        <Button
          onClick={handleLogout}
          variant="ghost"
          size="sm"
          className="w-full text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 justify-start px-3 text-xs font-bold h-9"
        >
          <LogOut className="w-3.5 h-3.5 mr-2" />
          Terminate Session
        </Button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-[hsl(224,71%,4%)] text-slate-100 font-sans selection:bg-violet-500/30 selection:text-white">
      {/* Desktop Persistent Sidebar */}
      <aside className="w-64 flex-col shrink-0 hidden md:flex border-r border-slate-800 bg-slate-950">
        <SidebarContent />
      </aside>

      {/* Main Responsive Shell Container */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Sticky Mobile/Top Header */}
        <header className="h-16 flex items-center justify-between px-4 md:px-8 border-b border-slate-900 bg-slate-950/80 backdrop-blur-md sticky top-0 z-40">
          <div className="flex items-center gap-3">
            {/* Hamburger Sheet Toggle on Mobile */}
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden text-slate-300 hover:bg-slate-900 hover:text-white"
                >
                  <Menu className="h-5.5 w-5.5" />
                </Button>
              </SheetTrigger>
              <SheetContent
                side="left"
                className="p-0 w-64 border-r border-slate-800 bg-slate-950 text-slate-100"
              >
                <SheetHeader className="sr-only">
                  <SheetTitle>Admin Navigation Drawer</SheetTitle>
                </SheetHeader>
                <SidebarContent />
              </SheetContent>
            </Sheet>

            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-extrabold text-violet-400 tracking-widest hidden md:block">
                RoomBox Core System
              </span>
              <h2 className="text-sm md:text-base font-extrabold text-slate-200 tracking-tight flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Administrative Node:{" "}
                <span className="text-cyan-400">Secure Mode</span>
              </h2>
            </div>
          </div>

          {/* Top Bar Quick Controls */}
          <div className="flex items-center gap-2">
            <Link href="/dashboard" className="hidden sm:inline-block">
              <Button
                size="sm"
                variant="outline"
                className="border-slate-800 hover:bg-slate-900 text-slate-300 text-xs font-bold"
              >
                Landlord Area
              </Button>
            </Link>
            <Avatar className="h-8.5 w-8.5 border border-violet-500/20 md:hidden">
              <AvatarImage src={currentUser.avatarUrl} />
              <AvatarFallback className="bg-violet-600 text-white font-bold text-xs">
                {adminInitials}
              </AvatarFallback>
            </Avatar>
          </div>
        </header>

        {/* Dynamic Main Workspace Content */}
        <main className="flex-1 p-3 md:p-6 lg:p-8 bg-slate-950/50 overflow-auto scrollbar-thin">
          {children}
        </main>
      </div>
    </div>
  );
}
