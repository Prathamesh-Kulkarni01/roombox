
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from '@/hooks/use-toast'
import { HomeIcon } from 'lucide-react'
import { useAppSelector } from '@/lib/hooks'

export default function CompleteProfilePage() {
    const router = useRouter()
    const { toast } = useToast()
    const [name, setName] = useState('')
    const [loading, setLoading] = useState(false)

    // This page is part of the old phone auth flow.
    // It is no longer used with Google Sign-In.
    // We redirect to the dashboard.
    useEffect(() => {
        router.replace('/dashboard')
    }, [router])


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
    }
    
    return (
        <div className="flex items-center justify-center min-h-[calc(100vh-56px)] bg-background p-4">
            <Card className="w-full max-w-sm">
                 <CardHeader className="text-center">
                    <CardTitle className="text-2xl">Redirecting...</CardTitle>
                    <CardDescription>
                        Completing your profile is now handled automatically.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-center text-sm text-muted-foreground">Please wait while we take you to your dashboard.</p>
                </CardContent>
            </Card>
        </div>
    )
}
