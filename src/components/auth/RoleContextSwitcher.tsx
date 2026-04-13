/**
 * RoleContextSwitcher
 * Allows users with multiple memberships (Tenant/Staff) across properties
 * to select which context they want to enter.
 */
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { User, Building2, ShieldCheck, Mail, ArrowRight } from 'lucide-react';
import { Loader2 } from 'lucide-react';

interface RoleContextSwitcherProps {
  user: any;
  onSelect: (role: string, pgId: string) => Promise<void>;
  isProcessing: boolean;
}

export const RoleContextSwitcher: React.FC<RoleContextSwitcherProps> = ({ user, onSelect, isProcessing }) => {
  const tenancies = user?.activeTenancies || [];
  const staffProfiles = user?.activeStaffProfiles || [];

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-xl font-bold tracking-tight">Select Context</h2>
        <p className="text-sm text-muted-foreground">Multiple profiles found. Choose which one to access.</p>
      </div>

      <div className="grid gap-4 max-h-[400px] overflow-y-auto pr-2 scrollbar-thin">
        {/* Staff Profiles */}
        {staffProfiles.map((p: any, i: number) => (
          <Card key={`staff-${i}`} className="relative group cursor-pointer hover:border-primary/50 transition-all shadow-sm hover:shadow-md" onClick={() => !isProcessing && onSelect(p.role, p.pgIds?.[0] || p.pgId)}>
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="bg-primary/10 p-2 rounded-lg group-hover:bg-primary/20 transition-colors">
                  <ShieldCheck className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <div className="text-sm font-bold capitalize">{p.role} Profile</div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <Building2 className="w-3 h-3" /> Managing Property
                  </div>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </CardContent>
          </Card>
        ))}

        {/* Tenant/Tenancy Profiles */}
        {tenancies.map((t: any, i: number) => (
          <Card key={`tenant-${i}`} className="relative group cursor-pointer hover:border-primary/50 transition-all shadow-sm hover:shadow-md" onClick={() => !isProcessing && onSelect('tenant', t.pgId)}>
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="bg-green-500/10 p-2 rounded-lg group-hover:bg-green-500/20 transition-colors">
                  <User className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <div className="text-sm font-bold">Resident Context</div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <Building2 className="w-3 h-3" /> {t.pgName || 'Your PG'}
                  </div>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </CardContent>
          </Card>
        ))}
        
        {/* If user record has a legacy role that isn't in lists, show it as fallback */}
        {staffProfiles.length === 0 && tenancies.length === 0 && user?.role && (
           <Card className="relative group cursor-pointer hover:border-primary/50 transition-all shadow-sm hover:shadow-md" onClick={() => !isProcessing && onSelect(user.role, user.pgId)}>
             <CardContent className="p-4 flex items-center justify-between">
               <div className="flex items-center gap-4">
                 <div className="bg-primary/10 p-2 rounded-lg group-hover:bg-primary/20 transition-colors">
                   <ShieldCheck className="w-5 h-5 text-primary" />
                 </div>
                 <div>
                   <div className="text-sm font-bold capitalize">Default {user.role}</div>
                   <div className="text-xs text-muted-foreground">Standard access</div>
                 </div>
               </div>
               <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
             </CardContent>
           </Card>
        )}
      </div>

      {isProcessing && (
        <div className="flex items-center justify-center gap-2 py-4">
          <Loader2 className="w-4 h-4 animate-spin text-primary" />
          <span className="text-xs font-medium text-muted-foreground">Switching context...</span>
        </div>
      )}
    </div>
  );
};
