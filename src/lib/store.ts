
import { configureStore } from '@reduxjs/toolkit';
import appReducer from './slices/appSlice';
import userReducer from './slices/userSlice';
import pgsReducer from './slices/pgsSlice';
import guestsReducer from './slices/guestsSlice';
import complaintsReducer from './slices/complaintsSlice';
import expensesReducer from './slices/expensesSlice';
import staffReducer from './slices/staffSlice';
import notificationsReducer from './slices/notificationsSlice';
import noticesReducer from './slices/noticesSlice';
import { api } from './api/apiSlice';

import permissionsReducer from './slices/permissionsSlice';

/**
 * STORE ARCHITECTURE (after RTK Query migration):
 *
 * Redux slices (kept):
 *  - userSlice      → auth session, plan (global singleton, not refetched)
 *  - appSlice       → UI globals (loading spinner, mockDate, selectedPgId)
 *  - notificationsSlice → ephemeral toast state
 *  - pgsSlice       → property structural mutations (floor/room/bed edits done locally)
 *  - guestsSlice    → tenant CRUD (Phase 2/3: will migrate to RTK Query)
 *  - complaintsSlice, expensesSlice, staffSlice → Phase 2 migration targets
 *  - permissionsSlice    → staff role mappings (needed for owner delegation)
 *
 * RTK Query (new):
 *  - api.getProperties   → property list (source of truth for display)
 *  - api.createProperty  → creates and invalidates cache
 *  - api.deleteProperty  → deletes and invalidates cache
 *  - api.getTenants      → tenant list with rent summary
 *  - api.recordPayment   → records payment and invalidates tenant/rent cache
 */

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
      notices: noticesReducer,
      permissions: permissionsReducer,
      // RTK Query API — handles server data fetching with auto-cache & invalidation
      [api.reducerPath]: api.reducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: false,
      }).concat(api.middleware),
    devTools: process.env.NODE_ENV !== 'production',
  });
};

export const store = makeStore();

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore['getState']>;
export type AppDispatch = AppStore['dispatch'];