'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { pgs as initialPgs, tenants as initialTenants, complaints as initialComplaints } from '@/lib/mock-data';
import type { PG, Tenant, Complaint } from '@/lib/types';

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
  tenants: Tenant[];
  complaints: Complaint[];
  updateTenant: (updatedTenant: Tenant) => void;
  addTenant: (newTenant: Tenant) => void;
  updatePgs: (updatedPgs: PG[]) => void;
  isLoading: boolean;
}

// Create context
const DataContext = createContext<DataContextType | undefined>(undefined);

// Provider component
export const DataProvider = ({ children }: { children: ReactNode }) => {
  const [pgs, setPgs] = useState<PG[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // This effect runs only once on mount to load data from localStorage
    setPgs(getFromLocalStorage<PG[]>('pgs', initialPgs));
    setTenants(getFromLocalStorage<Tenant[]>('tenants', initialTenants));
    setComplaints(getFromLocalStorage<Complaint[]>('complaints', initialComplaints));
    setIsLoading(false);
  }, []);
  
  const updateTenant = useCallback((updatedTenant: Tenant) => {
    setTenants(prevTenants => {
        const newTenants = prevTenants.map(t => t.id === updatedTenant.id ? updatedTenant : t);
        saveToLocalStorage('tenants', newTenants);
        return newTenants;
    })
  }, []);

  const addTenant = useCallback((newTenant: Tenant) => {
    setTenants(prevTenants => {
        const newTenants = [...prevTenants, newTenant];
        saveToLocalStorage('tenants', newTenants);
        return newTenants;
    });
  }, []);
  
  const updatePgs = useCallback((updatedPgs: PG[]) => {
      setPgs(updatedPgs);
      saveToLocalStorage('pgs', updatedPgs);
  }, []);

  const value = { pgs, tenants, complaints, updateTenant, addTenant, updatePgs, isLoading };

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
