
'use client'

import React from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowRight, BookOpen } from 'lucide-react'

const trainingGuides = [
    { href: '/blog/creating-property', title: 'Creating a Property', description: 'Learn how to add your first property listing, set its name, location, and other basic details.' },
    { href: '/blog/setting-up-layout', title: 'Setting up Floors, Rooms & Beds', description: 'Visually create your property layout to match its physical structure for easy management.' },
    { href: '/blog/onboarding-guest', title: 'Onboarding a New Guest', description: 'Add new guests to vacant beds, set their rent, deposit, and move-in dates seamlessly.' },
    { href: '/blog/collecting-rent', title: 'Collecting Rent & Managing Dues', description: 'Understand how to log payments, track pending dues, and manage the complete rent cycle.' },
    { href: '/blog/managing-staff', title: 'Managing Staff & Permissions', description: 'Add your staff members like managers or cooks and define what they can access on the dashboard.' },
    { href: '/blog/expense-tracking', title: 'Using the Expense Tracker', description: 'Log and categorize all your property-related expenses to keep your finances in check.' },
    { href: '/blog/setting-up-payouts', title: 'Setting Up Bank Payouts', description: 'Securely link your bank account or UPI ID to automatically receive rent payments from tenants.' },
    { href: '/blog/using-ai-tools', title: 'Using AI-Powered Tools', description: 'Leverage AI for rent reminders, generating SEO content, and answering tenant queries.' },
];

export default function TrainingCenterPage() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold">Training Center</h1>
                <p className="text-muted-foreground">Your one-stop shop to learn everything about RentSutra.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {trainingGuides.map(guide => (
                    <Link href={guide.href} key={guide.href} className="group">
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
