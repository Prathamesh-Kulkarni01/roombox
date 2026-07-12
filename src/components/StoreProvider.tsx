"use client";

import { useRef, type ReactNode, useEffect, useState } from "react";
import { Provider } from "react-redux";
import { makeStore, type AppStore } from "@/lib/store";
import { onAuthStateChanged, type User as FirebaseUser } from "firebase/auth";
import {
  collection,
  onSnapshot,
  doc,
  getDocs,
  query,
  where,
  documentId,
  type Unsubscribe,
} from "firebase/firestore";
import { getApp } from "firebase/app";
import {
  auth,
  db,
  isFirebaseConfigured,
  getDynamicDb,
  getOwnerClientDb,
  isEmulator,
  getActiveDb,
  getActiveAuth,
} from "@/lib/firebase";
import { getAnalytics, isSupported } from "firebase/analytics";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import {
  initializeUser,
  logoutUser,
  setCurrentUser,
} from "@/lib/slices/userSlice";
import { setPgs } from "@/lib/slices/pgsSlice";
import { setGuests } from "@/lib/slices/guestsSlice";
import { setComplaints } from "@/lib/slices/complaintsSlice";
import { setExpenses } from "@/lib/slices/expensesSlice";
import { setStaff } from "@/lib/slices/staffSlice";
import { setNotifications } from "@/lib/slices/notificationsSlice";
import { useToast } from "@/hooks/use-toast";
import { initializeFirebaseMessaging } from "@/lib/firebase-messaging-client";
import type {
  Guest,
  PG,
  Complaint,
  Notification,
  Staff,
  ChargeTemplate,
  Expense,
  User,
  UserRole,
} from "@/lib/types";
import { setLoading, setInitialDataLoaded, validateSelectedPg } from "@/lib/slices/appSlice";
import {
  useChargeTemplatesStore,
  usePermissionsStore,
  useKycConfigStore,
} from "@/lib/stores/configStores";
import { parseStaffPermissions } from "@/lib/parseStaffPermissions";
import { initPushAndSaveToken, subscribeToTopic } from "@/lib/notifications";
import { useRouter, usePathname } from "next/navigation";
import { Loader2 } from "lucide-react";
import { getCurrentPlan } from "@/lib/utils";

function AuthHandler({ children }: { children: ReactNode }) {
  const dispatch = useAppDispatch();
  const { currentUser } = useAppSelector((state) => state.user);
  const currentPlan = getCurrentPlan(currentUser);
  const authListenerStarted = useRef(false);
  const [dataListeners, setDataListeners] = useState<Unsubscribe[]>([]);
  const { toast } = useToast();
  const { selectedPgId } = useAppSelector((state) => state.app);
  const [authReady, setAuthReady] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { setTemplates: setChargeTemplatesZustand } = useChargeTemplatesStore();
  const { setPermissions: setZustandPermissions } = usePermissionsStore();
  const reduxPermissions = useAppSelector(
    (state) => (state as any).permissions?.featurePermissions,
  );

  useEffect(() => {
    if (isFirebaseConfigured() && !isEmulator()) {
      isSupported().then((supported) => {
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
        description:
          "Your changes will be saved and synced when you reconnect.",
      });
    };
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [toast]);

  // Auth state listener
  useEffect(() => {
    let unsubscribe: Unsubscribe | null = null;
    
    const initAuthListener = async () => {
      if (!isFirebaseConfigured() || authListenerStarted.current) {
        setAuthReady(true);
        return;
      }

      authListenerStarted.current = true;
      
      let activeAuth = auth;
      let activeDb = db;

      // Subdomain check
      try {
        const host = window.location.host;
        const parts = host.split('.');
        let isSubdomain = false;
        const systemSubdomains = ['www', 'rentsutra', 'roombox', 'dev', 'staging', 'localhost'];

        if (parts.length >= 3) {
          if (parts.includes('dev') || parts.includes('staging')) {
            if (parts.length >= 4 && !systemSubdomains.includes(parts[0])) {
              isSubdomain = true;
            }
          } else {
            if (!systemSubdomains.includes(parts[0])) {
              isSubdomain = true;
            }
          }
        } else if (parts.length === 2 && parts[1].startsWith('localhost') && parts[0] !== 'localhost') {
          isSubdomain = true;
        }

        if (isSubdomain) {
          // Fetch tenant config
          const res = await fetch(`/api/tenant-config?domain=${encodeURIComponent(host)}`);
          if (res.ok) {
            const data = await res.json();
            if (data.isEnterprise && data.clientConfig) {
              const { initializeApp, getApps } = await import('firebase/app');
              const { getAuth } = await import('firebase/auth');
              const { getFirestore } = await import('firebase/firestore');

              const appName = `tenant-login-instance`;
              let tenantApp = getApps().find(a => a.name === appName);
              if (!tenantApp) {
                tenantApp = initializeApp(data.clientConfig, appName);
              }
              activeAuth = getAuth(tenantApp);
              
              if (data.databaseId && data.databaseId !== '(default)' && data.databaseId !== 'default') {
                try {
                  activeDb = getFirestore(tenantApp, data.databaseId);
                } catch {
                  activeDb = getFirestore(tenantApp);
                }
              } else {
                activeDb = getFirestore(tenantApp);
              }

              // Signal FirebaseTenantContext that the enterprise app is now available
              // This resolves the race condition where context renders before this async init completes
              try {
                window.dispatchEvent(new Event('tenant-app-ready'));
              } catch (_) {}
            }
          }
        }
      } catch (err) {
        console.error("[StoreProvider] Failed to fetch tenant config:", err);
      }

      if (!activeAuth) {
        setAuthReady(true);
        return;
      }

      unsubscribe = onAuthStateChanged(
        activeAuth,
        async (firebaseUser: FirebaseUser | null) => {
          console.log(
            `[StoreProvider] Auth change detected. User: ${firebaseUser?.uid || "logged out"}`,
          );
          setAuthReady(false);

          if (firebaseUser) {
            // First initialization
            await dispatch(initializeUser(firebaseUser));

            // Add real-time user doc listener to catch role/guestId updates while logged in
            if (activeDb) {
              const userDocRef = doc(activeDb, "users", firebaseUser.uid);
              const userUnsub = onSnapshot(userDocRef, (snap) => {
                if (snap.exists()) {
                  const userData = { ...snap.data(), id: snap.id } as User;
                  dispatch(setCurrentUser(userData));
                }
              });
              setDataListeners((prev) => [...prev, userUnsub]);
            }
          } else {
            dispatch(logoutUser());
            dispatch(setLoading(false));
          }
          setAuthReady(true);
        },
      );
    };

    initAuthListener();

    return () => {
      if (unsubscribe) unsubscribe();
      authListenerStarted.current = false;
    };
  }, [dispatch]);

  // Centralized redirection logic
  useEffect(() => {
    if (!authReady) return;

    const allowedDashboardRoles: UserRole[] = [
      "owner",
      "manager",
      "cook",
      "cleaner",
      "security",
      "admin",
      "other",
    ];
    const publicPages = [
      "/",
      "/login",
      "/login/set-password",
      "/privacy-policy",
      "/terms-of-service",
      "/contact",
      "/about",
      "/refund-policy",
      "/pay",
      "/site",
      "/blog",
      "/invite",
      "/ledger",
      "/download",
      "/changelog",
      "/signup",
      "/sentry-example-page",
      "/scan",
    ];

    const isPublicPage = publicPages.some((p) => {
      if (p === "/") return pathname === "/";
      return pathname === p || pathname.startsWith(`${p}/`);
    });

    if (currentUser) {
      console.log(
        `[StoreProvider] User found: ${currentUser.role} at ${pathname}`,
      );
      const isInviteOrSetPassword =
        pathname.startsWith("/invite") ||
        pathname.startsWith("/login/set-password");
      const isLoginPage = pathname === "/login" || pathname === "/signup";
      const isMagicLoginPage = pathname.startsWith("/login/magic");
      const isAllowedPublicPage = pathname === "/download";

      if (currentUser.role === "tenant" && (isLoginPage || isMagicLoginPage)) {
        // Only redirect away from login pages — let set-password and invite pages handle their own flow
        console.log(
          `[StoreProvider] Redirecting tenant from login to portal... (Path: ${pathname})`,
        );
        router.replace("/tenants/my-pg");
      } else if (
        currentUser.role === "tenant" &&
        !pathname.startsWith("/tenants") &&
        !isAllowedPublicPage &&
        !isInviteOrSetPassword &&
        !isPublicPage
      ) {
        // Redirect tenant from non-tenant, non-public, non-setup pages
        console.log(
          `[StoreProvider] Redirecting tenant to portal... (Path: ${pathname})`,
        );
        router.replace("/tenants/my-pg");
      } else if (
        allowedDashboardRoles.includes(currentUser.role) &&
        ((!pathname.startsWith("/dashboard") && !isPublicPage) ||
          isLoginPage ||
          isMagicLoginPage) &&
        !isInviteOrSetPassword &&
        !pathname.startsWith("/admin")
      ) {
        // STRICT ONBOARDING: Only redirect owners to dashboard if they have completed onboarding
        // This prevents the redirect loop where the dashboard guard kicks them to /complete-profile
        // and this guard kicks them back to /dashboard.
        const isOwnerNotOnboarded =
          currentUser.role === "owner" && !currentUser.isOnboarded;

        if (isOwnerNotOnboarded) {
          if (pathname !== "/complete-profile") {
            console.log(
              `[StoreProvider] Owner not onboarded. Redirecting to complete profile...`,
            );
            router.replace("/complete-profile");
          }
        } else {
          console.log(
            `[StoreProvider] Redirecting ${currentUser.role} to dashboard... (Path: ${pathname})`,
          );
          router.replace("/dashboard");
        }
      } else if (
        currentUser.role === "unassigned" &&
        pathname !== "/complete-profile" &&
        !isPublicPage
      ) {
        console.log(
          `[StoreProvider] Redirecting unassigned user to complete profile...`,
        );
        router.replace("/complete-profile");
      } else if (
        currentUser.role === "owner" &&
        !currentUser.isOnboarded &&
        pathname !== "/complete-profile" &&
        !isPublicPage
      ) {
        console.log(
          `[StoreProvider] Owner not onboarded. Redirecting to complete profile...`,
        );
        router.replace("/complete-profile");
      }
    } else if (!isPublicPage) {
      console.log(
        `[AuthHandler] Restricted page detected: ${pathname}. Redirecting to /login`,
      );
      router.replace("/login");
    }
  }, [
    authReady,
    currentUser?.id,
    currentUser?.role,
    currentUser?.isOnboarded,
    pathname,
    router,
  ]);

  // Sync permissions to Zustand (the primary source for UI guards)
  // STRICT RBAC: Staff always uses their explicit permissions array.
  // Empty permissions = no access. No fallback to role-based defaults.
  useEffect(() => {
    if (!currentUser) {
      setZustandPermissions(null as any);
      return;
    }

    const isStaff =
      currentUser.role !== "owner" && currentUser.role !== "admin" && currentUser.role !== "tenant";

    if (isStaff) {
      // Staff: always use their explicit permissions. [] = no access.
      const parsed = parseStaffPermissions(currentUser.permissions || []);
      console.log(
        "[StoreProvider] Staff permissions:",
        currentUser.permissions,
        "→",
        parsed,
      );
      setZustandPermissions(parsed);
    } else if (reduxPermissions) {
      // Owner/Admin: use the role-based permission map
      setZustandPermissions(reduxPermissions);
    }
  }, [
    currentUser?.permissions,
    currentUser?.role,
    reduxPermissions,
    setZustandPermissions,
  ]);

  // Data fetching logic
  useEffect(() => {
    let unsubs: Unsubscribe[] = [];
    dataListeners.forEach((unsub) => unsub());
    setDataListeners([]);

    if (!currentUser || !currentPlan) {
      if (authReady) dispatch(setLoading(false));
      return;
    }

    // Role-claims sync check: ensure Firestore listeners use the correct token claims
    // We check if the token has the expected 'role' or 'ownerId' for the current state.
        // Role-claims sync check: ensure Firestore listeners use the correct token claims
    // We check if the token has the expected 'role', 'ownerId', or 'pgIds' hash for the current state.
    const verifyClaims = async () => {
      const activeAuth = getActiveAuth() || auth;
      if (!activeAuth?.currentUser) return false;
      const idTokenResult = await activeAuth.currentUser.getIdTokenResult();
      const tokenRole = idTokenResult.claims.role;
      const tokenOwnerId = idTokenResult.claims.ownerId;
      const tokenPgIdsHash = idTokenResult.claims.pgIdsHash;
      const tokenPgId = idTokenResult.claims.pgId;
      const tokenGuestId = idTokenResult.claims.guestId;

      // Generate a simple hash of current pgIds to compare
      const currentPgIdsHash = currentUser.pgIds 
        ? [...currentUser.pgIds].sort().join(',') 
        : '';

      const isTenantMismatch = currentUser.role === "tenant" && (tokenPgId !== currentUser.pgId || tokenGuestId !== currentUser.guestId);

      // If mismatch detected, force a refresh
      if (
        tokenRole !== currentUser.role ||
        (currentUser.role !== "owner" && tokenOwnerId !== currentUser.ownerId) ||
        (tokenPgIdsHash !== undefined && tokenPgIdsHash !== currentPgIdsHash) ||
        isTenantMismatch
      ) {
        console.log(
          `[StoreProvider] Claims mismatch detected. Refreshing token...`,
          { tokenRole, reduxRole: currentUser.role, tokenPgIdsHash, currentPgIdsHash, tokenPgId, tokenGuestId, isTenantMismatch }
        );
        await activeAuth.currentUser.getIdToken(true);
        return true;
      }
      return true;
    };

    const ownerIdForFetching =
      currentUser.role === "owner" ? currentUser.id : currentUser.ownerId;

    // FCM and topics
    initializeFirebaseMessaging(currentUser.id);
    (async () => {
      try {
        const claimsSynced = await verifyClaims();
        if (!claimsSynced) {
          console.warn(
            "[StoreProvider] Claims not synced, skipping listener setup this cycle.",
          );
          return;
        }

        let enterpriseDbId = currentUser.subscription?.enterpriseProject?.databaseId;
        let clientConfig = currentUser.subscription?.enterpriseProject?.clientConfig;

        // Managers don't have subscription info on their user document
        if (currentUser.role !== "owner" && currentUser.ownerId && !clientConfig && !enterpriseDbId) {
          try {
            const res = await fetch(`/api/tenant-config/by-owner?ownerId=${currentUser.ownerId}`);
            if (res.ok) {
              const data = await res.json();
              if (data.isEnterprise) {
                enterpriseDbId = data.databaseId;
                clientConfig = data.clientConfig;
              }
            }
          } catch (err) {
            console.error("[StoreProvider] Failed to fetch manager tenant config:", err);
          }
        }

        const dbInstance = clientConfig
          ? getOwnerClientDb(clientConfig, enterpriseDbId)
          : enterpriseDbId
            ? getDynamicDb(enterpriseDbId)
            : getActiveDb() || db;

        if (!dbInstance || !ownerIdForFetching) {
          dispatch(setLoading(false));
          return;
        }

        const res = await initPushAndSaveToken(currentUser.id);
        if (res.token) {
          const baseTopics = ["app", `role-${currentUser.role}`];
          const ownerTopics =
            currentUser.role === "owner" ? ["tenants-all"] : [];
          const pgTopics = selectedPgId ? [`pg-${selectedPgId}-tenants`] : [];
          await subscribeToTopic({
            token: res.token,
            topics: [...baseTopics, ...ownerTopics, ...pgTopics],
            userId: currentUser.id,
          });
        }

        const isDashboardUser = [
          "owner",
          "manager",
          "cook",
          "cleaner",
          "security",
        ].includes(currentUser.role);

        if (isDashboardUser) {
          const collectionsToSync: { [key: string]: any } = {
            pgs: setPgs,
            guests: setGuests,
            complaints: setComplaints,
            expenses: setExpenses,
            staff: setStaff,
          };
          const collectionNames = Object.keys(collectionsToSync);
          const loadedCollections = new Set<string>();

          if (ownerIdForFetching && ownerIdForFetching !== "undefined") {
            const notificationTargets = [currentUser.id];
            if (currentUser.role === "owner") {
              notificationTargets.push(ownerIdForFetching);
            } else if (currentUser.pgIds && currentUser.pgIds.length > 0) {
              notificationTargets.push(...currentUser.pgIds);
            }

            const notifQuery = query(
              collection(
                dbInstance,
                "users_data",
                ownerIdForFetching,
                "notifications",
              ),
              where("targetId", "in", notificationTargets),
            );
            const unsub = onSnapshot(notifQuery, (snapshot) => {
              const data = snapshot.docs.map(
                (doc) => doc.data() as Notification,
              );
              dispatch(
                setNotifications(
                  data.sort(
                    (a, b) =>
                      new Date(b.date).getTime() - new Date(a.date).getTime(),
                  ),
                ),
              );
            });
            unsubs.push(unsub);
            setDataListeners((prev) => [...prev, unsub]);

            // Sync chargeTemplates to Zustand
            const templatesRef = collection(
              dbInstance,
              "users_data",
              ownerIdForFetching,
              "chargeTemplates",
            );
            const templatesUnsub = onSnapshot(templatesRef, (snapshot) => {
              const data = snapshot.docs.map(
                (doc) => doc.data() as ChargeTemplate,
              );
              setChargeTemplatesZustand(data);
            });
            unsubs.push(templatesUnsub);
            setDataListeners((prev) => [...prev, templatesUnsub]);
          }

          collectionNames.forEach((collectionName) => {
            const setDataAction = collectionsToSync[collectionName];
            const isStaffRole =
              currentUser.role !== "owner" && currentUser.role !== "admin";
            const assignedPgIds = currentUser.pgIds || [];

            let finalQuery: any = collection(
              dbInstance,
              "users_data",
              ownerIdForFetching,
              collectionName,
            );

            if (isStaffRole) {
              if (assignedPgIds.length === 0) {
                // FAIL-CLOSED: If staff has no assignments, query for something that won't exist
                finalQuery = query(
                  finalQuery,
                  where(documentId(), "==", "force-empty-result"),
                );
              } else {
                if (collectionName === "pgs") {
                  finalQuery = query(
                    finalQuery,
                    where(documentId(), "in", assignedPgIds),
                  );
                } else if (
                  ["guests", "complaints", "expenses"].includes(collectionName)
                ) {
                  finalQuery = query(
                    finalQuery,
                    where("pgId", "in", assignedPgIds),
                  );
                } else if (collectionName === "staff") {
                  // Show colleagues who share at least one PG assignment
                  finalQuery = query(
                    finalQuery,
                    where("pgIds", "array-contains-any", assignedPgIds),
                  );
                }
              }
            }

            const unsub = onSnapshot(
              finalQuery,
              (snapshot: any) => {
                let data = snapshot.docs.map((doc: any) => doc.data());

                if (collectionName === "pgs")
                  dispatch(validateSelectedPg(data.map((pg: any) => (pg as PG).id)));
                if (["complaints", "expenses"].includes(collectionName)) {
                  data.sort(
                    (a: any, b: any) =>
                      new Date((b as any).date).getTime() -
                      new Date((a as any).date).getTime(),
                  );
                }
                dispatch(setDataAction(data));

                loadedCollections.add(collectionName);
                if (loadedCollections.size === collectionNames.length) {
                  dispatch(setLoading(false));
                  dispatch(setInitialDataLoaded(true));
                }
              },
              (err: any) => {
                console.error(`Error listening to ${collectionName}:`, err);
                loadedCollections.add(collectionName);
                if (loadedCollections.size === collectionNames.length) {
                  dispatch(setLoading(false));
                  dispatch(setInitialDataLoaded(true));
                }
              },
            );
            unsubs.push(unsub);
            setDataListeners((prev) => [...prev, unsub]);
          });
        } else if (
          currentUser.role === "tenant" &&
          currentUser.ownerId &&
          currentUser.pgId &&
          currentUser.guestId
        ) {
          const { ownerId, pgId, guestId, id: userId } = currentUser;
          console.log(`[StoreProvider] Tenant data fetching: ownerId=${ownerId}, pgId=${pgId}, guestId=${guestId}, DB=${(dbInstance as any)?.app?.options?.projectId}`);

          const unsubPg = onSnapshot(
            doc(dbInstance, "users_data", ownerId, "pgs", pgId),
            (snap) => {
              console.log(`[StoreProvider] PG Snapshot exists: ${snap.exists()}`);
              dispatch(setPgs(snap.exists() ? [snap.data() as PG] : []))
            },
            (error) => {
              console.error('[StoreProvider] PG Snapshot error:', error);
              auth?.currentUser?.getIdTokenResult().then(r => console.log('[StoreProvider] Claims at error:', r.claims));
            }
          );
          const unsubGuest = onSnapshot(
            doc(dbInstance, "users_data", ownerId, "guests", guestId),
            (snap) => {
              console.log(`[StoreProvider] Guest Snapshot exists: ${snap.exists()}`);
              dispatch(setGuests(snap.exists() ? [snap.data() as Guest] : []))
            },
            (error) => console.error('[StoreProvider] Guest Snapshot error:', error)
          );
          unsubs.push(unsubPg, unsubGuest);
          setDataListeners((prev) => [...prev, unsubPg, unsubGuest]);

          if (pgId && pgId !== "undefined") {
            const unsubComplaints = onSnapshot(
              query(
                collection(dbInstance, "users_data", ownerId, "complaints"),
                where("guestId", "==", guestId),
              ),
              (snap) => {
                dispatch(
                  setComplaints(
                    snap.docs
                      .map((d) => d.data() as Complaint)
                      .sort(
                        (a, b) =>
                          new Date(b.date).getTime() -
                          new Date(a.date).getTime(),
                      ),
                  ),
                );
              },
              (error) => console.error('[StoreProvider] Tenant complaints error:', error)
            );
            unsubs.push(unsubComplaints);
            setDataListeners((prev) => [...prev, unsubComplaints]);
          }
          const notificationTargets = [guestId, pgId, userId].filter(
            (t) => t && t !== "undefined",
          );
          if (notificationTargets.length > 0) {
            const unsubNotif = onSnapshot(
              query(
                collection(dbInstance, "users_data", ownerId, "notifications"),
                where("targetId", "in", notificationTargets),
              ),
              (snap) => {
                dispatch(
                  setNotifications(
                    snap.docs
                      .map((d) => d.data() as Notification)
                      .sort(
                        (a, b) =>
                          new Date(b.date).getTime() -
                          new Date(a.date).getTime(),
                      ),
                  ),
                );
              },
            );
            unsubs.push(unsubNotif);
            setDataListeners((prev) => [...prev, unsubNotif]);
          }
          dispatch(setLoading(false));
          dispatch(setInitialDataLoaded(true));
        } else {
          dispatch(setLoading(false));
          dispatch(setInitialDataLoaded(true));
        }
      } catch (e) {
        console.error("[StoreProvider] Init failed:", e);
        dispatch(setLoading(false));
        dispatch(setInitialDataLoaded(true));
      }
    })();

    // Force stop loading after 8 seconds to prevent hangs if listeners fail silently
    const loadingTimeout = setTimeout(() => {
      if (authReady) {
        console.warn(
          "[StoreProvider] Loading timeout reached. Forcing setLoading(false)",
        );
        dispatch(setLoading(false));
        dispatch(setInitialDataLoaded(true));
      }
    }, 8000);

    // Note: setDataListeners is handled inside the async IIFE per-unsub
    return () => {
      unsubs.forEach((unsub) => unsub());
      clearTimeout(loadingTimeout);
    };
  }, [
    currentUser?.id,
    currentUser?.role,
    currentUser?.pgId,
    currentUser?.guestId,
    currentUser?.ownerId,
    currentUser?.pgIds,
    currentPlan,
    dispatch,
    authReady,
  ]);

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
  const storeRef = useRef<AppStore>();
  if (!storeRef.current) {
    storeRef.current = makeStore();
  }

  return (
    <Provider store={storeRef.current}>
      <AuthHandler>{children}</AuthHandler>
    </Provider>
  );
}
