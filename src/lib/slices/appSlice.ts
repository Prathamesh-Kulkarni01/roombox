
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface TourState {
    hasCompletedOnboarding: boolean;
    hasCompletedLayout: boolean;
}

interface AppState {
    isLoading: boolean;
    selectedPgId: string | null;
    mockDate: string | null; // For time travel debugging
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

const initialState: AppState = {
    isLoading: true,
    selectedPgId: getInitialSelectedPgId(),
    mockDate: null,
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
        setMockDate: (state, action: PayloadAction<string | null>) => {
            state.mockDate = action.payload;
        }
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
                    localStorage.removeItem('selectedPgId');
                }
            });
    }
});

export const { setLoading, setSelectedPgId, setMockDate } = appSlice.actions;
export default appSlice.reducer;
