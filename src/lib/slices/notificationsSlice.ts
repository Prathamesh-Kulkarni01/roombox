
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type { Notification } from '../types';
import { db, isFirebaseConfigured } from '../firebase';
import { collection, doc, getDocs, setDoc, writeBatch } from 'firebase/firestore';
import { RootState } from '../store';
import { sendPushToTopic, sendPushToUser, getSubscribedTopics, subscribeToTopics } from '../notifications';

interface NotificationsState {
    notifications: Notification[];
}

const initialState: NotificationsState = {
    notifications: [],
};

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
        
        const ownerId = user.currentUser.role === 'owner' ? user.currentUser.id : user.currentUser.ownerId;
        if (!ownerId) return rejectWithValue('Could not determine owner ID for notification');


        if (user.currentPlan?.hasCloudSync && isFirebaseConfigured() && db) {
            const docRef = doc(db, 'users_data', ownerId, 'notifications', newNotification.id);
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
        
        const ownerId = user.currentUser.role === 'owner' ? user.currentUser.id : user.currentUser.ownerId;
        if (!ownerId) return rejectWithValue('Could not determine owner ID');

        const updatedNotification: Notification = { ...notification, isRead: true };

        if (user.currentPlan?.hasCloudSync && isFirebaseConfigured() && db) {
            const docRef = doc(db, 'users_data', ownerId, 'notifications', notificationId);
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
        
        const ownerId = user.currentUser.role === 'owner' ? user.currentUser.id : user.currentUser.ownerId;
        if (!ownerId) return rejectWithValue('Could not determine owner ID');
        
        const unreadNotifications = notifications.notifications.filter(n => !n.isRead);
        if (unreadNotifications.length === 0) return;

        if (user.currentPlan?.hasCloudSync && isFirebaseConfigured() && db) {
            const batch = writeBatch(db);
            unreadNotifications.forEach(notification => {
                const docRef = doc(db, 'users_data', ownerId, 'notifications', notification.id);
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
            .addCase('user/logoutUser/fulfilled', (state) => {
                state.notifications = [];
            });
    }
});

export const { setNotifications } = notificationsSlice.actions;
export default notificationsSlice.reducer;
