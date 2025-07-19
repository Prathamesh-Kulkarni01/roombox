

'use client'

import { useRef, type ReactNode, useEffect, useState } from 'react'
import { Provider } from 'react-redux'
import { makeStore, type AppStore } from '@/lib/store'
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth'
import { collection, onSnapshot, doc, getDocs, query, where, type Unsubscribe } from 'firebase/firestore'
import { getApp } from 'firebase/app'
import { auth, db, isFirebaseConfigured } from '@/lib/firebase'
import { getAnalytics, isSupported } from 'firebase/analytics'
import { useAppDispatch, useAppSelector } from '@/lib/hooks'
import { initializeUser, logoutUser } from '@/lib/slices/userSlice'
import { setPgs } from '@/lib/slices/pgsSlice'
import { setGuests } from '@/lib/slices/guestsSlice'
import { setComplaints } from '@/lib/slices/complaintsSlice'
import { setExpenses } from '@/lib/slices/expensesSlice'
import { setStaff } from '@/lib/slices/staffSlice'
import { setNotifications } from '@/lib/slices/notificationsSlice'
import { useToast } from '@/hooks/use-toast'
import { initializeFirebaseMessaging } from '@/lib/firebase-messaging-client'
import type { Guest, PG, Complaint, Notification, Staff } from '@/lib/types'
import { setLoading } from '@/lib/slices/appSlice'


function AuthHandler({ children }: { children: ReactNode }) {
  const dispatch = useAppDispatch();
  const { currentUser, currentPlan } = useAppSelector((state) => state.user);
  const authListenerStarted = useRef(false);
  const [dataListeners, setDataListeners] = useState<Unsubscribe[]>([]);
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

  // Data fetching logic based on user role
  useEffect(() => {
    // Clear previous listeners
    dataListeners.forEach(unsub => unsub());
    setDataListeners([]);

    if (!currentUser || !currentPlan || !db) return;

    initializeFirebaseMessaging();

    let unsubs: Unsubscribe[] = [];

    // Owner Data Fetching
    if (currentUser.role === 'owner') {
        const collectionsToSync: { [key: string]: (data: any) => { type: string; payload: any } } = {
            pgs: setPgs,
            guests: setGuests,
            complaints: setComplaints,
            expenses: setExpenses,
            staff: setStaff,
            notifications: setNotifications,
        };

        const promises = Object.entries(collectionsToSync).map(([collectionName]) => {
            return getDocs(collection(db, 'users_data', currentUser.id, collectionName));
        });

        Promise.all(promises).then((snapshots) => {
            snapshots.forEach((snapshot, index) => {
                const collectionName = Object.keys(collectionsToSync)[index];
                const data = snapshot.docs.map(doc => doc.data());
                 if (['complaints', 'expenses', 'notifications'].includes(collectionName)) {
                    data.sort((a, b) => new Date((b as any).date).getTime() - new Date((a as any).date).getTime());
                }
                if(collectionName === 'guests') {
                    dispatch(setGuests(data.filter(g => !(g as Guest).isVacated) as Guest[]));
                } else {
                    dispatch(collectionsToSync[collectionName](data));
                }
            });
            dispatch(setLoading(false));
        }).catch(error => {
            console.error("Error fetching initial data for owner:", error);
            dispatch(setLoading(false));
        });

        // Setup real-time listeners after initial fetch
        const newUnsubs = Object.entries(collectionsToSync).map(([collectionName, setDataAction]) => {
            const collRef = collection(db, 'users_data', currentUser.id, collectionName);
            return onSnapshot(collRef, (snapshot) => {
                 const data = snapshot.docs.map(doc => doc.data());
                 if (['complaints', 'expenses', 'notifications'].includes(collectionName)) {
                    data.sort((a, b) => new Date((b as any).date).getTime() - new Date((a as any).date).getTime());
                }
                 if(collectionName === 'guests') {
                    dispatch(setGuests(data.filter(g => !(g as Guest).isVacated) as Guest[]));
                } else {
                    dispatch(setDataAction(data as any));
                }
            }, (error) => console.error(`Error listening to ${collectionName}:`, error));
        });
        unsubs.push(...newUnsubs);

    // Tenant Data Fetching
    } else if (currentUser.role === 'tenant' && currentUser.ownerId && currentUser.pgId && currentUser.guestId) {
        const { ownerId, pgId, guestId } = currentUser;

        // Fetch single PG
        const pgDocRef = doc(db, 'users_data', ownerId, 'pgs', pgId);
        unsubs.push(onSnapshot(pgDocRef, (snap) => dispatch(setPgs(snap.exists() ? [snap.data() as PG] : []))));

        // Fetch single guest record
        const guestDocRef = doc(db, 'users_data', ownerId, 'guests', guestId);
        unsubs.push(onSnapshot(guestDocRef, (snap) => dispatch(setGuests(snap.exists() ? [snap.data() as Guest] : []))));
        
        // Fetch complaints for that PG
        const complaintsQuery = query(collection(db, 'users_data', ownerId, 'complaints'), where('pgId', '==', pgId));
        unsubs.push(onSnapshot(complaintsQuery, (snapshot) => {
            const complaintsData = snapshot.docs.map(d => d.data() as Complaint);
            dispatch(setComplaints(complaintsData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())));
        }));

        dispatch(setLoading(false)); // For tenants, loading is faster
    } else {
        // Handle other roles or incomplete user data
        dispatch(setLoading(false));
    }
    
    setDataListeners(unsubs);
    
    return () => {
        unsubs.forEach(unsub => unsub());
    };
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
