import React from 'react';

interface LoadingSpinnerProps {
  fullPage?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: 'h-6 w-6',
  md: 'h-12 w-12',
  lg: 'h-32 w-32',
};

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ fullPage = false, size = 'md' }) => {
  const spinner = (
    <div className={`animate-spin rounded-full border-b-2 border-orange-600 ${sizeClasses[size]}`} />
  );

  if (fullPage) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        {spinner}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center py-8">
      {spinner}
    </div>
  );
};

export default LoadingSpinner;
