import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../firebase';
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { setAuth } from '../utils/auth';
import { getOnlineStatus } from '../utils/onlineStatus';
import { setOfflineItem } from '../utils/offlineStorage';

type Role = 'admin' | 'student';

type UserProfile = {
  uid: string;
  email: string;
  role: Role;
  schoolId: string;
  name: string;
  rollNo?: string;
  approved?: boolean;
};

const schoolsCollection = collection(db, 'schools');
const usersCollection = collection(db, 'users');
const assignmentsCollection = collection(db, 'assignments');
const resourcesCollection = collection(db, 'resources');
const paymentsCollection = collection(db, 'payments');
const submissionsCollection = collection(db, 'submissions');

const generateUniqueSchoolId = async (): Promise<string> => {
  for (let i = 0; i < 10; i += 1) {
    const schoolId = `SCH-${Math.floor(1000 + Math.random() * 9000)}`;
    const existing = await getDoc(doc(db, 'schools', schoolId));
    if (!existing.exists()) {
      return schoolId;
    }
  }
  throw new Error('Unable to generate a unique School ID. Please try again.');
};

export const registerSchool = async (payload: { email: string; name: string; location: string; password: string }) => {
  const userCredential = await createUserWithEmailAndPassword(auth, payload.email, payload.password);
  const schoolId = await generateUniqueSchoolId();
  await setDoc(doc(db, 'schools', schoolId), {
    schoolId,
    schoolName: payload.name,
    location: payload.location,
    adminId: userCredential.user.uid,
    createdAt: serverTimestamp(),
  });
  await setDoc(doc(db, 'users', userCredential.user.uid), {
    email: payload.email,
    role: 'admin',
    schoolId,
    name: payload.name,
    createdAt: serverTimestamp(),
  });
  return { schoolId };
};

export const registerStudent = async (payload: { email: string; name: string; rollNo: string; schoolId: string; password: string }) => {
  const schoolRef = doc(db, 'schools', payload.schoolId);
  const schoolDoc = await getDoc(schoolRef);
  if (!schoolDoc.exists()) {
    throw new Error('School ID not found. Please check your School ID and try again.');
  }

  if (!getOnlineStatus()) {
    const offlineKey = `registration_${payload.email}_${Date.now()}`;
    await setOfflineItem(offlineKey, {
      ...payload,
      approved: false,
      offlineKey,
      requestedAt: Date.now(),
    }, true);

    return {
      email: payload.email,
      schoolId: payload.schoolId,
      name: payload.name,
      offline: true,
    };
  }

  const userCredential = await createUserWithEmailAndPassword(auth, payload.email, payload.password);
  await setDoc(doc(db, 'users', userCredential.user.uid), {
    email: payload.email,
    role: 'student',
    schoolId: payload.schoolId,
    name: payload.name,
    rollNo: payload.rollNo,
    approved: false,
    createdAt: serverTimestamp(),
  });
  return { email: payload.email, schoolId: payload.schoolId, name: payload.name };
};

export const authLogin = async (payload: { email: string; password: string }) => {
  const userCredential = await signInWithEmailAndPassword(auth, payload.email, payload.password);
  const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
  if (!userDoc.exists()) {
    throw new Error('User profile not found. Please contact your administrator.');
  }
  const userData = userDoc.data() as UserProfile;
  if (userData.role === 'student' && userData.approved === false) {
    throw new Error('Your student account is pending approval.');
  }
  const user = { uid: userCredential.user.uid, ...userData } as UserProfile;
  setAuth(user);
  return user;
};

export const fetchDashboard = async (user: UserProfile) => {
  const schoolId = user.schoolId;
  const studentsQuery = query(usersCollection, where('schoolId', '==', schoolId), where('role', '==', 'student'));
  const studentDocs = await getDocs(studentsQuery);
  const approvedStudents = studentDocs.docs.filter((docItem) => docItem.data().approved !== false).length;
  const pendingStudents = studentDocs.docs.filter((docItem) => docItem.data().approved === false).length;

  const assignmentsQuery = query(assignmentsCollection, where('schoolId', '==', schoolId), orderBy('createdAt', 'desc'));
  const assignmentDocs = await getDocs(assignmentsQuery);

  const paymentsQuery = query(paymentsCollection, where('schoolId', '==', schoolId), orderBy('createdAt', 'desc'));
  const paymentDocs = await getDocs(paymentsQuery);
  const pendingPayments = paymentDocs.docs.filter((docItem) => docItem.data().status === 'pending').length;

  return {
    approvedStudents,
    pendingStudents,
    dueAssignments: assignmentDocs.docs.length,
    pendingPayments,
  };
};

export const fetchPendingStudents = async (user: UserProfile) => {
  const pendingQuery = query(
    usersCollection,
    where('schoolId', '==', user.schoolId),
    where('role', '==', 'student'),
    where('approved', '==', false)
  );
  const snapshot = await getDocs(pendingQuery);
  return snapshot.docs.map((docItem) => ({ id: docItem.id, ...docItem.data() }));
};

export const approveStudent = async (studentId: string, approved: boolean) => {
  await updateDoc(doc(db, 'users', studentId), { approved });
};

export const fetchAssignments = async (user: UserProfile) => {
  const assignmentsQuery = query(assignmentsCollection, where('schoolId', '==', user.schoolId), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(assignmentsQuery);
  return snapshot.docs.map((docItem) => ({ id: docItem.id, ...docItem.data() }));
};

export const createAssignment = async (payload: { title: string; description: string; deadline: string }, user: UserProfile) => {
  await addDoc(assignmentsCollection, {
    schoolId: user.schoolId,
    title: payload.title,
    description: payload.description,
    deadline: payload.deadline,
    createdAt: serverTimestamp(),
  });
};

export const submitAssignment = async (payload: { assignmentId: string; content: string }, user: UserProfile) => {
  await addDoc(submissionsCollection, {
    schoolId: user.schoolId,
    assignmentId: payload.assignmentId,
    studentId: user.uid,
    studentEmail: user.email,
    content: payload.content,
    createdAt: serverTimestamp(),
  });
};

export const fetchResources = async (user: UserProfile) => {
  const resourcesQuery = query(resourcesCollection, where('schoolId', '==', user.schoolId), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(resourcesQuery);
  return snapshot.docs.map((docItem) => ({ id: docItem.id, ...docItem.data() }));
};

export const createResource = async (payload: { title: string; filePath: string }, user: UserProfile) => {
  await addDoc(resourcesCollection, {
    schoolId: user.schoolId,
    title: payload.title,
    filePath: payload.filePath,
    createdAt: serverTimestamp(),
  });
};

export const fetchPayments = async (user: UserProfile) => {
  const paymentsQuery =
    user.role === 'student'
      ? query(
          paymentsCollection,
          where('schoolId', '==', user.schoolId),
          where('studentId', '==', user.uid),
          orderBy('createdAt', 'desc')
        )
      : query(paymentsCollection, where('schoolId', '==', user.schoolId), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(paymentsQuery);
  return snapshot.docs.map((docItem) => ({ id: docItem.id, ...docItem.data() }));
};

export const createPayment = async (payload: { amount: number; status: string }, user: UserProfile) => {
  await addDoc(paymentsCollection, {
    schoolId: user.schoolId,
    studentId: user.uid,
    studentEmail: user.email,
    amount: payload.amount,
    status: payload.status,
    createdAt: serverTimestamp(),
  });
};
