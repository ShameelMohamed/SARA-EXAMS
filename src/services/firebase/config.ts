import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "sara-exams.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "sara-exams",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "sara-exams.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "207063629440",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:207063629440:web:963e9ca48ae80f88ab7065",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-9C8K4803X3"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });
export const db = getFirestore(app);

export const STUDENT_EMAIL_REGEX = /^cse.*@saranathan\.ac\.in$/i;
