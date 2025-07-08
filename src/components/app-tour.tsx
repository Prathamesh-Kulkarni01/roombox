
'use client'

import { useEffect, useState } from 'react'
import Joyride, { type CallBackProps, type Step } from 'react-joyride'
import { useAppDispatch, useAppSelector } from '@/lib/hooks'
import { endTour } from '@/lib/slices/appSlice'

const tourSteps: Step[] = [
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
    content: 'Great! Now, click here to open the form and add the details for your new property.',
    title: 'Add Your First Property',
  },
];


export default function AppTour() {
    const dispatch = useAppDispatch();
    const { pgs } = useAppSelector(state => state.pgs);
    const { tour } = useAppSelector(state => state.app);
    const { currentUser } = useAppSelector(state => state.user);
    const [runTour, setRunTour] = useState(false);

    useEffect(() => {
        // Run tour if user is an owner, has no PGs, and hasn't completed the tour before.
        if (currentUser?.role === 'owner' && pgs.length === 0 && !tour.hasCompleted) {
            setRunTour(true);
        }
    }, [currentUser, pgs, tour.hasCompleted]);

    const handleJoyrideCallback = (data: CallBackProps) => {
        const { status } = data;
        const finishedStatuses: string[] = ['finished', 'skipped'];

        if (finishedStatuses.includes(status)) {
            dispatch(endTour());
            setRunTour(false);
        }
    };

    return (
        <Joyride
            steps={tourSteps}
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
