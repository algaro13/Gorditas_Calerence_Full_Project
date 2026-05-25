import React from 'react';
import { AlertCircle } from 'lucide-react';

interface ErrorMessageProps {
  message: string;
  onRetry?: () => void;
}

const ErrorMessage: React.FC<ErrorMessageProps> = ({ message, onRetry }) => {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <AlertCircle className="w-12 h-12 text-red-500 mb-3" />
      <p className="text-gray-700 mb-4">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm font-medium"
        >
          Reintentar
        </button>
      )}
    </div>
  );
};

export default ErrorMessage;
