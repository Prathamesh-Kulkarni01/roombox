

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

// Async Thunks
export const fetchNotifications = createAsyncThunk(
    'notifications/fetchNotifications',
    async ({ userId, useCloud }: { userId: string, useCloud: boolean }) => {
        if (useCloud) {
            if (!isFirebaseConfigured() || !db) return [] as Notification[];
            const notificationsCollection = collection(db, 'users_data', userId, 'notifications');
            const snap = await getDocs(notificationsCollection);
            return snap.docs.map(d => d.data() as Notification);
        } else {
            if(typeof window === 'undefined') return [] as Notification[];
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

// Send push to a specific user via server API
export const sendPushNotificationToUser = createAsyncThunk<
    { ok: boolean; error?: string },
    { userId: string; title: string; body: string; link?: string }
>(
    'notifications/sendToUser',
    async (params) => {
        return await sendPushToUser(params);
    }
);

// Send push to a topic
export const sendPushNotificationToTopic = createAsyncThunk<
    { ok: boolean; error?: string },
    { topic: string; title: string; body: string; link?: string }
>(
    'notifications/sendToTopic',
    async (params) => {
        return await sendPushToTopic(params);
    }
);

// Subscribe current token to topics (requires token passed in caller)
export const subscribeCurrentTokenToTopics = createAsyncThunk<
    { ok: boolean; subscribed?: string[] },
    { token: string; topics: string[]; userId?: string }
>(
    'notifications/subscribeTopics',
    async ({ token, topics, userId }) => {
        const result = await subscribeToTopics(token, topics);
        return result;
    }
);

// Fetch subscribed topics by userId or token
export const fetchSubscribedTopics = createAsyncThunk<
    string[],
    { userId?: string; token?: string }
>(
    'notifications/fetchSubscribedTopics',
    async (opts) => {
        return await getSubscribedTopics(opts);
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
                state.notifications = (action.payload as Notification[]).sort((a: Notification, b: Notification) => new Date(b.date).getTime() - new Date(a.date).getTime());
            })
            .addCase(addNotification.fulfilled, (state, action) => {
                state.notifications.unshift(action.payload);
            })
            .addCase(markNotificationAsRead.fulfilled, (state, action) => {
                const notification = state.notifications.find((n: Notification) => n.id === action.payload);
                if (notification) {
                    notification.isRead = true;
                }
            })
            .addCase(markAllAsRead.fulfilled, (state) => {
                state.notifications.forEach((n: Notification) => n.isRead = true);
            })
            // push sends: nothing to update in state by default; could handle errors via toasts
            .addCase(sendPushNotificationToUser.rejected, () => {})
            .addCase(sendPushNotificationToUser.fulfilled, () => {})
            .addCase(sendPushNotificationToTopic.rejected, () => {})
            .addCase(sendPushNotificationToTopic.fulfilled, () => {})
            // subscriptions fetch is also separate state in UI; keeping slice minimal for now
            .addCase(fetchSubscribedTopics.fulfilled, () => {})
            .addCase(subscribeCurrentTokenToTopics.fulfilled, () => {})
            .addCase('user/logoutUser/fulfilled', (state) => {
                state.notifications = [];
            });
    }
});

export const { setNotifications } = notificationsSlice.actions;
export default notificationsSlice.reducer;
