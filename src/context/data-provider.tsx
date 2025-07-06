
'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from 'react';
import { pgs as initialPgs, guests as initialGuests, complaints as initialComplaints, expenses as initialExpenses, staff as initialStaff, users as initialUsers, defaultMenu } from '@/lib/mock-data';
import type { PG, Guest, Complaint, Expense, Menu, Staff, Notification, User } from '@/lib/types';
import { differenceInDays, parseISO, isPast, isFuture } from 'date-fns';


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
  addGuest: (newGuest: Guest) => void;
  updatePgs: (updatedPgs: PG[]) => void;
  updatePg: (updatedPg: PG) => void;
  addExpense: (newExpense: Omit<Expense, 'id'>) => void;
  updatePgMenu: (pgId: string, menu: Menu) => void;
  updateComplaint: (updatedComplaint: Complaint) => void;
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
}

// Create context
const DataContext = createContext<DataContextType | undefined>(undefined);

// Provider component
export const DataProvider = ({ children }: { children: ReactNode }) => {
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

  useEffect(() => {
    const loadedPgs = getFromLocalStorage<PG[]>('pgs', initialPgs);
    const loadedUsers = getFromLocalStorage<User[]>('users', initialUsers);

    setPgs(loadedPgs);
    setGuests(getFromLocalStorage<Guest[]>('guests', initialGuests));
    setComplaints(getFromLocalStorage<Complaint[]>('complaints', initialComplaints));
    setExpenses(getFromLocalStorage<Expense[]>('expenses', initialExpenses));
    setStaff(getFromLocalStorage<Staff[]>('staff', initialStaff));
    setUsers(loadedUsers);
    
    const storedPgId = getFromLocalStorage<string | null>('selectedPgId', null);
    setSelectedPgId(storedPgId);

    const storedUserId = getFromLocalStorage<string | null>('currentUserId', loadedUsers[0]?.id || null);
    setCurrentUser(loadedUsers.find(u => u.id === storedUserId) || loadedUsers[0] || null);
    
    setIsLoading(false);
  }, []);

  const handleSetCurrentUser = useCallback((user: User | null) => {
    setCurrentUser(user);
    saveToLocalStorage('currentUserId', user ? user.id : null);
  }, []);

  // Filter data based on current user's role and PG access
  const visiblePgs = useMemo(() => {
    if (isLoading || !currentUser) return [];
    if (currentUser.role === 'owner') return pgs;
    return pgs.filter(pg => currentUser.pgIds?.includes(pg.id));
  }, [currentUser, pgs, isLoading]);

  const visibleGuests = useMemo(() => {
    if (isLoading || !currentUser) return [];
    if (currentUser.role === 'owner') return guests;
    return guests.filter(guest => currentUser.pgIds?.includes(guest.pgId));
  }, [currentUser, guests, isLoading]);

  const visibleComplaints = useMemo(() => {
    if (isLoading || !currentUser) return [];
    if (currentUser.role === 'owner') return complaints;
    return complaints.filter(c => currentUser.pgIds?.includes(c.pgId));
  }, [currentUser, complaints, isLoading]);

  const visibleExpenses = useMemo(() => {
    if (isLoading || !currentUser) return [];
    if (currentUser.role === 'owner') return expenses;
    return expenses.filter(exp => currentUser.pgIds?.includes(exp.pgId));
  }, [currentUser, expenses, isLoading]);

  const visibleStaff = useMemo(() => {
    if (isLoading || !currentUser) return [];
    if (currentUser.role === 'owner') return staff;
    return staff.filter(s => currentUser.pgIds?.includes(s.pgId));
  }, [currentUser, staff, isLoading]);

  // Reset selectedPgId if the new user doesn't have access to it
  useEffect(() => {
    if (selectedPgId && visiblePgs.length > 0 && !visiblePgs.find(p => p.id === selectedPgId)) {
      setSelectedPgId(null);
    }
  }, [visiblePgs, selectedPgId]);


  // Notification Generation Logic
  useEffect(() => {
    if (isLoading) return;

    const newNotifications: Notification[] = [];
    
    visibleGuests.forEach(guest => {
        const dueDate = parseISO(guest.dueDate);
        const daysUntilDue = differenceInDays(dueDate, new Date());

        if (guest.rentStatus === 'unpaid' || guest.rentStatus === 'partial') {
            if (isPast(dueDate)) {
                newNotifications.push({
                    id: `noti-rent-overdue-${guest.id}`,
                    type: 'rent-overdue',
                    title: `Rent Overdue: ${guest.name}`,
                    message: `Rent was due on ${guest.dueDate}.`,
                    link: '/dashboard/tenant-management',
                    date: new Date().toISOString(),
                    isRead: false,
                    targetId: guest.id,
                });
            } else if (daysUntilDue <= 7) {
                 newNotifications.push({
                    id: `noti-rent-due-${guest.id}`,
                    type: 'rent-due',
                    title: `Rent Due Soon: ${guest.name}`,
                    message: `Rent is due in ${daysUntilDue + 1} days.`,
                    link: '/dashboard/tenant-management',
                    date: new Date().toISOString(),
                    isRead: false,
                    targetId: guest.id,
                });
            }
        }
    });

    visibleGuests.forEach(guest => {
        if (guest.exitDate) {
            const exitDate = parseISO(guest.exitDate);
            const daysUntilExit = differenceInDays(exitDate, new Date());
            if (daysUntilExit <= 15 && isFuture(exitDate)) {
                 newNotifications.push({
                    id: `noti-checkout-${guest.id}`,
                    type: 'checkout-soon',
                    title: `Checkout Soon: ${guest.name}`,
                    message: `Scheduled to check out in ${daysUntilExit + 1} days.`,
                    link: '/dashboard',
                    date: new Date().toISOString(),
                    isRead: false,
                    targetId: guest.id,
                });
            }
        }
    });

    visibleComplaints.forEach(complaint => {
        if (complaint.status === 'open') {
             newNotifications.push({
                id: `noti-complaint-${complaint.id}`,
                type: 'new-complaint',
                title: `New Complaint: ${complaint.guestName}`,
                message: `Category: ${complaint.category}.`,
                link: '/dashboard/complaints',
                date: new Date(complaint.date).toISOString(),
                isRead: false,
                targetId: complaint.id,
            });
        }
    });
    
    const storedNotifications = getFromLocalStorage<Notification[]>('notifications', []);
    const updatedNotifications = newNotifications.map(newNoti => {
        const storedNoti = storedNotifications.find(sn => sn.id === newNoti.id);
        return storedNoti ? { ...newNoti, isRead: storedNoti.isRead } : newNoti;
    });

    setNotifications(updatedNotifications.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));

  }, [visibleGuests, visibleComplaints, isLoading]);

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

  const updateGuest = useCallback((updatedGuest: Guest) => {
    setGuests(prevGuests => {
        const newGuests = prevGuests.map(t => t.id === updatedGuest.id ? updatedGuest : t);
        saveToLocalStorage('guests', newGuests);
        return newGuests;
    })
  }, []);

  const addGuest = useCallback((newGuest: Guest) => {
    setGuests(prevGuests => {
        const newGuests = [...prevGuests, newGuest];
        saveToLocalStorage('guests', newGuests);
        return newGuests;
    });
  }, []);
  
  const updatePgs = useCallback((updatedPgs: PG[]) => {
      setPgs(updatedPgs);
      saveToLocalStorage('pgs', updatedPgs);
  }, []);

  const updatePg = useCallback((updatedPg: PG) => {
    setPgs(prevPgs => {
        const newPgs = prevPgs.map(pg => (pg.id === updatedPg.id ? updatedPg : pg));
        saveToLocalStorage('pgs', newPgs);
        return newPgs;
    });
  }, []);

  const addExpense = useCallback((newExpenseData: Omit<Expense, 'id'>) => {
    setExpenses(prevExpenses => {
        const newExpense: Expense = {
            id: `exp-${new Date().getTime()}`,
            ...newExpenseData,
        };
        const newExpenses = [newExpense, ...prevExpenses];
        saveToLocalStorage('expenses', newExpenses);
        return newExpenses;
    });
  }, []);
  
  const updatePgMenu = useCallback((pgId: string, menu: Menu) => {
    setPgs(prevPgs => {
        const newPgs = prevPgs.map(pg => 
            pg.id === pgId ? { ...pg, menu } : pg
        );
        saveToLocalStorage('pgs', newPgs);
        return newPgs;
    });
  }, []);

  const updateComplaint = useCallback((updatedComplaint: Complaint) => {
    setComplaints(prevComplaints => {
      const newComplaints = prevComplaints.map(c => c.id === updatedComplaint.id ? updatedComplaint : c);
      saveToLocalStorage('complaints', newComplaints);
      return newComplaints;
    });
  }, []);

  const addStaff = useCallback((newStaffData: Omit<Staff, 'id'>) => {
    setStaff(prevStaff => {
        const newStaff: Staff = {
            id: `staff-${new Date().getTime()}`,
            ...newStaffData,
        };
        const newStaffList = [...prevStaff, newStaff];
        saveToLocalStorage('staff', newStaffList);
        return newStaffList;
    });
  }, []);

  const updateStaff = useCallback((updatedStaff: Staff) => {
    setStaff(prevStaff => {
        const newStaffList = prevStaff.map(s => s.id === updatedStaff.id ? updatedStaff : s);
        saveToLocalStorage('staff', newStaffList);
        return newStaffList;
    })
  }, []);
  
  const deleteStaff = useCallback((staffId: string) => {
      setStaff(prevStaff => {
          const newStaffList = prevStaff.filter(s => s.id !== staffId);
          saveToLocalStorage('staff', newStaffList);
          return newStaffList;
      })
  }, []);


  const value = { 
    pgs: visiblePgs, 
    guests: visibleGuests, 
    complaints: visibleComplaints, 
    expenses: visibleExpenses, 
    staff: visibleStaff, 
    selectedPgId, 
    setSelectedPgId: handleSetSelectedPgId, 
    updateGuest, 
    addGuest, 
    updatePgs, 
    updatePg, 
    addExpense, 
    updatePgMenu, 
    updateComplaint, 
    addStaff, 
    updateStaff, 
    deleteStaff, 
    isLoading, 
    notifications, 
    markNotificationAsRead, 
    markAllAsRead,
    users,
    currentUser,
    setCurrentUser: handleSetCurrentUser,
  };

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
};

// Custom hook to use the context
export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
