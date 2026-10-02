import React from 'react';
import { Badge } from './Badge';
import type { ExamStatus } from '../../types';

export const ExamStatusBadge: React.FC<{ status: ExamStatus }> = ({ status }) => {
  switch (status) {
    case 'DRAFT':
      return <Badge variant="slate">Draft</Badge>;
    case 'PUBLISHED':
      return <Badge variant="blue">Published</Badge>;
    case 'CLOSED':
      return <Badge variant="amber">Closed</Badge>;
    case 'COMPLETED':
      return <Badge variant="green">Completed</Badge>;
    default:
      return <Badge variant="slate">{status}</Badge>;
  }
};
