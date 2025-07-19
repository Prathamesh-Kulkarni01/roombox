
'use client'

import { useRef, type ReactNode, useEffect } from 'react'
import { Provider } from 'react-redux'
import { makeStore, type AppStore } from '@/lib/store'
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth'
import { collection, onSnapshot, doc, query, where, type Unsubscribe } from 'firebase/firestore'
import { getApp } from 'firebase/app'
import { auth, db, isFirebaseConfigured } from '@/lib/firebase'
import { getAnalytics, isSupported } from 'firebase/analytics'
import { useAppDispatch, useAppSelector } from '@/lib/hooks'
import { initializeUser, logoutUser } from '@/lib/slices/userSlice'
import { setPgs, fetchPgs as fetchLocalPgs } from '@/lib/slices/pgsSlice'
import { setGuests, fetchGuests as fetchLocalGuests } from '@/lib/slices/guestsSlice'
import { setComplaints, fetchComplaints as fetchLocalComplaints } from '@/lib/slices/complaintsSlice'
import { setExpenses, fetchExpenses as fetchLocalExpenses } from '@/lib/slices/expensesSlice'
import { setStaff, fetchStaff as fetchLocalStaff } from '@/lib/slices/staffSlice'
import { setNotifications, fetchNotifications as fetchLocalNotifications } from '@/lib/slices/notificationsSlice'
import { useToast } from '@/hooks/use-toast'
import { initializeFirebaseMessaging } from '@/lib/firebase-messaging-client'
import type { Guest, PG, Complaint, Notification } from '@/lib/types'
import { setLoading } from '@/lib/slices/appSlice'


function AuthHandler({ children }: { children: ReactNode }) {
  const dispatch = useAppDispatch();
  const { currentUser, currentPlan } = useAppSelector((state) => state.user);
  const authListenerStarted = useRef(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isFirebaseConfigured()) {
      isSupported().then(supported => {
        if (supported) {
          getAnalytics(getApp());
        }
      });
    }
  }, []);

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

  // Auth state listener
  useEffect(() => {
    if (!isFirebaseConfigured() || authListenerStarted.current || !auth) return;

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

  // Data fetching for Owners (and other non-tenant roles)
  useEffect(() => {
    if (!currentUser || currentUser.role === 'tenant' || !db) return;

    initializeFirebaseMessaging();

    if (!currentPlan) return;

    if (currentPlan.hasCloudSync) {
      const collectionsToSync = {
        pgs: setPgs,
        guests: setGuests,
        complaints: setComplaints,
        expenses: setExpenses,
        staff: setStaff,
        notifications: setNotifications,
      };

      const ownerUnsubs = Object.entries(collectionsToSync).map(([collectionName, setDataAction]) => {
        const collRef = collection(db, 'users_data', currentUser.id, collectionName);
        return onSnapshot(collRef, (snapshot) => {
          const data = snapshot.docs.map(doc => doc.data());
          if (['complaints', 'expenses', 'notifications'].includes(collectionName)) {
            data.sort((a, b) => new Date((b as any).date).getTime() - new Date((a as any).date).getTime());
          }
          dispatch(setDataAction(data as any));
        }, (error) => {
          console.error(`Error listening to ${collectionName} collection:`, error);
        });
      });
      return () => { ownerUnsubs.forEach(unsub => unsub()); };
    } else {
      const userId = currentUser.id;
      dispatch(fetchLocalPgs({ userId, useCloud: false }));
      dispatch(fetchLocalGuests({ userId, useCloud: false }));
      dispatch(fetchLocalComplaints({ userId, useCloud: false }));
      dispatch(fetchLocalExpenses({ userId, useCloud: false }));
      dispatch(fetchLocalStaff({ userId, useCloud: false }));
      dispatch(fetchLocalNotifications({ userId, useCloud: false }));
    }
  }, [currentUser, currentPlan, dispatch]);

  // Data fetching for Tenants
  useEffect(() => {
    if (currentUser?.role !== 'tenant' || !currentUser?.ownerId || !currentUser?.guestId || !db) {
        if (currentUser && currentUser.role === 'tenant') {
            dispatch(setLoading(false)); // Not enough info to fetch, stop loading
        }
        return;
    }

    initializeFirebaseMessaging();
    const { ownerId, guestId } = currentUser;

    let pgUnsubscribe: Unsubscribe | null = null;
    let complaintsUnsubscribe: Unsubscribe | null = null;
    let dataLoadedFlags = { guest: false, pg: false, complaints: false };

    const checkLoadingComplete = () => {
        if (Object.values(dataLoadedFlags).every(Boolean)) {
            dispatch(setLoading(false));
        }
    }

    const guestUnsubscribe = onSnapshot(doc(db, 'users_data', ownerId, 'guests', guestId), (guestSnap) => {
        dataLoadedFlags.guest = true;
        
        if (guestSnap.exists()) {
            const guestData = guestSnap.data() as Guest;
            dispatch(setGuests([guestData]));

            if (guestData.pgId) {
                const pgDocRef = doc(db, 'users_data', ownerId, 'pgs', guestData.pgId);
                pgUnsubscribe = onSnapshot(pgDocRef, (pgSnap) => {
                    dataLoadedFlags.pg = true;
                    if (pgSnap.exists()) {
                        dispatch(setPgs([pgSnap.data() as PG]));
                    } else {
                        dispatch(setPgs([]));
                    }
                    checkLoadingComplete();
                });

                const complaintsQuery = query(collection(db, 'users_data', ownerId, 'complaints'), where('pgId', '==', guestData.pgId));
                complaintsUnsubscribe = onSnapshot(complaintsQuery, (snapshot) => {
                    dataLoadedFlags.complaints = true;
                    const complaintsData = snapshot.docs.map(d => d.data() as Complaint);
                    dispatch(setComplaints(complaintsData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())));
                    checkLoadingComplete();
                }, (error) => {
                    console.error("Error fetching complaints:", error);
                    dataLoadedFlags.complaints = true;
                    checkLoadingComplete();
                });

            } else {
                dispatch(setPgs([]));
                dispatch(setComplaints([]));
                dataLoadedFlags.pg = true;
                dataLoadedFlags.complaints = true;
                checkLoadingComplete();
            }
        } else {
            // Guest document doesn't exist, can't fetch anything else
            dispatch(setGuests([]));
            dispatch(setPgs([]));
            dispatch(setComplaints([]));
            dataLoadedFlags.pg = true;
            dataLoadedFlags.complaints = true;
            checkLoadingComplete();
        }
    }, (error) => {
        console.error("Error listening to guest document:", error);
        dispatch(setLoading(false)); // Stop loading on error
    });

    return () => {
        guestUnsubscribe();
        if (pgUnsubscribe) pgUnsubscribe();
        if (complaintsUnsubscribe) complaintsUnsubscribe();
    };
  }, [currentUser, dispatch]);


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
