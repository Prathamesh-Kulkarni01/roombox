import { useEffect } from 'react';
import { useAppSelector } from '@/lib/hooks';
import { selectOwnerDataDb, isFirebaseConfigured } from '@/lib/firebase';
import { collection, doc, getDoc, getDocs, query, where, setDoc } from 'firebase/firestore';
import { format, isPast, parseISO, differenceInDays } from 'date-fns';
import { Guest } from '@/lib/types';

export function useClientAutomation() {
  const { currentUser } = useAppSelector(state => state.user);

  useEffect(() => {
    if (!currentUser || currentUser.role !== 'owner' || currentUser.subscription?.planId !== 'enterprise') {
      return;
    }

    const runAutomation = async () => {
      try {
        const db = selectOwnerDataDb(currentUser);
        if (!db) return;

        const todayStr = format(new Date(), 'yyyy-MM-dd');
        const runRef = doc(db, 'client_automation_runs', `run_${todayStr}`);
        const runSnap = await getDoc(runRef);

        if (runSnap.exists()) {
          console.log(`[Client Automation] Runs for ${todayStr} already completed.`);
          return;
        }

        console.log(`[Client Automation] Initiating decentralized guest scan for ${todayStr}...`);

        // Fetch active guests
        const guestsRef = collection(db, `users/${currentUser.id}/guests`);
        const q = query(guestsRef, where('isVacated', '==', false));
        const snapshot = await getDocs(q);

        const guests = snapshot.docs.map(d => ({ ...d.data(), id: d.id } as Guest));
        const now = new Date();

        for (const guest of guests) {
          if (!guest.dueDate) continue;

          const dueDate = parseISO(guest.dueDate);
          const isOverdue = isPast(dueDate);
          const daysDiff = Math.abs(differenceInDays(now, dueDate));

          // Simple business rule: trigger reminders 3 days before due, or if overdue
          const shouldRemind = isOverdue || daysDiff <= 3;

          if (shouldRemind && guest.phone) {
            // Check last reminder timestamp locally to avoid double sending
            if (guest.lastReminderSentAt) {
              const lastSent = new Date(guest.lastReminderSentAt);
              const daysSinceLastReminder = differenceInDays(now, lastSent);
              if (daysSinceLastReminder < 3) {
                // Sent recently, skip
                continue;
              }
            }

            console.log(`[Client Automation] Dispatching transient reminder for ${guest.name} (${guest.phone})...`);

            const token = await window.window?.localStorage?.getItem('firebase_id_token') || '';
            
            await fetch('/api/reminders/send-transient', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({
                recipientPhone: guest.phone,
                recipientName: guest.name,
                amountDue: guest.balance || guest.rentAmount,
                dueDate: guest.dueDate,
                pgName: guest.pgName || 'Our Property',
                guestId: guest.id,
                ownerId: currentUser.id
              })
            }).catch(err => console.error('[Client Automation] Transient dispatch failed:', err));

            // Update local guest document with lastReminderSentAt
            const guestRef = doc(db, `users/${currentUser.id}/guests`, guest.id);
            await setDoc(guestRef, {
              lastReminderSentAt: now.toISOString(),
              lastReminderType: isOverdue ? 'overdue' : 'due_soon'
            }, { merge: true });
          }
        }

        // Record the run completion
        await setDoc(runRef, {
          executedAt: now.toISOString(),
          executedBy: currentUser.id,
          status: 'success'
        });

        console.log(`[Client Automation] Completed run for ${todayStr}.`);
      } catch (error) {
        console.error('[Client Automation] Background run failed:', error);
      }
    };

    // Run automatically after a 5 second delay to prioritize load times
    const timer = setTimeout(runAutomation, 5000);
    return () => clearTimeout(timer);
  }, [currentUser]);
}
