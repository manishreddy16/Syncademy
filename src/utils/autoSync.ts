// Auto-sync service
// Syncs pending offline data to Firebase when online

import { db } from '../firebase';
import { goOnline, goOffline } from '../firebase';
import { getPendingSyncs, markAsSynced } from './offlineStorage';
import { subscribeToOnlineStatus } from './onlineStatus';
import { collection, query, where, getDocs, updateDoc, doc, serverTimestamp } from 'firebase/firestore';

interface PendingSync {
  key: string;
  type: 'assignment' | 'payment' | 'resource';
  data: any;
}

let isSyncing = false;

export const initAutoSync = (): void => {
  // Subscribe to online status changes
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

  // Handle different types of syncs
  if (key.startsWith('payment_')) {
    await syncPayment(value);
  } else if (key.startsWith('assignment_')) {
    await syncAssignment(value);
  } else if (key.startsWith('resource_')) {
    await syncResource(value);
  }
};

const syncPayment = async (paymentData: any): Promise<void> => {
  try {
    const paymentsRef = collection(db, 'payments');
    const q = query(paymentsRef, where('uid', '==', paymentData.uid));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      // Create new payment
      const newPaymentRef = doc(collection(db, 'payments'));
      await updateDoc(newPaymentRef, {
        ...paymentData,
        synced: true,
        syncedAt: serverTimestamp(),
      });
    } else {
      // Payment already exists
      snapshot.docs.forEach(async (docSnap) => {
        await updateDoc(docSnap.ref, {
          synced: true,
          syncedAt: serverTimestamp(),
        });
      });
    }
  } catch (error) {
    console.error('Payment sync failed:', error);
    throw error;
  }
};

const syncAssignment = async (assignmentData: any): Promise<void> => {
  try {
    const assignmentRef = collection(db, 'submissions');
    const q = query(assignmentRef, where('uid', '==', assignmentData.uid));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      const newAssignmentRef = doc(collection(db, 'submissions'));
      await updateDoc(newAssignmentRef, {
        ...assignmentData,
        synced: true,
        syncedAt: serverTimestamp(),
      });
    } else {
      snapshot.docs.forEach(async (docSnap) => {
        await updateDoc(docSnap.ref, {
          synced: true,
          syncedAt: serverTimestamp(),
        });
      });
    }
  } catch (error) {
    console.error('Assignment sync failed:', error);
    throw error;
  }
};

const syncResource = async (resourceData: any): Promise<void> => {
  try {
    const resourceRef = collection(db, 'resources');
    const q = query(resourceRef, where('uid', '==', resourceData.uid));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      const newResourceRef = doc(collection(db, 'resources'));
      await updateDoc(newResourceRef, {
        ...resourceData,
        synced: true,
        syncedAt: serverTimestamp(),
      });
    } else {
      snapshot.docs.forEach(async (docSnap) => {
        await updateDoc(docSnap.ref, {
          synced: true,
          syncedAt: serverTimestamp(),
        });
      });
    }
  } catch (error) {
    console.error('Resource sync failed:', error);
    throw error;
  }
};
