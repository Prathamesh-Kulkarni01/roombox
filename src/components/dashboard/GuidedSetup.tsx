
'use client'

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Circle, Building, Layout, UserPlus, ArrowRight } from 'lucide-react';
import { useAppSelector } from '@/lib/hooks';
import { useRouter } from 'next/navigation';
import type { PG, Guest } from '@/lib/types';

interface GuidedSetupProps {
  pgs: PG[];
  guests: Guest[];
  onAddProperty: () => void;
}

export default function GuidedSetup({ pgs, guests, onAddProperty }: GuidedSetupProps) {
  const router = useRouter();
  
  const hasPgs = pgs.length > 0;
  const hasLayout = hasPgs && pgs.some(p => p.totalBeds > 0);
  const hasGuests = guests.length > 0;

  const steps = [
    {
      id: 1,
      title: "Add Your First Property",
      description: "Create your first PG/Hostel listing to start managing it.",
      icon: Building,
      isComplete: hasPgs,
      action: onAddProperty,
      actionText: "Add Property",
    },
    {
      id: 2,
      title: "Set Up Property Layout",
      description: "Add floors, rooms, and beds to create a visual layout of your property.",
      icon: Layout,
      isComplete: hasLayout,
      action: () => router.push(`/dashboard/pg-management/${pgs[0].id}?setup=true`),
      actionText: "Go to Layout",
    },
    {
      id: 3,
      title: "Add Your First Guest",
      description: "Onboard a guest to an available bed to start tracking rent and occupancy.",
      icon: UserPlus,
      isComplete: hasGuests,
      action: () => {
        // This is a placeholder; the main dashboard page handles opening the dialog.
        // We can just scroll to the first available bed.
        const firstBed = document.querySelector('[data-tour="add-guest-on-bed"]');
        firstBed?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        (firstBed as HTMLElement)?.click();
      },
      actionText: "Add Guest",
    },
  ];

  const activeStep = steps.find(step => !step.isComplete);
  const showComponent = !hasLayout || !hasGuests;

  if (!showComponent) {
    return null;
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Welcome to RentSutra! Let's Get You Set Up.</CardTitle>
        <CardDescription>Follow these simple steps to get your property up and running.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {steps.map((step, index) => {
          const isNextStep = activeStep ? activeStep.id === step.id : false;

          return (
            <div
              key={step.id}
              className={`flex items-start gap-4 p-4 rounded-md border ${
                step.isComplete
                  ? 'bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800'
                  : isNextStep
                  ? 'bg-primary/10 border-primary/20'
                  : 'bg-muted/50'
              }`}
            >
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
              <div className="flex-1">
                <h4 className="font-semibold">{step.title}</h4>
                <p className="text-sm text-muted-foreground">{step.description}</p>
                 {isNextStep && (
                  <Button size="sm" className="mt-3" onClick={step.action}>
                    {step.actionText} <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
