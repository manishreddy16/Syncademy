// Auto-sync service
// Syncs pending offline data to Firebase when online

import { getPendingSyncs, markAsSynced } from './offlineStorage';
import { subscribeToOnlineStatus } from './onlineStatus';
import { auth, db } from '../firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  setDoc,
  doc,
  serverTimestamp,
  runTransaction,
} from 'firebase/firestore';
import { syncOfflineResource } from '../services/resources';

let isSyncing = false;

export const initAutoSync = (): void => {
  subscribeToOnlineStatus(async (online) => {
    if (online && !isSyncing) {
      console.log('Back online, starting sync...');
      await syncPendingData();
    }
  });
};

export const syncPendingData = async (): Promise<void> => {
  if (isSyncing) return;

  isSyncing = true;
  try {
    const pendingSyncs = await getPendingSyncs();
    console.log(`Syncing ${pendingSyncs.length} pending items...`);

    for (const item of pendingSyncs) {
      try {
        await syncItem(item);
        await markAsSynced(item.key);
      } catch (error) {
        console.warn(`Failed to sync ${item.key}:`, error);
      }
    }
  } finally {
    isSyncing = false;
  }
};

const syncItem = async (item: any): Promise<void> => {
  const { key, value } = item;
  if (!value) return;

  if (key.startsWith('payment_')) {
    await syncPayment(value);
  } else if (key.startsWith('assignment_')) {
    await syncAssignment(value);
  } else if (key.startsWith('resource_')) {
    await syncOfflineResource(value);
  } else if (key.startsWith('registration_')) {
    await syncRegistrationRequest(value);
  }
};

const syncPayment = async (paymentData: any): Promise<void> => {
  try {
    const paymentsRef = collection(db, 'payments');
    const q = query(paymentsRef, where('offlineKey', '==', paymentData.offlineKey));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      const userRef = doc(db, 'users', paymentData.uid);
      await runTransaction(db, async (transaction) => {
        const userDoc = await transaction.get(userRef);
        const currentBalance = userDoc.exists() ? userDoc.data()?.balance || 0 : 0;
        transaction.update(userRef, {
          balance: currentBalance - paymentData.amount,
          lastUpdated: serverTimestamp(),
        });
      });

      await addDoc(paymentsRef, {
        ...paymentData,
        synced: true,
        syncedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    console.error('Payment sync failed:', error);
    throw error;
  }
};

const syncAssignment = async (assignmentData: any): Promise<void> => {
  try {
    const submissionsRef = collection(db, 'submissions');
    const q = query(submissionsRef, where('offlineKey', '==', assignmentData.offlineKey));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      await addDoc(submissionsRef, {
        ...assignmentData,
        synced: true,
        syncedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    console.error('Assignment sync failed:', error);
    throw error;
  }
};

const syncRegistrationRequest = async (registrationData: any): Promise<void> => {
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', registrationData.email));
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      return;
    }

    const userCredential = await createUserWithEmailAndPassword(
      auth,
      registrationData.email,
      registrationData.password
    );

    await setDoc(doc(db, 'users', userCredential.user.uid), {
      email: registrationData.email,
      role: 'student',
      schoolId: registrationData.schoolId,
      name: registrationData.name,
      rollNo: registrationData.rollNo,
      approved: false,
      createdAt: serverTimestamp(),
      synced: true,
      offlineKey: registrationData.offlineKey,
    });
  } catch (error: any) {
    if (error.code === 'auth/email-already-in-use') {
      return;
    }
    console.error('Registration sync failed:', error);
    throw error;
  }
};
