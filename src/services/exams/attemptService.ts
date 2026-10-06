import { 
  doc, 
  getDoc, 
  runTransaction, 
  collection, 
  getDocs, 
  query, 
  where 
} from 'firebase/firestore';
import { db } from '../firebase/config';
import type { Exam, ExamAttempt, AttemptType, Question } from '../../types';

export interface StartAttemptResult {
  attempt: ExamAttempt | null;
  exam: Exam | null;
  questions: Question[] | null;
  error: string | null;
  alreadyAttempted: boolean;
}

export function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export async function getOrCreateExamAttempt(
  qpCode: string,
  studentUid: string,
  studentEmail: string,
  studentName: string | null = null,
  isAdminTest: boolean = false
): Promise<StartAttemptResult> {
  const cleanQpCode = qpCode.trim().toUpperCase();

  try {
    const q = query(collection(db, 'exams'), where('qpCode', '==', cleanQpCode));
    const examSnap = await getDocs(q);

    if (examSnap.empty) {
      return { attempt: null, exam: null, questions: null, error: `Invalid QP Code: "${cleanQpCode}". Please check and try again.`, alreadyAttempted: false };
    }

    const examDoc = examSnap.docs[0];
    const exam = { id: examDoc.id, ...examDoc.data() } as Exam;

    if (exam.status !== 'PUBLISHED' && !isAdminTest) {
      return { attempt: null, exam: null, questions: null, error: 'This examination is not active or published.', alreadyAttempted: false };
    }

    const versionId = exam.currentVersionId || 'v1';
    let questions: Question[] = [];

    try {
      const versionDoc = await getDoc(doc(db, `exams/${exam.id}/versions`, versionId));
      if (versionDoc.exists()) {
        questions = versionDoc.data().questions || [];
      } else {
        const draftDoc = await getDoc(doc(db, `exams/${exam.id}/draft`, 'questions'));
        if (draftDoc.exists()) {
          questions = draftDoc.data().questions || [];
        }
      }
    } catch (e) {
      console.warn('Version fetch warning:', e);
    }

    const attemptType: AttemptType = isAdminTest ? 'ADMIN_TEST' : 'STUDENT';
    const attemptId = isAdminTest
      ? `admin_test_${exam.id}_${studentUid}_${Date.now()}`
      : `attempt_${exam.id}_${studentUid}`;

    const attemptRef = doc(db, 'attempts', attemptId);

    const result = await runTransaction(db, async (transaction) => {
      const existingDoc = await transaction.get(attemptRef);

      if (existingDoc.exists()) {
        const existingAttempt = existingDoc.data() as ExamAttempt;
        return {
          attempt: existingAttempt,
          alreadyAttempted: true,
          error: 'You have already attempted this examination.'
        };
      }

      const questionOrder = shuffleArray(questions.map((q) => q.id));
      const initialShuffledCodeLines: Record<string, string[]> = {};

      questions.forEach((q) => {
        if (q.type === 'CODE_LINE_REORDERING') {
          initialShuffledCodeLines[q.id] = shuffleArray(q.codeLines);
        }
      });

      const newAttempt: ExamAttempt = {
        id: attemptId,
        studentUid,
        studentEmail,
        studentName: studentName || undefined,
        examId: exam.id,
        examVersionId: versionId,
        qpCode: exam.qpCode,
        examName: exam.name,
        subject: exam.subject,
        attemptType,
        status: 'IN_PROGRESS',
        startedAt: new Date().toISOString(),
        resultVisible: exam.resultVisibility,
        questionOrder,
        initialShuffledCodeLines
      };

      transaction.set(attemptRef, newAttempt);
      return { attempt: newAttempt, alreadyAttempted: false, error: null };
    });

    if (result.alreadyAttempted && !isAdminTest) {
      return {
        attempt: result.attempt,
        exam,
        questions,
        error: result.error,
        alreadyAttempted: true
      };
    }

    return {
      attempt: result.attempt,
      exam,
      questions,
      error: null,
      alreadyAttempted: false
    };
  } catch (err: any) {
    console.error('Attempt creation error:', err);
    return {
      attempt: null,
      exam: null,
      questions: null,
      error: err.message || 'Failed to start examination attempt.',
      alreadyAttempted: false
    };
  }
}
