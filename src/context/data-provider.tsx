'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { pgs as initialPgs, guests as initialGuests, complaints as initialComplaints, expenses as initialExpenses, defaultMenu } from '@/lib/mock-data';
import type { PG, Guest, Complaint, Expense, Menu } from '@/lib/types';

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
  selectedPgId: string | null;
  setSelectedPgId: (id: string | null) => void;
  updateGuest: (updatedGuest: Guest) => void;
  addGuest: (newGuest: Guest) => void;
  updatePgs: (updatedPgs: PG[]) => void;
  updatePg: (updatedPg: PG) => void;
  addExpense: (newExpense: Omit<Expense, 'id'>) => void;
  updatePgMenu: (pgId: string, menu: Menu) => void;
  isLoading: boolean;
}

// Create context
const DataContext = createContext<DataContextType | undefined>(undefined);

// Provider component
export const DataProvider = ({ children }: { children: ReactNode }) => {
  const [pgs, setPgs] = useState<PG[]>([]);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [selectedPgId, setSelectedPgId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadedPgs = getFromLocalStorage<PG[]>('pgs', initialPgs);
    setPgs(loadedPgs);
    setGuests(getFromLocalStorage<Guest[]>('guests', initialGuests));
    setComplaints(getFromLocalStorage<Complaint[]>('complaints', initialComplaints));
    setExpenses(getFromLocalStorage<Expense[]>('expenses', initialExpenses));
    
    const storedPgId = getFromLocalStorage<string | null>('selectedPgId', null);
    setSelectedPgId(storedPgId);
    
    setIsLoading(false);
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


  const value = { pgs, guests, complaints, expenses, selectedPgId, setSelectedPgId: handleSetSelectedPgId, updateGuest, addGuest, updatePgs, updatePg, addExpense, updatePgMenu, isLoading };

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
