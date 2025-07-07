'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useData } from '@/context/data-provider'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from '@/hooks/use-toast'
import { HomeIcon } from 'lucide-react'

export default function CompleteProfilePage() {
    const router = useRouter()
    const { toast } = useToast()
    const { completeNewUserSignup, pendingSignupPhone } = useData()
    const [name, setName] = useState('')
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (!pendingSignupPhone) {
            router.replace('/login')
        }
    }, [pendingSignupPhone, router])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!name.trim()) {
            toast({
                variant: 'destructive',
                title: 'Name is required',
                description: 'Please enter your full name.',
            })
            return
        }
        setLoading(true)
        await completeNewUserSignup(name)
        toast({
            title: 'Welcome to PGOasis!',
            description: "Your account has been created successfully.",
        })
        router.push('/dashboard')
    }
    
    if (!pendingSignupPhone) {
        return null; // Or a loading spinner
    }

    return (
        <div className="flex items-center justify-center min-h-[calc(100vh-56px)] bg-background p-4">
            <Card className="w-full max-w-sm">
                 <CardHeader className="text-center">
                    <CardTitle className="text-2xl">One Last Step</CardTitle>
                    <CardDescription>
                        Please enter your name to complete your account setup.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="grid gap-4">
                         <div className="grid gap-2">
                            <Label htmlFor="name">Full Name</Label>
                            <Input 
                                id="name" 
                                placeholder="e.g. Priya Sharma" 
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required 
                            />
                        </div>
                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? 'Saving...' : 'Complete Signup'}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
