
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { UserRole } from '@/lib/types';
import { useAppDispatch, useAppSelector } from '@/lib/hooks';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserCircle, SwitchCamera, Loader2, ChevronRight } from 'lucide-react';
import { auth } from '@/lib/firebase';
import { initializeUser } from '@/lib/slices/userSlice';
import { cn, getRedirectUrlForSubdomain } from '@/lib/utils';

interface RoleSwitcherProps {
  variant?: 'default' | 'ghost' | 'list';
}

export default function RoleSwitcher({ variant = 'default' }: RoleSwitcherProps) {
  const { currentUser } = useAppSelector((state) => state.user);
  const dispatch = useAppDispatch();
  const router = useRouter();
  const [isSwitching, setIsSwitching] = useState(false);

  if (!currentUser) return null;

  const hasStaffProfiles = (currentUser.activeStaffProfiles?.length || 0) > 0;
  const hasTenancies = (currentUser.activeTenancies?.length || 0) > 0;
  const isOwner = currentUser.role === 'owner';

  // Only show if user has at least two distinct role types they can switch between
  const canSwitch = (isOwner && hasTenancies) || (hasStaffProfiles && hasTenancies) || (isOwner && hasStaffProfiles);

  const handleSwitch = async (targetRole: string, pgId?: string) => {
    try {
      setIsSwitching(true);
      const token = await auth?.currentUser?.getIdToken();
      const response = await fetch('/api/auth/switch-context', {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ targetRole, targetPgId: pgId }),
      });

      if (!response.ok) throw new Error('Failed to switch context');

      const data = await response.json();
      const subdomain = data.subdomain || null;

      // Refresh Firebase Token to pick up new custom claims
      if (auth?.currentUser) {
        await auth.currentUser.getIdToken(true);
        // Re-initialize user state in Redux
        await dispatch(initializeUser(auth.currentUser));
      }

      // Redirect based on new role with subdomain sync
      const targetPath = targetRole === 'tenant' ? '/tenants/my-pg' : '/dashboard';
      const redirectUrl = getRedirectUrlForSubdomain(targetRole, subdomain, targetPath);
      
      window.location.href = redirectUrl;
    } catch (error) {
      console.error('Error switching role:', error);
    } finally {
      setIsSwitching(false);
    }
  };

  if (variant === 'list') {
    return (
      <div className="space-y-2 w-full">
        {isOwner && (
          <Button 
            variant={currentUser.role === 'owner' ? "default" : "outline"}
            className={cn(
              "w-full justify-start h-12 rounded-2xl gap-3 px-4 transition-all",
              currentUser.role === 'owner' ? "shadow-md shadow-primary/20" : "bg-muted/10 border-border/40"
            )}
            onClick={() => currentUser.role !== 'owner' && handleSwitch('owner')}
            disabled={isSwitching || currentUser.role === 'owner'}
          >
             <span className="text-lg">👑</span>
             <span className="font-bold text-sm">Owner Dashboard</span>
             {currentUser.role === 'owner' && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white" />}
          </Button>
        )}

        {currentUser.activeStaffProfiles?.map((profile: any) => (
          <Button 
            key={profile.staffId}
            variant={currentUser.role === profile.role ? "default" : "outline"}
            className={cn(
              "w-full justify-start h-12 rounded-2xl gap-3 px-4 transition-all",
              currentUser.role === profile.role ? "shadow-md shadow-primary/20" : "bg-muted/10 border-border/40"
            )}
            onClick={() => currentUser.role !== profile.role && handleSwitch(profile.role, profile.pgIds?.[0])}
            disabled={isSwitching || currentUser.role === profile.role}
          >
             <span className="text-lg">🛠️</span>
             <span className="font-bold text-sm capitalize">{profile.role} View</span>
             {currentUser.role === profile.role && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white" />}
          </Button>
        ))}

        {currentUser.activeTenancies?.map((tenancy: any) => (
          <Button 
            key={tenancy.guestId}
            variant={currentUser.role === 'tenant' && currentUser.pgId === tenancy.pgId ? "default" : "outline"}
            className={cn(
              "w-full justify-start h-12 rounded-2xl gap-3 px-4 transition-all",
              currentUser.role === 'tenant' && currentUser.pgId === tenancy.pgId ? "shadow-md shadow-primary/20" : "bg-muted/10 border-border/40"
            )}
            onClick={() => !(currentUser.role === 'tenant' && currentUser.pgId === tenancy.pgId) && handleSwitch('tenant', tenancy.pgId)}
            disabled={isSwitching || (currentUser.role === 'tenant' && currentUser.pgId === tenancy.pgId)}
          >
             <span className="text-lg">🏠</span>
             <span className="font-bold text-sm truncate max-w-[150px]">{tenancy.pgName || 'Tenant'} View</span>
             {currentUser.role === 'tenant' && currentUser.pgId === tenancy.pgId && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white" />}
          </Button>
        ))}
      </div>
    );
  }

  if (!canSwitch) {
    return (
      <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-muted/30 border border-border/40 text-muted-foreground text-xs font-bold uppercase tracking-wider">
        {currentUser.role}
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2 px-2 h-9 md:h-10 hover:bg-primary/10 transition-colors" disabled={isSwitching}>
          {isSwitching ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserCircle className="h-4 w-4" />}
          <span className="hidden sm:inline font-medium text-xs md:text-sm capitalize">{currentUser.role}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Switch Dashboard View</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {/* Owner Option */}
        {isOwner && currentUser.role !== 'owner' && (
          <DropdownMenuItem onClick={() => handleSwitch('owner')}>
             👑 Owner Dashboard
          </DropdownMenuItem>
        )}

        {/* Staff Options */}
        {currentUser.activeStaffProfiles?.map((profile: any) => (
          <DropdownMenuItem 
            key={profile.staffId} 
            onClick={() => handleSwitch(profile.role, profile.pgIds?.[0])}
            disabled={currentUser.role === profile.role}
          >
             🛠️ {profile.role} View
          </DropdownMenuItem>
        ))}

        {/* Tenant Options */}
        {currentUser.activeTenancies?.map((tenancy: any) => (
          <DropdownMenuItem 
            key={tenancy.guestId} 
            onClick={() => handleSwitch('tenant', tenancy.pgId)}
            disabled={currentUser.role === 'tenant' && currentUser.pgId === tenancy.pgId}
          >
             🏠 {tenancy.pgName || 'Tenant'} View
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
