import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Play, Trash2, PlusCircle, AlertCircle, Download } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { collection, getDocs, query, orderBy, doc, deleteDoc, where } from 'firebase/firestore';
import { db } from '../../services/firebase/config';
import type { Exam } from '../../types';
import { ExamStatusBadge } from '../../components/ui/ExamStatusBadge';
import { downloadCSVTemplate } from '../../services/exams/csvParser';

export const AdminExamsPage: React.FC = () => {
  const navigate = useNavigate();
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [targetExamToDelete, setTargetExamToDelete] = useState<Exam | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchExams = async () => {
    try {
      setLoading(true);
      let snap;
      try {
        const q = query(collection(db, 'exams'), orderBy('createdAt', 'desc'));
        snap = await getDocs(q);
      } catch (_) {
        snap = await getDocs(collection(db, 'exams'));
      }
      const list: Exam[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() } as Exam));
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setExams(list);
    } catch (err) {
      console.warn('Could not load exams:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExams();
  }, []);

  const handleDeleteExam = async () => {
    if (!targetExamToDelete) return;
    const examId = targetExamToDelete.id;
    setDeletingId(examId);
    setErrorMsg(null);

    try {
      // 1. Delete versions subcollection
      try {
        const vSnap = await getDocs(collection(db, `exams/${examId}/versions`));
        for (const vDoc of vSnap.docs) {
          await deleteDoc(doc(db, `exams/${examId}/versions`, vDoc.id));
        }
      } catch (e) {
        console.warn('Error deleting versions:', e);
      }

      // 2. Delete draft subcollection
      try {
        await deleteDoc(doc(db, `exams/${examId}/draft`, 'questions'));
      } catch (e) {
        console.warn('Error deleting draft:', e);
      }

      // 3. Delete attempts associated with exam
      try {
        const aSnap = await getDocs(query(collection(db, 'attempts'), where('examId', '==', examId)));
        for (const aDoc of aSnap.docs) {
          await deleteDoc(doc(db, 'attempts', aDoc.id));
        }
      } catch (e) {
        console.warn('Error deleting attempts:', e);
      }

      // 4. Delete main exam doc
      await deleteDoc(doc(db, 'exams', examId));

      setTargetExamToDelete(null);
      await fetchExams();
    } catch (err: any) {
      console.error('Failed to delete exam:', err);
      setErrorMsg(err.message || 'Failed to delete examination and related data.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-600" />
          <h1 className="text-2xl font-bold text-slate-900">All Portal Examinations</h1>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={downloadCSVTemplate}
            className="bg-white border-blue-300 text-blue-800 hover:bg-blue-50 font-semibold"
            icon={<Download className="w-4 h-4 text-blue-600" />}
          >
            Download CSV Template
          </Button>
          <Button
            variant="primary"
            onClick={() => navigate('/admin/exams/new')}
            icon={<PlusCircle className="w-4 h-4" />}
          >
            Create Examination
          </Button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 bg-red-50 text-red-700 border border-red-200 rounded-xl text-sm font-medium flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Confirmation Modal */}
      {targetExamToDelete && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full border border-slate-200 shadow-xl space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center border border-red-100">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Delete Examination?</h3>
                <p className="text-xs text-slate-500 font-mono">{targetExamToDelete.qpCode}</p>
              </div>
            </div>

            <p className="text-sm text-slate-600 leading-relaxed">
              Are you sure you want to permanently delete <strong className="text-slate-800">{targetExamToDelete.name}</strong>?
              This will remove all versions, questions, draft data, and student attempts.
              <span className="block mt-2 font-bold text-red-700">This action cannot be undone.</span>
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setTargetExamToDelete(null)}
                disabled={deletingId !== null}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                isLoading={deletingId !== null}
                onClick={handleDeleteExam}
                icon={<Trash2 className="w-4 h-4" />}
              >
                Delete Permanently
              </Button>
            </div>
          </div>
        </div>
      )}

      <Card title={`All Created Examinations (${exams.length})`}>
        {loading ? (
          <div className="py-8 text-center text-sm text-slate-500">Loading examinations...</div>
        ) : exams.length === 0 ? (
          <div className="py-8 text-center text-sm text-slate-500">No examinations found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">QP Code</th>
                  <th className="py-3 px-4">Name</th>
                  <th className="py-3 px-4">Subject</th>
                  <th className="py-3 px-4">Created By</th>
                  <th className="py-3 px-4">Duration</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {exams.map((exam) => (
                  <tr key={exam.id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4 font-mono font-medium text-slate-800">{exam.qpCode}</td>
                    <td className="py-3 px-4 font-semibold text-slate-900">{exam.name}</td>
                    <td className="py-3 px-4 text-slate-600">{exam.subject}</td>
                    <td className="py-3 px-4 text-slate-600 text-xs">{exam.createdBy}</td>
                    <td className="py-3 px-4 text-slate-600">{exam.durationMinutes} mins</td>
                    <td className="py-3 px-4">
                      <ExamStatusBadge status={exam.status} />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          icon={<Play className="w-3.5 h-3.5 text-purple-600" />}
                          onClick={() => navigate(`/exam/${exam.id}?adminTest=true`)}
                        >
                          Attempt Test
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:bg-red-50"
                          onClick={() => setTargetExamToDelete(exam)}
                          icon={<Trash2 className="w-3.5 h-3.5" />}
                          title="Delete Examination"
                        >
                          Delete
                        </Button>
                      </div>
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
