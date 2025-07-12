
'use client'

import { useEffect, useState } from 'react'
import Joyride, { type CallBackProps, type Step, STATUS, EVENTS, ACTIONS } from 'react-joyride'
import { useAppDispatch, useAppSelector } from '@/lib/hooks'
import { setTourStepIndex, endOnboardingTour, endLayoutTour } from '@/lib/slices/appSlice'
import { usePathname } from 'next/navigation'

const onboardingSteps: Step[] = [
  {
    content: "Welcome to RoomBox! Let's get you set up by adding your first property.",
    locale: { skip: <strong aria-label="skip">Skip Tour</strong> },
    placement: 'center',
    target: 'body',
    title: 'Welcome!',
    disableBeacon: true,
  },
  {
    target: '[data-tour="add-first-pg-button"]',
    content: 'Click here to add your first property. A form will open from the side.',
    title: 'Add Your First Property',
    disableBeacon: true,
    hideFooter: true,
  },
  {
    target: '[data-tour="add-pg-sheet-content"]',
    content: 'Now, fill in the basic details for your property. When you click "Add Property", the tour will continue to help you set up its layout.',
    title: 'Property Details',
    disableBeacon: true,
    placement: 'left',
  }
];

const layoutTourSteps: Step[] = [
    {
        target: '[data-tour="add-floor-button"]',
        content: 'Your property needs a layout. Start by adding your first floor. Click here to open the floor creation dialog.',
        title: 'Step 1: Add a Floor',
        disableBeacon: true,
        spotlightClicks: true,
    },
    {
        target: '[data-tour="add-room-button"]',
        content: 'Great! Add a room to this floor. This will let you set its sharing type and rent.',
        title: 'Step 2: Add a Room',
        disableBeacon: true,
        spotlightClicks: true,
    },
    {
        target: '[data-tour="add-bed-button"]',
        content: "Almost done. Add a bed to the room. You can add multiple beds for different sharing types.",
        title: 'Step 3: Add a Bed',
        disableBeacon: true,
        spotlightClicks: true,
    },
    {
        target: '[data-tour="edit-mode-switch"]',
        content: "Perfect! Your layout is ready. Disable 'Edit Mode' now to see the occupancy view and manage guests.",
        title: "Step 4: You're All Set!",
        disableBeacon: true,
        spotlightClicks: true,
    },
    {
        target: '[data-tour="add-guest-on-bed"]',
        content: "To add a guest, just click any available bed. That's it! You've completed the main setup.",
        title: 'Final Step: Add Your First Guest',
        disableBeacon: true,
        spotlightClicks: false, // Don't force this click, just inform.
    },
];


export default function AppTour() {
    const dispatch = useAppDispatch();
    const { pgs } = useAppSelector(state => state.pgs);
    const { tour, tourStepIndex } = useAppSelector(state => state.app);
    const { currentUser } = useAppSelector(state => state.user);
    const [steps, setSteps] = useState<Step[]>([]);
    const [runTour, setRunTour] = useState(false);
    const [activeTour, setActiveTour] = useState<'onboarding' | 'layout' | null>(null);
    const pathname = usePathname();

     useEffect(() => {
        if (currentUser?.role !== 'owner') {
            setRunTour(false);
            return;
        }

        const hasPgs = pgs.length > 0;
        const hasLayout = hasPgs && pgs.some(p => p.totalBeds > 0);
        
        const isOnDashboard = pathname === '/dashboard';
        
        setRunTour(false);

        // Tour 1: Onboarding for first PG
        if (!tour.hasCompletedOnboarding && !hasPgs && isOnDashboard) {
            setActiveTour('onboarding');
            setSteps(onboardingSteps);
            setRunTour(true);
        } 
        // Tour 2: Layout setup on Dashboard page
        else if (tour.hasCompletedOnboarding && !tour.hasCompletedLayout && hasPgs && !hasLayout && isOnDashboard) {
             setActiveTour('layout');
             setSteps(layoutTourSteps);
             setRunTour(true);
        } else {
            setActiveTour(null);
        }
    }, [currentUser, pgs, tour, pathname]);


    const handleJoyrideCallback = (data: CallBackProps) => {
        const { action, index, status, type } = data;

        if (([STATUS.FINISHED, STATUS.SKIPPED] as string[]).includes(status)) {
            setRunTour(false);
            dispatch(setTourStepIndex(0));
            if (activeTour === 'onboarding') {
                dispatch(endOnboardingTour());
            } else if (activeTour === 'layout') {
                dispatch(endLayoutTour());
            }
            return;
        }

        if (type === EVENTS.STEP_AFTER) {
            const nextStep = index + (action === ACTIONS.PREV ? -1 : 1);
            dispatch(setTourStepIndex(nextStep));
        }
    };

    if (!runTour) {
        return null;
    }

    return (
        <Joyride
            steps={steps}
            run={runTour}
            stepIndex={tourStepIndex}
            showProgress
            showSkipButton
            continuous
            disableOverlayClose
            spotlightClicks
            callback={handleJoyrideCallback}
            styles={{
                options: {
                    zIndex: 10000,
                    arrowColor: 'hsl(var(--popover))',
                    overlayColor: 'rgba(0, 0, 0, 0.6)',
                },
                 spotlight: {
                    borderRadius: 'var(--radius)',
                }
            }}
        />
    )
}
