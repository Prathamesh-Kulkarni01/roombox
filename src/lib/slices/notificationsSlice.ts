
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type { Notification } from '../types';
import { db, isFirebaseConfigured } from '../firebase';
import { collection, doc, getDocs, setDoc, writeBatch } from 'firebase/firestore';
import { RootState } from '../store';

interface NotificationsState {
    notifications: Notification[];
}

const initialState: NotificationsState = {
    notifications: [],
};

const notificationsSlice = createSlice({
    name: 'notifications',
    initialState,
    reducers: {
        setNotifications: (state, action: PayloadAction<Notification[]>) => {
            state.notifications = action.payload;
        },
        addNotification: (state, action: PayloadAction<Notification>) => {
             state.notifications.unshift(action.payload);
        },
        markNotificationAsRead: (state, action: PayloadAction<string>) => {
            const index = state.notifications.findIndex(n => n.id === action.payload);
            if (index !== -1) {
                state.notifications[index].isRead = true;
            }
        },
        markAllAsRead: (state) => {
            state.notifications.forEach(n => {
                n.isRead = true;
            });
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase('user/logoutUser/fulfilled', (state) => {
                state.notifications = [];
            });
    }
});

export const { setNotifications, addNotification, markNotificationAsRead, markAllAsRead } = notificationsSlice.actions;
export default notificationsSlice.reducer;
