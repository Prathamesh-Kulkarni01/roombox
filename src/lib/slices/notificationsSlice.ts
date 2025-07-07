
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { Notification } from '../types';

interface NotificationsState {
    notifications: Notification[];
}

const getInitialNotifications = (): Notification[] => {
    if (typeof window === 'undefined') return [];
    try {
        const item = window.localStorage.getItem('notifications');
        return item ? JSON.parse(item) : [];
    } catch (error) {
        return [];
    }
};

const initialState: NotificationsState = {
    notifications: getInitialNotifications(),
};

const notificationsSlice = createSlice({
    name: 'notifications',
    initialState,
    reducers: {
        setNotifications: (state, action: PayloadAction<Notification[]>) => {
            state.notifications = action.payload;
            if (typeof window !== 'undefined') {
                localStorage.setItem('notifications', JSON.stringify(action.payload));
            }
        },
        markNotificationAsRead: (state, action: PayloadAction<string>) => {
            const notification = state.notifications.find(n => n.id === action.payload);
            if (notification) {
                notification.isRead = true;
            }
             if (typeof window !== 'undefined') {
                localStorage.setItem('notifications', JSON.stringify(state.notifications));
            }
        },
        markAllAsRead: (state) => {
            state.notifications.forEach(n => n.isRead = true);
             if (typeof window !== 'undefined') {
                localStorage.setItem('notifications', JSON.stringify(state.notifications));
            }
        },
    },
     extraReducers: (builder) => {
        builder.addCase('user/logoutUser/fulfilled', (state) => {
            state.notifications = [];
             if (typeof window !== 'undefined') {
                localStorage.removeItem('notifications');
            }
        });
    }
});

export const { setNotifications, markNotificationAsRead, markAllAsRead } = notificationsSlice.actions;
export default notificationsSlice.reducer;
