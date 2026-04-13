
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
import { UserCircle, SwitchCamera, Loader2 } from 'lucide-react';
import { auth } from '@/lib/firebase';
import { initializeUser } from '@/lib/slices/userSlice';

export default function RoleSwitcher() {
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

  if (!canSwitch) return null;

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

      // Refresh Firebase Token to pick up new custom claims
      if (auth?.currentUser) {
        await auth.currentUser.getIdToken(true);
        // Re-initialize user state in Redux
        await dispatch(initializeUser(auth.currentUser));
      }

      // Redirect based on new role
      if (targetRole === 'tenant') {
        router.push('/tenants/my-pg');
      } else {
        router.push('/dashboard');
      }
      
      router.refresh();
    } catch (error) {
      console.error('Error switching role:', error);
    } finally {
      setIsSwitching(false);
    }
  };

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
