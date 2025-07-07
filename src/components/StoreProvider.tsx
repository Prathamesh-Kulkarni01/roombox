
'use client'

import { useRef, type ReactNode } from 'react'
import { Provider } from 'react-redux'
import { makeStore, type AppStore } from '@/lib/store'
import { useEffect } from 'react'
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth'
import { auth, isFirebaseConfigured } from '@/lib/firebase'
import { useAppDispatch, useAppSelector } from '@/lib/hooks'
import { fetchAllData, initializeUser, logoutUser } from '@/lib/slices/userSlice'

function AuthHandler({ children }: { children: ReactNode }) {
  const dispatch = useAppDispatch();
  const { currentUser } = useAppSelector((state) => state.user);
  const authListenerStarted = useRef(false);

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

  useEffect(() => {
    if (currentUser) {
      dispatch(fetchAllData(currentUser));
    }
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
