import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Users, FileText, Award, UserPlus, Play, PlusCircle } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../features/auth/AuthContext';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../../services/firebase/config';
import type { Exam } from '../../types';
import { ExamStatusBadge } from '../../components/ui/ExamStatusBadge';

export const AdminDashboard: React.FC = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();

  const [teacherCount, setTeacherCount] = useState<number>(0);
  const [recentExams, setRecentExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadStats() {
      try {
        setLoading(true);
        const teacherSnap = await getDocs(collection(db, 'teachers'));
        setTeacherCount(teacherSnap.size);

        const examsQuery = query(collection(db, 'exams'), orderBy('createdAt', 'desc'), limit(5));
        const examSnap = await getDocs(examsQuery);
        const examsData: Exam[] = [];
        examSnap.forEach((doc) => {
          examsData.push({ id: doc.id, ...doc.data() } as Exam);
        });
        setRecentExams(examsData);
      } catch (err) {
        console.warn('Firestore load stats warning:', err);
      } finally {
        setLoading(false);
      }
    }

    loadStats();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-purple-600" />
            <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Welcome back, {profile?.displayName || profile?.email}. Manage teachers, examinations, and institution reports.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => navigate('/admin/teachers')}
            icon={<UserPlus className="w-4 h-4" />}
          >
            Manage Roles
          </Button>
          <Button
            variant="primary"
            onClick={() => navigate('/admin/exams/new')}
            icon={<PlusCircle className="w-4 h-4" />}
          >
            + Create Exam
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <Card padding="md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Authorized Teachers</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">{loading ? '...' : teacherCount}</h3>
            </div>
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
              <Users className="w-6 h-6" />
            </div>
          </div>
        </Card>

        <Card padding="md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Examinations</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">{loading ? '...' : recentExams.length}</h3>
            </div>
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
              <FileText className="w-6 h-6" />
            </div>
          </div>
        </Card>

        <Card padding="md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Reports & Analytics</p>
              <h3 className="text-sm font-semibold text-blue-600 mt-2 hover:underline cursor-pointer" onClick={() => navigate('/admin/reports')}>
                View Minimal Reports →
              </h3>
            </div>
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
              <Award className="w-6 h-6" />
            </div>
          </div>
        </Card>
      </div>

      <Card title="Recent Examinations Portal-Wide" action={
        <Button variant="ghost" size="sm" onClick={() => navigate('/admin/exams')}>
          View All Exams
        </Button>
      }>
        {recentExams.length === 0 ? (
          <div className="py-8 text-center text-sm text-slate-500">
            No examinations published yet.
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
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {recentExams.map((exam) => (
                  <tr key={exam.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 px-4 font-mono font-medium text-slate-800">{exam.qpCode}</td>
                    <td className="py-3 px-4 font-semibold text-slate-900">{exam.name}</td>
                    <td className="py-3 px-4 text-slate-600">{exam.subject}</td>
                    <td className="py-3 px-4 text-slate-600">{exam.durationMinutes} mins</td>
                    <td className="py-3 px-4">
                      <ExamStatusBadge status={exam.status} />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        icon={<Play className="w-3.5 h-3.5 text-purple-600" />}
                        onClick={() => navigate(`/exam/${exam.id}?adminTest=true`)}
                      >
                        Admin Test
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
