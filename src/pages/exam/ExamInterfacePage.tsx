import React, { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { Clock, CheckCircle2, ChevronLeft, ChevronRight, Send } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { QuestionTypeBadge } from '../../components/ui/QuestionTypeBadge';
import { DraggableCodeLines } from '../../components/exam/DraggableCodeLines';
import type { Exam, ExamAttempt, Question, StudentAnswer } from '../../types';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../services/firebase/config';
import { useAuth } from '../../features/auth/AuthContext';

export const ExamInterfacePage: React.FC = () => {
  const { examId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { profile } = useAuth();

  const searchParams = new URLSearchParams(location.search);
  const isAdminTest = searchParams.get('adminTest') === 'true';

  // State
  const [exam, setExam] = useState<Exam | null>(location.state?.exam || null);
  const [attempt, setAttempt] = useState<ExamAttempt | null>(location.state?.attempt || null);
  const [questions, setQuestions] = useState<Question[]>(location.state?.questions || []);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [answers, setAnswers] = useState<Record<string, StudentAnswer>>({});
  const [timeLeftSeconds, setTimeLeftSeconds] = useState<number>(0);
  const [submitting, setSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [finalResult, setFinalResult] = useState<{ score: number; totalMarks: number } | null>(null);

  const [tokenError, setTokenError] = useState<string | null>(null);

  useEffect(() => {
    async function initExam() {
      let currentAttempt = attempt;
      let currentExam = exam;
      let resolvedStudentUid = profile?.uid;
      let resolvedAttemptId = attempt?.id;
      let resolvedExamId: string | undefined = undefined;

      // Validate launch token if provided in URL params
      const token = searchParams.get('token');
      if (token) {
        const { validateAndConsumeToken } = await import('../../services/exams/tokenService');
        const tokenVal = await validateAndConsumeToken(token);
        if (!tokenVal.valid) {
          setTokenError(tokenVal.error || 'Token validation failed.');
          return;
        }
        if (tokenVal.studentUid) resolvedStudentUid = tokenVal.studentUid;
        if (tokenVal.attemptId) resolvedAttemptId = tokenVal.attemptId;
        if (tokenVal.examId) resolvedExamId = tokenVal.examId;
      }

      if (!resolvedStudentUid && !profile?.uid) {
        setTokenError('No valid launch token or active user session found. Please start your exam from your web browser.');
        return;
      }

      const activeUid = resolvedStudentUid || profile?.uid;
      const targetExamId = resolvedExamId || examId;

      // Register security event listener from Electron main process
      // @ts-ignore
      if (window.electronAPI && typeof window.electronAPI.onSecurityEvent === 'function') {
        // @ts-ignore
        window.electronAPI.onSecurityEvent(async (data: any) => {
          try {
            const { collection, addDoc } = await import('firebase/firestore');
            await addDoc(collection(db, 'security_events'), {
              attemptId: currentAttempt?.id || resolvedAttemptId || targetExamId,
              studentUid: activeUid || 'anonymous',
              eventType: data.type || 'SECURITY_EVENT',
              timestamp: data.timestamp || new Date().toISOString(),
              details: JSON.stringify(data)
            });
          } catch (e) {
            console.warn('Failed to log security event:', e);
          }
        });
      }

      if (targetExamId && activeUid) {
        const attemptId = resolvedAttemptId || (isAdminTest ? `admin_test_${targetExamId}_${activeUid}` : `attempt_${targetExamId}_${activeUid}`);
        try {
          const aDoc = await getDoc(doc(db, 'attempts', attemptId));
          if (aDoc.exists()) {
            currentAttempt = { id: aDoc.id, ...aDoc.data() } as ExamAttempt;
            setAttempt(currentAttempt);
            if (currentAttempt.status === 'SUBMITTED') {
              setIsSubmitted(true);
              setFinalResult({ score: currentAttempt.score || 0, totalMarks: currentAttempt.totalMarks || 0 });
            }
          }
        } catch (e) {
          console.warn('Attempt fetch error:', e);
        }
      }

      if (targetExamId) {
        try {
          const examDoc = await getDoc(doc(db, 'exams', targetExamId));
          if (examDoc.exists()) {
            currentExam = { id: examDoc.id, ...examDoc.data() } as Exam;
            setExam(currentExam);

            const vId = currentExam.currentVersionId || 'v1';
            const vDoc = await getDoc(doc(db, `exams/${targetExamId}/versions`, vId));
            let totalDurationMinutes = currentExam.durationMinutes || 30;

            if (vDoc.exists()) {
              const vData = vDoc.data();
              if (vData.durationMinutes) {
                totalDurationMinutes = vData.durationMinutes;
              }
              const rawQuestions: Question[] = vData.questions || [];
              if (currentAttempt?.questionOrder && currentAttempt.questionOrder.length > 0) {
                const qMap = new Map<string, Question>(rawQuestions.map((q) => [q.id, q]));
                const ordered: Question[] = [];
                currentAttempt.questionOrder.forEach((qId) => {
                  const found = qMap.get(qId);
                  if (found) ordered.push(found);
                });
                // Append any unmapped questions just in case
                rawQuestions.forEach((q) => {
                  if (!currentAttempt?.questionOrder?.includes(q.id)) {
                    ordered.push(q);
                  }
                });
                setQuestions(ordered);
              } else {
                setQuestions(rawQuestions);
              }
            }

            // Calculate remaining seconds based on attempt startedAt
            const totalSecs = totalDurationMinutes * 60;
            if (currentAttempt?.startedAt) {
              const elapsedSecs = Math.floor((Date.now() - new Date(currentAttempt.startedAt).getTime()) / 1000);
              const remaining = Math.max(0, totalSecs - elapsedSecs);
              setTimeLeftSeconds(remaining);
            } else {
              setTimeLeftSeconds(totalSecs);
            }
          }
        } catch (e) {
          console.warn('Exam init error:', e);
        }
      }
    }
    initExam();
  }, [examId]);

  useEffect(() => {
    if (questions.length > 0) {
      const initialAnswers: Record<string, StudentAnswer> = {};
      questions.forEach((q) => {
        if (q.type === 'CODE_LINE_REORDERING') {
          const shuffled = attempt?.initialShuffledCodeLines?.[q.id] || [...q.codeLines].sort(() => Math.random() - 0.5);
          initialAnswers[q.id] = {
            questionId: q.id,
            answer: shuffled
          };
        }
      });
      setAnswers((prev) => ({ ...initialAnswers, ...prev }));
    }
  }, [questions, attempt]);

  useEffect(() => {
    if (isSubmitted) return;
    const interval = setInterval(() => {
      setTimeLeftSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleSubmitExam();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isSubmitted]);

  const currentQuestion = questions[currentIndex];

  const handleSelectMCQ = (questionId: string, optionIdx: number) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: {
        questionId,
        answer: optionIdx,
        submittedAt: new Date().toISOString()
      }
    }));
  };

  const handleToggleMSQ = (questionId: string, optionIdx: number) => {
    const currentAns = (answers[questionId]?.answer as number[]) || [];
    const newAns = currentAns.includes(optionIdx)
      ? currentAns.filter((i) => i !== optionIdx)
      : [...currentAns, optionIdx].sort();

    setAnswers((prev) => ({
      ...prev,
      [questionId]: {
        questionId,
        answer: newAns,
        submittedAt: new Date().toISOString()
      }
    }));
  };

  const handleReorderCodeLines = (questionId: string, newLines: string[]) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: {
        questionId,
        answer: newLines,
        submittedAt: new Date().toISOString()
      }
    }));
  };

  const calculateScore = () => {
    let score = 0;
    let totalMarks = 0;

    questions.forEach((q) => {
      const qMarks = q.marks || 1;
      totalMarks += qMarks;
      const studentAns = answers[q.id]?.answer;

      if (q.type === 'MCQ') {
        if (studentAns === q.correctAnswer) {
          score += qMarks;
        }
      } else if (q.type === 'MSQ') {
        const sortedStudent = Array.isArray(studentAns) ? [...studentAns].sort() : [];
        const sortedCorrect = [...q.correctAnswers].sort();
        if (
          sortedStudent.length === sortedCorrect.length &&
          sortedStudent.every((v, i) => v === sortedCorrect[i])
        ) {
          score += qMarks;
        }
      } else if (q.type === 'CODE_LINE_REORDERING') {
        const studentLines = Array.isArray(studentAns) ? studentAns : [];
        if (
          studentLines.length === q.codeLines.length &&
          studentLines.every((line, idx) => line === q.codeLines[idx])
        ) {
          score += qMarks;
        }
      }
    });

    return { score, totalMarks };
  };

  const handleSubmitExam = async () => {
    if (isSubmitted || submitting) return;

    if (!window.confirm('Are you sure you want to submit your examination now?')) {
      return;
    }

    setSubmitting(true);
    const { score, totalMarks } = calculateScore();

    try {
      const attemptId = attempt?.id || `attempt_${exam?.id}_${profile?.uid}`;
      const attemptRef = doc(db, 'attempts', attemptId);

      await updateDoc(attemptRef, {
        status: 'SUBMITTED',
        submittedAt: new Date().toISOString(),
        score,
        totalMarks,
        answers
      });

      setFinalResult({ score, totalMarks });
      setIsSubmitted(true);
      // Notify main process to close the secure exam window
      // @ts-ignore – electronAPI injected in Electron
      window.electronAPI.closeSecureExam();
    } catch (err) {
      console.warn('Attempt update warning:', err);
      setFinalResult({ score, totalMarks });
      setIsSubmitted(true);
      // Ensure the secure window is closed even on error
      // @ts-ignore
      window.electronAPI.closeSecureExam();
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (tokenError) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-slate-800 text-white p-8 rounded-2xl border border-slate-700 shadow-2xl max-w-md w-full text-center space-y-4">
          <div className="w-16 h-16 bg-red-500/10 text-red-400 rounded-full flex items-center justify-center mx-auto border border-red-500/20">
            ⚠️
          </div>
          <h2 className="text-xl font-bold text-white">Secure Launch Required</h2>
          <p className="text-xs text-red-400 font-semibold leading-relaxed">{tokenError}</p>
          <p className="text-xs text-slate-300 leading-relaxed">
            Please return to your browser portal (Chrome/Edge) and click "Start Exam" to launch your exam with a fresh token.
          </p>
          <Button
            variant="outline"
            className="w-full mt-2 text-slate-200 border-slate-600 hover:bg-slate-700"
            onClick={() => {
              // @ts-ignore
              if (typeof window !== 'undefined' && window.electronAPI?.closeSecureExam) {
                // @ts-ignore
                window.electronAPI.closeSecureExam();
              } else {
                navigate('/student');
              }
            }}
          >
            Close Kiosk Window
          </Button>
        </div>
      </div>
    );
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-md max-w-md w-full text-center space-y-4">
          <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto border border-emerald-200">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900">Examination Submitted</h2>
          <p className="text-sm text-slate-600">
            Your responses have been securely recorded into SARA EXAMS database.
          </p>

          {exam?.resultVisibility && finalResult && (
            <div className="p-4 bg-blue-50/80 rounded-xl border border-blue-200 my-4">
              <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider">Your Score</p>
              <h3 className="text-3xl font-black text-blue-900 mt-1">
                {finalResult.score} / {finalResult.totalMarks}
              </h3>
            </div>
          )}

          <Button
            variant="primary"
            onClick={() => {
              // @ts-ignore
              if (typeof window !== 'undefined' && window.electronAPI && typeof window.electronAPI.closeSecureExam === 'function') {
                // @ts-ignore
                window.electronAPI.closeSecureExam();
              } else {
                navigate(isAdminTest ? '/admin' : '/student');
              }
            }}
            className="w-full justify-center py-2.5"
          >
            {/* @ts-ignore */}
            {typeof window !== 'undefined' && window.electronAPI ? 'Close Kiosk Window' : 'Return to Dashboard'}
          </Button>
        </div>
      </div>
    );
  }

  if (!currentQuestion) {
    return <div className="p-8 text-center text-slate-500">Loading examination questions...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans select-none-exam">
      <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-30 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-base">
            S
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-900 leading-tight">SARA EXAMS — {exam?.name || 'Examination'}</h1>
            <p className="text-xs text-slate-500 font-mono font-medium">{exam?.qpCode}</p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className={`flex items-center gap-2 px-3 py-1.5 border rounded-lg font-mono text-sm font-bold ${
            timeLeftSeconds < 60
              ? 'bg-red-50 border-red-300 text-red-700 animate-bounce'
              : timeLeftSeconds < 300
              ? 'bg-amber-50 border-amber-300 text-amber-900'
              : 'bg-slate-100 border-slate-300 text-slate-800'
          }`}>
            <Clock className={`w-4 h-4 ${timeLeftSeconds < 60 ? 'text-red-600' : 'text-amber-600 animate-pulse'}`} />
            <span>{formatTime(timeLeftSeconds)}</span>
          </div>

          <Button
            variant="danger"
            size="sm"
            onClick={handleSubmitExam}
            isLoading={submitting}
            icon={<Send className="w-3.5 h-3.5" />}
          >
            Submit Exam
          </Button>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full p-6 space-y-6">
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-900">
                Question {currentIndex + 1} of {questions.length}
              </span>
              <QuestionTypeBadge type={currentQuestion.type} />
            </div>
            <span className="text-xs font-semibold text-slate-500">
              {currentQuestion.marks} Mark{currentQuestion.marks > 1 ? 's' : ''}
            </span>
          </div>

          <h2 className="text-base font-bold text-slate-900 leading-relaxed">
            {currentQuestion.questionText}
          </h2>

          <div className="pt-2">
            {currentQuestion.type === 'MCQ' && (
              <div className="space-y-2.5">
                {currentQuestion.options.map((opt, optIdx) => {
                  const isSelected = answers[currentQuestion.id]?.answer === optIdx;
                  return (
                    <button
                      key={optIdx}
                      type="button"
                      onClick={() => handleSelectMCQ(currentQuestion.id, optIdx)}
                      className={`w-full text-left p-3.5 rounded-xl border transition-all flex items-center gap-3 cursor-pointer ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50/70 text-blue-900 font-semibold shadow-2xs'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <span className={`w-6 h-6 rounded-full border flex items-center justify-center text-xs font-bold ${
                        isSelected ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300 text-slate-500'
                      }`}>
                        {String.fromCharCode(65 + optIdx)}
                      </span>
                      <span className="text-sm">{opt}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {currentQuestion.type === 'MSQ' && (
              <div className="space-y-2.5">
                {currentQuestion.options.map((opt, optIdx) => {
                  const selectedArr = (answers[currentQuestion.id]?.answer as number[]) || [];
                  const isSelected = selectedArr.includes(optIdx);
                  return (
                    <button
                      key={optIdx}
                      type="button"
                      onClick={() => handleToggleMSQ(currentQuestion.id, optIdx)}
                      className={`w-full text-left p-3.5 rounded-xl border transition-all flex items-center gap-3 cursor-pointer ${
                        isSelected
                          ? 'border-indigo-600 bg-indigo-50/70 text-indigo-900 font-semibold shadow-2xs'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <span className={`w-6 h-6 rounded-md border flex items-center justify-center text-xs font-bold ${
                        isSelected ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 text-slate-500'
                      }`}>
                        {isSelected ? '✓' : String.fromCharCode(65 + optIdx)}
                      </span>
                      <span className="text-sm">{opt}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {currentQuestion.type === 'CODE_LINE_REORDERING' && (
              <DraggableCodeLines
                lines={(answers[currentQuestion.id]?.answer as string[]) || currentQuestion.codeLines}
                onChange={(newLines) => handleReorderCodeLines(currentQuestion.id, newLines)}
              />
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-4">
          <Button
            variant="outline"
            disabled={currentIndex === 0}
            onClick={() => setCurrentIndex(currentIndex - 1)}
            icon={<ChevronLeft className="w-4 h-4" />}
          >
            Previous
          </Button>

          <div className="flex flex-wrap items-center justify-center gap-1.5">
            {questions.map((q, idx) => {
              const isAnswered = answers[q.id]?.answer !== undefined;
              const isCurrent = idx === currentIndex;
              return (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => setCurrentIndex(idx)}
                  className={`w-8 h-8 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    isCurrent
                      ? 'ring-2 ring-blue-600 bg-blue-600 text-white'
                      : isAnswered
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>

          <Button
            variant="primary"
            disabled={currentIndex === questions.length - 1}
            onClick={() => setCurrentIndex(currentIndex + 1)}
            className="gap-2"
          >
            <span>Save & Next</span>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </main>
    </div>
  );
};
