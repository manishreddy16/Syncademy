// Assignments service
// Manages assignment submission, offline storage, and syncing

import { db } from '../firebase';
import {
  collection,
  doc,
  addDoc,
  getDocs,
  query,
  where,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { setOfflineItem, getPendingSyncsByPrefix, savePending, getPendingItems } from '../utils/offlineStorage';

const assignmentsCollection = collection(db, 'assignments');
const submissionsCollection = collection(db, 'submissions');

export interface Assignment {
  id?: string;
  title: string;
  description: string;
  dueDate: number;
  createdBy: string; // teacher/admin uid
  schoolId: string;
  createdAt?: number;
}

export interface Submission {
  id?: string;
  assignmentId: string;
  uid: string;
  content: string; // submission text or file content
  submittedAt?: number;
  synced?: boolean;
  status?: 'pending' | 'submitted' | 'graded';
  grade?: string;
  offlineKey?: string;
}

// Create assignment (admin/teacher only)
export const createAssignment = async (
  assignment: Omit<Assignment, 'id' | 'createdAt'>
): Promise<Assignment> => {
  try {
    const newAssignment = {
      ...assignment,
      createdAt: Date.now(),
    };

    const docRef = await addDoc(assignmentsCollection, newAssignment);

    return {
      id: docRef.id,
      ...newAssignment,
    };
  } catch (error) {
    console.error('Error creating assignment:', error);
    throw error;
  }
};

export const createAssignmentOffline = async (
  assignment: Omit<Assignment, 'id' | 'createdAt'>
): Promise<void> => {
  const key = `assignment_create_${assignment.schoolId}_${Date.now()}`;
  const pendingAssignment = {
    ...assignment,
    createdAt: Date.now(),
    key,
    offlineKey: key,
    status: 'pending',
    action: 'create',
  };

  await savePending('assignments', pendingAssignment);
};

// Get assignments for school
export const getSchoolAssignments = async (schoolId: string): Promise<Assignment[]> => {
  try {
    const q = query(assignmentsCollection, where('schoolId', '==', schoolId));
    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    } as Assignment));
  } catch (error) {
    console.error('Error getting assignments:', error);
    return [];
  }
};

// Submit assignment (student)
export const submitAssignment = async (
  assignmentId: string,
  uid: string,
  content: string
): Promise<Submission> => {
  try {
    const submission: Submission = {
      assignmentId,
      uid,
      content,
      submittedAt: Date.now(),
      synced: true,
      status: 'submitted',
    };

    const docRef = await addDoc(submissionsCollection, submission);

    // Cache offline
    await setOfflineItem(`submission_${uid}_${assignmentId}`, submission);

    return {
      id: docRef.id,
      ...submission,
    };
  } catch (error) {
    console.error('Error submitting assignment:', error);
    throw error;
  }
};

// Submit assignment offline
export const submitAssignmentOffline = async (
  assignmentId: string,
  uid: string,
  content: string
): Promise<void> => {
  const key = `assignment_${uid}_${assignmentId}_${Date.now()}`;
  const submission: Submission = {
    assignmentId,
    uid,
    content,
    submittedAt: Date.now(),
    synced: false,
    status: 'pending',
    offlineKey: key,
  };

  await setOfflineItem(key, submission, true);
  await savePending('assignments', {
    ...submission,
    key,
  });
};

// Get student submissions for an assignment
export const getAssignmentSubmissions = async (assignmentId: string): Promise<Submission[]> => {
  try {
    const q = query(submissionsCollection, where('assignmentId', '==', assignmentId));
    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    } as Submission));
  } catch (error) {
    console.error('Error getting submissions:', error);
    return [];
  }
};

// Get student's submissions
export const getStudentSubmissions = async (uid: string): Promise<Submission[]> => {
  try {
    const q = query(submissionsCollection, where('uid', '==', uid));
    const snapshot = await getDocs(q);
    const onlineSubmissions = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    } as Submission));

    const offlineSubmissions = await getPendingItems('assignments');
    const pending = offlineSubmissions
      .filter((item) => item.uid === uid)
      .map((item) => ({
        ...item,
        status: 'pending',
      } as Submission));

    return [...pending, ...onlineSubmissions];
  } catch (error) {
    console.error('Error getting student submissions:', error);
    return [];
  }
};

// Grade submission (teacher/admin)
export const gradeSubmission = async (submissionId: string, grade: string): Promise<void> => {
  try {
    await updateDoc(doc(submissionsCollection, submissionId), {
      grade,
      status: 'graded',
      gradedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error grading submission:', error);
    throw error;
  }
};

// Get pending offline submissions
export const getPendingOfflineSubmissions = async (uid: string): Promise<Submission[]> => {
  const pending: Submission[] = [];
  
  // In production, you'd iterate through offline storage
  // For now, this is a placeholder
  
  return pending;
};

// Sync pending assignments
export const syncPendingSubmissions = async (): Promise<void> => {
  console.log('Syncing pending submissions...');
  // This will be called by the auto-sync service
};
