import React from 'react';
import { Badge } from './Badge';
import type { QuestionType } from '../../types';

export const QuestionTypeBadge: React.FC<{ type: QuestionType }> = ({ type }) => {
  switch (type) {
    case 'MCQ':
      return <Badge variant="blue">MCQ</Badge>;
    case 'MSQ':
      return <Badge variant="purple">MSQ</Badge>;
    case 'CODE_LINE_REORDERING':
      return <Badge variant="amber">Code Line Reorder</Badge>;
    default:
      return <Badge variant="slate">{type}</Badge>;
  }
};
