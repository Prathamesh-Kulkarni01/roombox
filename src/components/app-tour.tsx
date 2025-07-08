
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
    target: '[data-tour="add-first-pg-button"]',
    content: 'Click here to add your first property. The form will open in a side panel, and the tour will continue automatically after you save.',
    title: 'Add Your First Property',
    disableBeacon: true,
    hideFooter: true,
  },
];

const layoutAndGuestSteps: Step[] = [
    {
        target: '[data-tour="edit-mode-switch"]',
        content: "Great! Your property is created. Now, enable 'Edit Mode' to build the layout of your property. This allows you to add floors, rooms, and beds.",
        title: 'Step 1: Enable Edit Mode',
        disableBeacon: true,
    },
    {
        target: '[data-tour="add-floor-button"]',
        content: "With Edit Mode on, you can now add your first floor. Click here to create a floor.",
        title: 'Step 2: Add a Floor',
        disableBeacon: true,
    },
    {
        target: '[data-tour="add-room-button"]',
        content: "Good job! Now add a room to this floor. You'll set its name and rent details here.",
        title: 'Step 3: Add a Room',
        disableBeacon: true,
    },
    {
        target: '[data-tour="add-bed-button"]',
        content: "Almost there! Add a bed to the room. The number of beds determines the sharing type.",
        title: 'Step 4: Add Beds',
        disableBeacon: true,
    },
    {
        target: '[data-tour="edit-mode-switch"]',
        content: "Your basic layout is complete! Now, turn off 'Edit Mode' to switch to the guest management view.",
        title: 'Step 5: Disable Edit Mode',
        disableBeacon: true,
    },
    {
        target: '[data-tour="dashboard-nav"]',
        content: "Finally, head back to the main Dashboard to add your first guest to the bed you just created.",
        title: 'Step 6: Go to Dashboard',
        disableBeacon: true,
    },
    {
        target: '[data-tour="add-guest-on-bed"]',
        content: "On the dashboard, simply click any available bed to start adding a guest. That's it, you're all set!",
        title: 'Step 7: Add Your First Guest',
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
                    overlayColor: 'rgba(0, 0, 0, 0.6)',
                },
                 spotlight: {
                    borderRadius: 'var(--radius)',
                }
            }}
        />
    )
}
