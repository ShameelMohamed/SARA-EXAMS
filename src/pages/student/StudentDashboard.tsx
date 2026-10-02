import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { KeyRound, GraduationCap, AlertCircle, ArrowRight, ShieldCheck } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../features/auth/AuthContext';
import { getOrCreateExamAttempt } from '../../services/exams/attemptService';

export const StudentDashboard: React.FC = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();

  const [qpCode, setQpCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleValidateQP = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanCode = qpCode.trim().toUpperCase();
    if (!cleanCode) {
      setErrorMsg('Please enter a Question Paper (QP) Code.');
      return;
    }

    if (!profile) return;

    setLoading(true);
    const res = await getOrCreateExamAttempt(cleanCode, profile.uid, profile.email);
    setLoading(false);

    if (res.error) {
      setErrorMsg(res.error);
      return;
    }

    if (res.exam) {
      // Route to Exam Info Page
      navigate(`/student/exam-info`, {
        state: {
          exam: res.exam,
          attempt: res.attempt,
          questions: res.questions
        }
      });
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-2 border border-blue-100">
          <GraduationCap className="w-7 h-7" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900">Student Portal</h1>
        <p className="text-sm text-slate-500">
          Welcome, <span className="font-semibold text-slate-800">{profile?.displayName || profile?.email}</span>
        </p>
      </div>

      {/* QP Entry Card */}
      <Card title="Access College Examination">
        <form onSubmit={handleValidateQP} className="space-y-4">
          <Input
            label="Question Paper (QP) Code"
            placeholder="e.g. SARA-DBMS-2026-101"
            value={qpCode}
            onChange={(e) => setQpCode(e.target.value)}
            icon={<KeyRound className="w-4 h-4" />}
            autoFocus
            required
          />

          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs font-semibold text-red-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <Button
            type="submit"
            variant="primary"
            size="lg"
            isLoading={loading}
            icon={<ArrowRight className="w-4 h-4" />}
            className="w-full justify-center"
          >
            Continue to Examination
          </Button>
        </form>
      </Card>

      <div className="p-4 bg-white rounded-xl border border-slate-200 text-xs text-slate-500 space-y-2">
        <div className="flex items-center gap-2 font-semibold text-slate-700">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Important Examination Rules:</span>
        </div>
        <ul className="list-disc list-inside space-y-1 pl-1 text-slate-600">
          <li>Each examination can be attempted <strong>ONLY ONCE</strong> per student.</li>
          <li>Your attempt is created atomically when you click Start Exam.</li>
          <li>Secure examination mode will launch when starting the test.</li>
        </ul>
      </div>
    </div>
  );
};
