
'use client'

import { useEffect, useState } from 'react'
import Joyride, { type CallBackProps, type Step } from 'react-joyride'
import { useAppDispatch, useAppSelector } from '@/lib/hooks'
import { endOnboardingTour, endLayoutTour } from '@/lib/slices/appSlice'

const onboardingSteps: Step[] = [
  {
    content: "Welcome to RoomBox! Let's get you set up by adding your first property.",
    locale: { skip: 'Skip Tour' },
    placement: 'center',
    target: 'body',
    title: 'Welcome!',
  },
  {
    target: '[data-tour="pg-management-nav"]',
    content: "This is your main navigation. Let's head over to the Property Management section to create your first PG.",
    title: 'Manage Properties',
    spotlightClicks: true,
    disableBeacon: true,
  },
  {
    target: '[data-tour="add-pg-button"]',
    content: 'Great! Now, click here to open the form and add the details for your new property. After you add it, a new tour will begin to help you set up its layout.',
    title: 'Add Your First Property',
  },
];

const layoutAndGuestSteps: Step[] = [
  {
    target: '[data-tour="edit-mode-switch"]',
    content: "You've created your property! Now, let's build its structure. Enable 'Edit Mode' to add floors, rooms, and beds.",
    title: 'Set Up Your Property',
    disableBeacon: true,
  },
  {
    target: '[data-tour="add-floor-button"]',
    content: "Start by adding a floor. You can name it 'Ground Floor', 'First Floor', etc.",
    title: 'Add a Floor',
  },
  {
    target: '[data-tour="add-room-button"]',
    content: "Inside each floor, you can add rooms. This is where you'll define room names and rent details.",
    title: 'Add a Room',
  },
  {
    target: '[data-tour="add-bed-button"]',
    content: "Next, add beds to your rooms. This determines the sharing type (e.g., 2 beds for double sharing).",
    title: 'Add Beds',
  },
  {
    target: '[data-tour="dashboard-nav"]',
    content: "Once your layout is complete, turn off 'Edit Mode' and head back to the main Dashboard to add your first guest.",
    title: 'Go to Dashboard',
  },
  {
    target: '[data-tour="add-guest-on-bed"]',
    content: "On the dashboard, simply click any available bed to begin the guest onboarding process. That's it!",
    title: 'Add Your First Guest',
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

        if (!hasPgs && !tour.hasCompletedOnboarding) {
            setActiveTour('onboarding');
            setSteps(onboardingSteps);
            setRunTour(true);
        } else if (hasPgs && !hasLayout && !tour.hasCompletedLayout) {
             setActiveTour('layout');
             setSteps(layoutAndGuestSteps);
             setRunTour(true);
        } else {
            setRunTour(false);
            setActiveTour(null);
        }
    }, [currentUser, pgs, tour]);


    const handleJoyrideCallback = (data: CallBackProps) => {
        const { status } = data;
        const finishedStatuses: string[] = ['finished', 'skipped'];

        if (finishedStatuses.includes(status)) {
            if (activeTour === 'onboarding') {
                dispatch(endOnboardingTour());
            } else if (activeTour === 'layout') {
                dispatch(endLayoutTour());
            }
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
            callback={handleJoyrideCallback}
            styles={{
                options: {
                    zIndex: 10000,
                },
            }}
        />
    )
}
