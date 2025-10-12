
'use client'

import KycManagementTab from '@/components/dashboard/KycManagementTab';
import { useAppSelector } from '@/lib/hooks';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Building } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function KycPage() {
    const { guests, pgs, isLoading } = useAppSelector(state => ({
        guests: state.guests.guests,
        pgs: state.pgs.pgs,
        isLoading: state.app.isLoading
    }));
    
    if (isLoading) {
        return (
            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <Skeleton className="h-8 w-48" />
                        <Skeleton className="h-5 w-72" />
                    </CardHeader>
                    <CardContent>
                        <Skeleton className="h-48 w-full" />
                    </CardContent>
                </Card>
            </div>
        )
    }

     if (pgs.length === 0) {
        return (
          <div className="flex items-center justify-center h-full min-h-[calc(100vh-250px)]">
              <div className="text-center p-8 bg-card rounded-lg border">
                  <Building className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h2 className="mt-4 text-xl font-semibold">Add a Property First</h2>
                  <p className="mt-2 text-muted-foreground max-w-sm">You need to add a property before you can manage guest KYC.</p>
                  <Button asChild className="mt-4">
                    <Link href="/dashboard/pg-management">Add Property</Link>
                  </Button>
              </div>
          </div>
        )
    }
    
    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>KYC Management</CardTitle>
                    <CardDescription>Review and manage the KYC status of all your tenants.</CardDescription>
                </CardHeader>
                <CardContent>
                    <KycManagementTab guests={guests} />
                </CardContent>
            </Card>
        </div>
    );
}
