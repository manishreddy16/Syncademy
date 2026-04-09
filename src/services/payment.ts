// Payment & Balance service
// Manages user balances, transactions, and financial operations

import { db } from '../firebase';
import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
  addDoc,
  runTransaction,
} from 'firebase/firestore';
import { setOfflineItem, getOfflineItem, savePending, getPendingItems } from '../utils/offlineStorage';

const INITIAL_BALANCE = 50000; // Default balance for all users
const paymentsCollection = collection(db, 'payments');
const usersCollection = collection(db, 'users');

export interface UserBalance {
  uid: string;
  balance: number;
  lastUpdated: number;
}

export interface Transaction {
  id?: string;
  uid: string;
  studentId?: string;
  type: 'debit' | 'credit'; // debit = payment/spending, credit = money added
  amount: number;
  description: string;
  timestamp: number;
  synced?: boolean;
  offlineKey?: string;
}

// Get user balance
export const getUserBalance = async (uid: string): Promise<number> => {
  try {
    const userRef = doc(usersCollection, uid);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      return INITIAL_BALANCE;
    }

    const data = userDoc.data();
    return data.balance || INITIAL_BALANCE;
  } catch (error) {
    console.error('Error getting balance:', error);
    // Return cached balance if available
    const cached = await getOfflineItem(`balance_${uid}`);
    return cached || INITIAL_BALANCE;
  }
};

// Initialize user balance (called on first login)
export const initializeUserBalance = async (uid: string): Promise<void> => {
  try {
    const userRef = doc(usersCollection, uid);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      await setDoc(userRef, { balance: INITIAL_BALANCE }, { merge: true });
    } else if (!userDoc.data().balance) {
      await updateDoc(userRef, { balance: INITIAL_BALANCE });
    }
  } catch (error) {
    console.error('Error initializing balance:', error);
  }
};

// Deduct money from user (for payments)
export const deductMoney = async (uid: string, amount: number, description: string): Promise<boolean> => {
  try {
    const userRef = doc(usersCollection, uid);
    let newBalance: number;

    await runTransaction(db, async (transaction) => {
      const userDoc = await transaction.get(userRef);
      const currentBalance = userDoc.exists() ? userDoc.data()?.balance || INITIAL_BALANCE : INITIAL_BALANCE;

      if (currentBalance < amount) {
        throw new Error('Insufficient balance');
      }

      newBalance = currentBalance - amount;
      transaction.update(userRef, {
        balance: newBalance,
        lastUpdated: serverTimestamp(),
      });
    });

    const offlineKey = `payment_${uid}_${Date.now()}`;
    await addDoc(paymentsCollection, {
      studentId: uid,
      schoolId: (await getDoc(userRef)).data()?.schoolId || '',
      paidTo: 'school',
      amount: amount,
      amountPaid: amount,
      description,
      type: 'debit',
      timestamp: Date.now(),
      status: 'completed',
      synced: true,
      offlineKey,
    });
    await setOfflineItem(`balance_${uid}`, newBalance!);

    return true;
  } catch (error) {
    console.error('Error deducting money:', error);
    throw error;
  }
};

// Add money to user (admin operation)
export const addMoney = async (uid: string, amount: number, description: string): Promise<void> => {
  try {
    const userRef = doc(usersCollection, uid);
    let newBalance: number;
    let schoolId = '';

    await runTransaction(db, async (transaction) => {
      const userDoc = await transaction.get(userRef);
      schoolId = userDoc.exists() ? userDoc.data()?.schoolId || '' : '';
      const currentBalance = userDoc.exists() ? userDoc.data()?.balance || INITIAL_BALANCE : INITIAL_BALANCE;
      newBalance = currentBalance + amount;

      transaction.update(userRef, {
        balance: newBalance,
        lastUpdated: serverTimestamp(),
      });
    });

    const offlineKey = `credit_${uid}_${Date.now()}`;
    await addDoc(paymentsCollection, {
      studentId: uid,
      schoolId,
      paidTo: 'school',
      amount,
      amountPaid: amount,
      description,
      type: 'credit',
      timestamp: Date.now(),
      status: 'completed',
      synced: true,
      offlineKey,
    });
    await setOfflineItem(`balance_${uid}`, newBalance!);
  } catch (error) {
    console.error('Error adding money:', error);
    throw error;
  }
};

export const recordOfflineCredit = async (uid: string, schoolId: string, amount: number, description: string): Promise<void> => {
  const key = `payment_credit_${uid}_${Date.now()}`;
  const transaction: Transaction = {
    uid,
    studentId: uid,
    schoolId,
    type: 'credit',
    amount,
    description,
    timestamp: Date.now(),
    synced: false,
    offlineKey: key,
  } as any;

  await savePending('payments', {
    ...transaction,
    paidTo: 'school',
    status: 'pending',
    action: 'credit',
  });

  const currentBalance = (await getOfflineItem(`balance_${uid}`)) ?? INITIAL_BALANCE;
  const newBalance = currentBalance + amount;
  await setOfflineItem(`balance_${uid}`, newBalance);
};

export const addMoneyToStudent = async (uid: string, amount: number, description: string): Promise<void> => {
  try {
    const userRef = doc(usersCollection, uid);
    let newBalance: number;

    await runTransaction(db, async (transaction) => {
      const userDoc = await transaction.get(userRef);
      const currentBalance = userDoc.exists() ? userDoc.data()?.balance || INITIAL_BALANCE : INITIAL_BALANCE;
      newBalance = currentBalance + amount;
      transaction.update(userRef, {
        balance: newBalance,
        lastUpdated: serverTimestamp(),
      });
    });

    await addDoc(paymentsCollection, {
      studentId: uid,
      schoolId: (await getDoc(userRef)).data()?.schoolId || '',
      paidTo: 'school',
      amount,
      amountPaid: amount,
      description,
      type: 'credit',
      timestamp: Date.now(),
      status: 'completed',
      synced: true,
    });

    await setOfflineItem(`balance_${uid}`, newBalance!);
  } catch (error) {
    console.error('Error adding money to student:', error);
    throw error;
  }
};

export const recordOfflineBulkCredit = async (schoolId: string, amount: number, description: string): Promise<void> => {
  const key = `payment_bulk_${schoolId}_${Date.now()}`;
  await savePending('payments', {
    key,
    action: 'bulkCredit',
    schoolId,
    amount,
    description,
    timestamp: Date.now(),
    type: 'credit',
    status: 'pending',
  });
};

// Bulk add money to all students in a school (admin operation)
export const bulkAddMoneyToStudents = async (schoolId: string, amount: number, description: string): Promise<void> => {
  try {
    // Get all students in the school
    const usersRef = collection(db, 'users');
    const q = query(
      usersRef,
      where('schoolId', '==', schoolId),
      where('role', '==', 'student')
    );

    const snapshot = await getDocs(q);

    // Add money to each student
    for (const userDoc of snapshot.docs) {
      const uid = userDoc.id;
      const currentBalance = userDoc.data().balance || INITIAL_BALANCE;
      const newBalance = currentBalance + amount;

      await updateDoc(userDoc.ref, {
        balance: newBalance,
        lastUpdated: serverTimestamp(),
      });

      // Record credit transaction
      await addDoc(paymentsCollection, {
        studentId: uid,
        schoolId,
        paidTo: 'school',
        amount,
        amountPaid: amount,
        description,
        type: 'credit',
        timestamp: Date.now(),
        status: 'completed',
        synced: true,
      });
    }
  } catch (error) {
    console.error('Error bulk adding money:', error);
    throw error;
  }
};

// Get user transactions
export const getUserTransactions = async (uid: string, limit: number = 50): Promise<Transaction[]> => {
  try {
    const q = query(paymentsCollection, where('studentId', '==', uid), orderBy('timestamp', 'desc'));
    const snapshot = await getDocs(q);

    const onlineTransactions = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    } as Transaction));

    const offlineTransactions = await getPendingItems('payments');
    const pendingForUser = offlineTransactions
      .filter((item) => item.studentId === uid)
      .map((item) => ({
        ...item,
        synced: false,
      } as Transaction));

    return [...pendingForUser, ...onlineTransactions]
      .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
      .slice(0, limit);
  } catch (error) {
    console.error('Error getting transactions:', error);
    return [];
  }
};

// Get all users' balances for admin view
export const getAllStudentBalances = async (schoolId: string): Promise<(UserBalance & { name: string; email: string })[]> => {
  try {
    const q = query(
      usersCollection,
      where('schoolId', '==', schoolId),
      where('role', '==', 'student')
    );

    const snapshot = await getDocs(q);
    const balances = snapshot.docs.map((doc) => ({
      uid: doc.id,
      name: doc.data().name,
      email: doc.data().email,
      balance: doc.data().balance || INITIAL_BALANCE,
      lastUpdated: doc.data().lastUpdated?.toMillis?.() || 0,
    }));

    return balances;
  } catch (error) {
    console.error('Error getting student balances:', error);
    return [];
  }
};

// Get all payment transactions for admin view (who paid, how much, when)
export const getAllPaymentHistory = async (schoolId: string, limit: number = 100): Promise<(Transaction & { name: string; email: string })[]> => {
  try {
    const studentsQuery = query(usersCollection, where('schoolId', '==', schoolId), where('role', '==', 'student'));
    const studentsSnapshot = await getDocs(studentsQuery);
    const studentMap = new Map<string, { name: string; email: string }>();
    studentsSnapshot.docs.forEach((docItem) => {
      const data = docItem.data();
      studentMap.set(docItem.id, { name: data.name, email: data.email });
    });

    const paymentsQuery = query(paymentsCollection, where('schoolId', '==', schoolId), orderBy('timestamp', 'desc'));
    const paymentsSnapshot = await getDocs(paymentsQuery);

    const onlineTransactions = paymentsSnapshot.docs
      .map((docItem) => {
        const data = docItem.data() as Transaction & { studentId: string };
        const student = studentMap.get(data.studentId);
        return student
          ? {
              id: docItem.id,
              ...data,
              name: student.name,
              email: student.email,
            }
          : null;
      })
      .filter(Boolean) as (Transaction & { name: string; email: string })[];

    const pending = await getPendingItems('payments');
    const pendingTransactions = pending
      .filter((item) => item.schoolId === schoolId)
      .map((item: any) => {
        const student = studentMap.get(item.studentId);
        return {
          ...item,
          name: student?.name || 'Pending student',
          email: student?.email || 'pending@local',
          synced: false,
        } as Transaction & { name: string; email: string };
      });

    const allTransactions = [...pendingTransactions, ...onlineTransactions].sort((a, b) => b.timestamp - a.timestamp);

    return allTransactions.slice(0, limit);
  } catch (error) {
    console.error('Error getting payment history:', error);
    return [];
  }
};

// Record offline payment (for when user is offline)
export const recordOfflinePayment = async (uid: string, schoolId: string, amount: number, description: string): Promise<void> => {
  const key = `payment_${uid}_${Date.now()}`;
  const transaction: Transaction = {
    uid,
    type: 'debit',
    amount,
    description,
    timestamp: Date.now(),
    synced: false,
    offlineKey: key,
    action: 'debit',
  } as any;

  await savePending('payments', {
    ...transaction,
    studentId: uid,
    schoolId,
    paidTo: 'school',
    status: 'pending',
  });

  const currentBalance = (await getOfflineItem(`balance_${uid}`)) ?? INITIAL_BALANCE;
  const newBalance = currentBalance - amount;
  await setOfflineItem(`balance_${uid}`, newBalance);
};
