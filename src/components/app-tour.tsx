
'use client'

import { useEffect, useState } from 'react'
import Joyride, { type CallBackProps, type Step } from 'react-joyride'
import { useAppDispatch, useAppSelector } from '@/lib/hooks'
import { endOnboardingTour, endLayoutTour } from '@/lib/slices/appSlice'

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
    target: '[data-tour="pg-management-nav"]',
    content: "This is your main navigation. Click here to go to the Property Management section.",
    title: 'Manage Properties',
    disableBeacon: true,
  },
  {
    target: '[data-tour="add-pg-button"]',
    content: 'Great! Now, click here to open the form and add the details for your new property. The tour will continue after you create it.',
    title: 'Add Your First Property',
    disableBeacon: true,
  },
];

const layoutAndGuestSteps: Step[] = [
  {
    target: '[data-tour="add-floor-button"]',
    content: "Your property is created and Edit Mode is on! Start by adding a floor. You can name it 'Ground Floor', 'First Floor', etc.",
    title: 'Step 1: Add a Floor',
    disableBeacon: true,
  },
  {
    target: '[data-tour="add-room-button"]',
    content: "Inside each floor, you can add rooms. This is where you'll define room names and rent details.",
    title: 'Step 2: Add a Room',
    disableBeacon: true,
  },
  {
    target: '[data-tour="add-bed-button"]',
    content: "Next, add beds to your rooms. This determines the sharing type (e.g., 2 beds for double sharing).",
    title: 'Step 3: Add Beds',
    disableBeacon: true,
  },
  {
    target: '[data-tour="dashboard-nav"]',
    content: "Once your layout is complete, turn off 'Edit Mode' and head back to the main Dashboard to add your first guest.",
    title: 'Step 4: Go to Dashboard',
    disableBeacon: true,
  },
  {
    target: '[data-tour="add-guest-on-bed"]',
    content: "On the dashboard, simply click any available bed to begin the guest onboarding process. That's it!",
    title: 'Step 5: Add Your First Guest',
    disableBeacon: true,
  },
];


export default function AppTour() {
    const dispatch = useAppDispatch();
    const { pgs } = useAppSelector(state => state.pgs);
    const { tour } = useAppSelector(state => state.app);
    const { currentUser } = useAppSelector(state => state.user);
    const [steps, setSteps] = useState<Step[]>([]);
    const [runTour, setRunTour] = useState(false);
    const [activeTour, setActiveTour] = useState<'onboarding' | 'layout' | null>(null);

     useEffect(() => {
        if (currentUser?.role !== 'owner') {
            setRunTour(false);
            return;
        }

        const hasPgs = pgs.length > 0;
        const hasLayout = hasPgs && pgs.some(p => p.floors && p.floors.length > 0);

        // Tour completion checks temporarily removed for testing purposes.
        // This will make the tour run every time.
        if (!hasPgs /* && !tour.hasCompletedOnboarding */) {
            setActiveTour('onboarding');
            setSteps(onboardingSteps);
            setRunTour(true);
        } else if (hasPgs && !hasLayout /* && !tour.hasCompletedLayout */) {
             setActiveTour('layout');
             setSteps(layoutAndGuestSteps);
             setRunTour(true);
        } else {
            setRunTour(false);
            setActiveTour(null);
        }
    }, [currentUser, pgs]);


    const handleJoyrideCallback = (data: CallBackProps) => {
        const { status } = data;
        const finishedStatuses: string[] = ['finished', 'skipped'];

        if (finishedStatuses.includes(status)) {
            // Tour completion dispatches temporarily removed for testing
            // if (activeTour === 'onboarding') {
            //     dispatch(endOnboardingTour());
            // } else if (activeTour === 'layout') {
            //     dispatch(endLayoutTour());
            // }
            setRunTour(false);
        }
    };

    return (
        <Joyride
            steps={steps}
            run={runTour}
            continuous
            showProgress
            showSkipButton
            disableOverlayClose={true}
            spotlightClicks={true}
            callback={handleJoyrideCallback}
            styles={{
                options: {
                    zIndex: 10000,
                    arrowColor: 'hsl(var(--card))',
                },
                 spotlight: {
                    borderRadius: 'var(--radius)',
                }
            }}
        />
    )
}
