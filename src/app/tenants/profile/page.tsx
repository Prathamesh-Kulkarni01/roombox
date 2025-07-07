
'use client'

import React from 'react'
import { useData } from "@/context/data-provider"
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { UserCog } from "lucide-react"

export default function TenantProfilePage() {
    const { currentUser, isLoading, disassociateAndCreateOwnerAccount } = useData()

    const handleBecomeOwner = () => {
        if (confirm("Are you sure? This will convert your guest account into a new PG Owner account. You will be logged out and can log back in as an owner.")) {
            disassociateAndCreateOwnerAccount()
        }
    }

    if (isLoading || !currentUser) {
        return (
            <div className="max-w-2xl mx-auto space-y-6">
                <Card>
                    <CardHeader className="text-center">
                        <Skeleton className="h-24 w-24 rounded-full mx-auto mb-4" />
                        <Skeleton className="h-8 w-48 mx-auto" />
                        <Skeleton className="h-5 w-64 mx-auto" />
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-2"><Skeleton className="h-5 w-24" /><Skeleton className="h-10 w-full" /></div>
                        <div className="space-y-2"><Skeleton className="h-5 w-24" /><Skeleton className="h-10 w-full" /></div>
                        <Skeleton className="h-10 w-32" />
                    </CardContent>
                </Card>
                 <Skeleton className="h-40 w-full" />
            </div>
        )
    }

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <Card>
                <CardHeader className="text-center">
                    <Avatar className="w-24 h-24 mx-auto mb-4">
                        <AvatarImage src={currentUser.avatarUrl} />
                        <AvatarFallback>{currentUser.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <CardTitle className="text-2xl">{currentUser.name}</CardTitle>
                    <CardDescription>Update your profile information.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-2">
                        <Label htmlFor="name">Full Name</Label>
                        <Input id="name" defaultValue={currentUser.name} />
                    </div>
                     <div className="grid gap-2">
                        <Label htmlFor="email">Email Address</Label>
                        <Input id="email" type="email" defaultValue={currentUser.email} readOnly />
                    </div>
                     <div className="grid gap-2">
                        <Label htmlFor="password">New Password</Label>
                        <Input id="password" type="password" placeholder="••••••••" />
                    </div>
                    <Button>Save Changes</Button>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Account Actions</CardTitle>
                    <CardDescription>Manage your account settings and roles.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Alert>
                        <UserCog className="h-4 w-4" />
                        <AlertTitle>Become a PG Owner</AlertTitle>
                        <AlertDescription>
                            Want to manage your own PG? You can convert your guest account into a new, separate owner account.
                        </AlertDescription>
                    </Alert>
                </CardContent>
                <CardFooter>
                     <Button variant="outline" onClick={handleBecomeOwner}>Start Managing Your Own PG</Button>
                </CardFooter>
            </Card>
        </div>
    )
}
