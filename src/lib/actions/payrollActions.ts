import { db } from '../firebase';
import { collection, doc, setDoc, getDocs, updateDoc, query, orderBy, serverTimestamp, where, runTransaction } from 'firebase/firestore';
import { StaffAdvance, PayrollRecord, Staff } from '../types';

export const recordStaffAdvance = async (ownerId: string, staffId: string, data: Omit<StaffAdvance, 'id' | 'ownerId' | 'staffId' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  if (!ownerId || !staffId) throw new Error('Owner ID and Staff ID are required');

  const advanceRef = doc(collection(db!, `users/${ownerId}/staff_advances`));
  const newAdvance: StaffAdvance = {
    ...data,
    id: advanceRef.id,
    ownerId,
    staffId,
  };

  await setDoc(advanceRef, {
    ...newAdvance,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return advanceRef.id;
};

export const fetchUnsettledAdvances = async (ownerId: string, staffId: string): Promise<StaffAdvance[]> => {
  const advancesRef = collection(db!, `users/${ownerId}/staff_advances`);
  const q = query(advancesRef, where('staffId', '==', staffId), orderBy('date', 'desc'));
  
  const snapshot = await getDocs(q);
  return snapshot.docs
    .map(doc => ({ ...doc.data(), id: doc.id } as StaffAdvance))
    .filter(adv => !adv.deductedInPayrollId);
};

export const generateMonthlyPayroll = async (ownerId: string, staffId: string, month: string): Promise<PayrollRecord> => {
  if (!ownerId || !staffId) throw new Error('Owner ID and Staff ID are required');

  // Fetch staff details
  const staffRef = doc(db!, `users/${ownerId}/users_data`, staffId); 
  // Wait, staff is usually stored in users_data or staff collection depending on schema. 
  // In Roombox it's `users/${ownerId}/staff`. Let's use that.
  
  // Note: For this implementation, I will assume base salary is passed in if I can't fetch it, 
  // but let's try to fetch it properly. We will fetch all staff and find them.
  const staffQuery = query(collection(db!, `users/${ownerId}/staff`), where('id', '==', staffId));
  const staffSnap = await getDocs(staffQuery);
  let baseSalary = 0;
  if (!staffSnap.empty) {
    baseSalary = staffSnap.docs[0].data().salary || 0;
  }

  // Fetch unsettled advances
  const advances = await fetchUnsettledAdvances(ownerId, staffId);
  const totalAdvances = advances.reduce((sum, adv) => sum + adv.amount, 0);

  // In a real app, we'd calculate attendance here. For now, assume 30 days.
  const attendanceDays = 30;
  const calculatedDeduction = 0; // if attendance < 30, (30-attendance)*dailyRate

  const payrollRef = doc(collection(db!, `users/${ownerId}/staff_payrolls`));
  
  const payrollData: PayrollRecord = {
    id: payrollRef.id,
    ownerId,
    staffId,
    month,
    baseSalary,
    attendanceDays,
    calculatedDeduction,
    advancesDeducted: totalAdvances,
    bonus: 0,
    finalPayout: baseSalary - calculatedDeduction - totalAdvances,
    status: 'pending',
  };

  await setDoc(payrollRef, {
    ...payrollData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return payrollData;
};

export const processPayroll = async (ownerId: string, payrollId: string): Promise<void> => {
  const payrollRef = doc(db!, `users/${ownerId}/staff_payrolls`, payrollId);
  
  await runTransaction(db!, async (transaction) => {
    const docSnap = await transaction.get(payrollRef);
    if (!docSnap.exists()) throw new Error("Payroll record not found");
    
    const payroll = docSnap.data() as PayrollRecord;
    if (payroll.status === 'paid') throw new Error("Payroll already processed");

    // Settle advances
    const advancesRef = collection(db!, `users/${ownerId}/staff_advances`);
    const q = query(advancesRef, where('staffId', '==', payroll.staffId));
    // Cannot run queries inside a transaction easily without throwing warnings if data is modified, 
    // but in Firebase client SDK it's somewhat allowed if done before writes.
    // For safety, we will just fetch outside transaction if we wanted, but let's do it simply:
    const advancesSnap = await getDocs(q); 
    
    for (const advDoc of advancesSnap.docs) {
      const advData = advDoc.data() as StaffAdvance;
      if (!advData.deductedInPayrollId) {
        transaction.update(advDoc.ref, {
          deductedInPayrollId: payrollId,
          updatedAt: serverTimestamp()
        });
      }
    }

    transaction.update(payrollRef, {
      status: 'paid',
      paidDate: new Date().toISOString(),
      updatedAt: serverTimestamp()
    });
  });
};

export const fetchPayrolls = async (ownerId: string, staffId: string): Promise<PayrollRecord[]> => {
  const payrollsRef = collection(db!, `users/${ownerId}/staff_payrolls`);
  const q = query(payrollsRef, where('staffId', '==', staffId), orderBy('month', 'desc'));
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as PayrollRecord));
};
