
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

// Async Thunks
export const fetchNotifications = createAsyncThunk(
    'notifications/fetchNotifications',
    async ({ userId, useCloud }: { userId: string, useCloud: boolean }) => {
        if (useCloud) {
            const notificationsCollection = collection(db, 'users_data', userId, 'notifications');
            const snap = await getDocs(notificationsCollection);
            return snap.docs.map(d => d.data() as Notification);
        } else {
            if(typeof window === 'undefined') return [];
            const localData = localStorage.getItem('notifications');
            return localData ? JSON.parse(localData) : [];
        }
    }
);

export const addNotification = createAsyncThunk<Notification, Omit<Notification, 'id' | 'date' | 'isRead'>, { state: RootState }>(
    'notifications/addNotification',
    async (notificationData, { getState, rejectWithValue }) => {
        const { user } = getState();
        if (!user.currentUser) return rejectWithValue('No user');

        const newNotification: Notification = {
            id: `notif-${Date.now()}`,
            ...notificationData,
            date: new Date().toISOString(),
            isRead: false,
        };

        if (user.currentPlan?.hasCloudSync && isFirebaseConfigured()) {
            const docRef = doc(db, 'users_data', user.currentUser.id, 'notifications', newNotification.id);
            await setDoc(docRef, newNotification);
        }
        return newNotification;
    }
);

export const markNotificationAsRead = createAsyncThunk<string, string, { state: RootState }>(
    'notifications/markAsRead',
    async (notificationId, { getState, rejectWithValue }) => {
        const { user, notifications } = getState();
        if (!user.currentUser) return rejectWithValue('No user');

        const notification = notifications.notifications.find(n => n.id === notificationId);
        if (!notification) return rejectWithValue('Notification not found');
        
        const updatedNotification = { ...notification, isRead: true };

        if (user.currentPlan?.hasCloudSync && isFirebaseConfigured()) {
            const docRef = doc(db, 'users_data', user.currentUser.id, 'notifications', notificationId);
            await setDoc(docRef, updatedNotification, { merge: true });
        }
        return notificationId;
    }
);

export const markAllAsRead = createAsyncThunk<void, void, { state: RootState }>(
    'notifications/markAllAsRead',
    async (_, { getState, rejectWithValue }) => {
        const { user, notifications } = getState();
        if (!user.currentUser) return rejectWithValue('No user');
        
        const unreadNotifications = notifications.notifications.filter(n => !n.isRead);
        if (unreadNotifications.length === 0) return;

        if (user.currentPlan?.hasCloudSync && isFirebaseConfigured()) {
            const batch = writeBatch(db);
            unreadNotifications.forEach(notification => {
                const docRef = doc(db, 'users_data', user.currentUser.id, 'notifications', notification.id);
                batch.update(docRef, { isRead: true });
            });
            await batch.commit();
        }
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
