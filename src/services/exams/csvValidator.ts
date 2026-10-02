import type { Question } from '../../types';

export interface ValidationIssue {
  questionIndex: number;
  message: string;
  severity: 'error' | 'warning';
}

export function validateQuestions(questions: Question[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!questions || questions.length === 0) {
    issues.push({
      questionIndex: -1,
      message: 'Examination must contain at least 1 question.',
      severity: 'error'
    });
    return issues;
  }

  questions.forEach((q, idx) => {
    if (!q.questionText || q.questionText.trim().length === 0) {
      issues.push({
        questionIndex: idx,
        message: `Question #${idx + 1} text is empty.`,
        severity: 'error'
      });
    }

    if (q.type === 'MCQ') {
      if (!q.options || q.options.length < 2) {
        issues.push({
          questionIndex: idx,
          message: `MCQ #${idx + 1} must have at least 2 options.`,
          severity: 'error'
        });
      }
      if (q.correctAnswer < 0 || q.correctAnswer >= q.options.length) {
        issues.push({
          questionIndex: idx,
          message: `MCQ #${idx + 1} correct answer index is out of bounds.`,
          severity: 'error'
        });
      }
    } else if (q.type === 'MSQ') {
      if (!q.options || q.options.length < 2) {
        issues.push({
          questionIndex: idx,
          message: `MSQ #${idx + 1} must have at least 2 options.`,
          severity: 'error'
        });
      }
      if (!q.correctAnswers || q.correctAnswers.length === 0) {
        issues.push({
          questionIndex: idx,
          message: `MSQ #${idx + 1} must have at least 1 correct answer selected.`,
          severity: 'error'
        });
      }
    } else if (q.type === 'CODE_LINE_REORDERING') {
      if (!q.codeLines || q.codeLines.length < 2) {
        issues.push({
          questionIndex: idx,
          message: `Code Line Reordering #${idx + 1} must have at least 2 code lines.`,
          severity: 'error'
        });
      }
    }
  });

  return issues;
}
