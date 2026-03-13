'use client'

import React, { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useAppSelector } from "@/lib/hooks"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { PWASettings } from "@/components/dashboard/pwa-settings"
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Button } from "@/components/ui/button"

export default function SettingsPage() {
    const { currentUser, currentPlan } = useAppSelector((state) => state.user)

    if (!currentUser || !currentPlan) {
        return null
    }

    return (
        <div className="flex flex-col gap-8">
            <PWASettings />

            <Card>
                <CardHeader>
                    <CardTitle>Owner Profile</CardTitle>
                    <CardDescription>Your account and subscription details.</CardDescription>
                </CardHeader>
                <CardContent className="flex items-center gap-4">
                    <Avatar className="h-16 w-16">
                        <AvatarImage src={currentUser.avatarUrl} alt={currentUser.name} />
                        <AvatarFallback>{currentUser.name.slice(0, 2).toUpperCase()} </AvatarFallback>
                    </Avatar>
                    <div>
                        <div className="text-lg font-semibold">{currentUser.name}</div>
                        <div className="text-muted-foreground">{currentUser.email}</div>
                        <div className="text-sm text-muted-foreground capitalize">
                            {currentUser.role} -
                            <span className="font-medium text-primary">
                                {currentUser.subscription?.status === 'trialing' ? ` Pro Trial` : ` ${currentPlan.name} Plan`}
                            </span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Payment Settings</CardTitle>
                    <CardDescription>Configure how you receive payments from tenants.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                        Set up your Direct UPI details, QR code, or manage your online payment gateway integrated with Razorpay.
                    </p>
                    <Button asChild variant="outline" className="w-full justify-between">
                        <Link href="/dashboard/settings/payment">
                            Manage Payment Modes
                            <ArrowRight className="h-4 w-4" />
                        </Link>
                    </Button>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>About RoomBox</CardTitle>
                    <CardDescription>Version and system status.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">App Version</span>
                        <span className="font-mono">v2.4.0-stable</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">System Status</span>
                        <span className="text-green-600 font-medium flex items-center gap-2">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                            </span>
                            All Systems Operational
                        </span>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
