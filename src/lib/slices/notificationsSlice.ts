
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type { Notification } from '../types';
import { RootState } from '../store';

interface NotificationsState {
    notifications: Notification[];
}

const initialState: NotificationsState = {
    notifications: [],
};

// Async Thunks
export const fetchNotifications = createAsyncThunk<Notification[], void, { state: RootState }>(
    'notifications/fetchNotifications',
    async (_, { getState }) => {
        const { user } = getState();
        if (!user.currentUser) return [];
        const res = await fetch('/api/data/notifications');
        return await res.json();
    }
);

export const addNotification = createAsyncThunk<Notification, Omit<Notification, 'id' | 'date' | 'isRead'>, { state: RootState }>(
    'notifications/addNotification',
    async (notificationData, { rejectWithValue }) => {
        const res = await fetch('/api/data/notifications', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(notificationData)
        });
        if (!res.ok) return rejectWithValue('Failed to add notification');
        return await res.json();
    }
);

export const markNotificationAsRead = createAsyncThunk<string, string, { state: RootState }>(
    'notifications/markAsRead',
    async (notificationId, { rejectWithValue }) => {
        const res = await fetch(`/api/data/notifications/${notificationId}`, { method: 'PUT' });
        if (!res.ok) return rejectWithValue('Failed to mark as read');
        return notificationId;
    }
);

export const markAllAsRead = createAsyncThunk<void, void, { state: RootState }>(
    'notifications/markAllAsRead',
    async (_, { rejectWithValue }) => {
        const res = await fetch(`/api/data/notifications`, { method: 'PUT' });
        if (!res.ok) return rejectWithValue('Failed to mark all as read');
    }
);


const notificationsSlice = createSlice({
    name: 'notifications',
    initialState,
    reducers: {
        setNotifications: (state, action: PayloadAction<Notification[]>) => {
            state.notifications = action.payload;
        },
    },
     extraReducers: (builder) => {
        builder
            .addCase(fetchNotifications.fulfilled, (state, action) => {
                state.notifications = action.payload.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            })
            .addCase(addNotification.fulfilled, (state, action) => {
                state.notifications.unshift(action.payload);
            })
            .addCase(markNotificationAsRead.fulfilled, (state, action) => {
                const notification = state.notifications.find(n => n.id === action.payload);
                if (notification) {
                    notification.isRead = true;
                }
            })
            .addCase(markAllAsRead.fulfilled, (state) => {
                state.notifications.forEach(n => n.isRead = true);
            })
            .addCase('user/logoutUser/fulfilled', (state) => {
                state.notifications = [];
            });
    }
});

export const { setNotifications } = notificationsSlice.actions;
export default notificationsSlice.reducer;
