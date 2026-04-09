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
  serverTimestamp,
  addDoc,
  runTransaction,
} from 'firebase/firestore';
import { setOfflineItem, getOfflineItem } from '../utils/offlineStorage';

const INITIAL_BALANCE = 50000; // Default balance for all users
const transactionsCollection = collection(db, 'transactions');
const usersCollection = collection(db, 'users');

export interface UserBalance {
  uid: string;
  balance: number;
  lastUpdated: number;
}

export interface Transaction {
  id?: string;
  uid: string;
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

    const transactionRecord: Transaction = {
      uid,
      type: 'debit',
      amount,
      description,
      timestamp: Date.now(),
      synced: true,
      offlineKey: `payment_${uid}_${Date.now()}`,
    };

    await addDoc(transactionsCollection, transactionRecord);
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

    await runTransaction(db, async (transaction) => {
      const userDoc = await transaction.get(userRef);
      const currentBalance = userDoc.exists() ? userDoc.data()?.balance || INITIAL_BALANCE : INITIAL_BALANCE;
      newBalance = currentBalance + amount;

      transaction.update(userRef, {
        balance: newBalance,
        lastUpdated: serverTimestamp(),
      });
    });

    const transactionRecord: Transaction = {
      uid,
      type: 'credit',
      amount,
      description,
      timestamp: Date.now(),
      synced: true,
      offlineKey: `credit_${uid}_${Date.now()}`,
    };

    await addDoc(transactionsCollection, transactionRecord);
    await setOfflineItem(`balance_${uid}`, newBalance!);
  } catch (error) {
    console.error('Error adding money:', error);
    throw error;
  }
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

      // Record transaction
      const transaction: Transaction = {
        uid,
        type: 'credit',
        amount,
        description,
        timestamp: Date.now(),
      };

      await addDoc(transactionsCollection, transaction);
    }
  } catch (error) {
    console.error('Error bulk adding money:', error);
    throw error;
  }
};

// Get user transactions
export const getUserTransactions = async (uid: string, limit: number = 50): Promise<Transaction[]> => {
  try {
    const q = query(transactionsCollection, where('uid', '==', uid));
    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    } as Transaction));
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
    // Get all students in the school
    const usersRef = collection(db, 'users');
    const studentsQuery = query(
      usersRef,
      where('schoolId', '==', schoolId),
      where('role', '==', 'student')
    );
    const studentsSnapshot = await getDocs(studentsQuery);
    const studentUids = studentsSnapshot.docs.map(doc => doc.id);
    const studentMap = new Map();
    studentsSnapshot.docs.forEach(doc => {
      studentMap.set(doc.id, { name: doc.data().name, email: doc.data().email });
    });

    // Get all transactions for these students
    const allTransactions: (Transaction & { name: string; email: string })[] = [];
    for (const uid of studentUids) {
      const q = query(transactionsCollection, where('uid', '==', uid));
      const snapshot = await getDocs(q);
      snapshot.docs.forEach(doc => {
        const data = doc.data() as Transaction;
        const student = studentMap.get(uid);
        if (student) {
          allTransactions.push({
            ...data,
            id: doc.id,
            name: student.name,
            email: student.email,
          });
        }
      });
    }

    // Sort by timestamp descending and limit
    return allTransactions
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  } catch (error) {
    console.error('Error getting payment history:', error);
    return [];
  }
};

// Record offline payment (for when user is offline)
export const recordOfflinePayment = async (uid: string, amount: number, description: string): Promise<void> => {
  const key = `payment_${uid}_${Date.now()}`;
  const transaction: Transaction = {
    uid,
    type: 'debit',
    amount,
    description,
    timestamp: Date.now(),
    synced: false,
    offlineKey: key,
  };

  await setOfflineItem(key, transaction, true);

  const currentBalance = (await getOfflineItem(`balance_${uid}`)) ?? INITIAL_BALANCE;
  const newBalance = currentBalance - amount;
  await setOfflineItem(`balance_${uid}`, newBalance);
};
