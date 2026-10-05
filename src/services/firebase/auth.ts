import { 
  signInWithPopup,
  getRedirectResult,
  signOut as firebaseSignOut, 
  onAuthStateChanged 
} from 'firebase/auth';
import type { User } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, googleProvider, db, STUDENT_EMAIL_REGEX } from './config';
import type { UserProfile, UserRole } from '../../types';

export async function determineUserRole(_uid: string, email: string | null): Promise<UserRole | null> {
  if (!email) return null;
  const cleanEmail = email.trim().toLowerCase();

  try {
    // 1. Authoritative check in authorized_roles/{cleanEmail}
    const roleDoc = await getDoc(doc(db, 'authorized_roles', cleanEmail));
    if (roleDoc.exists()) {
      const data = roleDoc.data();
      if (data.active !== false && (data.role === 'ADMIN' || data.role === 'TEACHER')) {
        return data.role as UserRole;
      }
      if (data.active === false) {
        // Explicitly revoked
        return null;
      }
    }
  } catch (error) {
    console.warn('Firestore role check failed or offline mode:', error);
  }

  // 2. STUDENT check: email regex restriction ONLY applies to STUDENT role
  if (STUDENT_EMAIL_REGEX.test(cleanEmail)) {
    return 'STUDENT';
  }

  return null;
}

export async function signInWithGoogle(): Promise<{ profile: UserProfile | null; error: string | null }> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    const email = user.email;

    if (!email) {
      await firebaseSignOut(auth);
      return { profile: null, error: 'No email address associated with this Google account.' };
    }

    const role = await determineUserRole(user.uid, email);

    if (!role) {
      await firebaseSignOut(auth);
      const isStudentAttempt = email.includes('saranathan.ac.in');
      const errorMsg = isStudentAttempt
        ? `Student email (${email}) does not match required pattern (cse*@saranathan.ac.in).`
        : `Access denied for ${email}. Not registered as Teacher or Admin in Firestore.`;
      return { 
        profile: null, 
        error: errorMsg 
      };
    }

    const profile: UserProfile = {
      uid: user.uid,
      email: user.email!,
      displayName: user.displayName || user.email!.split('@')[0],
      role,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      active: true
    };

    try {
      await setDoc(doc(db, 'users', user.uid), profile, { merge: true });
    } catch (err) {
      console.warn('Could not update user doc in Firestore:', err);
    }

    return { profile, error: null };
  } catch (error: any) {
    console.error('Google Sign-In Error:', error);
    return { profile: null, error: error.message || 'Failed to sign in with Google.' };
  }
}

export async function handleGoogleRedirectResult(): Promise<{ profile: UserProfile | null; error: string | null }> {
  try {
    const result = await getRedirectResult(auth);
    if (!result) return { profile: null, error: null };

    const user = result.user;
    const email = user.email;

    if (!email) {
      await firebaseSignOut(auth);
      return { profile: null, error: 'No email address associated with this Google account.' };
    }

    const role = await determineUserRole(user.uid, email);

    if (!role) {
      await firebaseSignOut(auth);
      const isStudentAttempt = email.includes('saranathan.ac.in');
      const errorMsg = isStudentAttempt
        ? 'Students must use an official Saranathan CSE Google account (e.g., cse*@saranathan.ac.in).'
        : 'Access denied. Your account is not authorized as a Teacher or Admin.';
      return { 
        profile: null, 
        error: errorMsg 
      };
    }

    const profile: UserProfile = {
      uid: user.uid,
      email: user.email!,
      displayName: user.displayName || user.email!.split('@')[0],
      role,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      active: true
    };

    try {
      await setDoc(doc(db, 'users', user.uid), profile, { merge: true });
    } catch (err) {
      console.warn('Could not update user doc in Firestore:', err);
    }

    return { profile, error: null };
  } catch (error: any) {
    // Ignore network-request-failed if no redirect was active or iframe was blocked
    if (error?.code === 'auth/network-request-failed' || error?.code === 'auth/null-user') {
      console.debug('No pending redirect auth result found:', error);
      return { profile: null, error: null };
    }
    console.error('Google Redirect Auth Error:', error);
    return { profile: null, error: error.message || 'Failed to process Google sign-in redirect.' };
  }
}

export async function logoutUser(): Promise<void> {
  await firebaseSignOut(auth);
}

export function subscribeToAuthChanges(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}
