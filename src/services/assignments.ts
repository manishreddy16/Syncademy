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
import { ref, uploadBytes, getStorage } from 'firebase/storage';
import { setOfflineItem, getPendingSyncsByPrefix, savePending, getPendingItems, removeOfflineItem } from '../utils/offlineStorage';

const assignmentsCollection = collection(db, 'assignments');
const submissionsCollection = collection(db, 'submissions');
const usersCollection = collection(db, 'users');

export interface Question {
  id: string;
  text: string;
  type: 'multiple-choice' | 'text' | 'true-false';
  options?: string[]; // For multiple choice
  correctAnswer?: string; // For auto-grading if needed
}

export interface Assignment {
  id?: string;
  title: string;
  description: string;
  dueDate: number;
  createdBy: string; // teacher/admin uid
  schoolId: string;
  createdAt?: number;
  questions?: Question[]; // New: multiple questions
  type?: 'assignment' | 'quiz'; // New: assignment vs quiz
}

export interface Submission {
  id?: string;
  assignmentId: string;
  uid: string;
  content?: string; // submission text or file content
  submittedAt?: number;
  synced?: boolean;
  status?: 'pending' | 'submitted' | 'graded';
  grade?: string;
  offlineKey?: string;
  fileName?: string;
  fileType?: string;
  fileUrl?: string;
  base64Data?: string;
  answers?: { [questionId: string]: string }; // New: answers to questions
  studentName?: string; // For admin view
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

    const onlineAssignments = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    } as Assignment));

    const offlineAssignments = (await getPendingItems('assignments'))
      .filter((item) => item.action === 'create' && item.schoolId === schoolId)
      .map((item) => ({
        id: item.offlineKey,
        title: item.title,
        description: item.description,
        dueDate: item.dueDate,
        createdBy: item.createdBy,
        schoolId: item.schoolId,
        createdAt: item.createdAt,
        status: 'pending',
      } as Assignment));

    return [...offlineAssignments, ...onlineAssignments].sort((a, b) => (b.dueDate || 0) - (a.dueDate || 0));
  } catch (error) {
    console.error('Error getting assignments:', error);
    const offlineAssignments = (await getPendingItems('assignments'))
      .filter((item) => item.action === 'create' && item.schoolId === schoolId)
      .map((item) => ({
        id: item.offlineKey,
        title: item.title,
        description: item.description,
        dueDate: item.dueDate,
        createdBy: item.createdBy,
        schoolId: item.schoolId,
        createdAt: item.createdAt,
        status: 'pending',
      } as Assignment));

    return offlineAssignments;
  }
};
// Submit assignment (student)
export const submitAssignment = async (
  assignmentId: string,
  uid: string,
  content: string | null,
  file: File | null = null,
  schoolId?: string,
  answers?: { [questionId: string]: string }
): Promise<Submission> => {
  // Check for duplicate submission
  const alreadySubmitted = await hasStudentSubmitted(assignmentId, uid);
  if (alreadySubmitted) {
    throw new Error('You have already submitted this assignment');
  }

  try {
    const submission: Submission = {
      assignmentId,
      uid,
      content: content || '',
      submittedAt: Date.now(),
      synced: true,
      status: 'submitted',
      schoolId: schoolId || undefined,
      answers: answers || {},
    } as Submission;

    if (file && schoolId) {
      const storageRef = ref(getStorage(), `submissions/${schoolId}/${uid}/${Date.now()}_${file.name}`);
      const snapshot = await uploadBytes(storageRef, file);
      submission.fileUrl = snapshot.ref.fullPath;
      submission.fileName = file.name;
      submission.fileType = file.type;
    }

    const docRef = await addDoc(submissionsCollection, submission);

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
  content: string | null,
  file: File | null = null,
  schoolId: string,
  answers?: { [questionId: string]: string }
): Promise<void> => {
  // Check for duplicate submission (only check online, offline pending is OK)
  const alreadySubmitted = await hasStudentSubmitted(assignmentId, uid);
  if (alreadySubmitted) {
    throw new Error('You have already submitted this assignment');
  }

  const key = `assignment_${uid}_${assignmentId}_${Date.now()}`;
  const submission: Submission = {
    assignmentId,
    uid,
    content: content || '',
    submittedAt: Date.now(),
    synced: false,
    status: 'pending',
    offlineKey: key,
    action: 'submit',
    schoolId,
    answers: answers || {},
  } as Submission;

  if (file) {
    const reader = new FileReader();
    const base64Promise = new Promise<string>((resolve, reject) => {
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
    });
    reader.readAsDataURL(file);
    submission.base64Data = await base64Promise;
    submission.fileName = file.name;
    submission.fileType = file.type;
  }

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

    const onlineSubmissions = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    } as Submission));

    const offlineSubmissions = await getPendingItems('assignments');
    const pending = offlineSubmissions
      .filter((item) => item.assignmentId === assignmentId && item.action === 'submit')
      .map((item) => ({
        ...item,
        status: 'pending',
      } as Submission));

    return [...pending, ...onlineSubmissions].sort((a, b) => (b.submittedAt || 0) - (a.submittedAt || 0));
  } catch (error) {
    console.error('Error getting submissions:', error);
    return [];
  }
};

export const getSchoolSubmissions = async (schoolId: string): Promise<Submission[]> => {
  try {
    const q = query(submissionsCollection, where('schoolId', '==', schoolId));
    const snapshot = await getDocs(q);

    const onlineSubmissions = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    } as Submission));

    const assignmentQuery = query(assignmentsCollection, where('schoolId', '==', schoolId));
    const assignmentSnapshot = await getDocs(assignmentQuery);
    const assignmentIds = assignmentSnapshot.docs.map((docItem) => docItem.id);

    const assignmentSubmissions: Submission[] = [];
    for (let i = 0; i < assignmentIds.length; i += 10) {
      const batchIds = assignmentIds.slice(i, i + 10);
      const submissionsQuery = query(submissionsCollection, where('assignmentId', 'in', batchIds));
      const submissionsSnapshot = await getDocs(submissionsQuery);
      assignmentSubmissions.push(
        ...submissionsSnapshot.docs.map((docItem) => ({
          id: docItem.id,
          ...docItem.data(),
        } as Submission))
      );
    }

    const allOnlineSubmissions = onlineSubmissions.concat(
      assignmentSubmissions.filter((sub) => !onlineSubmissions.some((online) => online.id === sub.id))
    );

    const studentQuery = query(usersCollection, where('schoolId', '==', schoolId), where('role', '==', 'student'));
    const studentSnapshot = await getDocs(studentQuery);
    const studentMap = new Map<string, string>();
    studentSnapshot.docs.forEach((docItem) => {
      const data = docItem.data() as any;
      studentMap.set(docItem.id, data.name || 'Student');
    });

    const onlineWithNames = allOnlineSubmissions.map((item) => ({
      ...item,
      studentName: studentMap.get(item.uid) || item.uid,
    } as Submission & { studentName: string }));

    const offlineSubmissions = await getPendingItems('assignments');
    const pending = offlineSubmissions
      .filter((item) => item.schoolId === schoolId && item.action === 'submit')
      .map((item) => ({
        ...item,
        status: 'pending',
        studentName: studentMap.get(item.uid) || item.uid,
      } as Submission & { studentName: string }));

    return [...pending, ...onlineWithNames].sort((a, b) => (b.submittedAt || 0) - (a.submittedAt || 0));
  } catch (error) {
    console.error('Error getting school submissions:', error);
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
      .filter((item) => item.uid === uid && item.action === 'submit')
      .map((item) => ({
        ...item,
        status: 'pending',
      } as Submission));

    return [...pending, ...onlineSubmissions].sort((a, b) => (b.submittedAt || 0) - (a.submittedAt || 0));
  } catch (error) {
    console.error('Error getting student submissions:', error);
    return [];
  }
};

// Check if student has already submitted an assignment
export const hasStudentSubmitted = async (assignmentId: string, uid: string): Promise<boolean> => {
  try {
    // Check online submissions
    const q = query(
      submissionsCollection,
      where('assignmentId', '==', assignmentId),
      where('uid', '==', uid)
    );
    const snapshot = await getDocs(q);
    const onlineSubmitted = snapshot.docs.length > 0;

    // Check offline pending submissions
    const offlineSubmissions = await getPendingItems('assignments');
    const offlineSubmitted = offlineSubmissions.some(
      (item) => item.assignmentId === assignmentId && item.uid === uid && item.action === 'submit'
    );

    return onlineSubmitted || offlineSubmitted;
  } catch (error) {
    console.error('Error checking submission status:', error);
    // If we can't check, assume not submitted to be safe
    return false;
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
};
