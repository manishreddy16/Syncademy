import { signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { getLocalItem, removeLocalItem, setLocalItem } from './storage';

const USER_KEY = 'syncademy_user';
const SESSION_KEY = 'syncademy_session';
const SESSION_TIMESTAMP_KEY = 'syncademy_session_time';

// Session expiry time (24 hours)
const SESSION_EXPIRY_MS = 24 * 60 * 60 * 1000;

export const setAuth = (user: Record<string, unknown>) => {
  setLocalItem(USER_KEY, user);
  setLocalItem(SESSION_KEY, user);
  setLocalItem(SESSION_TIMESTAMP_KEY, Date.now());
};

export const getCurrentUser = (): any => {
  const user = getLocalItem(USER_KEY) as any;
  
  // Check if session is still valid
  if (user) {
    const sessionTime = getLocalItem(SESSION_TIMESTAMP_KEY) as number;
    if (sessionTime && Date.now() - sessionTime > SESSION_EXPIRY_MS) {
      // Session expired
      removeLocalItem(USER_KEY);
      removeLocalItem(SESSION_KEY);
      removeLocalItem(SESSION_TIMESTAMP_KEY);
      return null;
    }
  }
  
  return user;
};

// Restore session from localStorage on app load
export const restoreSession = (): any => {
  const user = getLocalItem(SESSION_KEY) as any;
  
  if (user) {
    const sessionTime = getLocalItem(SESSION_TIMESTAMP_KEY) as number;
    if (sessionTime && Date.now() - sessionTime <= SESSION_EXPIRY_MS) {
      // Session still valid, restore it
      setLocalItem(USER_KEY, user);
      return user;
    } else {
      // Session expired, clear it
      removeLocalItem(SESSION_KEY);
      removeLocalItem(SESSION_TIMESTAMP_KEY);
      return null;
    }
  }
  
  return null;
};

// Refresh session timestamp (keep user logged in)
export const refreshSession = () => {
  const user = getLocalItem(USER_KEY) as any;
  if (user) {
    setLocalItem(SESSION_TIMESTAMP_KEY, Date.now());
  }
};

export const logout = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.warn('Firebase logout failed', error);
  }
  removeLocalItem(USER_KEY);
  removeLocalItem(SESSION_KEY);
  removeLocalItem(SESSION_TIMESTAMP_KEY);
};

export const isAdminUser = () => getCurrentUser()?.role === 'admin';
export const isStudentUser = () => getCurrentUser()?.role === 'student';
