// src/firebase.ts

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, initializeFirestore, CACHE_SIZE_UNLIMITED } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyABEpWXEeTk_kOKNVq2MM-NhExaC0gpIkE",
  authDomain: "syncademy-34c9a.firebaseapp.com",
  projectId: "syncademy-34c9a",
  storageBucket: "syncademy-34c9a.firebasestorage.app",
  messagingSenderId: "623722217261",
  appId: "1:623722217261:web:278256e1d1bf5b4c08dda4",
  measurementId: "G-6XLF6D2ZL4",
};

const app = initializeApp(firebaseConfig);

// export services
export const auth = getAuth(app);
export const db = initializeFirestore(app, { cache: { sizeBytes: CACHE_SIZE_UNLIMITED } });

// Network management utilities
export const goOffline = () => disableNetwork(db);
export const goOnline = () => enableNetwork(db);
