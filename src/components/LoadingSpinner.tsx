import React from 'react';
import { cn } from '../lib/utils';

interface LoadingSpinnerProps {
  size?: number;
  className?: string;
  variant?: 'default' | 'primary' | 'secondary';
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 16, 
  className = '', 
  variant = 'default' 
}) => {
  const variants = {
    default: 'border-current border-t-transparent',
    primary: 'border-blue-200 border-t-blue-600',
    secondary: 'border-gray-200 border-t-gray-600'
  };

  const style: React.CSSProperties = {
    width: size,
    height: size
  };

  return (
    <span
      className={cn(
        'inline-block animate-spin rounded-full border-2',
        variants[variant],
        className
      )}
      style={style}
      aria-label="Loading"
      role="status"
    />
  );
};

export default LoadingSpinner;



