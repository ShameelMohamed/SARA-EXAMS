import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from './Button';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Something went wrong',
  message = 'Unable to load your examinations. Please try again.',
  onRetry
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 bg-red-50/50 rounded-xl border border-red-200 text-center">
      <div className="p-3 bg-red-100 rounded-full text-red-600 mb-3">
        <AlertTriangle className="w-6 h-6" />
      </div>
      <h3 className="text-base font-semibold text-red-900">{title}</h3>
      <p className="text-sm text-red-600 max-w-md mt-1 mb-4">{message}</p>
      {onRetry && (
        <Button onClick={onRetry} variant="outline" size="sm" className="border-red-200 text-red-700 hover:bg-red-100">
          Try Again
        </Button>
      )}
    </div>
  );
};
