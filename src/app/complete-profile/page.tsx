
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Building2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useAppDispatch, useAppSelector } from '@/lib/hooks'
import { finalizeUserRole } from '@/lib/slices/userSlice'

export default function CompleteProfilePage() {
    const router = useRouter()
    const dispatch = useAppDispatch()
    const { toast } = useToast()
    const [loadingRole, setLoadingRole] = useState<'owner' | 'tenant' | null>(null)
    const { currentUser } = useAppSelector(state => state.user)

    const handleRoleSelection = async (role: 'owner' | 'tenant') => {
        if (!currentUser) {
            toast({ variant: 'destructive', title: 'Error', description: 'User session not found. Please log in again.'})
            router.push('/login');
            return;
        }

        setLoadingRole(role)
        try {
            await dispatch(finalizeUserRole(role)).unwrap();
            if (role === 'owner') {
                toast({ title: 'Welcome!', description: "Your owner account has been created."});
                router.push('/dashboard');
            } else {
                toast({ title: 'Account Ready!', description: "Your tenant account is ready. Ask your manager to add you to your PG."});
                router.push('/tenants/my-pg');
            }
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Setup Failed', description: error.message || 'Could not set up your account.' });
            setLoadingRole(null);
        }
    }
    
    return (
        <div className="flex items-center justify-center min-h-[calc(100vh-56px)] bg-background p-4">
            <Card className="w-full max-w-md">
                 <CardHeader className="text-center">
                    <CardTitle className="text-2xl">One Last Step!</CardTitle>
                    <CardDescription>
                        Create your owner account to get started with RentSutra.
                    </CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 gap-4">
                    <Button 
                        variant="outline" 
                        className="h-auto p-6 flex flex-col gap-2 items-center"
                        onClick={() => handleRoleSelection('owner')}
                        disabled={!!loadingRole}
                    >
                        {loadingRole === 'owner' ? <Loader2 className="h-8 w-8 animate-spin" /> : <Building2 className="h-8 w-8 text-primary" />}
                        <span className="font-bold text-lg">I'm a Property Owner</span>
                        <span className="text-xs text-muted-foreground text-center">Manage your PG, hostel, or co-living space.</span>
                    </Button>

                    <Button 
                        variant="outline" 
                        className="h-auto p-6 flex flex-col gap-1 items-center"
                        onClick={() => handleRoleSelection('tenant')}
                        disabled={!!loadingRole}
                    >
                        <div className="bg-primary/10 p-2 rounded-full">
                            <Building2 className="h-5 w-5 text-primary" />
                        </div>
                        <span className="font-semibold text-lg leading-none">Renting a room</span>
                        <span className="text-xs text-muted-foreground text-center">Access your room dashboard & pay bills.</span>
                    </Button>
                </CardContent>
            </Card>
        </div>
    )
}
