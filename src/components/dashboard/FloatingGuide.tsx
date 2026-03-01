
'use client'

import React, { useEffect, useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from '@/components/ui/sheet';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, Circle, Building, Layout, UserPlus, ArrowRight, UtensilsCrossed, Wallet, Contact } from 'lucide-react';
import { useAppSelector } from '@/lib/hooks';
import { useRouter } from 'next/navigation';
import type { PG, Guest, Staff, Expense } from '@/lib/types';
import { useTranslation } from '@/context/language-context';
import { ScrollArea } from '../ui/scroll-area';

interface FloatingGuideProps {
  onAddProperty: () => void;
  onSetupLayout: () => void;
  onAddGuest: () => void;
}

export function FloatingGuide({ onAddProperty, onSetupLayout, onAddGuest }: FloatingGuideProps) {
  const router = useRouter();
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const { pgs, guests, staff, expenses } = useAppSelector(state => ({
    pgs: state.pgs.pgs,
    guests: state.guests.guests,
    staff: state.staff.staff,
    expenses: state.expenses.expenses,
  }));
  const { t } = useTranslation();
  const stepRefs = useRef<(HTMLDivElement | null)[]>([]);

  const hasPgs = pgs.length > 0;
  const hasLayout = hasPgs && pgs.some(p => p.totalBeds > 0);
  const hasGuests = guests.length > 0;
  const hasStaff = staff.length > 0;
  const hasMenu = hasPgs && pgs.some(p => p.menu && Object.values(p.menu).some(day => day.breakfast || day.lunch || day.dinner));
  const hasExpenses = expenses.length > 0;

  const steps = [
    { id: 1, titleKey: 'guided_step_1_title', descKey: 'guided_step_1_desc', icon: Building, isComplete: hasPgs, action: onAddProperty, actionKey: 'guided_step_1_action', disabled: false },
    { id: 2, titleKey: 'guided_step_2_title', descKey: 'guided_step_2_desc', icon: Layout, isComplete: hasLayout, action: onSetupLayout, actionKey: 'guided_step_2_action', disabled: !hasPgs },
    { id: 3, titleKey: 'guided_step_3_title', descKey: 'guided_step_3_desc', icon: UserPlus, isComplete: hasGuests, action: onAddGuest, actionKey: 'guided_step_3_action', disabled: !hasLayout },
    { id: 4, titleKey: 'guided_step_4_title', descKey: 'guided_step_4_desc', icon: Contact, isComplete: hasStaff, action: () => router.push('/dashboard/staff'), actionKey: 'guided_step_4_action', disabled: !hasPgs },
    { id: 5, titleKey: 'guided_step_5_title', descKey: 'guided_step_5_desc', icon: UtensilsCrossed, isComplete: hasMenu, action: () => router.push('/dashboard/food'), actionKey: 'guided_step_5_action', disabled: !hasPgs },
    { id: 6, titleKey: 'guided_step_6_title', descKey: 'guided_step_6_desc', icon: Wallet, isComplete: hasExpenses, action: () => router.push('/dashboard/expense'), actionKey: 'guided_step_6_action', disabled: !hasPgs },
  ];

  const completedSteps = steps.filter(step => step.isComplete).length;
  const progress = (completedSteps / steps.length) * 100;
  const activeStep = steps.find(step => !step.isComplete);
  const allStepsComplete = !activeStep;

  useEffect(() => {
    stepRefs.current = stepRefs.current.slice(0, steps.length);
  }, [steps.length]);

  useEffect(() => {
    if (isSheetOpen && activeStep) {
      const activeStepIndex = steps.findIndex(step => step.id === activeStep.id);
      setTimeout(() => {
        if (activeStepIndex !== -1 && stepRefs.current[activeStepIndex]) {
          stepRefs.current[activeStepIndex]?.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
          });
        }
      }, 100); // Small delay to ensure sheet is fully rendered
    }
  }, [isSheetOpen, activeStep, steps]);

  if (allStepsComplete) {
    return null;
  }
  
  const handleAction = (action: () => void) => {
    action();
    setIsSheetOpen(false);
  }

  return (
    <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
      <SheetTrigger asChild>
        <Button className="fixed bottom-20 md:bottom-6 right-6 h-16 w-16 rounded-full shadow-lg z-50 flex flex-col items-center justify-center gap-1" variant="hero">
          <span className="text-sm font-bold">{completedSteps}/{steps.length}</span>
          <span className="text-xs">Setup</span>
        </Button>
      </SheetTrigger>
      <SheetContent className="flex flex-col">
        <SheetHeader>
          <SheetTitle>{t('guided_setup_title')}</SheetTitle>
          <SheetDescription>{t('guided_setup_subtitle')}</SheetDescription>
        </SheetHeader>
        <div className="py-4">
          <Progress value={progress} className="w-full mb-4" />
          <p className="text-center text-sm text-muted-foreground mb-6">{completedSteps} of {steps.length} steps completed</p>
        </div>
        <ScrollArea className="flex-1">
          <div className="space-y-4 pr-6">
            {steps.map((step, index) => (
              <div 
                key={step.id} 
                ref={el => stepRefs.current[index] = el}
                className="flex flex-col gap-3 p-3 border rounded-lg"
              >
                <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-1">
                        {step.isComplete ? <CheckCircle className="w-5 h-5 text-green-500" /> : <Circle className="w-5 h-5 text-primary" />}
                    </div>
                    <div>
                        <h4 className="font-semibold">{t(step.titleKey as any)}</h4>
                        <p className="text-sm text-muted-foreground">{t(step.descKey as any)}</p>
                    </div>
                </div>
                {!step.isComplete && step.id === activeStep?.id && (
                  <Button size="sm" onClick={() => handleAction(step.action)} disabled={step.disabled}>
                    {t(step.actionKey as any)} <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
