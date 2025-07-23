
'use client'

import { useEffect } from 'react'
import { TourProvider, useTour, type StepType } from '@reactour/tour'
import { useAppDispatch, useAppSelector } from '@/lib/hooks'
import { endOnboardingTour, endLayoutTour, setTourStepIndex } from '@/lib/slices/appSlice'
import { usePathname } from 'next/navigation'
import { Button } from './ui/button'

const onboardingSteps: StepType[] = [
  {
    selector: 'body',
    content: "Welcome to RentVastu! Let's get you set up by adding your first property.",
  },
  {
    selector: '[data-tour="add-first-pg-button"]',
    content: 'Click here to add your first property. A form will open from the side.',
  },
  {
    selector: '[data-tour="add-pg-sheet-content"]',
    content: 'Now, fill in the basic details for your property. When you click "Add Property", the tour will continue to help you set up its layout.',
    position: 'left',
  }
];

const layoutTourSteps: StepType[] = [
    {
        selector: '[data-tour="add-floor-button"]',
        content: 'Your property needs a layout. Start by adding your first floor. Click here to open the floor creation dialog.',
    },
    {
        selector: '[data-tour="add-room-button"]',
        content: 'Great! Add a room to this floor. This will let you set its sharing type and rent.',
    },
    {
        selector: '[data-tour="add-bed-button"]',
        content: "Almost done. Add a bed to the room. You can add multiple beds for different sharing types.",
    },
    {
        selector: '[data-tour="add-guest-on-bed"]',
        content: "Perfect! Your layout is ready. To add a guest, just click any available bed. That's it! You've completed the main setup.",
    },
];

function TourLogic() {
    const dispatch = useAppDispatch();
    const { pgs } = useAppSelector(state => state.pgs);
    const { tour, tourStepIndex } = useAppSelector(state => state.app);
    const { currentUser } = useAppSelector(state => state.user);
    const pathname = usePathname();
    const { setIsOpen, setSteps, setCurrentStep } = useTour();

    useEffect(() => {
        if (currentUser?.role !== 'owner') {
            setIsOpen(false);
            return;
        }

        const hasPgs = pgs.length > 0;
        const hasLayout = hasPgs && pgs.some(p => p.totalBeds > 0);
        const isOnDashboard = pathname === '/dashboard';

        if (!tour.hasCompletedOnboarding && !hasPgs && isOnDashboard) {
            setSteps(onboardingSteps);
            setIsOpen(true);
            setCurrentStep(tourStepIndex);
        } else if (tour.hasCompletedOnboarding && !tour.hasCompletedLayout && hasPgs && !hasLayout && isOnDashboard) {
            setSteps(layoutTourSteps);
            setIsOpen(true);
            setCurrentStep(tourStepIndex);
        } else {
            setIsOpen(false);
        }
    }, [currentUser, pgs, tour, pathname, setIsOpen, setSteps, setCurrentStep, tourStepIndex]);

    return null;
}

const CustomPopover = (props: any) => {
    return (
      <div
        {...props}
        className="rounded-lg border bg-popover text-popover-foreground p-6 shadow-lg max-w-sm w-full"
      >
        <h3 className="text-lg font-semibold mb-2">{props.steps[props.currentStep].title || 'RentVastu Tour'}</h3>
        <p className="text-sm text-muted-foreground mb-4">{props.steps[props.currentStep].content}</p>
        <div className="flex justify-between items-center">
            <div>
              {props.currentStep > 0 && (
                  <Button variant="ghost" onClick={props.prevStep}>Back</Button>
              )}
            </div>
            <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{props.currentStep + 1} / {props.steps.length}</span>
                {props.currentStep < props.steps.length - 1 && (
                  <Button onClick={props.nextStep}>Next</Button>
                )}
                {props.currentStep === props.steps.length - 1 && (
                  <Button onClick={() => props.setIsOpen(false)}>Finish</Button>
                )}
            </div>
        </div>
      </div>
    )
};

export default function AppTour() {
    const dispatch = useAppDispatch();
    const { tour, tourStepIndex } = useAppSelector(state => state.app);
    const { pgs } = useAppSelector(state => state.pgs);

    const hasPgs = pgs.length > 0;
    const hasLayout = hasPgs && pgs.some(p => p.totalBeds > 0);

    const afterOpen = (target: Element | undefined) => {
      if(target) target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    const beforeClose = (target: Element | undefined) => {
        if (!tour.hasCompletedOnboarding && !hasPgs) {
            dispatch(endOnboardingTour());
        }
        if (tour.hasCompletedOnboarding && !tour.hasCompletedLayout && hasPgs && !hasLayout) {
             dispatch(endLayoutTour());
        }
        dispatch(setTourStepIndex(0));
    }
    
    return (
        <TourProvider
            steps={[]}
            components={{ Popover: CustomPopover }}
            styles={{
                popover: (base) => ({ ...base, boxShadow: 'none', background: 'transparent' }),
                maskWrapper: (base) => ({ ...base, zIndex: 10000, opacity: 0.8 }),
                highlightedArea: (base) => ({ ...base, rx: 12 }),
            }}
            padding={{ mask: 8, popover: 12 }}
            onClickMask={({ setCurrentStep, currentStep, setIsOpen }) => {
              // Don't allow closing by clicking mask
            }}
            afterOpen={afterOpen}
            beforeClose={beforeClose}
            onStepChange={(meta) => {
                if(meta) dispatch(setTourStepIndex(meta.currentStep));
            }}
        >
            <TourLogic />
        </TourProvider>
    )
}
