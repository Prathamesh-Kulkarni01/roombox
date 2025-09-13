
'use client'

import React, { useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Circle, Building, Layout, UserPlus, ArrowRight, UtensilsCrossed, Wallet, Contact } from 'lucide-react';
import { useAppSelector } from '@/lib/hooks';
import { useRouter } from 'next/navigation';
import type { PG, Guest, Staff, Expense } from '@/lib/types';
import { ScrollArea, ScrollBar } from '../ui/scroll-area';
import { cn } from '@/lib/utils';

interface GuidedSetupProps {
  pgs: PG[];
  guests: Guest[];
  staff: Staff[];
  expenses: Expense[];
  onAddProperty: () => void;
  onSetupLayout: () => void;
  onAddGuest: () => void;
}

export default function GuidedSetup({ pgs, guests, staff, expenses, onAddProperty, onSetupLayout, onAddGuest }: GuidedSetupProps) {
  const router = useRouter();
  const activeStepRef = useRef<HTMLDivElement>(null);
  
  const hasPgs = pgs.length > 0;
  const hasLayout = hasPgs && pgs.some(p => p.totalBeds > 0);
  const hasGuests = guests.length > 0;
  const hasStaff = staff.length > 0;
  const hasMenu = hasPgs && pgs.some(p => p.menu && Object.values(p.menu).some(day => day.breakfast || day.lunch || day.dinner));
  const hasExpenses = expenses.length > 0;

  const steps = [
    {
      id: 1,
      title: "Add Your First Property",
      description: "Create your first PG/Hostel listing to start managing it.",
      icon: Building,
      isComplete: hasPgs,
      action: onAddProperty,
      actionText: "Add Property",
      disabled: false,
    },
    {
      id: 2,
      title: "Set Up Property Layout",
      description: "Add floors, rooms, and beds to create a visual layout.",
      icon: Layout,
      isComplete: hasLayout,
      action: onSetupLayout,
      actionText: "Setup Layout",
      disabled: !hasPgs,
    },
    {
      id: 3,
      title: "Add Your First Guest",
      description: "Onboard a guest to an available bed to track rent.",
      icon: UserPlus,
      isComplete: hasGuests,
      action: onAddGuest,
      actionText: "Add Guest",
      disabled: !hasLayout,
    },
    {
        id: 4,
        title: "Add a Staff Member",
        description: "Manage your team by adding staff like managers or cooks.",
        icon: Contact,
        isComplete: hasStaff,
        action: () => router.push('/dashboard/staff'),
        actionText: "Go to Staff",
        disabled: !hasPgs,
    },
    {
        id: 5,
        title: "Set Weekly Menu",
        description: "Plan your meals for the week so tenants can see it.",
        icon: UtensilsCrossed,
        isComplete: hasMenu,
        action: () => router.push('/dashboard/food'),
        actionText: "Set Menu",
        disabled: !hasPgs,
    },
     {
        id: 6,
        title: "Log Your First Expense",
        description: "Start tracking your property expenses to manage finances.",
        icon: Wallet,
        isComplete: hasExpenses,
        action: () => router.push('/dashboard/expense'),
        actionText: "Go to Expenses",
        disabled: !hasPgs,
    }
  ];

  const activeStep = steps.find(step => !step.isComplete);
  const allStepsComplete = !activeStep;

  useEffect(() => {
    if (activeStepRef.current) {
        activeStepRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
    }
  }, [activeStep?.id]);


  if (allStepsComplete) {
    return null;
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Welcome to RentSutra! Let's Get You Set Up.</CardTitle>
        <CardDescription>Follow these steps to get your property fully operational.</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="w-full">
            <div className="flex space-x-4 pb-4">
            {steps.map((step, index) => {
            const isNextStep = activeStep ? activeStep.id === step.id : false;

            return (
                <div
                key={step.id}
                ref={isNextStep ? activeStepRef : null}
                className={cn(`flex flex-col items-start gap-4 p-4 rounded-lg border w-72 flex-shrink-0`,
                    step.isComplete
                    ? 'bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800'
                    : isNextStep
                    ? 'bg-primary/10 border-primary/20'
                    : 'bg-muted/50'
                )}
                >
                <div className="flex items-center gap-3">
                     <div className="flex-shrink-0">
                        {step.isComplete ? (
                        <CheckCircle className="w-8 h-8 text-green-500" />
                        ) : (
                        <div className="relative">
                            <Circle className={`w-8 h-8 ${isNextStep ? 'text-primary' : 'text-muted-foreground'}`} />
                            <span className={`absolute inset-0 flex items-center justify-center text-sm font-bold ${isNextStep ? 'text-primary' : 'text-muted-foreground'}`}>
                                {step.id}
                            </span>
                        </div>
                        )}
                    </div>
                     <div>
                        <h4 className="font-semibold">{step.title}</h4>
                        <p className="text-sm text-muted-foreground">{step.description}</p>
                    </div>
                </div>
                {isNextStep && (
                    <Button size="sm" className="mt-auto" onClick={step.action} disabled={step.disabled}>
                        {step.actionText} <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                )}
                </div>
            );
            })}
            </div>
             <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
