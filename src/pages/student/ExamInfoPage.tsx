import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ShieldAlert, Play, ArrowLeft, Clock, FileText, CheckCircle2 } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import type { Exam, ExamAttempt, Question } from '../../types';

export const ExamInfoPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const state = location.state as {
    exam: Exam;
    attempt: ExamAttempt;
    questions: Question[];
  } | null;

  if (!state || !state.exam) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-600">No examination selected.</p>
        <Button variant="outline" onClick={() => navigate('/student')} className="mt-4">
          Return to Dashboard
        </Button>
      </div>
    );
  }

  const { exam, attempt, questions } = state;

  const isDateAvailable = () => {
    const examDate = (exam as any).examDate;
    if (!examDate) return true;
    const today = new Date().toISOString().split('T')[0];
    return today === examDate;
  };

  const available = isDateAvailable();
  const [loadingLaunch, setLoadingLaunch] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleStartExam = async () => {
    if (!available || loadingLaunch) return;
    setErrorMessage(null);
    setLoadingLaunch(true);

    try {
      // 1. Generate short-lived launch token
      const { createLaunchToken } = await import('../../services/exams/tokenService');
      const token = await createLaunchToken(attempt.id, attempt.studentUid, exam.id);

      // 2. Build deep-link URL: saraexam://start?examId=...&attemptId=...&token=...&domain=...
      const currentOrigin = window.location.origin;
      const protocolUrl = `saraexam://start?examId=${encodeURIComponent(exam.id)}&attemptId=${encodeURIComponent(attempt.id)}&token=${encodeURIComponent(token)}&domain=${encodeURIComponent(currentOrigin)}`;

      // 3. Launch secure application via deep-link protocol
      window.location.href = protocolUrl;

      // 4. In case dev mode without custom protocol registered, check window.electronAPI fallback
      // @ts-ignore
      if (window.electronAPI && typeof window.electronAPI.openSecureExam === 'function') {
        const devUrl = import.meta.env.VITE_DEV_SERVER_URL || window.location.origin;
        window.electronAPI.openSecureExam(`${devUrl}/exam/${exam.id}?token=${token}`);
      }
    } catch (err: any) {
      console.error('Launch failed:', err);
      setErrorMessage('Failed to generate launch token. Please try again.');
    } finally {
      setLoadingLaunch(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate('/student')}
        icon={<ArrowLeft className="w-4 h-4" />}
      >
        Back to Code Entry
      </Button>

      <Card title="Examination Information">
        <div className="space-y-6">
          <div>
            <span className="text-xs font-mono font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200">
              {exam.qpCode}
            </span>
            <h2 className="text-2xl font-bold text-slate-900 mt-2">{exam.name}</h2>
            <p className="text-sm text-slate-500 font-medium">{exam.subject}</p>
          </div>

          <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-blue-600 shrink-0" />
              <div>
                <p className="text-xs text-slate-500 font-semibold uppercase">Duration</p>
                <p className="text-base font-bold text-slate-900">{exam.durationMinutes} Minutes</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-indigo-600 shrink-0" />
              <div>
                <p className="text-xs text-slate-500 font-semibold uppercase">Total Questions</p>
                <p className="text-base font-bold text-slate-900">{questions?.length || exam.totalQuestions || 0}</p>
              </div>
            </div>
          </div>

          {exam.availableFrom && exam.availableUntil && (
            <div className={`p-3 rounded-xl border text-xs font-medium ${available ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-amber-50 text-amber-800 border-amber-200'}`}>
              <strong>Daily Availability Window:</strong> {exam.availableFrom} – {exam.availableUntil}
              {!available && <p className="mt-1 text-red-600 font-semibold">The exam is currently closed. You can only start between {exam.availableFrom} and {exam.availableUntil}.</p>}
            </div>
          )}

          <div className="space-y-2 text-xs text-slate-600 border-t border-slate-100 pt-4">
            <h4 className="font-semibold text-slate-800 text-sm">Instructions:</h4>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>Ensure a stable internet connection during submission.</span>
            </div>
            <div className="flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>Secure exam mode will launch. Window focus loses and copy/paste attempts are logged.</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>Answers are automatically recorded as you progress.</span>
            </div>
          </div>

          <Button
            variant="primary"
            size="lg"
            disabled={!available}
            isLoading={loadingLaunch}
            onClick={handleStartExam}
            icon={<Play className="w-5 h-5" />}
            className="w-full justify-center py-3.5 text-base font-bold shadow-md bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
          >
            {available ? 'START EXAM NOW' : 'EXAM NOT AVAILABLE AT THIS TIME'}
          </Button>

          <div className="text-center text-xs text-slate-500 mt-4 space-y-1">
            <p>Requires <strong>SARA EXAMS Secure Browser</strong> installed.</p>
            <p>
              Not installed?{' '}
              <a 
                href="https://drive.google.com/file/d/1bJPPYapgKQMkPE8634ga-GXzO-1LTxF1/view?usp=sharing"
                target="_blank"
                rel="noreferrer"
                className="text-blue-600 hover:underline font-bold"
              >
                Download Updated Installer (.exe)
              </a>
            </p>
          </div>
{errorMessage && (
  <div className="mt-4 p-2 bg-red-50 text-red-800 border border-red-200 rounded">
    {errorMessage}
  </div>
)}
        </div>
      </Card>
    </div>
  );
};
