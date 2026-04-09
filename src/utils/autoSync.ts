// Auto-sync service
// Syncs pending offline data to Firebase when online

import { syncPending, setOfflineItem, getOfflineItem, removeOfflineItem } from './offlineStorage';
import { getOnlineStatus, subscribeToOnlineStatus } from './onlineStatus';
import { db } from '../firebase';
import { collection, query, where, getDocs, addDoc, doc, getDoc, serverTimestamp, runTransaction } from 'firebase/firestore';
import { getStorage, ref, uploadBytes } from 'firebase/storage';
import { syncOfflineResource, base64ToBlob } from '../services/resources';

const INITIAL_BALANCE = 50000;
const registrationRequestsCollection = collection(db, 'registrationRequests');
let isSyncing = false;

export const initAutoSync = (): void => {
  const online = getOnlineStatus();
  if (online && !isSyncing) {
    console.log('Online on startup, syncing pending data...');
    syncPendingData().catch((error) => console.error('Initial sync failed:', error));
  }

  subscribeToOnlineStatus(async (onlineStatus) => {
    if (onlineStatus && !isSyncing) {
      console.log('Back online, starting sync...');
      await syncPendingData();
    }
  });
};

export const syncPendingData = async (): Promise<void> => {
  if (isSyncing) return;
  isSyncing = true;

  try {
    await syncPending('payments', syncPayment);
    await syncPending('assignments', syncAssignment);
    await syncPending('resources', syncOfflineResource);
    await syncPending('registrations', syncRegistrationRequest);
  } finally {
    isSyncing = false;
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('syncademy:sync-complete'));
    }
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

    if (!snapshot.empty) {
      return;
    }

    if (paymentData.action === 'bulkCredit') {
      const usersRef = collection(db, 'users');
      const studentQuery = query(usersRef, where('schoolId', '==', paymentData.schoolId), where('role', '==', 'student'));
      const studentSnapshot = await getDocs(studentQuery);

      for (const studentDoc of studentSnapshot.docs) {
        const uid = studentDoc.id;
        await runTransaction(db, async (transaction) => {
          const currentDoc = await transaction.get(studentDoc.ref);
          const currentBalance = currentDoc.exists() ? currentDoc.data()?.balance || 0 : 0;
          transaction.update(studentDoc.ref, {
            balance: currentBalance + paymentData.amount,
            lastUpdated: serverTimestamp(),
          });
        });

        await addDoc(paymentsRef, {
          studentId: uid,
          schoolId: paymentData.schoolId,
          paidTo: 'school',
          amount: paymentData.amount,
          amountPaid: paymentData.amount,
          description: paymentData.description,
          type: 'credit',
          timestamp: paymentData.timestamp || Date.now(),
          status: 'completed',
          synced: true,
          offlineKey: paymentData.offlineKey,
        });
      }
      return;
    }

    const userRef = doc(db, 'users', paymentData.uid);
    const userDoc = await getDoc(userRef);
    const schoolId = userDoc.exists() ? userDoc.data()?.schoolId || '' : paymentData.schoolId || '';

    await runTransaction(db, async (transaction) => {
      const currentDoc = await transaction.get(userRef);
      const currentBalance = currentDoc.exists() ? currentDoc.data()?.balance || 0 : 0;
      const updatedBalance = paymentData.type === 'debit' ? currentBalance - paymentData.amount : currentBalance + paymentData.amount;
      transaction.update(userRef, {
        balance: updatedBalance,
        lastUpdated: serverTimestamp(),
      });
    });

    await addDoc(paymentsRef, {
      studentId: paymentData.uid,
      schoolId,
      paidTo: paymentData.paidTo || 'school',
      amount: paymentData.amount,
      amountPaid: paymentData.amount,
      description: paymentData.description,
      type: paymentData.type || 'debit',
      timestamp: paymentData.timestamp || Date.now(),
      status: 'completed',
      synced: true,
      offlineKey: paymentData.offlineKey,
    });

    const storedBalance = (await getOfflineItem(`balance_${paymentData.uid}`)) ?? 0;
    const updatedOfflineBalance = paymentData.type === 'debit'
      ? storedBalance - paymentData.amount
      : storedBalance + paymentData.amount;
    await setOfflineItem(`balance_${paymentData.uid}`, updatedOfflineBalance);
  } catch (error) {
    console.error('Payment sync failed:', error);
    throw error;
  }
};

const syncAssignment = async (assignmentData: any): Promise<void> => {
  try {
    if (assignmentData.action === 'create') {
      const assignmentsRef = collection(db, 'assignments');
      await addDoc(assignmentsRef, {
        title: assignmentData.title,
        description: assignmentData.description,
        dueDate: assignmentData.dueDate,
        createdBy: assignmentData.createdBy,
        schoolId: assignmentData.schoolId,
        createdAt: serverTimestamp(),
        synced: true,
        offlineKey: assignmentData.offlineKey,
      });
      return;
    }

    const submissionsRef = collection(db, 'submissions');
    const q = query(submissionsRef, where('offlineKey', '==', assignmentData.offlineKey));
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      return;
    }

    let submissionRecord = {
      assignmentId: assignmentData.assignmentId,
      uid: assignmentData.uid,
      content: assignmentData.content,
      submittedAt: assignmentData.submittedAt || Date.now(),
      status: 'submitted',
      synced: true,
      offlineKey: assignmentData.offlineKey,
      fileName: assignmentData.fileName || null,
      fileType: assignmentData.fileType || null,
      fileUrl: assignmentData.fileUrl || null,
    } as any;

    if (assignmentData.base64Data) {
      const submissionBlob = base64ToBlob(assignmentData.base64Data);
      const storageRef = ref(getStorage(), `submissions/${assignmentData.schoolId}/${assignmentData.uid}/${Date.now()}_${assignmentData.fileName}`);
      const fileSnapshot = await uploadBytes(storageRef, submissionBlob);
      submissionRecord.fileUrl = fileSnapshot.ref.fullPath;
      submissionRecord.fileName = assignmentData.fileName;
      submissionRecord.fileType = assignmentData.fileType;
    }

    await addDoc(submissionsRef, {
      ...submissionRecord,
      syncedAt: serverTimestamp(),
    });

    if (assignmentData.offlineKey) {
      await removeOfflineItem(assignmentData.offlineKey);
    }
  } catch (error) {
    console.error('Assignment sync failed:', error);
    throw error;
  }
};

const syncRegistrationRequest = async (registrationData: any): Promise<void> => {
  try {
    const requestQuery = query(
      registrationRequestsCollection,
      where('email', '==', registrationData.email),
      where('schoolId', '==', registrationData.schoolId)
    );
    const requestSnapshot = await getDocs(requestQuery);

    if (!requestSnapshot.empty) {
      return;
    }

    await addDoc(registrationRequestsCollection, {
      email: registrationData.email,
      name: registrationData.name,
      rollNo: registrationData.rollNo,
      schoolId: registrationData.schoolId,
      password: registrationData.password,
      status: 'pending',
      createdAt: serverTimestamp(),
      offlineKey: registrationData.offlineKey,
    });
  } catch (error) {
    console.error('Registration sync failed:', error);
    throw error;
  }
};
