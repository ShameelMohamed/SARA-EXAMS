import { doc, setDoc, getDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

export interface LaunchTokenData {
  token: string;
  attemptId: string;
  studentUid: string;
  examId: string;
  expiresAt: number; // Unix timestamp ms
  createdAt: string;
}

/**
 * Generates a short-lived launch token stored in Firestore `launchTokens` collection.
 * Token expires in 2 minutes.
 */
export async function createLaunchToken(attemptId: string, studentUid: string, examId: string): Promise<string> {
  const token = `tok_${Math.random().toString(36).substring(2, 15)}_${Date.now()}`;
  const expiresAt = Date.now() + 2 * 60 * 1000; // 2 minutes valid window

  const tokenData: LaunchTokenData = {
    token,
    attemptId,
    studentUid,
    examId,
    expiresAt,
    createdAt: new Date().toISOString()
  };

  await setDoc(doc(db, 'launchTokens', token), tokenData);
  return token;
}

/**
 * Validates and consumes a short-lived launch token.
 * Single-use token: deleted upon successful verification.
 */
export async function validateAndConsumeToken(token: string): Promise<{ valid: boolean; attemptId?: string; studentUid?: string; examId?: string; error?: string }> {
  try {
    const tokenRef = doc(db, 'launchTokens', token);
    const tokenSnap = await getDoc(tokenRef);

    if (!tokenSnap.exists()) {
      return { valid: false, error: 'Invalid or already consumed launch token.' };
    }

    const data = tokenSnap.data() as LaunchTokenData;

    // Delete token immediately so it cannot be reused
    await deleteDoc(tokenRef);

    if (Date.now() > data.expiresAt) {
      return { valid: false, error: 'Launch token has expired. Please launch again from the website.' };
    }

    return {
      valid: true,
      attemptId: data.attemptId,
      studentUid: data.studentUid,
      examId: data.examId
    };
  } catch (err: any) {
    console.error('Token validation failed:', err);
    return { valid: false, error: err.message || 'Token verification failed.' };
  }
}
