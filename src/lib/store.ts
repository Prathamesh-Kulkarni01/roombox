
import { configureStore } from '@reduxjs/toolkit';
import appReducer from './slices/appSlice';
import userReducer from './slices/userSlice';
import pgsReducer from './slices/pgsSlice';
import guestsReducer from './slices/guestsSlice';
import complaintsReducer from './slices/complaintsSlice';
import expensesReducer from './slices/expensesSlice';
import staffReducer from './slices/staffSlice';
import notificationsReducer from './slices/notificationsSlice';

export const makeStore = () => {
  return configureStore({
    reducer: {
        app: appReducer,
        user: userReducer,
        pgs: pgsReducer,
        guests: guestsReducer,
        complaints: complaintsReducer,
        expenses: expensesReducer,
        staff: staffReducer,
        notifications: notificationsReducer,
    },
    devTools: process.env.NODE_ENV !== 'production',
  });
};

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore['getState']>;
export type AppDispatch = AppStore['dispatch'];
