
'use client'

import { useRef, type ReactNode, useEffect, useCallback } from 'react'
import { Provider } from 'react-redux'
import { makeStore, type AppStore } from '@/lib/store'
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth'
import { getApp } from 'firebase/app'
import { auth, isFirebaseConfigured } from '@/lib/firebase'
import { getAnalytics, isSupported } from 'firebase/analytics'
import { useAppDispatch, useAppSelector } from '@/lib/hooks'
import { initializeUser, logoutUser } from '@/lib/slices/userSlice'
import { fetchPgs } from '@/lib/slices/pgsSlice'
import { fetchGuests } from '@/lib/slices/guestsSlice'
import { fetchComplaints } from '@/lib/slices/complaintsSlice'
import { fetchExpenses } from '@/lib/slices/expensesSlice'
import { fetchStaff } from '@/lib/slices/staffSlice'
import { fetchNotifications } from '@/lib/slices/notificationsSlice'
import { useToast } from '@/hooks/use-toast'
import { initializeFirebaseMessaging } from '@/lib/firebase-messaging-client'
import { setLoading } from '@/lib/slices/appSlice'

function AppInitializer({ children }: { children: ReactNode }) {
  const dispatch = useAppDispatch();
  const { currentUser } = useAppSelector((state) => state.user);
  const authListenerStarted = useRef(false);
  const { toast } = useToast();

  const fetchDataForUser = useCallback(() => {
    if (!currentUser) return;
    if (currentUser.role === 'tenant') {
        dispatch(fetchGuests());
        dispatch(fetchPgs());
        dispatch(fetchComplaints());
    } else {
        dispatch(fetchPgs());
        dispatch(fetchGuests());
        dispatch(fetchComplaints());
        dispatch(fetchExpenses());
        dispatch(fetchStaff());
        dispatch(fetchNotifications());
    }
  }, [currentUser, dispatch]);

  useEffect(() => {
    if (isFirebaseConfigured()) {
      isSupported().then(supported => {
        if (supported) { getAnalytics(getApp()); }
      });
    }
  }, []);

  useEffect(() => {
    const handleOnline = () => toast({ title: "You're back online!" });
    const handleOffline = () => toast({ title: "You've gone offline" });
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [toast]);

  useEffect(() => {
    if (!isFirebaseConfigured() || authListenerStarted.current || !auth) return;
    authListenerStarted.current = true;
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        await dispatch(initializeUser(firebaseUser));
      } else {
        dispatch(logoutUser());
      }
    });
    return () => {
      unsubscribe();
      authListenerStarted.current = false;
    };
  }, [dispatch]);

  useEffect(() => {
      if(currentUser) {
        initializeFirebaseMessaging();
        fetchDataForUser();
      }
  }, [currentUser, fetchDataForUser]);

  return <>{children}</>;
}


export default function StoreProvider({ children }: { children: ReactNode }) {
  const storeRef = useRef<AppStore>()
  if (!storeRef.current) {
    storeRef.current = makeStore()
  }

  return (
    <Provider store={storeRef.current}>
      <AppInitializer>{children}</AppInitializer>
    </Provider>
  )
}
