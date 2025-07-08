
'use client'

import { useEffect, useState } from 'react'
import Joyride, { type CallBackProps, type Step, STATUS, EVENTS, ACTIONS } from 'react-joyride'
import { useAppDispatch, useAppSelector } from '@/lib/hooks'
import { setTourStepIndex } from '@/lib/slices/appSlice'
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
    content: 'Now, fill in the basic details for your property. When you click "Add Property", you will be taken to the layout editor to continue the tour.',
    title: 'Property Details',
    disableBeacon: true,
    placement: 'left',
  }
];

const layoutAndGuestSteps: Step[] = [
    {
        target: '[data-tour="edit-mode-switch"]',
        content: "Great! Your property is created. Now, enable 'Edit Mode' to build the layout. This allows you to add floors, rooms, and beds.",
        title: 'Step 1: Enable Edit Mode',
        disableBeacon: true,
        spotlightClicks: true,
    },
    {
        target: '[data-tour="add-floor-button"]',
        content: "With Edit Mode on, you can now add your first floor. Click here to create a floor.",
        title: 'Step 2: Add a Floor',
        disableBeacon: true,
        spotlightClicks: true,
    },
    {
        target: '[data-tour="add-room-button"]',
        content: "Good job! Now add a room to this floor. You'll set its name and rent details here.",
        title: 'Step 3: Add a Room',
        disableBeacon: true,
        spotlightClicks: true,
    },
    {
        target: '[data-tour="add-bed-button"]',
        content: "Almost there! Add a bed to the room. The number of beds determines the sharing type.",
        title: 'Step 4: Add Beds',
        disableBeacon: true,
        spotlightClicks: true,
    },
    {
        target: '[data-tour="edit-mode-switch"]',
        content: "Your basic layout is complete! Now, turn off 'Edit Mode' to switch to the guest management view.",
        title: 'Step 5: Disable Edit Mode',
        disableBeacon: true,
        spotlightClicks: true,
    },
    {
        target: '[data-tour="dashboard-nav"]',
        content: "Finally, head back to the main Dashboard to add your first guest to the bed you just created.",
        title: 'Step 6: Go to Dashboard',
        disableBeacon: true,
        spotlightClicks: true,
    },
    {
        target: '[data-tour="add-guest-on-bed"]',
        content: "On the dashboard, simply click any available bed to start adding a guest. That's it, you're all set!",
        title: 'Step 7: Add Your First Guest',
        disableBeacon: true,
        spotlightClicks: true,
    },
];


export default function AppTour() {
    const dispatch = useAppDispatch();
    const { pgs } = useAppSelector(state => state.pgs);
    const { tourStepIndex } = useAppSelector(state => state.app);
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
        const hasLayout = hasPgs && pgs.some(p => p.floors && p.floors.length > 0);
        
        // This was the temporary change to always show the tour
        const onboardingCompleted = false; 
        const layoutCompleted = false; 

        const isOnDashboard = pathname === '/dashboard';
        const isOnPgManagement = pathname.startsWith('/dashboard/pg-management/');
        
        // Default to not running the tour
        setRunTour(false);

        if (!onboardingCompleted && !hasPgs && isOnDashboard) {
            setActiveTour('onboarding');
            setSteps(onboardingSteps);
            setRunTour(true);
        } else if (!layoutCompleted && hasPgs && !hasLayout && isOnPgManagement) {
             setActiveTour('layout');
             setSteps(layoutAndGuestSteps);
             setRunTour(true);
        } else {
            setActiveTour(null);
        }
    }, [currentUser, pgs, pathname]);


    const handleJoyrideCallback = (data: CallBackProps) => {
        const { action, index, status, type } = data;

        if (([STATUS.FINISHED, STATUS.SKIPPED] as string[]).includes(status)) {
            setRunTour(false);
            dispatch(setTourStepIndex(0));
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
