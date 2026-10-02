import React, { useEffect, useState } from 'react';
import { Award, Download } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../services/firebase/config';
import type { Exam, ExamAttempt } from '../../types';
import { generateMinimalPDF } from '../../services/reports/pdfGenerator';
import type { MinimalReportRow } from '../../services/reports/pdfGenerator';

export const AdminReportsPage: React.FC = () => {
  const [exams, setExams] = useState<Exam[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<string>('');
  const [attempts, setAttempts] = useState<ExamAttempt[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    async function loadExams() {
      try {
        const snap = await getDocs(collection(db, 'exams'));
        const list: Exam[] = [];
        snap.forEach((d) => list.push({ id: d.id, ...d.data() } as Exam));
        setExams(list);
        if (list.length > 0) {
          setSelectedExamId(list[0].id);
        }
      } catch (err) {
        console.warn('Error loading exams for report:', err);
      }
    }
    loadExams();
  }, []);

  useEffect(() => {
    if (!selectedExamId) return;

    async function loadAttempts() {
      setLoading(true);
      try {
        const q = query(
          collection(db, 'attempts'),
          where('examId', '==', selectedExamId),
          where('attemptType', '==', 'STUDENT')
        );
        const snap = await getDocs(q);
        const list: ExamAttempt[] = [];
        snap.forEach((d) => list.push({ id: d.id, ...d.data() } as ExamAttempt));
        setAttempts(list);
      } catch (err) {
        console.warn('Could not load attempts for exam:', err);
      } finally {
        setLoading(false);
      }
    }

    loadAttempts();
  }, [selectedExamId]);

  const selectedExam = exams.find((e) => e.id === selectedExamId);

  const reportRows: MinimalReportRow[] = attempts.map((a) => ({
    email: a.studentEmail,
    fullName: (a as any).studentDisplayName || a.studentEmail.split('@')[0],
    mark: a.score ?? 0
  }));

  const handleDownloadPDF = () => {
    if (!selectedExam) return;
    const dateStr = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    generateMinimalPDF(selectedExam.name, selectedExam.qpCode, dateStr, reportRows);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-emerald-600" />
            <h1 className="text-2xl font-bold text-slate-900">Examination Reports</h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Student marks report (Full Name, Mail ID & Mark). Admin tests strictly excluded.
          </p>
        </div>

        {selectedExam && reportRows.length > 0 && (
          <Button
            variant="success"
            icon={<Download className="w-4 h-4" />}
            onClick={handleDownloadPDF}
          >
            Download PDF Report
          </Button>
        )}
      </div>

      <Card title="Select Examination">
        <div className="max-w-md">
          <Select
            label="Select Published Examination"
            value={selectedExamId}
            onChange={(e) => setSelectedExamId(e.target.value)}
            options={exams.map((e) => ({
              value: e.id,
              label: `${e.qpCode} — ${e.name} (${e.subject})`
            }))}
          />
        </div>
      </Card>

      <Card
        title={
          <div>
            <div className="text-sm font-normal text-slate-500">Date: {new Date().toLocaleDateString()}</div>
            <div className="text-base font-bold text-slate-900 mt-1">
              {selectedExam ? `${selectedExam.name} (${selectedExam.qpCode})` : 'Examination Report'}
            </div>
          </div>
        }
      >
        {loading ? (
          <div className="py-8 text-center text-sm text-slate-500">Loading student scores...</div>
        ) : reportRows.length === 0 ? (
          <div className="py-8 text-center text-sm text-slate-500">
            No student submissions found for this examination yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse border border-slate-200">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200 text-xs font-bold text-slate-800 uppercase tracking-wider">
                  <th className="py-3 px-6 border-r border-slate-200">Full Name</th>
                  <th className="py-3 px-6 border-r border-slate-200">Mail ID</th>
                  <th className="py-3 px-6">Mark</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {reportRows.map((row) => (
                  <tr key={row.email} className="hover:bg-slate-50">
                    <td className="py-3 px-6 border-r border-slate-200 font-semibold text-slate-900">{row.fullName}</td>
                    <td className="py-3 px-6 border-r border-slate-200 text-slate-700 font-mono">{row.email}</td>
                    <td className="py-3 px-6 font-bold text-blue-700 font-mono">{row.mark}</td>
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
