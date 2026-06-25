'use client';

import { useAccessibleNav } from '@/lib/hooks/use-accessible-nav';
import { useTranslation } from '@/context/language-context';
import LeadBoard from '@/components/leads/LeadBoard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import GodModeGuard from '@/components/GodModeGuard';
import { Users } from 'lucide-react';

export default function LeadsPage() {
  const { currentUser } = useAccessibleNav();
  const { t } = useTranslation();

  const ownerId = currentUser?.role === 'owner' || currentUser?.role === 'admin' 
    ? currentUser.id 
    : currentUser?.ownerId;

  if (!ownerId) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    
      <div className="p-4 md:p-6 space-y-6 max-w-[1600px] mx-auto">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-primary font-headline">Lead Management</h1>
            <p className="text-muted-foreground mt-1">Track prospective tenants from inquiry to move-in.</p>
          </div>
        </div>

        <Card className="border-primary/10 bg-surface-container/50 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="w-5 h-5 text-primary" />
              Sales Pipeline
            </CardTitle>
            <CardDescription>
              Drag and drop leads across stages to track their progress.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <LeadBoard ownerId={ownerId} />
          </CardContent>
        </Card>
      </div>
    
  );
}
