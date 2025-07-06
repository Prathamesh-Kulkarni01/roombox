'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { pgs as initialPgs, guests as initialGuests, complaints as initialComplaints } from '@/lib/mock-data';
import type { PG, Guest, Complaint } from '@/lib/types';

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
  updateGuest: (updatedGuest: Guest) => void;
  addGuest: (newGuest: Guest) => void;
  updatePgs: (updatedPgs: PG[]) => void;
  isLoading: boolean;
}

// Create context
const DataContext = createContext<DataContextType | undefined>(undefined);

// Provider component
export const DataProvider = ({ children }: { children: ReactNode }) => {
  const [pgs, setPgs] = useState<PG[]>([]);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // This effect runs only once on mount to load data from localStorage
    setPgs(getFromLocalStorage<PG[]>('pgs', initialPgs));
    setGuests(getFromLocalStorage<Guest[]>('guests', initialGuests));
    setComplaints(getFromLocalStorage<Complaint[]>('complaints', initialComplaints));
    setIsLoading(false);
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

  const value = { pgs, guests, complaints, updateGuest, addGuest, updatePgs, isLoading };

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
