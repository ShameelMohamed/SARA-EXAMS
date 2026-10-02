export type UserRole = 'ADMIN' | 'TEACHER' | 'STUDENT';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string | null;
  role: UserRole;
  createdAt: string;
  updatedAt?: string;
  active: boolean;
}

export type QuestionType = 'MCQ' | 'MSQ' | 'CODE_LINE_REORDERING';

export interface BaseQuestion {
  id: string;
  type: QuestionType;
  questionText: string;
  marks: number;
}

export interface MCQQuestion extends BaseQuestion {
  type: 'MCQ';
  options: string[];
  correctAnswer: number; // 0-indexed index of correct option
}

export interface MSQQuestion extends BaseQuestion {
  type: 'MSQ';
  options: string[];
  correctAnswers: number[]; // 0-indexed indices of correct options
}

export interface CodeLineReorderingQuestion extends BaseQuestion {
  type: 'CODE_LINE_REORDERING';
  codeLines: string[]; // Correct ordered sequence of code lines
}

export type Question = MCQQuestion | MSQQuestion | CodeLineReorderingQuestion;

export type ExamStatus = 'DRAFT' | 'PUBLISHED' | 'CLOSED' | 'COMPLETED';

export interface Exam {
  id: string;
  qpCode: string;
  name: string;
  subject: string;
  durationMinutes: number;
  availableFrom?: string; // e.g. "09:15"
  availableUntil?: string; // e.g. "10:45"
  createdBy: string; // email or uid of creator
  status: ExamStatus;
  resultVisibility: boolean; // true = student can see mark after submit
  createdAt: string;
  publishedAt?: string;
  currentVersionId?: string;
  totalQuestions?: number;
  totalMarks?: number;
}

export interface ExamVersion {
  id: string;
  examId: string;
  version: number;
  questions: Question[];
  durationMinutes: number;
  availableFrom?: string;
  availableUntil?: string;
  createdAt: string;
  publishedAt: string;
  immutable: boolean;
}

export type AttemptType = 'STUDENT' | 'ADMIN_TEST';
export type AttemptStatus = 'IN_PROGRESS' | 'SUBMITTED' | 'TIMED_OUT';

export interface StudentAnswer {
  questionId: string;
  // Answer payload depending on type:
  // MCQ: number (selected index)
  // MSQ: number[] (selected indices)
  // CODE_LINE_REORDERING: string[] (reordered code lines array)
  answer: number | number[] | string[];
  isCorrect?: boolean;
  marksAwarded?: number;
  submittedAt?: string;
}

export interface ExamAttempt {
  id: string; // e.g. versionId_studentUid
  studentUid: string;
  studentEmail: string;
  examId: string;
  examVersionId: string;
  qpCode: string;
  examName: string;
  subject: string;
  attemptType: AttemptType;
  status: AttemptStatus;
  startedAt: string;
  submittedAt?: string;
  score?: number;
  totalMarks?: number;
  resultVisible: boolean;
  answers: Record<string, StudentAnswer>;
  questionOrder: string[]; // shuffled list of question IDs for this attempt
  initialShuffledCodeLines?: Record<string, string[]>; // initial shuffled lines per code-reorder question
}

export interface AuthorizedRoleAccount {
  email: string;
  role: 'ADMIN' | 'TEACHER';
  assignedBy: string;
  assignedAt: string;
}

export type TeacherAccount = AuthorizedRoleAccount;

export interface SecurityEvent {
  id: string;
  attemptId: string;
  studentUid: string;
  eventType: 'FOCUS_LOST' | 'FULLSCREEN_EXIT' | 'KEYBOARD_RESTRICTED' | 'COPY_PASTE_ATTEMPT';
  timestamp: string;
  details?: string;
}
