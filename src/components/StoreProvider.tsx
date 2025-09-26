
'use client'

import { useRef, type ReactNode, useEffect, useState } from 'react'
import { Provider } from 'react-redux'
import { makeStore, type AppStore } from '@/lib/store'
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth'
import { collection, onSnapshot, doc, getDocs, query, where, type Unsubscribe } from 'firebase/firestore'
import { getApp } from 'firebase/app'
import { auth, db, isFirebaseConfigured, getDynamicDb, getOwnerClientDb } from '@/lib/firebase'
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
import type { Guest, PG, Complaint, Notification, Staff, ChargeTemplate, Expense, User } from '@/lib/types'
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

    if (!currentUser || !currentPlan) {
        // If there's no user after the auth check, we are done loading.
        dispatch(setLoading(false));
        return;
    }
    
    // Determine the correct ID for fetching data
    const ownerIdForFetching = currentUser.role === 'owner' ? currentUser.id : currentUser.ownerId;
    const enterpriseDbId = currentUser.subscription?.enterpriseProject?.databaseId;
    const clientConfig = currentUser.subscription?.enterpriseProject?.clientConfig;

    const dbInstance = clientConfig
      ? getOwnerClientDb(clientConfig, enterpriseDbId)
      : (enterpriseDbId ? getDynamicDb(enterpriseDbId) : db);
    
    if (!dbInstance) {
        console.error("Database instance could not be determined. This can happen if Firebase is not configured or the user is not properly authenticated.");
        dispatch(setLoading(false));
        return;
    }
    
    if (!ownerIdForFetching) {
        // This case is for new, unassigned users who haven't selected a role yet.
        // They don't have an ownerId, so we can't fetch owner-specific data.
        // We can consider them "loaded" for now.
        dispatch(setLoading(false));
        return;
    }

    // Initialize Firebase Messaging and push notifications
    initializeFirebaseMessaging(currentUser.id);
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
    
    // Fetch non-realtime settings first
    dispatch(fetchPermissions({ ownerId: ownerIdForFetching, plan: currentPlan }));
    dispatch(fetchKycConfig({ ownerId: ownerIdForFetching }));

    if (isDashboardUser) {
        const collectionsToSync: { [key: string]: (data: any) => { type: string; payload: any } } = {
            pgs: setPgs,
            guests: setGuests,
            complaints: setComplaints,
            expenses: setExpenses,
            staff: setStaff,
            chargeTemplates: setChargeTemplates,
        };

        const collectionNames = Object.keys(collectionsToSync);
        let loadedCount = 0;
        
        const ownerNotificationQuery = query(collection(dbInstance, 'users_data', ownerIdForFetching, 'notifications'), where('targetId', '==', ownerIdForFetching));
        unsubs.push(onSnapshot(ownerNotificationQuery, (snapshot) => {
            const data = snapshot.docs.map(doc => doc.data() as Notification);
            dispatch(setNotifications(data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())));
        }));


        // Setup real-time listeners for other collections
        const otherCollections = collectionNames.map((collectionName) => {
            const setDataAction = collectionsToSync[collectionName];
            const collRef = collection(dbInstance, 'users_data', ownerIdForFetching, collectionName);
            
            return onSnapshot(collRef, (snapshot) => {
                 let data = snapshot.docs.map(doc => doc.data());

                 if (collectionName === 'pgs' && currentUser.role !== 'owner' && currentUser.pgIds) {
                    data = data.filter(pg => currentUser.pgIds?.includes((pg as PG).id));
                 }
                 if (['complaints', 'expenses'].includes(collectionName)) { 
                    data.sort((a, b) => new Date((b as any).date).getTime() - new Date((a as any).date).getTime());
                }
                 dispatch(setDataAction(data as any));
                
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
        unsubs.push(...otherCollections);

    } else if (currentUser.role === 'tenant' && currentUser.ownerId && currentUser.pgId && currentUser.guestId) {
        const { ownerId, pgId, guestId, id: userId } = currentUser;

        const pgDocRef = doc(dbInstance, 'users_data', ownerId, 'pgs', pgId);
        unsubs.push(onSnapshot(pgDocRef, (snap) => dispatch(setPgs(snap.exists() ? [snap.data() as PG] : []))));

        const guestDocRef = doc(dbInstance, 'users_data', ownerId, 'guests', guestId);
        unsubs.push(onSnapshot(guestDocRef, (snap) => dispatch(setGuests(snap.exists() ? [snap.data() as Guest] : []))));
        
        const complaintsQuery = query(collection(dbInstance, 'users_data', ownerId, 'complaints'), where('pgId', '==', pgId));
        unsubs.push(onSnapshot(complaintsQuery, (snapshot) => {
            const complaintsData = snapshot.docs.map(d => d.data() as Complaint);
            dispatch(setComplaints(complaintsData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())));
        }));
        
        const staffQuery = query(collection(dbInstance, 'users_data', ownerId, 'staff'), where('pgId', '==', pgId));
        unsubs.push(onSnapshot(staffQuery, (snapshot) => {
            dispatch(setStaff(snapshot.docs.map(d => d.data() as Staff)));
        }));
        
        const notificationsQuery = query(collection(dbInstance, 'users_data', ownerId, 'notifications'), where('targetId', 'in', [guestId, pgId, userId]));
         unsubs.push(onSnapshot(notificationsQuery, (snapshot) => {
            const notificationsData = snapshot.docs.map(d => d.data() as Notification);
            dispatch(setNotifications(notificationsData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())));
        }));

        dispatch(setLoading(false));
    } else {
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
