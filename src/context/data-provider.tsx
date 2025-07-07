
'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { pgs as initialPgs, guests as initialGuests, complaints as initialComplaints, expenses as initialExpenses, staff as initialStaff, users as initialUsers, defaultMenu, plans } from '@/lib/mock-data';
import type { PG, Guest, Complaint, Expense, Menu, Staff, Notification, User, Plan, PlanName, UserRole } from '@/lib/types';
import { differenceInDays, parseISO, isPast, isFuture, format, addMonths } from 'date-fns';
import { db, auth, isFirebaseConfigured } from '@/lib/firebase';
import { type User as FirebaseUser } from 'firebase/auth';
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
  addPg: (newPgData: NewPgData) => string | undefined;
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

    const newGuests = [...guests, newGuest];
    setGuests(newGuests);
    saveToLocalStorage('guests', newGuests);

    const pgToUpdate = pgs.find(p => p.id === newGuest.pgId);
    if (!pgToUpdate) return;

    const updatedPg = produce(pgToUpdate, draft => {
        draft.occupancy += 1;
        let bedFound = false;
        draft.floors?.forEach(floor => {
            if (bedFound) return;
            floor.rooms.forEach(room => {
                if (bedFound) return;
                const bed = room.beds.find(b => b.id === newGuest.bedId);
                if (bed) {
                    bed.guestId = newGuest.id;
                    bedFound = true;
                }
            });
        });
    });
    
    const newPgs = pgs.map(p => p.id === updatedPg.id ? updatedPg : p);
    setPgs(newPgs);
    saveToLocalStorage('pgs', newPgs);

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
  
  const addPg = useCallback((newPgData: NewPgData): string | undefined => {
    if (!currentUser) return;
    const newPg: PG = { id: `pg-${Date.now()}`, ...newPgData, ownerId: currentUser.id, images: ['https://placehold.co/600x400.png'], rating: 0, occupancy: 0, totalBeds: 0, rules: [], contact: '', priceRange: { min: 0, max: 0 }, amenities: ['wifi', 'food'], floors: [], menu: defaultMenu };
    setPgs(prev => { const newPgs = [...prev, newPg]; saveToLocalStorage('pgs', newPgs); return newPgs; });
    syncToFirestore('pgs', newPg);
    return newPg.id;
  }, [currentUser, syncToFirestore]);
  
  const logout = useCallback(() => {
    handleSetCurrentUser(null);
    auth.signOut();
    router.push('/login');
  }, [router, handleSetCurrentUser]);
  
  const disassociateAndCreateOwnerAccount = useCallback(() => {
    if (!currentUser || !currentGuest) return;
    
    const guestRecordToUpdate = { ...currentGuest, email: undefined };
    updateGuest(guestRecordToUpdate);

    const updatedUserAsOwner: User = { ...currentUser, role: 'owner', guestId: undefined, subscription: { planId: 'free', status: 'active' } };
    const updatedUsers = users.map(u => u.id === currentUser.id ? updatedUserAsOwner : u);
    setUsers(updatedUsers);
    saveToLocalStorage('users', updatedUsers);
    
    handleSetCurrentUser(updatedUserAsOwner);
    addPg({ name: `${currentUser.name.split(' ')[0]}'s First PG`, location: 'Update Location', city: 'Update City', gender: 'co-ed' });
    logout();
  }, [currentUser, currentGuest, users, addPg, logout, handleSetCurrentUser, updateGuest]);

  // Main data loading effect
  useEffect(() => {
    const loadInitialData = async () => {
      setIsLoading(true);
      const loadedUsers = getFromLocalStorage<User[]>('users', initialUsers);
      setUsers(loadedUsers);

      const storedUserId = getFromLocalStorage<string | null>('currentUserId', null);
      const user = storedUserId ? loadedUsers.find(u => u.id === storedUserId) : null;
      
      const loadDataFromLocalStorage = () => {
        const localPgs = getFromLocalStorage<PG[]>('pgs', initialPgs);
        const localGuests = getFromLocalStorage<Guest[]>('guests', initialGuests);
        const localComplaints = getFromLocalStorage<Complaint[]>('complaints', initialComplaints);
        const localExpenses = getFromLocalStorage<Expense[]>('expenses', initialExpenses);
        const localStaff = getFromLocalStorage<Staff[]>('staff', initialStaff);

        setPgs(localPgs);
        setGuests(localGuests);
        setComplaints(localComplaints);
        setExpenses(localExpenses);
        setStaff(localStaff);
        return { localPgs, localGuests, localComplaints, localExpenses, localStaff };
      };

      if (user) {
        // Set user first to derive plan
        setCurrentUser(user);
        const plan = plans[user.subscription?.planId || 'free'];
        
        if (plan.hasCloudSync && isFirebaseConfigured()) {
          console.log(`Cloud-sync plan (${plan.id}) detected. Initializing Firebase sync.`);
          try {
            const collections = {
              pgs: collection(db, 'users_data', user.id, 'pgs'),
              guests: collection(db, 'users_data', user.id, 'guests'),
              complaints: collection(db, 'users_data', user.id, 'complaints'),
              expenses: collection(db, 'users_data', user.id, 'expenses'),
              staff: collection(db, 'users_data', user.id, 'staff'),
            };

            const docRef = doc(db, "users_data", user.id);
            const userDoc = await getDoc(docRef);

            if (!userDoc.exists()) {
              console.log("No data in Firestore, performing initial sync from local storage.");
              const { localPgs, localGuests, localComplaints, localExpenses, localStaff } = loadDataFromLocalStorage();
              
              const batch = writeBatch(db);
              batch.set(doc(db, 'users_data', user.id), { syncedAt: new Date().toISOString() });
              localPgs.forEach(item => batch.set(doc(collections.pgs, item.id), item));
              localGuests.forEach(item => batch.set(doc(collections.guests, item.id), item));
              localComplaints.forEach(item => batch.set(doc(collections.complaints, item.id), item));
              localExpenses.forEach(item => batch.set(doc(collections.expenses, item.id), item));
              localStaff.forEach(item => batch.set(doc(collections.staff, item.id), item));
              await batch.commit();
              console.log("Initial sync to Firebase complete.");
            } else {
              console.log("Data found in Firestore, syncing to local state.");
              const [pgsSnap, guestsSnap, complaintsSnap, expensesSnap, staffSnap] = await Promise.all([
                getDocs(collections.pgs), getDocs(collections.guests), getDocs(collections.complaints), getDocs(collections.expenses), getDocs(collections.staff)
              ]);

              const pgsData = pgsSnap.docs.map(d => d.data() as PG);
              const guestsData = guestsSnap.docs.map(d => d.data() as Guest);
              const complaintsData = complaintsSnap.docs.map(d => d.data() as Complaint);
              const expensesData = expensesSnap.docs.map(d => d.data() as Expense);
              const staffData = staffSnap.docs.map(d => d.data() as Staff);
              
              setPgs(pgsData);
              setGuests(guestsData);
              setComplaints(complaintsData);
              setExpenses(expensesData);
              setStaff(staffData);
              
              saveToLocalStorage('pgs', pgsData);
              saveToLocalStorage('guests', guestsData);
              saveToLocalStorage('complaints', complaintsData);
              saveToLocalStorage('expenses', expensesData);
              saveToLocalStorage('staff', staffData);
            }
          } catch (error) {
            console.error("Firebase sync failed, falling back to local storage:", error);
            loadDataFromLocalStorage();
          }
        } else {
          console.log(`Plan (${plan.id}) does not have cloud sync or Firebase not configured. Using local storage.`);
          loadDataFromLocalStorage();
        }
      } else {
        // No user logged in, clear state or use defaults
         setPgs([]); setGuests([]); setComplaints([]); setExpenses([]); setStaff([]);
      }
      
      const storedPgId = getFromLocalStorage<string | null>('selectedPgId', null);
      setSelectedPgId(storedPgId);
      setIsLoading(false);
    };

    loadInitialData();
  }, [currentUser?.id]); // Rerun when user changes

  const handleSocialLogin = useCallback(async (socialUser: FirebaseUser): Promise<{ isNewUser: boolean, role: UserRole | null }> => {
    if (!socialUser.email) {
      throw new Error("Social login provider did not return an email.");
    }
    
    // 1. Check if a User object already exists
    let existingUser = users.find(u => u.email === socialUser.email);
    if (existingUser) {
      handleSetCurrentUser(existingUser);
      return { isNewUser: false, role: existingUser.role };
    }

    // 2. Check if a Staff object exists with this email
    const existingStaff = staff.find(s => s.email === socialUser.email);
    if (existingStaff) {
       const newUserForStaff: User = {
          id: `user-${Date.now()}`,
          name: existingStaff.name,
          email: socialUser.email,
          role: existingStaff.role,
          pgIds: [existingStaff.pgId],
          avatarUrl: socialUser.photoURL || `https://placehold.co/40x40.png?text=${existingStaff.name.slice(0,2).toUpperCase()}`
       };
       const updatedUsers = [...users, newUserForStaff];
       setUsers(updatedUsers);
       saveToLocalStorage('users', updatedUsers);
       handleSetCurrentUser(newUserForStaff);
       return { isNewUser: false, role: newUserForStaff.role };
    }

    // 3. Check if a Guest object exists with this email
    const existingGuest = guests.find(g => g.email === socialUser.email);
    if (existingGuest) {
       const newUserForGuest: User = {
          id: `user-${Date.now()}`,
          name: existingGuest.name,
          email: socialUser.email,
          role: 'tenant',
          guestId: existingGuest.id,
          avatarUrl: socialUser.photoURL || `https://placehold.co/40x40.png?text=${existingGuest.name.slice(0,2).toUpperCase()}`
       };
       const updatedUsers = [...users, newUserForGuest];
       setUsers(updatedUsers);
       saveToLocalStorage('users', updatedUsers);
       handleSetCurrentUser(newUserForGuest);
       return { isNewUser: false, role: newUserForGuest.role };
    }

    // 4. If no user found, it's a new owner signup
    const newUser: User = {
        id: `user-${Date.now()}`,
        name: socialUser.displayName || 'New User',
        email: socialUser.email,
        phone: socialUser.phoneNumber || undefined,
        role: 'owner',
        subscription: { planId: 'free', status: 'active' },
        avatarUrl: socialUser.photoURL || `https://placehold.co/40x40.png?text=${(socialUser.displayName || 'NU').slice(0,2).toUpperCase()}`
    };

    const updatedUsers = [...users, newUser];
    setUsers(updatedUsers);
    saveToLocalStorage('users', updatedUsers);
    handleSetCurrentUser(newUser); 
    addPg({ name: `${newUser.name.split(' ')[0]}'s First PG`, location: 'Update Location', city: 'Update City', gender: 'co-ed' });
    
    return { isNewUser: true, role: 'owner' };
  }, [users, staff, guests, handleSetCurrentUser, addPg]);

  const updateUserPlan = useCallback((planId: PlanName) => {
    if (!currentUser) return;
    const updatedUser: User = { ...currentUser, subscription: { ...(currentUser.subscription || { status: 'active' }), planId: planId } };
    handleSetCurrentUser(updatedUser);
    setUsers(prevUsers => {
      const newUsers = prevUsers.map(u => u.id === updatedUser.id ? updatedUser : u);
      saveToLocalStorage('users', newUsers);
      return newUsers;
    });
  }, [currentUser, handleSetCurrentUser]);
  
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
