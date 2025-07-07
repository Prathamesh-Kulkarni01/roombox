
'use client'

import { useRef, type ReactNode, useEffect } from 'react'
import { Provider } from 'react-redux'
import { makeStore, type AppStore } from '@/lib/store'
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth'
import { collection, onSnapshot } from 'firebase/firestore'
import { auth, db, isFirebaseConfigured } from '@/lib/firebase'
import { useAppDispatch, useAppSelector } from '@/lib/hooks'
import { initializeUser, logoutUser } from '@/lib/slices/userSlice'
import { setPgs, fetchPgs as fetchLocalPgs } from '@/lib/slices/pgsSlice'
import { setGuests, fetchGuests as fetchLocalGuests } from '@/lib/slices/guestsSlice'
import { setComplaints, fetchComplaints as fetchLocalComplaints } from '@/lib/slices/complaintsSlice'
import { setExpenses, fetchExpenses as fetchLocalExpenses } from '@/lib/slices/expensesSlice'
import { setStaff, fetchStaff as fetchLocalStaff } from '@/lib/slices/staffSlice'
import { setNotifications, fetchNotifications as fetchLocalNotifications } from '@/lib/slices/notificationsSlice'
import { useToast } from '@/hooks/use-toast'

function AuthHandler({ children }: { children: ReactNode }) {
  const dispatch = useAppDispatch();
  const { currentUser, currentPlan } = useAppSelector((state) => state.user);
  const authListenerStarted = useRef(false);
  const { toast } = useToast();

  useEffect(() => {
    const handleOnline = () => {
      toast({
        title: "You're back online!",
        description: "Your data will be synced automatically.",
      });
    };

    const handleOffline = () => {
      toast({
        title: "You've gone offline",
        description: "Your changes will be saved and synced when you reconnect.",
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [toast]);

  useEffect(() => {
    if (!isFirebaseConfigured() || authListenerStarted.current) return;

    authListenerStarted.current = true;
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        dispatch(initializeUser(firebaseUser));
      } else {
        dispatch(logoutUser());
      }
    });

    return () => {
      unsubscribe();
      authListenerStarted.current = false;
    };
  }, [dispatch]);

  // Real-time data subscription and local data fetching effect
  useEffect(() => {
    if (!currentUser || !currentPlan) {
      return;
    }

    if (currentPlan.hasCloudSync && isFirebaseConfigured()) {
      // Pro Plan: Real-time sync from Firestore
      const collectionsToSync = {
        pgs: setPgs,
        guests: setGuests,
        complaints: setComplaints,
        expenses: setExpenses,
        staff: setStaff,
        notifications: setNotifications,
      };

      const unsubscribes = Object.entries(collectionsToSync).map(
        ([collectionName, setDataAction]) => {
          const collRef = collection(db, 'users_data', currentUser.id, collectionName);
          const unsubscribe = onSnapshot(collRef, (snapshot) => {
            const data = snapshot.docs.map(doc => doc.data());
            // Sort by date if applicable, descending
            if (['complaints', 'expenses', 'notifications'].includes(collectionName)) {
                data.sort((a, b) => new Date((b as any).date).getTime() - new Date((a as any).date).getTime());
            }
            dispatch(setDataAction(data as any));
          }, (error) => {
            console.error(`Error listening to ${collectionName} collection:`, error);
          });
          return unsubscribe;
        }
      );

      // Cleanup function to unsubscribe when component unmounts or dependencies change
      return () => {
        unsubscribes.forEach(unsub => unsub());
      };

    } else {
      // Free Plan: Fetch from local storage once
      const userId = currentUser.id;
      dispatch(fetchLocalPgs({ userId, useCloud: false }));
      dispatch(fetchLocalGuests({ userId, useCloud: false }));
      dispatch(fetchLocalComplaints({ userId, useCloud: false }));
      dispatch(fetchLocalExpenses({ userId, useCloud: false }));
      dispatch(fetchLocalStaff({ userId, useCloud: false }));
      dispatch(fetchLocalNotifications({ userId, useCloud: false }));
    }
  }, [currentUser, currentPlan, dispatch]);

  return <>{children}</>;
}


export default function StoreProvider({ children }: { children: ReactNode }) {
  const storeRef = useRef<AppStore>()
  if (!storeRef.current) {
    storeRef.current = makeStore()
  }

  return (
    <Provider store={storeRef.current}>
      <AuthHandler>{children}</AuthHandler>
    </Provider>
  )
}
