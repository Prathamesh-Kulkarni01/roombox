
'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { defaultMenu, plans } from '@/lib/mock-data';
import type { PG, Guest, Complaint, Expense, Menu, Staff, Notification, User, Plan, PlanName, UserRole } from '@/lib/types';
import { differenceInDays, parseISO, isPast, isFuture, format, addMonths } from 'date-fns';
import { db, auth, isFirebaseConfigured } from '@/lib/firebase';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, setDoc, deleteDoc, collection, getDocs, writeBatch } from 'firebase/firestore';
import { produce } from 'immer';


// Helper functions for localStorage
const getFromLocalStorage = <T,>(key: string, initialData: T): T => {
  if (typeof window === 'undefined') {
    return initialData;
  }
  try {
    const item = window.localStorage.getItem(key);
    if (item) {
      return JSON.parse(item);
    }
    // If not in localStorage, set it
    window.localStorage.setItem(key, JSON.stringify(initialData));
    return initialData;
  } catch (error) {
    console.error(`Error reading from localStorage key "${key}":`, error);
    return initialData;
  }
};

const saveToLocalStorage = <T,>(key: string, data: T) => {
    if (typeof window === 'undefined') return;
    try {
        window.localStorage.setItem(key, JSON.stringify(data));
    } catch(error) {
        console.error(`Error saving to localStorage key "${key}":`, error);
    }
}

type NewPgData = Pick<PG, 'name' | 'location' | 'city' | 'gender'>;
type NewComplaintData = Pick<Complaint, 'category' | 'description'>

// Context type
interface DataContextType {
  pgs: PG[];
  guests: Guest[];
  complaints: Complaint[];
  expenses: Expense[];
  staff: Staff[];
  selectedPgId: string | null;
  setSelectedPgId: (id: string | null) => void;
  updateGuest: (updatedGuest: Guest) => void;
  addGuest: (guestData: Omit<Guest, 'id'>) => void;
  updatePgs: (updatedPgs: PG[]) => void;
  updatePg: (updatedPg: PG) => void;
  addPg: (newPgData: NewPgData, ownerId?: string) => string | undefined;
  addExpense: (newExpense: Omit<Expense, 'id'>) => void;
  updatePgMenu: (pgId: string, menu: Menu) => void;
  updateComplaint: (updatedComplaint: Complaint) => void;
  addComplaint: (newComplaintData: NewComplaintData) => void;
  addStaff: (newStaff: Omit<Staff, 'id'>) => void;
  updateStaff: (updatedStaff: Staff) => void;
  deleteStaff: (staffId: string) => void;
  isLoading: boolean;
  notifications: Notification[];
  markNotificationAsRead: (notificationId: string) => void;
  markAllAsRead: () => void;
  users: User[];
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  logout: () => void;
  disassociateAndCreateOwnerAccount: () => void;
  currentPlan: Plan | null;
  updateUserPlan: (planId: PlanName) => void;
  currentGuest: Guest | null;
  currentPg: PG | null;
  handleSocialLogin: (socialUser: FirebaseUser) => Promise<{ isNewUser: boolean; role: UserRole | null }>;
}

// Create context
const DataContext = createContext<DataContextType | undefined>(undefined);

// Provider component
export const DataProvider = ({ children }: { children: ReactNode }) => {
  const router = useRouter();
  const [pgs, setPgs] = useState<PG[]>([]);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [selectedPgId, setSelectedPgId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const handleSetCurrentUser = useCallback((user: User | null) => {
    setCurrentUser(user);
    saveToLocalStorage('currentUserId', user ? user.id : null);
  }, []);
  
  const currentPlan = useMemo(() => {
    if (!currentUser) return null;
    return plans[currentUser.subscription?.planId || 'free'];
  }, [currentUser]);

  const currentGuest = useMemo(() => {
    if (isLoading || !currentUser || currentUser.role !== 'tenant' || !currentUser.guestId) return null;
    return guests.find(g => g.id === currentUser.guestId) || null;
  }, [currentUser, guests, isLoading]);

  const currentPg = useMemo(() => {
    if (!currentGuest) return null;
    return pgs.find(p => p.id === currentGuest.pgId) || null;
  }, [currentGuest, pgs]);
  
  // Helper to sync a document to Firestore if on a Pro plan
  const syncToFirestore = useCallback(async (collectionName: string, data: { id: string }) => {
    if (currentUser && currentPlan && currentPlan.hasCloudSync && isFirebaseConfigured()) {
      try {
        const docRef = doc(db, 'users_data', currentUser.id, collectionName, data.id);
        await setDoc(docRef, data, { merge: true });
      } catch (err) {
        console.error(`Failed to sync ${collectionName} item to Firebase`, err);
      }
    }
  }, [currentUser, currentPlan]);
  
  const deleteFromFirestore = useCallback(async (collectionName: string, docId: string) => {
     if (currentUser && currentPlan && currentPlan.hasCloudSync && isFirebaseConfigured()) {
        try {
            const docRef = doc(db, 'users_data', currentUser.id, collectionName, docId);
            await deleteDoc(docRef);
        } catch (err) {
            console.error(`Failed to delete ${collectionName} item from Firebase`, err);
        }
     }
  }, [currentUser, currentPlan]);

  const addPg = useCallback((newPgData: NewPgData, ownerId?: string): string | undefined => {
    const currentOwnerId = ownerId || currentUser?.id;
    if (!currentOwnerId) return;
    const newPg: PG = { id: `pg-${Date.now()}`, ...newPgData, ownerId: currentOwnerId, images: ['https://placehold.co/600x400.png'], rating: 0, occupancy: 0, totalBeds: 0, rules: [], contact: '', priceRange: { min: 0, max: 0 }, amenities: ['wifi', 'food'], floors: [], menu: defaultMenu };
    setPgs(prev => { const newPgs = [...prev, newPg]; saveToLocalStorage('pgs', newPgs); return newPgs; });
    syncToFirestore('pgs', newPg);
    return newPg.id;
  }, [currentUser, syncToFirestore]);

  const handleSocialLogin = useCallback(async (socialUser: FirebaseUser): Promise<{ isNewUser: boolean, role: UserRole | null }> => {
    const userDocRef = doc(db, 'users', socialUser.uid);
    const userDoc = await getDoc(userDocRef);

    if (userDoc.exists()) {
        const existingUser = userDoc.data() as User;
        handleSetCurrentUser(existingUser);
        setUsers([existingUser]);
        return { isNewUser: false, role: existingUser.role };
    }

    const newUser: Partial<User> = {
        id: socialUser.uid,
        name: socialUser.displayName || 'New User',
        role: 'owner',
        subscription: { planId: 'free', status: 'active' },
        avatarUrl: socialUser.photoURL || `https://placehold.co/40x40.png?text=${(socialUser.displayName || 'NU').slice(0,2).toUpperCase()}`
    };
    if (socialUser.email) newUser.email = socialUser.email;
    
    const newUserToSave = newUser as User;

    await setDoc(userDocRef, newUserToSave);
    handleSetCurrentUser(newUserToSave);
    setUsers([newUserToSave]);
    
    return { isNewUser: true, role: 'owner' };
  }, [handleSetCurrentUser]);

  const logout = useCallback(() => {
    if (isFirebaseConfigured()) {
      auth.signOut();
    } else {
      handleSetCurrentUser(null);
    }
  }, [handleSetCurrentUser]);

  // Effect to manage Firebase auth state
  useEffect(() => {
      const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
          setIsLoading(true);
          if (firebaseUser) {
              const userDocRef = doc(db, 'users', firebaseUser.uid);
              const userDoc = await getDoc(userDocRef);

              if (userDoc.exists()) {
                  const user = userDoc.data() as User;
                  setUsers([user]);
                  handleSetCurrentUser(user);
              } else {
                  console.log("Authenticated user has no user document, attempting to create one.");
                  await handleSocialLogin(firebaseUser);
              }
          } else {
              handleSetCurrentUser(null);
              setUsers([]);
          }
          setIsLoading(false);
      });
      return () => unsubscribe();
  }, [handleSetCurrentUser, handleSocialLogin]);

  // Effect to load user-specific data when currentUser changes
  useEffect(() => {
    const loadUserData = async () => {
        if (!currentUser) {
            // Clear data if no user is logged in
            setPgs([]); setGuests([]); setComplaints([]); setExpenses([]); setStaff([]);
            return;
        }

        setIsLoading(true);
        const plan = plans[currentUser.subscription?.planId || 'free'];
        
        const loadFromLocalStorage = () => {
            setPgs(getFromLocalStorage<PG[]>('pgs', []).filter(p => p.ownerId === currentUser.id));
            setGuests(getFromLocalStorage<Guest[]>('guests', []));
            setComplaints(getFromLocalStorage<Complaint[]>('complaints', []));
            setExpenses(getFromLocalStorage<Expense[]>('expenses', []));
            setStaff(getFromLocalStorage<Staff[]>('staff', []));
        };

        if (plan.hasCloudSync && isFirebaseConfigured()) {
            try {
                const collections = {
                    pgs: collection(db, 'users_data', currentUser.id, 'pgs'),
                    guests: collection(db, 'users_data', currentUser.id, 'guests'),
                    complaints: collection(db, 'users_data', currentUser.id, 'complaints'),
                    expenses: collection(db, 'users_data', currentUser.id, 'expenses'),
                    staff: collection(db, 'users_data', currentUser.id, 'staff'),
                };
                
                const [pgsSnap, guestsSnap, complaintsSnap, expensesSnap, staffSnap] = await Promise.all([
                    getDocs(collections.pgs), getDocs(collections.guests), getDocs(collections.complaints), getDocs(collections.expenses), getDocs(collections.staff)
                ]);
                const data = {
                    pgs: pgsSnap.docs.map(d => d.data() as PG),
                    guests: guestsSnap.docs.map(d => d.data() as Guest),
                    complaints: complaintsSnap.docs.map(d => d.data() as Complaint),
                    expenses: expensesSnap.docs.map(d => d.data() as Expense),
                    staff: staffSnap.docs.map(d => d.data() as Staff),
                };
                setPgs(data.pgs); setGuests(data.guests); setComplaints(data.complaints); setExpenses(data.expenses); setStaff(data.staff);
                saveToLocalStorage('pgs', data.pgs); saveToLocalStorage('guests', data.guests); saveToLocalStorage('complaints', data.complaints); saveToLocalStorage('expenses', data.expenses); saveToLocalStorage('staff', data.staff);
                
            } catch (error) {
                console.error("Firebase sync failed. User data could not be loaded.", error);
                setPgs([]); setGuests([]); setComplaints([]); setExpenses([]); setStaff([]);
            }
        } else {
            loadFromLocalStorage();
        }
        
        const storedPgId = getFromLocalStorage<string | null>('selectedPgId', null);
        setSelectedPgId(storedPgId);
        setIsLoading(false);
    };

    loadUserData();
  }, [currentUser]);

  const updateUserPlan = useCallback(async (planId: PlanName) => {
    if (!currentUser) return;
    const updatedUser: User = { ...currentUser, subscription: { ...(currentUser.subscription || { status: 'active' }), planId: planId } };
    
    if (isFirebaseConfigured()) {
        try {
            const userDocRef = doc(db, 'users', currentUser.id);
            await setDoc(userDocRef, updatedUser, { merge: true });
        } catch (error) {
            console.error("Failed to update user plan in Firestore", error);
            return; // Don't update local state if firestore fails
        }
    }
    
    handleSetCurrentUser(updatedUser);
    setUsers(prevUsers => {
      const newUsers = prevUsers.map(u => u.id === updatedUser.id ? updatedUser : u);
      saveToLocalStorage('users', newUsers);
      return newUsers;
    });
  }, [currentUser, handleSetCurrentUser]);
  
  const disassociateAndCreateOwnerAccount = useCallback(async () => {
    if (!currentUser || !currentGuest) return;

    // Create a new object, removing guestId
    const { guestId, ...restOfUser } = currentUser;
    const updatedUserAsOwner: User = { ...restOfUser, role: 'owner', subscription: { planId: 'free', status: 'active' } };

    if (isFirebaseConfigured()) {
        const userDocRef = doc(db, 'users', currentUser.id);
        await setDoc(userDocRef, updatedUserAsOwner, { merge: true });
    }
    
    handleSetCurrentUser(updatedUserAsOwner);
    const newUsers = users.map(u => u.id === currentUser.id ? updatedUserAsOwner : u);
    setUsers(newUsers);
    saveToLocalStorage('users', newUsers);
    logout();
  }, [currentUser, currentGuest, users, logout, handleSetCurrentUser]);

  const updatePg = useCallback((updatedPg: PG) => {
    setPgs(prev => {
        const newPgs = prev.map(pg => (pg.id === updatedPg.id ? updatedPg : pg));
        saveToLocalStorage('pgs', newPgs);
        return newPgs;
    });
    syncToFirestore('pgs', updatedPg);
  }, [syncToFirestore]);

  const updatePgs = useCallback((updatedPgs: PG[]) => {
      setPgs(updatedPgs);
      saveToLocalStorage('pgs', updatedPgs);
      if (currentUser && currentPlan && currentPlan.hasCloudSync && isFirebaseConfigured()) {
          const batch = writeBatch(db);
          updatedPgs.forEach(pg => {
              const docRef = doc(db, 'users_data', currentUser.id, 'pgs', pg.id);
              batch.set(docRef, pg);
          });
          batch.commit().catch(err => console.error("Failed to batch sync PGs to Firebase", err));
      }
  }, [currentUser, currentPlan]);
  
  const addGuest = useCallback((guestData: Omit<Guest, 'id'>) => {
    const newGuest: Guest = {
      ...guestData,
      id: `g-${Date.now()}`
    };

    const updatedGuests = [...guests, newGuest];
    setGuests(updatedGuests);
    saveToLocalStorage('guests', updatedGuests);

    const pgToUpdate = pgs.find(p => p.id === newGuest.pgId);
    if (!pgToUpdate) return;

    const updatedPg = produce(pgToUpdate, draft => {
        draft.occupancy += 1;
        draft.floors?.forEach(floor => {
            floor.rooms.forEach(room => {
                const bed = room.beds.find(b => b.id === newGuest.bedId);
                if (bed) bed.guestId = newGuest.id;
            });
        });
    });
    
    const updatedPgs = pgs.map(p => p.id === updatedPg.id ? updatedPg : p)
    setPgs(updatedPgs);
    saveToLocalStorage('pgs', updatedPgs);

    if (currentUser && currentPlan && currentPlan.hasCloudSync && isFirebaseConfigured()) {
        const batch = writeBatch(db);
        const guestRef = doc(db, 'users_data', currentUser.id, 'guests', newGuest.id);
        batch.set(guestRef, newGuest);
        const pgRef = doc(db, 'users_data', currentUser.id, 'pgs', updatedPg.id);
        batch.set(pgRef, updatedPg);
        batch.commit().catch(err => console.error("Failed to batch write guest and pg", err));
    }
  }, [guests, pgs, currentUser, currentPlan]);
  
  const updateGuest = useCallback((updatedGuest: Guest) => {
    setGuests(prev => { const newGuests = prev.map(g => g.id === updatedGuest.id ? updatedGuest : g); saveToLocalStorage('guests', newGuests); return newGuests; });
    syncToFirestore('guests', updatedGuest);
  }, [syncToFirestore]);
  
  const addExpense = useCallback((newExpenseData: Omit<Expense, 'id'>) => {
    const newExpense: Expense = { id: `exp-${Date.now()}`, ...newExpenseData };
    setExpenses(prev => { const newExpenses = [newExpense, ...prev]; saveToLocalStorage('expenses', newExpenses); return newExpenses; });
    syncToFirestore('expenses', newExpense);
  }, [syncToFirestore]);

  const updatePgMenu = useCallback((pgId: string, menu: Menu) => {
    setPgs(prevPgs => {
      const newPgs = prevPgs.map(pg => pg.id === pgId ? { ...pg, menu } : pg);
      const updatedPg = newPgs.find(pg => pg.id === pgId);
      if (updatedPg) syncToFirestore('pgs', updatedPg);
      saveToLocalStorage('pgs', newPgs);
      return newPgs;
    });
  }, [syncToFirestore]);

  const updateComplaint = useCallback((updatedComplaint: Complaint) => {
    setComplaints(prev => { const newComplaints = prev.map(c => c.id === updatedComplaint.id ? updatedComplaint : c); saveToLocalStorage('complaints', newComplaints); return newComplaints; });
    syncToFirestore('complaints', updatedComplaint);
  }, [syncToFirestore]);
  
  const addComplaint = useCallback((newComplaintData: NewComplaintData) => {
    const guest = currentGuest;
    if (!guest) return;
    const newComplaint: Complaint = { id: `c-${Date.now()}`, ...newComplaintData, guestId: guest.id, guestName: guest.name, pgId: guest.pgId, pgName: guest.pgName, status: 'open', date: format(new Date(), 'yyyy-MM-dd'), upvotes: 0 };
    setComplaints(prev => { const newComplaints = [newComplaint, ...prev]; saveToLocalStorage('complaints', newComplaints); return newComplaints; });
    syncToFirestore('complaints', newComplaint);
  }, [currentGuest, syncToFirestore]);
  
  const addStaff = useCallback((newStaffData: Omit<Staff, 'id'>) => {
    const newStaff: Staff = { id: `staff-${Date.now()}`, ...newStaffData };
    setStaff(prev => { const newStaffList = [...prev, newStaff]; saveToLocalStorage('staff', newStaffList); return newStaffList; });
    syncToFirestore('staff', newStaff);
  }, [syncToFirestore]);
  
  const updateStaff = useCallback((updatedStaff: Staff) => {
    setStaff(prev => { const newStaffList = prev.map(s => s.id === updatedStaff.id ? updatedStaff : s); saveToLocalStorage('staff', newStaffList); return newStaffList; });
    syncToFirestore('staff', updatedStaff);
  }, [syncToFirestore]);

  const deleteStaff = useCallback((staffId: string) => {
    setStaff(prev => { const newStaffList = prev.filter(s => s.id !== staffId); saveToLocalStorage('staff', newStaffList); return newStaffList; });
    deleteFromFirestore('staff', staffId);
  }, [deleteFromFirestore]);

  const visiblePgs = useMemo(() => {
    if (isLoading || !currentUser || currentUser.role === 'tenant') return [];
    if (currentUser.role === 'owner') return pgs.filter(pg => pg.ownerId === currentUser.id);
    return pgs.filter(pg => currentUser.pgIds?.includes(pg.id));
  }, [currentUser, pgs, isLoading]);

  const visibleGuests = useMemo(() => {
    if (isLoading || !currentUser || currentUser.role === 'tenant') return [];
    const userPgs = visiblePgs.map(p => p.id);
    return guests.filter(guest => userPgs.includes(guest.pgId));
  }, [currentUser, guests, isLoading, visiblePgs]);

  const visibleComplaints = useMemo(() => {
    if (isLoading || !currentUser || currentUser.role === 'tenant') return [];
    const userPgs = visiblePgs.map(p => p.id);
    return complaints.filter(c => userPgs.includes(c.pgId));
  }, [currentUser, complaints, isLoading, visiblePgs]);

  const visibleExpenses = useMemo(() => {
    if (isLoading || !currentUser || currentUser.role === 'tenant') return [];
    const userPgs = visiblePgs.map(p => p.id);
    return expenses.filter(exp => userPgs.includes(exp.pgId));
  }, [currentUser, expenses, isLoading, visiblePgs]);

  const visibleStaff = useMemo(() => {
    if (isLoading || !currentUser || currentUser.role === 'tenant') return [];
    const userPgs = visiblePgs.map(p => p.id);
    return staff.filter(s => userPgs.includes(s.pgId));
  }, [currentUser, staff, isLoading, visiblePgs]);

  useEffect(() => {
    if (selectedPgId && visiblePgs.length > 0 && !visiblePgs.find(p => p.id === selectedPgId)) {
      setSelectedPgId(null);
    }
  }, [visiblePgs, selectedPgId]);

  useEffect(() => {
    if (isLoading || !currentPlan) return;
    const newNotifications: Notification[] = [];
    visibleGuests.forEach(guest => {
        const dueDate = parseISO(guest.dueDate);
        const daysUntilDue = differenceInDays(dueDate, new Date());
        if (guest.rentStatus === 'unpaid' || guest.rentStatus === 'partial') {
            if (isPast(dueDate)) newNotifications.push({ id: `noti-rent-overdue-${guest.id}`, type: 'rent-overdue', title: `Rent Overdue: ${guest.name}`, message: `Rent was due on ${guest.dueDate}.`, link: '/dashboard/tenant-management', date: new Date().toISOString(), isRead: false, targetId: guest.id });
            else if (daysUntilDue <= 7) newNotifications.push({ id: `noti-rent-due-${guest.id}`, type: 'rent-due', title: `Rent Due Soon: ${guest.name}`, message: `Rent is due in ${daysUntilDue + 1} days.`, link: '/dashboard/tenant-management', date: new Date().toISOString(), isRead: false, targetId: guest.id });
        }
    });
    visibleGuests.forEach(guest => {
        if (guest.exitDate) {
            const exitDate = parseISO(guest.exitDate);
            const daysUntilExit = differenceInDays(exitDate, new Date());
            if (daysUntilExit <= 15 && isFuture(exitDate)) newNotifications.push({ id: `noti-checkout-${guest.id}`, type: 'checkout-soon', title: `Checkout Soon: ${guest.name}`, message: `Scheduled to check out in ${daysUntilExit + 1} days.`, link: '/dashboard', date: new Date().toISOString(), isRead: false, targetId: guest.id });
        }
    });
    if (currentPlan.hasComplaints) {
        visibleComplaints.forEach(complaint => {
            if (complaint.status === 'open') newNotifications.push({ id: `noti-complaint-${complaint.id}`, type: 'new-complaint', title: `New Complaint: ${complaint.guestName}`, message: `Category: ${complaint.category}.`, link: '/dashboard/complaints', date: new Date(complaint.date).toISOString(), isRead: false, targetId: complaint.id });
        });
    }
    const storedNotifications = getFromLocalStorage<Notification[]>('notifications', []);
    const updatedNotifications = newNotifications.map(newNoti => {
        const storedNoti = storedNotifications.find(sn => sn.id === newNoti.id);
        return storedNoti ? { ...newNoti, isRead: storedNoti.isRead } : newNoti;
    });
    setNotifications(updatedNotifications.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
  }, [visibleGuests, visibleComplaints, isLoading, currentPlan]);

  const markNotificationAsRead = useCallback((notificationId: string) => {
    setNotifications(prev => {
        const newNotifications = prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n);
        saveToLocalStorage('notifications', newNotifications);
        return newNotifications;
    });
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => {
        const newNotifications = prev.map(n => ({...n, isRead: true}));
        saveToLocalStorage('notifications', newNotifications);
        return newNotifications;
    });
  }, []);

  const handleSetSelectedPgId = useCallback((id: string | null) => {
    setSelectedPgId(id);
    saveToLocalStorage('selectedPgId', id);
  }, []);
  
  const value = { pgs: visiblePgs, guests: visibleGuests, complaints: visibleComplaints, expenses: visibleExpenses, staff: visibleStaff, selectedPgId, setSelectedPgId: handleSetSelectedPgId, updateGuest, addGuest, updatePgs, updatePg, addPg, addExpense, updatePgMenu, updateComplaint, addComplaint, addStaff, updateStaff, deleteStaff, isLoading, notifications, markNotificationAsRead, markAllAsRead, users, currentUser, setCurrentUser: handleSetCurrentUser, logout, disassociateAndCreateOwnerAccount, currentPlan, updateUserPlan, currentGuest, currentPg, handleSocialLogin };

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};

