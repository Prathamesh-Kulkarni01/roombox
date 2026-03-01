
'use client'

import React from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowRight, BookOpen } from 'lucide-react'
import { trainingGuides } from '@/lib/blog-data'

export default function TrainingCenterPage() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold">Training Center</h1>
                <p className="text-muted-foreground">Your one-stop shop to learn everything about RentSutra.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {trainingGuides.map(guide => (
                    <Link href={`/blog/${guide.slug}`} key={guide.slug} className="group">
                        <Card className="h-full flex flex-col hover:border-primary transition-all hover:shadow-lg">
                            <CardHeader>
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="bg-primary/10 p-2 rounded-full">
                                        <BookOpen className="w-5 h-5 text-primary" />
                                    </div>
                                    <CardTitle>{guide.title}</CardTitle>
                                </div>
                                <CardDescription>{guide.description}</CardDescription>
                            </CardHeader>
                            <CardContent className="mt-auto flex justify-end">
                                <div className="flex items-center text-sm font-semibold text-primary group-hover:underline">
                                    Read Guide <ArrowRight className="w-4 h-4 ml-1" />
                                </div>
                            </CardContent>
                        </Card>
                    </Link>
                ))}
            </div>
        </div>
    )
}
