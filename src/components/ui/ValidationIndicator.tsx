import React from 'react';
import { AlertCircle, CheckCircle, AlertTriangle, Info } from 'lucide-react';
import { Badge } from './Badge';
import { cn } from '../../lib/utils';
import type { ValidationResult } from '../../utils/expenseValidation';

interface ValidationIndicatorProps {
  validation: ValidationResult;
  className?: string;
  showDetails?: boolean;
  inline?: boolean;
}

interface ValidationStatusProps {
  hasErrors: boolean;
  hasWarnings: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

interface ValidationMessageProps {
  validation: ValidationResult;
  maxMessages?: number;
  className?: string;
}

export const ValidationStatus: React.FC<ValidationStatusProps> = ({
  hasErrors,
  hasWarnings,
  className = '',
  size = 'md'
}) => {
  const sizeClasses = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5'
  };

  if (hasErrors) {
    return (
      <div className={cn('flex items-center gap-1 text-red-600', className)}>
        <AlertCircle className={sizeClasses[size]} />
        {size !== 'sm' && <span className="text-xs font-medium">Errors</span>}
      </div>
    );
  }

  if (hasWarnings) {
    return (
      <div className={cn('flex items-center gap-1 text-yellow-600', className)}>
        <AlertTriangle className={sizeClasses[size]} />
        {size !== 'sm' && <span className="text-xs font-medium">Warnings</span>}
      </div>
    );
  }

  return (
    <div className={cn('flex items-center gap-1 text-green-600', className)}>
      <CheckCircle className={sizeClasses[size]} />
      {size !== 'sm' && <span className="text-xs font-medium">Valid</span>}
    </div>
  );
};

export const ValidationMessages: React.FC<ValidationMessageProps> = ({
  validation,
  maxMessages = 3,
  className = ''
}) => {
  const { errors, warnings } = validation;
  const allMessages = [...errors, ...warnings];
  const displayMessages = allMessages.slice(0, maxMessages);
  const remainingCount = allMessages.length - displayMessages.length;

  if (allMessages.length === 0) {
    return null;
  }

  return (
    <div className={cn('space-y-2', className)}>
      {displayMessages.map((message, index) => (
        <div
          key={`${message.field}-${index}`}
          className={cn(
            'flex items-start gap-2 p-2 rounded-md text-sm',
            message.type === 'error' 
              ? 'bg-red-50 text-red-700 border border-red-200'
              : 'bg-yellow-50 text-yellow-700 border border-yellow-200'
          )}
        >
          {message.type === 'error' ? (
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          ) : (
            <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          )}
          <span className="flex-1">{message.message}</span>
        </div>
      ))}
      
      {remainingCount > 0 && (
        <div className="text-xs text-gray-500 text-center py-1">
          {remainingCount} more {remainingCount === 1 ? 'message' : 'messages'}...
        </div>
      )}
    </div>
  );
};

export const ValidationIndicator: React.FC<ValidationIndicatorProps> = ({
  validation,
  className = '',
  showDetails = false,
  inline = false
}) => {
  const hasErrors = validation.errors.length > 0;
  const hasWarnings = validation.warnings.length > 0;

  if (inline) {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <ValidationStatus hasErrors={hasErrors} hasWarnings={hasWarnings} size="sm" />
        {showDetails && validation.errors.length > 0 && (
          <span className="text-xs text-red-600">
            {validation.errors[0].message}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between">
        <ValidationStatus hasErrors={hasErrors} hasWarnings={hasWarnings} />
        <Badge 
          variant={hasErrors ? 'destructive' : hasWarnings ? 'secondary' : 'default'}
          className="text-xs"
        >
          {hasErrors ? `${validation.errors.length} error${validation.errors.length > 1 ? 's' : ''}` :
           hasWarnings ? `${validation.warnings.length} warning${validation.warnings.length > 1 ? 's' : ''}` :
           'Valid'}
        </Badge>
      </div>
      
      {showDetails && (
        <ValidationMessages validation={validation} />
      )}
    </div>
  );
};

interface TabValidationIndicatorProps {
  tabName: string;
  validation: ValidationResult;
  className?: string;
}

export const TabValidationIndicator: React.FC<TabValidationIndicatorProps> = ({
  tabName,
  validation,
  className = ''
}) => {
  const hasErrors = validation.errors.length > 0;
  const hasWarnings = validation.warnings.length > 0;

  if (!hasErrors && !hasWarnings) {
    return null;
  }

  return (
    <div className={cn('ml-1', className)}>
      {hasErrors ? (
        <div className="w-2 h-2 bg-red-500 rounded-full" title={`${validation.errors.length} error${validation.errors.length > 1 ? 's' : ''} in ${tabName}`} />
      ) : (
        <div className="w-2 h-2 bg-yellow-500 rounded-full" title={`${validation.warnings.length} warning${validation.warnings.length > 1 ? 's' : ''} in ${tabName}`} />
      )}
    </div>
  );
};

interface FieldValidationProps {
  fieldName: string;
  validation: ValidationResult;
  className?: string;
}

export const FieldValidation: React.FC<FieldValidationProps> = ({
  fieldName,
  validation,
  className = ''
}) => {
  const fieldErrors = validation.errors.filter(error => error.field === fieldName);
  const fieldWarnings = validation.warnings.filter(warning => warning.field === fieldName);

  if (fieldErrors.length === 0 && fieldWarnings.length === 0) {
    return null;
  }

  const message = fieldErrors[0]?.message || fieldWarnings[0]?.message;
  const isError = fieldErrors.length > 0;

  return (
    <div className={cn(
      'flex items-center gap-1 mt-1 text-xs',
      isError ? 'text-red-600' : 'text-yellow-600',
      className
    )}>
      {isError ? (
        <AlertCircle className="h-3 w-3 flex-shrink-0" />
      ) : (
        <AlertTriangle className="h-3 w-3 flex-shrink-0" />
      )}
      <span>{message}</span>
    </div>
  );
};

export default ValidationIndicator;
