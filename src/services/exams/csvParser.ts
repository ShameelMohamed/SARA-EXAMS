import type { Question, MCQQuestion, MSQQuestion, CodeLineReorderingQuestion, QuestionType } from '../../types';

export interface CSVParseResult {
  questions: Question[];
  errors: string[];
  warnings: string[];
}

export function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

export function parseCSVContent(csvText: string): CSVParseResult {
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const questions: Question[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];

  if (lines.length === 0) {
    return { questions: [], errors: ['CSV file is empty.'], warnings: [] };
  }

  for (let i = 1; i < lines.length; i++) {
    const rawLine = lines[i];
    const columns = parseCSVLine(rawLine);

    if (columns.length < 2) continue;

    const questionId = `q_${i}_${Date.now()}`;
    const questionText = columns[0] || `Question ${i}`;
    const typeStr = (columns[1] || 'MCQ').toUpperCase();
    const marks = parseInt(columns[columns.length - 1], 10) || 1;

    let questionType: QuestionType = 'MCQ';
    if (typeStr.includes('MSQ')) questionType = 'MSQ';
    else if (typeStr.includes('CODE') || typeStr.includes('REORDER')) questionType = 'CODE_LINE_REORDERING';

    if (questionType === 'MCQ') {
      const options = columns.slice(2, -2).filter(Boolean);
      const correctStr = columns[columns.length - 2] || '0';
      const correctAnswer = parseInt(correctStr, 10) || 0;

      const mcq: MCQQuestion = {
        id: questionId,
        type: 'MCQ',
        questionText,
        options: options.length > 0 ? options : ['Option A', 'Option B', 'Option C', 'Option D'],
        correctAnswer: Math.max(0, Math.min(correctAnswer, (options.length || 4) - 1)),
        marks
      };
      questions.push(mcq);
    } else if (questionType === 'MSQ') {
      const options = columns.slice(2, -2).filter(Boolean);
      const correctStr = columns[columns.length - 2] || '0';
      const correctAnswers = correctStr
        .split(';')
        .map((s) => parseInt(s.trim(), 10))
        .filter((n) => !isNaN(n));

      const msq: MSQQuestion = {
        id: questionId,
        type: 'MSQ',
        questionText,
        options: options.length > 0 ? options : ['Option A', 'Option B', 'Option C', 'Option D'],
        correctAnswers: correctAnswers.length > 0 ? correctAnswers : [0],
        marks
      };
      questions.push(msq);
    } else if (questionType === 'CODE_LINE_REORDERING') {
      const codeLinesRaw = columns[2] || 'line 1|line 2|line 3';
      const codeLines = codeLinesRaw.split(/[|;]/).map((l) => l.trim()).filter(Boolean);

      const codeQ: CodeLineReorderingQuestion = {
        id: questionId,
        type: 'CODE_LINE_REORDERING',
        questionText,
        codeLines: codeLines.length > 0 ? codeLines : ['line A', 'line B', 'line C'],
        marks
      };
      questions.push(codeQ);
    }
  }

  return { questions, errors, warnings };
}

export function downloadCSVTemplate(): void {
  const templateHeader = `"Question Text","Type","Option 1 / Code Lines","Option 2","Option 3","Option 4","Correct Answer(s) Index","Marks"\n`;
  const sampleRows = [
    `"Which protocol is used for secure web communications?","MCQ","HTTP","HTTPS","FTP","SMTP","1","1"`,
    `"Select all object-oriented programming languages:","MSQ","Java","C++","C","Python","0;1;3","2"`,
    `"Arrange the Python function lines in correct order:","CODE_LINE_REORDERING","def calculate_total(prices):|    total = 0|    for p in prices:|        total += p|    return total","","","","","3"`
  ].join('\n');

  const csvData = templateHeader + sampleRows;
  const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', 'SARA_EXAMS_Questions_Template.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
