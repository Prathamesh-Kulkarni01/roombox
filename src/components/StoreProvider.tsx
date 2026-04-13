
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
import { initializeUser, logoutUser, setCurrentUser } from '@/lib/slices/userSlice'
import { setPgs } from '@/lib/slices/pgsSlice'
import { setGuests } from '@/lib/slices/guestsSlice'
import { setComplaints } from '@/lib/slices/complaintsSlice'
import { setExpenses } from '@/lib/slices/expensesSlice'
import { setStaff } from '@/lib/slices/staffSlice'
import { setNotifications } from '@/lib/slices/notificationsSlice'
import { useToast } from '@/hooks/use-toast'
import { initializeFirebaseMessaging } from '@/lib/firebase-messaging-client'
import type { Guest, PG, Complaint, Notification, Staff, ChargeTemplate, Expense, User, UserRole } from '@/lib/types'
import { setLoading, validateSelectedPg } from '@/lib/slices/appSlice';
import { useChargeTemplatesStore, usePermissionsStore, useKycConfigStore } from '@/lib/stores/configStores';
import { fetchPermissions, updatePermissions, setPermissions as setReduxPermissions } from '@/lib/slices/permissionsSlice';
import { parseStaffPermissions } from '@/lib/permissions';
import { initPushAndSaveToken, subscribeToTopic } from '@/lib/notifications';
import { useRouter, usePathname } from 'next/navigation'
import { Loader2 } from 'lucide-react'


function AuthHandler({ children }: { children: ReactNode }) {
  const dispatch = useAppDispatch();
  const { currentUser, currentPlan } = useAppSelector((state) => state.user);
  const authListenerStarted = useRef(false);
  const [dataListeners, setDataListeners] = useState<Unsubscribe[]>([]);
  const { toast } = useToast();
  const { selectedPgId } = useAppSelector((state) => state.app);
  const [authReady, setAuthReady] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { setTemplates: setChargeTemplatesZustand } = useChargeTemplatesStore();
  const { setPermissions: setZustandPermissions } = usePermissionsStore();
  const reduxPermissions = useAppSelector(state => (state as any).permissions?.featurePermissions);

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
      toast({ title: "You're back online!", description: "Your data will be synced automatically." });
    };
    const handleOffline = () => {
      toast({ title: "You've gone offline", description: "Your changes will be saved and synced when you reconnect." });
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
    if (!isFirebaseConfigured() || authListenerStarted.current || !auth) {
      setAuthReady(true);
      return;
    };

    authListenerStarted.current = true;
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      console.log(`[StoreProvider] Auth change detected. User: ${firebaseUser?.uid || 'logged out'}`);
      setAuthReady(false);
      
      if (firebaseUser) {
        // First initialization
        await dispatch(initializeUser(firebaseUser));
        
        // Add real-time user doc listener to catch role/guestId updates while logged in
        const userDocRef = doc(db!, 'users', firebaseUser.uid);
        const userUnsub = onSnapshot(userDocRef, (snap) => {
          if (snap.exists()) {
            const userData = { ...snap.data(), id: snap.id } as User;
            // Use the same action that initializeUser uses internally if possible, 
            // or just dispatch setCurrentUser (need to make sure we don't overwrite crucial metadata)
            // For now, let's just trigger initializeUser again if role/guestId changes significantly?
            // Actually, we can just update the Redux state directly.
            dispatch(setCurrentUser(userData));
          }
        });
        
        setDataListeners(prev => [...prev, userUnsub]);
      } else {
        dispatch(logoutUser());
        dispatch(setLoading(false));
      }
      setAuthReady(true);
    });

    return () => {
      unsubscribe();
      authListenerStarted.current = false;
    };
  }, [dispatch]);

  // Centralized redirection logic
  useEffect(() => {
    if (!authReady) return;

    const allowedDashboardRoles: UserRole[] = ['owner', 'manager', 'cook', 'cleaner', 'security', 'admin', 'other'];
    const publicPages = [
      '/', '/login', '/login/set-password', '/privacy-policy', '/terms-of-service',
      '/contact', '/about', '/refund-policy', '/pay', '/site', '/blog', '/invite', '/ledger', '/download', '/changelog'
    ];

    if (process.env.NODE_ENV === 'development') {
      publicPages.push('/signup');
    }

    const isPublicPage = publicPages.some(p => {
      if (p === '/') return pathname === '/';
      return pathname === p || pathname.startsWith(`${p}/`);
    });

    if (currentUser) {
      console.log(`[StoreProvider] User found: ${currentUser.role} at ${pathname}`);
      const isInviteOrSetPassword = pathname.startsWith('/invite') || pathname.startsWith('/login/set-password');
      const isLoginPage = pathname === '/login' || pathname === '/signup';
      const isMagicLoginPage = pathname.startsWith('/login/magic');
      const isAllowedPublicPage = pathname === '/download';

      if (currentUser.role === 'tenant' && (isLoginPage || isMagicLoginPage)) {
        // Only redirect away from login pages — let set-password and invite pages handle their own flow
        console.log(`[StoreProvider] Redirecting tenant from login to portal... (Path: ${pathname})`);
        router.replace('/tenants/my-pg');
      } else if (currentUser.role === 'tenant' && !pathname.startsWith('/tenants') && !isAllowedPublicPage && !isInviteOrSetPassword && !isPublicPage) {
        // Redirect tenant from non-tenant, non-public, non-setup pages
        console.log(`[StoreProvider] Redirecting tenant to portal... (Path: ${pathname})`);
        router.replace('/tenants/my-pg');
      } else if (allowedDashboardRoles.includes(currentUser.role) && ((!pathname.startsWith('/dashboard') && !isPublicPage) || isLoginPage || isMagicLoginPage) && !isInviteOrSetPassword && !pathname.startsWith('/admin')) {
        console.log(`[StoreProvider] Redirecting ${currentUser.role} to dashboard... (Path: ${pathname})`);
        router.replace('/dashboard');
      } else if (currentUser.role === 'unassigned' && pathname !== '/complete-profile' && !isPublicPage) {
        console.log(`[StoreProvider] Redirecting unassigned user to complete profile...`);
        router.replace('/complete-profile');
      }
    } else if (!isPublicPage) {
      console.log(`[AuthHandler] Restricted page detected: ${pathname}. Redirecting to /login`);
      router.replace('/login');
    }
  }, [authReady, currentUser?.id, currentUser?.role, pathname, router]);
  
  // Sync permissions to Zustand (the primary source for UI guards)
  // STRICT RBAC: Staff always uses their explicit permissions array.
  // Empty permissions = no access. No fallback to role-based defaults.
  useEffect(() => {
    if (!currentUser) {
      setZustandPermissions(null as any);
      return;
    }

    const isStaff = currentUser.role !== 'owner' && currentUser.role !== 'admin';

    if (isStaff) {
      // Staff: always use their explicit permissions. [] = no access.
      const parsed = parseStaffPermissions(currentUser.permissions || []);
      console.log("[StoreProvider] Staff permissions:", currentUser.permissions, "→", parsed);
      setZustandPermissions(parsed);
    } else if (reduxPermissions) {
      // Owner/Admin: use the role-based permission map
      setZustandPermissions(reduxPermissions);
    }
  }, [currentUser?.permissions, currentUser?.role, reduxPermissions, setZustandPermissions]);

  // Data fetching logic
  useEffect(() => {
    let unsubs: Unsubscribe[] = [];
    dataListeners.forEach(unsub => unsub());
    setDataListeners([]);

    if (!currentUser || !currentPlan) {
      if (authReady) dispatch(setLoading(false));
      return;
    }

    // Role-claims sync check: ensure Firestore listeners use the correct token claims
    // We check if the token has the expected 'role' or 'ownerId' for the current state.
    const verifyClaims = async () => {
      if (!auth?.currentUser) return false;
      const idTokenResult = await auth.currentUser.getIdTokenResult();
      const tokenRole = idTokenResult.claims.role;
      const tokenOwnerId = idTokenResult.claims.ownerId;
      
      // If mismatch detected, force a refresh
      if (tokenRole !== currentUser.role || (currentUser.role !== 'owner' && tokenOwnerId !== currentUser.ownerId)) {
        console.log(`[StoreProvider] Role mismatch (Token: ${tokenRole}, Redux: ${currentUser.role}). Refreshing token...`);
        await auth.currentUser.getIdToken(true);
        return true;
      }
      return true;
    };

    const ownerIdForFetching = currentUser.role === 'owner' ? currentUser.id : currentUser.ownerId;
    const enterpriseDbId = currentUser.subscription?.enterpriseProject?.databaseId;
    const clientConfig = currentUser.subscription?.enterpriseProject?.clientConfig;

    const dbInstance = clientConfig
      ? getOwnerClientDb(clientConfig, enterpriseDbId)
      : (enterpriseDbId ? getDynamicDb(enterpriseDbId) : db);

    if (!dbInstance || !ownerIdForFetching) {
      dispatch(setLoading(false));
      return;
    }

    // FCM and topics
    initializeFirebaseMessaging(currentUser.id);
    (async () => {
      try {
        const claimsSynced = await verifyClaims();
        if (!claimsSynced) {
            console.warn('[StoreProvider] Claims not synced, skipping listener setup this cycle.');
            return;
        }

        const res = await initPushAndSaveToken(currentUser.id);
        if (res.token) {
          const baseTopics = ['app', `role-${currentUser.role}`];
          const ownerTopics = currentUser.role === 'owner' ? ['tenants-all'] : [];
          const pgTopics = selectedPgId ? [`pg-${selectedPgId}-tenants`] : [];
          await subscribeToTopic({ token: res.token, topics: [...baseTopics, ...ownerTopics, ...pgTopics], userId: currentUser.id })
        }

        const isDashboardUser = ['owner', 'manager', 'cook', 'cleaner', 'security'].includes(currentUser.role);

        if (isDashboardUser) {
          const collectionsToSync: { [key: string]: any } = {
            pgs: setPgs, guests: setGuests, complaints: setComplaints, expenses: setExpenses, staff: setStaff,
          };
          const collectionNames = Object.keys(collectionsToSync);
          let loadedCount = 0;

          if (ownerIdForFetching && ownerIdForFetching !== 'undefined') {
            const ownerNotifQuery = query(collection(dbInstance, 'users_data', ownerIdForFetching, 'notifications'), where('targetId', '==', ownerIdForFetching));
            const unsub = onSnapshot(ownerNotifQuery, snapshot => {
              const data = snapshot.docs.map(doc => doc.data() as Notification);
              dispatch(setNotifications(data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())));
            });
            unsubs.push(unsub);
            setDataListeners(prev => [...prev, unsub]);
          }

          collectionNames.forEach(collectionName => {
            const setDataAction = collectionsToSync[collectionName];
            const collRef = collection(dbInstance, 'users_data', ownerIdForFetching, collectionName);
            const unsub = onSnapshot(collRef, snapshot => {
              let data = snapshot.docs.map(doc => doc.data());
              if (collectionName === 'pgs' && currentUser.role !== 'owner' && currentUser.pgIds) {
                data = data.filter(pg => currentUser.pgIds?.includes((pg as PG).id));
              }
              if (collectionName === 'pgs') dispatch(validateSelectedPg(data.map(pg => (pg as PG).id)));
              if (['complaints', 'expenses'].includes(collectionName)) {
                data.sort((a, b) => new Date((b as any).date).getTime() - new Date((a as any).date).getTime());
              }
              dispatch(setDataAction(data));
              if (loadedCount < collectionNames.length) {
                loadedCount++;
                if (loadedCount === collectionNames.length) dispatch(setLoading(false));
              }
            }, err => {
              console.error(`Error listening to ${collectionName}:`, err);
              loadedCount++;
              if (loadedCount === collectionNames.length) dispatch(setLoading(false));
            });
            unsubs.push(unsub);
            setDataListeners(prev => [...prev, unsub]);
          });
        } else if (currentUser.role === 'tenant' && currentUser.ownerId && currentUser.pgId && currentUser.guestId) {
          const { ownerId, pgId, guestId, id: userId } = currentUser;
          
          const unsubPg = onSnapshot(doc(dbInstance, 'users_data', ownerId, 'pgs', pgId), snap => dispatch(setPgs(snap.exists() ? [snap.data() as PG] : [])));
          const unsubGuest = onSnapshot(doc(dbInstance, 'users_data', ownerId, 'guests', guestId), snap => dispatch(setGuests(snap.exists() ? [snap.data() as Guest] : [])));
          unsubs.push(unsubPg, unsubGuest);
          setDataListeners(prev => [...prev, unsubPg, unsubGuest]);

          if (pgId && pgId !== 'undefined') {
            const unsubComplaints = onSnapshot(query(collection(dbInstance, 'users_data', ownerId, 'complaints'), where('pgId', '==', pgId)), snap => {
              dispatch(setComplaints(snap.docs.map(d => d.data() as Complaint).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())));
            });
            const unsubStaff = onSnapshot(query(collection(dbInstance, 'users_data', ownerId, 'staff'), where('pgId', '==', pgId)), snap => {
              dispatch(setStaff(snap.docs.map(d => d.data() as Staff)));
            });
            unsubs.push(unsubComplaints, unsubStaff);
            setDataListeners(prev => [...prev, unsubComplaints, unsubStaff]);
          }
          const notificationTargets = [guestId, pgId, userId].filter(t => t && t !== 'undefined');
          if (notificationTargets.length > 0) {
            const unsubNotif = onSnapshot(query(collection(dbInstance, 'users_data', ownerId, 'notifications'), where('targetId', 'in', notificationTargets)), snap => {
              dispatch(setNotifications(snap.docs.map(d => d.data() as Notification).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())));
            });
            unsubs.push(unsubNotif);
            setDataListeners(prev => [...prev, unsubNotif]);
          }
          dispatch(setLoading(false));
        } else {
          dispatch(setLoading(false));
        }
      } catch (e) { 
        console.error('[StoreProvider] Init failed:', e); 
        dispatch(setLoading(false));
      }
    })();

    // Force stop loading after 8 seconds to prevent hangs if listeners fail silently
    const loadingTimeout = setTimeout(() => {
        if (authReady) {
            console.warn('[StoreProvider] Loading timeout reached. Forcing setLoading(false)');
            dispatch(setLoading(false));
        }
    }, 8000);

    // Note: setDataListeners is handled inside the async IIFE per-unsub
    return () => {
        unsubs.forEach(unsub => unsub());
        clearTimeout(loadingTimeout);
    };
  }, [currentUser?.id, currentUser?.role, currentUser?.pgId, currentUser?.guestId, currentUser?.ownerId, currentPlan, dispatch, authReady]);

  if (!authReady) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

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
