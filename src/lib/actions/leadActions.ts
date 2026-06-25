import { db } from '../firebase';
import { collection, doc, setDoc, getDocs, deleteDoc, updateDoc, query, orderBy, serverTimestamp, getDoc } from 'firebase/firestore';
import { Lead, LeadStatus } from '../types';

/** Remove all keys whose value is `undefined` — Firestore rejects them. */
function stripUndefined<T extends object>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined)
  ) as Partial<T>;
}

export const createLead = async (ownerId: string, leadData: Omit<Lead, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  if (!ownerId) throw new Error('Owner ID is required to create a lead');

  const leadRef = doc(collection(db!, `users/${ownerId}/leads`));
  const newLead: Lead = {
    ...leadData,
    id: leadRef.id,
    ownerId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await setDoc(leadRef, stripUndefined({
    ...newLead,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }));

  return leadRef.id;
};

export const updateLeadStatus = async (ownerId: string, leadId: string, status: LeadStatus): Promise<void> => {
  if (!ownerId || !leadId) throw new Error('Owner ID and Lead ID are required');

  const leadRef = doc(db!, `users/${ownerId}/leads`, leadId);
  await updateDoc(leadRef, stripUndefined({
    status,
    updatedAt: serverTimestamp(),
  }));
};

export const updateLeadDetails = async (ownerId: string, leadId: string, updates: Partial<Lead>): Promise<void> => {
    if (!ownerId || !leadId) throw new Error('Owner ID and Lead ID are required');
  
    const leadRef = doc(db!, `users/${ownerId}/leads`, leadId);
    await updateDoc(leadRef, stripUndefined({
      ...updates,
      updatedAt: serverTimestamp(),
    }));
};

export const fetchLeadsForOwner = async (ownerId: string): Promise<Lead[]> => {
  if (!ownerId) throw new Error('Owner ID is required to fetch leads');

  const leadsRef = collection(db!, `users/${ownerId}/leads`);
  // Ordered by descending timestamp (newest first)
  const q = query(leadsRef, orderBy('createdAt', 'desc'));
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      ...data,
      id: doc.id,
      // Handle Firestore timestamps
      createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
      updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
    } as Lead;
  });
};

export const deleteLead = async (ownerId: string, leadId: string): Promise<void> => {
  if (!ownerId || !leadId) throw new Error('Owner ID and Lead ID are required');
  
  const leadRef = doc(db!, `users/${ownerId}/leads`, leadId);
  await deleteDoc(leadRef);
};
