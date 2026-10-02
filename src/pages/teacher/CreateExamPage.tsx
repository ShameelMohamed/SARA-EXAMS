import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, Plus, Trash2, Save, CheckCircle, Check, Download } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { QuestionTypeBadge } from '../../components/ui/QuestionTypeBadge';
import { parseCSVContent, downloadCSVTemplate } from '../../services/exams/csvParser';
import { validateQuestions } from '../../services/exams/csvValidator';
import type { Question, MCQQuestion, MSQQuestion, CodeLineReorderingQuestion } from '../../types';
import { useAuth } from '../../features/auth/AuthContext';
import { doc, setDoc, collection } from 'firebase/firestore';
import { db } from '../../services/firebase/config';

export const CreateExamPage: React.FC = () => {
  const navigate = useNavigate();
  console.log('CreateExamPage mounted');
  const { profile } = useAuth();

  const [qpName, setQpName] = useState('');
  const [subject, setSubject] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [availableFrom, setAvailableFrom] = useState('');
  const [resultVisibility, setResultVisibility] = useState<boolean>(true);

  const [examDate, setExamDate] = useState('');

  const [questions, setQuestions] = useState<Question[]>([]);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleDownloadCSVTemplate = () => {
    downloadCSVTemplate();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const { questions: parsed } = parseCSVContent(content);
        setQuestions(parsed);
      }
    };
    reader.readAsText(file);
  };

  const addSampleMCQ = () => {
    const newQ: MCQQuestion = {
      id: `q_${Date.now()}`,
      type: 'MCQ',
      questionText: 'Which protocol is used for secure web communications?',
      options: ['HTTP', 'HTTPS', 'FTP', 'SMTP'],
      correctAnswer: 1,
      marks: 1
    };
    setQuestions([...questions, newQ]);
  };

  const addSampleMSQ = () => {
    const newQ: MSQQuestion = {
      id: `q_${Date.now()}`,
      type: 'MSQ',
      questionText: 'Select all object-oriented programming languages:',
      options: ['Java', 'C++', 'C', 'Python'],
      correctAnswers: [0, 1, 3],
      marks: 2
    };
    setQuestions([...questions, newQ]);
  };

  const addSampleCodeReorder = () => {
    const newQ: CodeLineReorderingQuestion = {
      id: `q_${Date.now()}`,
      type: 'CODE_LINE_REORDERING',
      questionText: 'Arrange the Python function lines in correct order:',
      codeLines: [
        'def calculate_total(prices):',
        '    total = 0',
        '    for p in prices:',
        '        total += p',
        '    return total'
      ],
      marks: 3
    };
    setQuestions([...questions, newQ]);
  };

  const handleDeleteQuestion = (id: string) => {
    setQuestions(questions.filter((q) => q.id !== id));
  };

  const generateQPCode = () => {
    const subjCode = (subject || 'EXAM').replaceAll(/\s+/g, '').toUpperCase().substring(0, 4);
    const randNum = Math.floor(100 + Math.random() * 900);
    return `SARA-${subjCode}-2026-${randNum}`;
  };

  const handleSaveExam = async (status: 'DRAFT' | 'PUBLISHED') => {
    // Validate required fields
    if (!qpName || !subject || !examDate) {
      setErrorMsg('Please fill all required exam details (name, subject, date).');
      return;
    }
    if (questions.length === 0) {
      setErrorMsg('Please upload a CSV or add at least one question.');
      return;
    }
    const issues = validateQuestions(questions);
    if (issues.some((i) => i.severity === 'error')) {
      setErrorMsg('Please fix question validation errors before saving.');
      return;
    }

    setSaving(true);
    setErrorMsg(null);

    try {
      const examId = doc(collection(db, 'exams')).id;
      const qpCode = generateQPCode();
      const now = new Date().toISOString();

      const totalMarks = questions.reduce((sum, q) => sum + (q.marks || 1), 0);

      const examPayload: Record<string, any> = {
        id: examId,
        qpCode,
        name: qpName,
        subject,
        durationMinutes,
        createdBy: (profile?.email || 'TEACHER').trim().toLowerCase(),
        status,
        examDate,
        resultVisibility,
        createdAt: now,
        totalQuestions: questions.length,
        totalMarks,
      };

      if (status === 'PUBLISHED') {
        examPayload.publishedAt = now;
      }

      const versionId = `v1_${Date.now()}`;
      if (status === 'PUBLISHED') {
        examPayload.currentVersionId = versionId;
        const versionRef = doc(db, `exams/${examId}/versions`, versionId);
        await setDoc(versionRef, {
          id: versionId,
          examId,
          version: 1,
          questions,
          durationMinutes,
          createdAt: now,
          publishedAt: now,
          immutable: true,
        });
      }

      await setDoc(doc(db, 'exams', examId), examPayload);

      const draftRef = doc(db, `exams/${examId}/draft`, 'questions');
      await setDoc(draftRef, { questions });

      navigate('/teacher');
    } catch (err: any) {
      console.error('Error saving exam:', err);
      setErrorMsg(err.message || 'Failed to save examination to Firestore.');
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Create New Examination</h1>
        <p className="text-sm text-slate-500 mt-1">
          Configure exam details, import CSV questions, review, and save as draft or publish.
        </p>
      </div>

      {errorMsg && (
        <div className="p-4 bg-red-50 text-red-700 border border-red-200 rounded-xl text-sm font-medium">
          {errorMsg}
        </div>
      )}

      <Card title="1. Examination Details">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Question Paper (QP) Name"
            placeholder="e.g. DBMS Midterm Exam 2026"
            value={qpName}
            onChange={(e) => setQpName(e.target.value)}
            required
          />
          <Input
            label="Subject / Course"
            placeholder="e.g. Database Management Systems"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            required
          />
          <Input
            label="Duration (Minutes)"
            type="number"
            value={durationMinutes}
            onChange={(e) => setDurationMinutes(parseInt(e.target.value, 10) || 30)}
            required
          />
          <Select
            label="Student Result Visibility After Submission"
            value={resultVisibility ? 'YES' : 'NO'}
            onChange={(e) => setResultVisibility(e.target.value === 'YES')}
            options={[
              { value: 'YES', label: 'Allow students to view mark immediately after submission' },
              { value: 'NO', label: 'Hide mark from students (save to DB only)' }
            ]}
          />
        </div>

        <div className="mt-6 pt-4 border-t border-slate-100">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Student Daily Availability Window</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Available From (Daily Start Time)"
              type="time"
              value={availableFrom}
              onChange={(e) => setAvailableFrom(e.target.value)}
              required
            />
          <Input
            label="Exam Date"
            type="date"
            value={examDate}
            onChange={(e) => setExamDate(e.target.value)}
            required
          />
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Students will be allowed to start this examination only during this daily window.
          </p>
        </div>
      </Card>

      <Card title="2. Import Questions via CSV">
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-blue-50/70 border border-blue-200 rounded-xl">
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-blue-900 flex items-center gap-2">
                <Download className="w-4 h-4 text-blue-600" /> Need a CSV Question Template?
              </h4>
              <p className="text-xs text-blue-700">
                Download our sample template with pre-configured headers for MCQ, MSQ, and Code Line Reordering questions.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadCSVTemplate}
              className="shrink-0 bg-white border-blue-300 text-blue-800 hover:bg-blue-100/50 font-semibold"
              icon={<Download className="w-4 h-4 text-blue-600" />}
            >
              Download Template (.CSV)
            </Button>
          </div>

          <div className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-xl p-6 text-center transition-colors bg-slate-50/50">
            <Upload className="w-8 h-8 text-blue-600 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-800">Upload CSV Question File</p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
              Questions are parsed locally and verified immediately. CSV files are not stored on external servers.
            </p>
            <input
              type="file"
              accept=".csv"
              id="csv-file-input"
              className="hidden"
              onChange={handleFileUpload}
            />
            <label htmlFor="csv-file-input">
              <span className="inline-flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer shadow-2xs transition-all">
                <Upload className="w-4 h-4 text-slate-600" />
                Select & Import CSV File
              </span>
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
            <span className="text-xs font-semibold text-slate-500">Quick Test Manual Questions:</span>
            <Button variant="ghost" size="sm" onClick={addSampleMCQ} icon={<Plus className="w-3.5 h-3.5" />}>
              + Sample MCQ
            </Button>
            <Button variant="ghost" size="sm" onClick={addSampleMSQ} icon={<Plus className="w-3.5 h-3.5" />}>
              + Sample MSQ
            </Button>
            <Button variant="ghost" size="sm" onClick={addSampleCodeReorder} icon={<Plus className="w-3.5 h-3.5" />}>
              + Sample Code Reorder
            </Button>
          </div>
        </div>
      </Card>

      <Card title={`3. Question Review (${questions.length} Questions)`}>
        {questions.length === 0 ? (
          <div className="py-8 text-center text-sm text-slate-500">
            No questions imported yet. Upload a CSV file above.
          </div>
        ) : (
          <div className="space-y-4 divide-y divide-slate-100">
            {questions.map((q, idx) => (
              <div key={q.id} className="pt-4 first:pt-0">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-800">#{idx + 1}</span>
                      <QuestionTypeBadge type={q.type} />
                      <span className="text-xs font-medium text-slate-500">({q.marks} Mark{q.marks > 1 ? 's' : ''})</span>
                    </div>
                    <p className="text-sm font-semibold text-slate-900 mt-1">{q.questionText}</p>

                    {q.type === 'MCQ' && (
                      <div className="mt-2 space-y-1 text-xs text-slate-600 pl-3 border-l-2 border-blue-200">
                        {q.options.map((opt, optIdx) => (
                          <div
                            key={optIdx}
                            className={`flex items-center gap-2 ${
                              optIdx === q.correctAnswer ? 'font-bold text-blue-700' : ''
                            }`}
                          >
                            <span>{String.fromCharCode(65 + optIdx)}.</span>
                            <span>{opt}</span>
                            {optIdx === q.correctAnswer && <Check className="w-3.5 h-3.5 text-blue-600" />}
                          </div>
                        ))}
                      </div>
                    )}

                    {q.type === 'MSQ' && (
                      <div className="mt-2 space-y-1 text-xs text-slate-600 pl-3 border-l-2 border-indigo-200">
                        {q.options.map((opt, optIdx) => (
                          <div
                            key={optIdx}
                            className={`flex items-center gap-2 ${
                              q.correctAnswers.includes(optIdx) ? 'font-bold text-indigo-700' : ''
                            }`}
                          >
                            <span>{String.fromCharCode(65 + optIdx)}.</span>
                            <span>{opt}</span>
                            {q.correctAnswers.includes(optIdx) && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                          </div>
                        ))}
                      </div>
                    )}

                    {q.type === 'CODE_LINE_REORDERING' && (
                      <div className="mt-2 space-y-1 font-mono text-xs text-slate-800 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                        <div className="text-[11px] font-sans text-slate-500 font-semibold mb-1">
                          Stored Correct Line Order ({q.codeLines.length} lines):
                        </div>
                        {q.codeLines.map((line, lineIdx) => (
                          <div key={lineIdx} className="flex items-center gap-2 text-slate-700">
                            <span className="text-slate-400 select-none">{lineIdx + 1}.</span>
                            <span>{line}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteQuestion(q.id)}
                      icon={<Trash2 className="w-4 h-4 text-red-500" />}
                      title="Delete Question"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="flex items-center justify-between pt-4 border-t border-slate-200">
        <Button variant="outline" onClick={() => navigate('/teacher')}>
          Cancel
        </Button>

        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            isLoading={saving}
            onClick={() => handleSaveExam('DRAFT')}
            icon={<Save className="w-4 h-4" />}
          >
            Save Draft
          </Button>

          <Button
            variant="primary"
            isLoading={saving}
            onClick={() => handleSaveExam('PUBLISHED')}
            icon={<CheckCircle className="w-4 h-4" />}
          >
            Publish Exam
          </Button>
        </div>
      </div>
    </div>
  );
};
