import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlusCircle, BookOpen, FileText, CheckCircle, Clock, Download } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { ExamStatusBadge } from '../../components/ui/ExamStatusBadge';
import { useAuth } from '../../features/auth/AuthContext';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '../../services/firebase/config';
import type { Exam } from '../../types';
import { downloadCSVTemplate } from '../../services/exams/csvParser';

export const TeacherDashboard: React.FC = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();

  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadTeacherExams() {
      if (!profile?.email) return;
      try {
        setLoading(true);
        const cleanEmail = profile.email.trim().toLowerCase();
        let snap;
        try {
          const q = query(
            collection(db, 'exams'),
            where('createdBy', '==', cleanEmail),
            orderBy('createdAt', 'desc')
          );
          snap = await getDocs(q);
        } catch (idxErr) {
          console.warn('Index error fallback:', idxErr);
          const qFallback = query(
            collection(db, 'exams'),
            where('createdBy', '==', cleanEmail)
          );
          snap = await getDocs(qFallback);
        }

        const list: Exam[] = [];
        snap.forEach((d) => list.push({ id: d.id, ...d.data() } as Exam));

        // Ensure descending sort if fallback was used
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        setExams(list);
      } catch (err) {
        console.warn('Could not load teacher exams:', err);
      } finally {
        setLoading(false);
      }
    }

    loadTeacherExams();
  }, [profile]);

  const totalExams = exams.length;
  const draftExams = exams.filter((e) => e.status === 'DRAFT').length;
  const publishedExams = exams.filter((e) => e.status === 'PUBLISHED').length;
  const completedExams = exams.filter((e) => e.status === 'COMPLETED' || e.status === 'CLOSED').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-600" />
            <h1 className="text-2xl font-bold text-slate-900">Teacher Dashboard</h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Welcome, {profile?.displayName || profile?.email}. Create, preview, and publish your college examinations.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="md"
            onClick={downloadCSVTemplate}
            className="bg-white border-blue-300 text-blue-800 hover:bg-blue-50 font-semibold"
            icon={<Download className="w-4 h-4 text-blue-600" />}
          >
            Download CSV Template
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={() => navigate('/teacher/exams/new')}
            icon={<PlusCircle className="w-4 h-4" />}
          >
            Create Examination
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card padding="sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Exams</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">{loading ? '...' : totalExams}</h3>
            </div>
            <div className="p-2.5 bg-slate-100 text-slate-600 rounded-lg">
              <FileText className="w-5 h-5" />
            </div>
          </div>
        </Card>

        <Card padding="sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Draft Exams</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">{loading ? '...' : draftExams}</h3>
            </div>
            <div className="p-2.5 bg-amber-50 text-amber-600 rounded-lg">
              <Clock className="w-5 h-5" />
            </div>
          </div>
        </Card>

        <Card padding="sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Published</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">{loading ? '...' : publishedExams}</h3>
            </div>
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg">
              <BookOpen className="w-5 h-5" />
            </div>
          </div>
        </Card>

        <Card padding="sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Completed</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">{loading ? '...' : completedExams}</h3>
            </div>
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg">
              <CheckCircle className="w-5 h-5" />
            </div>
          </div>
        </Card>
      </div>

      <Card title="Recent Examinations">
        {loading ? (
          <div className="py-8 text-center text-sm text-slate-500">Loading examinations...</div>
        ) : exams.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-base font-semibold text-slate-700">No examinations created yet</p>
            <p className="text-xs text-slate-500 mt-1 mb-4">Click below to create your first examination with CSV import.</p>
            <Button variant="primary" onClick={() => navigate('/teacher/exams/new')} icon={<PlusCircle className="w-4 h-4" />}>
              Create Examination
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">QP Code</th>
                  <th className="py-3 px-4">QP Name</th>
                  <th className="py-3 px-4">Subject</th>
                  <th className="py-3 px-4">Duration</th>
                  <th className="py-3 px-4">Questions</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Created Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {exams.map((exam) => (
                  <tr key={exam.id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4 font-mono font-semibold text-slate-800">{exam.qpCode}</td>
                    <td className="py-3 px-4 font-semibold text-slate-900">{exam.name}</td>
                    <td className="py-3 px-4 text-slate-600">{exam.subject}</td>
                    <td className="py-3 px-4 text-slate-600">{exam.durationMinutes} mins</td>
                    <td className="py-3 px-4 text-slate-600">{exam.totalQuestions ?? 0}</td>
                    <td className="py-3 px-4">
                      <ExamStatusBadge status={exam.status} />
                    </td>
                    <td className="py-3 px-4 text-slate-500 text-xs">
                      {new Date(exam.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/teacher/exams/${exam.id}`)}
                      >
                        Manage
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};
