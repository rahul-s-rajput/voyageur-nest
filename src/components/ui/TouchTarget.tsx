import React from 'react';
import { cn } from '../../lib/utils';

interface TouchTargetProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * TouchTarget ensures minimum 44px touch target for mobile accessibility
 * as per Apple and Google design guidelines
 */
export const TouchTarget: React.FC<TouchTargetProps> = ({ 
  children, 
  className, 
  size = 'md',
  ...props 
}) => {
  const sizeClasses = {
    sm: 'min-h-[40px] min-w-[40px]',
    md: 'min-h-[44px] min-w-[44px]', 
    lg: 'min-h-[48px] min-w-[48px]'
  };

  return (
    <div 
      className={cn(
        'flex items-center justify-center touch-manipulation',
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};
