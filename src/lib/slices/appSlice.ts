
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface TourState {
    hasCompletedOnboarding: boolean;
    hasCompletedLayout: boolean;
}

interface AppState {
    isLoading: boolean;
    selectedPgId: string | null;
    tour: TourState;
    tourStepIndex: number;
}

const getInitialSelectedPgId = (): string | null => {
    if (typeof window === 'undefined') return null;
    try {
        const item = window.localStorage.getItem('selectedPgId');
        return item ? JSON.parse(item) : null;
    } catch (error) {
        return null;
    }
};

const getInitialTourState = (tourName: 'onboarding' | 'layout'): boolean => {
    if (typeof window === 'undefined') return false;
    try {
        const item = window.localStorage.getItem(`tour_${tourName}_completed`);
        return item ? JSON.parse(item) : false;
    } catch (error) {
        return false;
    }
};

const initialState: AppState = {
    isLoading: true,
    selectedPgId: getInitialSelectedPgId(),
    tour: {
        hasCompletedOnboarding: getInitialTourState('onboarding'),
        hasCompletedLayout: getInitialTourState('layout'),
    },
    tourStepIndex: 0,
};

const appSlice = createSlice({
    name: 'app',
    initialState,
    reducers: {
        setLoading: (state, action: PayloadAction<boolean>) => {
            state.isLoading = action.payload;
        },
        setSelectedPgId: (state, action: PayloadAction<string | null>) => {
            state.selectedPgId = action.payload;
            if (typeof window !== 'undefined') {
                localStorage.setItem('selectedPgId', JSON.stringify(action.payload));
            }
        },
        endOnboardingTour: (state) => {
            state.tour.hasCompletedOnboarding = true;
            if (typeof window !== 'undefined') {
                localStorage.setItem('tour_onboarding_completed', JSON.stringify(true));
            }
        },
        endLayoutTour: (state) => {
            state.tour.hasCompletedLayout = true;
            if (typeof window !== 'undefined') {
                localStorage.setItem('tour_layout_completed', JSON.stringify(true));
            }
        },
        setTourStepIndex: (state, action: PayloadAction<number>) => {
            state.tourStepIndex = action.payload;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase('user/initializeUser/pending', (state) => {
                state.isLoading = true;
            })
            .addCase('user/initializeUser/fulfilled', (state) => {
                state.isLoading = false;
            })
            .addCase('user/initializeUser/rejected', (state) => {
                state.isLoading = false;
            })
            .addCase('user/logoutUser/fulfilled', (state) => {
                state.isLoading = false;
                state.selectedPgId = null;
                 if (typeof window !== 'undefined') {
                    localStorage.removeItem('tour_onboarding_completed');
                    localStorage.removeItem('tour_layout_completed');
                    localStorage.removeItem('selectedPgId');
                }
                state.tour.hasCompletedOnboarding = false;
                state.tour.hasCompletedLayout = false;
                state.tourStepIndex = 0;
            });
    }
});

export const { setLoading, setSelectedPgId, endOnboardingTour, endLayoutTour, setTourStepIndex } = appSlice.actions;
export default appSlice.reducer;
