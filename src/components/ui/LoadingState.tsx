import React from 'react';
import { Loader2 } from 'lucide-react';

export const LoadingState: React.FC<{ message?: string }> = ({ message = 'Loading SARA EXAMS portal...' }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[300px] p-8 text-slate-500">
      <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-3" />
      <p className="text-sm font-medium text-slate-600">{message}</p>
    </div>
  );
};
