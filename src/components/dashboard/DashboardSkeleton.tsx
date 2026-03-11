'use client'

import React from 'react'
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export default function DashboardSkeleton() {
    return (
        <div className="flex flex-col gap-6 md:max-w-xl mx-auto md:mx-0 w-full pb-20 mt-4 md:mt-0 animate-in fade-in duration-500">
            {/* Heading Skeleton */}
            <div className="flex items-center justify-between mb-2">
                <div className="space-y-2">
                    <Skeleton className="h-7 w-48" />
                    <Skeleton className="h-4 w-32" />
                </div>
            </div>

            {/* Stats Cards Skeleton */}
            <div className="flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-4">
                    {[1, 2].map((i) => (
                        <Card key={i} className="border-border/40 shadow-sm">
                            <CardHeader className="p-4 pb-2">
                                <Skeleton className="h-10 w-10 rounded-xl" />
                            </CardHeader>
                            <CardContent className="p-4 pt-1 space-y-2">
                                <Skeleton className="h-8 w-16" />
                                <Skeleton className="h-4 w-24" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card className="border-border/40 shadow-sm">
                        <CardHeader className="p-4 pb-2">
                            <Skeleton className="h-10 w-10 rounded-xl" />
                        </CardHeader>
                        <CardContent className="p-4 pt-0 space-y-3">
                            <Skeleton className="h-8 w-full" />
                            <Skeleton className="h-2 w-full rounded-full" />
                        </CardContent>
                    </Card>
                    <Card className="border-border/40 shadow-sm">
                        <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
                            <div className="space-y-2">
                                <Skeleton className="h-3 w-24" />
                                <Skeleton className="h-8 w-32" />
                            </div>
                            <Skeleton className="h-12 w-12 rounded-2xl" />
                        </CardHeader>
                    </Card>
                </div>
                <div className="h-20 w-full rounded-2xl border border-border/40 bg-muted/20 flex items-center p-4 gap-4">
                    <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                    <div className="flex-1 space-y-2">
                        <Skeleton className="h-3 w-20" />
                        <Skeleton className="h-6 w-32" />
                    </div>
                    <Skeleton className="h-10 w-28 rounded-xl" />
                </div>
            </div>

            {/* Quick Actions Skeleton */}
            <div className="space-y-4 pt-2">
                <Skeleton className="h-4 w-24 ml-1" />
                <div className="grid grid-cols-2 gap-4">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="h-24 rounded-2xl border border-border/80 flex flex-col items-center justify-center gap-3">
                            <Skeleton className="h-6 w-6" />
                            <Skeleton className="h-3 w-16" />
                        </div>
                    ))}
                </div>
            </div>

            {/* Recent Guests Skeleton */}
            <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between px-1">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-6 w-16 rounded-full" />
                </div>
                <Card className="border-border/40 shadow-sm">
                    <div className="divide-y divide-border/20">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="p-4 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Skeleton className="h-10 w-10 rounded-full" />
                                    <div className="space-y-2">
                                        <Skeleton className="h-4 w-24" />
                                        <Skeleton className="h-3 w-16" />
                                    </div>
                                </div>
                                <Skeleton className="h-5 w-16" />
                            </div>
                        ))}
                    </div>
                </Card>
            </div>

            {/* Action Button Skeleton */}
            <div className="mt-2">
                <Skeleton className="h-14 w-full rounded-xl" />
            </div>
        </div>
    )
}
