
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
import { setChargeTemplates } from '@/lib/slices/chargeTemplatesSlice'
import { setNotifications } from '@/lib/slices/notificationsSlice'
import { useToast } from '@/hooks/use-toast'
import { initializeFirebaseMessaging } from '@/lib/firebase-messaging-client'
import type { Guest, PG, Complaint, Notification, Staff, ChargeTemplate, Expense } from '@/lib/types'
import { setLoading } from '@/lib/slices/appSlice'
import { fetchPermissions } from '@/lib/slices/permissionsSlice'
import { fetchKycConfig } from '@/lib/slices/kycConfigSlice'
import { initPushAndSaveToken, subscribeToTopic } from '@/lib/notifications'


function AuthHandler({ children }: { children: ReactNode }) {
  const dispatch = useAppDispatch();
  const { currentUser, currentPlan } = useAppSelector((state) => state.user);
  const authListenerStarted = useRef(false);
  const [dataListeners, setDataListeners] = useState<Unsubscribe[]>([]);
  const { toast } = useToast();
  const { selectedPgId } = useAppSelector((state) => state.app);

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
    
    // Determine the correct ID for fetching data (owner's ID for everyone)
    const ownerIdForFetching = currentUser.role === 'owner' ? currentUser.id : currentUser.ownerId;

    if (!ownerIdForFetching) {
        dispatch(setLoading(false));
        return; // Can't fetch data without an owner ID
    }

    // Initialize Firebase Messaging (legacy helper)
    initializeFirebaseMessaging(currentUser.id);
    // Also initialize new push flow and persist token for UI
    (async () => {
      try {
        const res = await initPushAndSaveToken(currentUser.id);
        if(res.token) {
          const baseTopics: string[] = ['app', `role-${currentUser.role}`];
          const ownerTopics: string[] = currentUser.role === 'owner' ? ['tenants-all'] : [];
          const pgTopics: string[] = selectedPgId ? [`pg-${selectedPgId}-tenants`] : [];
          await subscribeToTopic({ token: res.token, topics: [...baseTopics, ...ownerTopics, ...pgTopics], userId: currentUser.id })
        }
      } catch (e) {
        console.error('[Push] Auto init failed:', e);
      }
    })();

    let unsubs: Unsubscribe[] = [];

    const isDashboardUser = ['owner', 'manager', 'cook', 'cleaner', 'security'].includes(currentUser.role);
    
    // Fetch non-realtime settings first, now that we have the plan
    dispatch(fetchPermissions({ ownerId: ownerIdForFetching, plan: currentPlan }));
    dispatch(fetchKycConfig({ ownerId: ownerIdForFetching }));

    if (isDashboardUser) {
        const collectionsToSync: { [key: string]: (data: any) => { type: string; payload: any } } = {
            pgs: setPgs,
            guests: setGuests,
            complaints: setComplaints,
            expenses: setExpenses,
            staff: setStaff,
            notifications: setNotifications,
            chargeTemplates: setChargeTemplates,
        };

        const collectionNames = Object.keys(collectionsToSync);
        let loadedCount = 0;

        // Setup real-time listeners
        const newUnsubs = collectionNames.map((collectionName) => {
            const setDataAction = collectionsToSync[collectionName];
            const collRef = collection(db, 'users_data', ownerIdForFetching, collectionName);
            
            return onSnapshot(collRef, (snapshot) => {
                 let data = snapshot.docs.map(doc => doc.data());

                 if (collectionName === 'pgs' && currentUser.role !== 'owner' && currentUser.pgIds) {
                    data = data.filter(pg => currentUser.pgIds?.includes((pg as PG).id));
                 }
                 if (['complaints', 'expenses', 'notifications'].includes(collectionName)) {
                    data.sort((a, b) => new Date((b as any).date).getTime() - new Date((a as any).date).getTime());
                }
                 dispatch(setDataAction(data as any));
                
                // Track loading status
                if (loadedCount < collectionNames.length) {
                    loadedCount++;
                    if (loadedCount === collectionNames.length) {
                         dispatch(setLoading(false));
                    }
                }

            }, (error) => {
                console.error(`Error listening to ${collectionName}:`, error);
                loadedCount++;
                if (loadedCount === collectionNames.length) {
                    dispatch(setLoading(false));
                }
            });
        });
        unsubs.push(...newUnsubs);
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
        
        // Fetch staff for that PG
        const staffQuery = query(collection(db, 'users_data', ownerId, 'staff'), where('pgId', '==', pgId));
        unsubs.push(onSnapshot(staffQuery, (snapshot) => {
            dispatch(setStaff(snapshot.docs.map(d => d.data() as Staff)));
        }));
        
        // Fetch notifications for the tenant
        const notificationsQuery = query(collection(db, 'users_data', ownerId, 'notifications'), where('targetId', 'in', [guestId, pgId]));
         unsubs.push(onSnapshot(notificationsQuery, (snapshot) => {
            const notificationsData = snapshot.docs.map(d => d.data() as Notification);
            dispatch(setNotifications(notificationsData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())));
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
