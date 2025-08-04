/**
 * Standardized error handling utility for consistent error management
 * Provides user-friendly messages while maintaining security
 */

import SecureLogger from './secureLogger';

export enum ErrorType {
  VALIDATION = 'VALIDATION',
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  NETWORK = 'NETWORK',
  FILE_UPLOAD = 'FILE_UPLOAD',
  RATE_LIMIT = 'RATE_LIMIT',
  SERVER = 'SERVER',
  CLIENT = 'CLIENT',
  UNKNOWN = 'UNKNOWN'
}

export enum ErrorSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export interface ErrorDetails {
  type: ErrorType;
  severity: ErrorSeverity;
  code: string;
  message: string;
  userMessage: string;
  context?: string;
  originalError?: Error;
  metadata?: Record<string, any>;
  timestamp: string;
  retryable: boolean;
  actionRequired?: string;
}

export interface ErrorHandlerConfig {
  enableLogging: boolean;
  enableUserNotification: boolean;
  enableRetry: boolean;
  maxRetries: number;
  retryDelay: number;
}

export class AppError extends Error {
  public readonly type: ErrorType;
  public readonly severity: ErrorSeverity;
  public readonly code: string;
  public readonly userMessage: string;
  public readonly context?: string;
  public readonly metadata?: Record<string, any>;
  public readonly timestamp: string;
  public readonly retryable: boolean;
  public readonly actionRequired?: string;

  constructor(details: Partial<ErrorDetails> & { message: string }) {
    super(details.message);
    
    this.name = 'AppError';
    this.type = details.type || ErrorType.UNKNOWN;
    this.severity = details.severity || ErrorSeverity.MEDIUM;
    this.code = details.code || 'UNKNOWN_ERROR';
    this.userMessage = details.userMessage || 'An unexpected error occurred. Please try again.';
    this.context = details.context;
    this.metadata = details.metadata;
    this.timestamp = details.timestamp || new Date().toISOString();
    this.retryable = details.retryable ?? false;
    this.actionRequired = details.actionRequired;

    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }

  toJSON(): ErrorDetails {
    return {
      type: this.type,
      severity: this.severity,
      code: this.code,
      message: this.message,
      userMessage: this.userMessage,
      context: this.context,
      metadata: this.metadata,
      timestamp: this.timestamp,
      retryable: this.retryable,
      actionRequired: this.actionRequired
    };
  }
}

export class ErrorHandler {
  private static readonly DEFAULT_CONFIG: ErrorHandlerConfig = {
    enableLogging: true,
    enableUserNotification: true,
    enableRetry: false,
    maxRetries: 3,
    retryDelay: 1000
  };

  private static config: ErrorHandlerConfig = ErrorHandler.DEFAULT_CONFIG;

  /**
   * Configure error handler behavior
   */
  static configure(config: Partial<ErrorHandlerConfig>): void {
    ErrorHandler.config = { ...ErrorHandler.DEFAULT_CONFIG, ...config };
  }

  /**
   * Handle any error and convert to standardized format
   */
  static handle(
    error: unknown,
    context?: string,
    metadata?: Record<string, any>
  ): AppError {
    const appError = ErrorHandler.normalizeError(error, context, metadata);
    
    if (ErrorHandler.config.enableLogging) {
      ErrorHandler.logError(appError);
    }

    return appError;
  }

  /**
   * Handle validation errors
   */
  static handleValidation(
    message: string,
    field?: string,
    value?: any,
    context?: string
  ): AppError {
    return new AppError({
      type: ErrorType.VALIDATION,
      severity: ErrorSeverity.LOW,
      code: 'VALIDATION_ERROR',
      message,
      userMessage: `Please check your input: ${message}`,
      context,
      metadata: { field, value: SecureLogger.sanitizeData(value) },
      retryable: false,
      actionRequired: 'Please correct the highlighted fields and try again.'
    });
  }

  /**
   * Handle file upload errors
   */
  static handleFileUpload(
    message: string,
    fileName?: string,
    fileSize?: number,
    context?: string
  ): AppError {
    return new AppError({
      type: ErrorType.FILE_UPLOAD,
      severity: ErrorSeverity.MEDIUM,
      code: 'FILE_UPLOAD_ERROR',
      message,
      userMessage: 'There was a problem uploading your file. Please try again.',
      context,
      metadata: { 
        fileName: fileName ? SecureLogger.sanitizeData(fileName) : undefined,
        fileSize 
      },
      retryable: true,
      actionRequired: 'Please check your file and try uploading again.'
    });
  }

  /**
   * Handle rate limiting errors
   */
  static handleRateLimit(
    action: string,
    retryAfter?: number,
    context?: string
  ): AppError {
    const retryMessage = retryAfter 
      ? `Please wait ${Math.ceil(retryAfter / 1000)} seconds before trying again.`
      : 'Please wait a moment before trying again.';

    return new AppError({
      type: ErrorType.RATE_LIMIT,
      severity: ErrorSeverity.MEDIUM,
      code: 'RATE_LIMIT_EXCEEDED',
      message: `Rate limit exceeded for ${action}`,
      userMessage: `You're doing that too quickly. ${retryMessage}`,
      context,
      metadata: { action, retryAfter },
      retryable: true,
      actionRequired: retryMessage
    });
  }

  /**
   * Handle network errors
   */
  static handleNetwork(
    message: string,
    status?: number,
    context?: string
  ): AppError {
    let userMessage = 'Network error occurred. Please check your connection and try again.';
    let severity = ErrorSeverity.MEDIUM;

    if (status) {
      if (status >= 500) {
        userMessage = 'Server error occurred. Please try again later.';
        severity = ErrorSeverity.HIGH;
      } else if (status === 404) {
        userMessage = 'The requested resource was not found.';
      } else if (status === 403) {
        userMessage = 'You do not have permission to perform this action.';
      } else if (status === 401) {
        userMessage = 'Please log in to continue.';
      }
    }

    return new AppError({
      type: ErrorType.NETWORK,
      severity,
      code: `NETWORK_ERROR_${status || 'UNKNOWN'}`,
      message,
      userMessage,
      context,
      metadata: { status },
      retryable: !status || status >= 500 || status === 408 || status === 429,
      actionRequired: status === 401 ? 'Please log in again.' : undefined
    });
  }

  /**
   * Handle authentication errors
   */
  static handleAuthentication(
    message: string,
    context?: string
  ): AppError {
    return new AppError({
      type: ErrorType.AUTHENTICATION,
      severity: ErrorSeverity.HIGH,
      code: 'AUTHENTICATION_ERROR',
      message,
      userMessage: 'Authentication failed. Please log in again.',
      context,
      retryable: false,
      actionRequired: 'Please log in again to continue.'
    });
  }

  /**
   * Handle authorization errors
   */
  static handleAuthorization(
    message: string,
    requiredPermission?: string,
    context?: string
  ): AppError {
    return new AppError({
      type: ErrorType.AUTHORIZATION,
      severity: ErrorSeverity.HIGH,
      code: 'AUTHORIZATION_ERROR',
      message,
      userMessage: 'You do not have permission to perform this action.',
      context,
      metadata: { requiredPermission },
      retryable: false,
      actionRequired: 'Please contact support if you believe this is an error.'
    });
  }

  /**
   * Handle server errors
   */
  static handleServer(
    message: string,
    status?: number,
    context?: string
  ): AppError {
    return new AppError({
      type: ErrorType.SERVER,
      severity: ErrorSeverity.HIGH,
      code: `SERVER_ERROR_${status || 'UNKNOWN'}`,
      message,
      userMessage: 'A server error occurred. Please try again later.',
      context,
      metadata: { status },
      retryable: true,
      actionRequired: 'Please try again in a few moments.'
    });
  }

  /**
   * Normalize any error to AppError
   */
  private static normalizeError(
    error: unknown,
    context?: string,
    metadata?: Record<string, any>
  ): AppError {
    // Already an AppError
    if (error instanceof AppError) {
      return error;
    }

    // Standard Error
    if (error instanceof Error) {
      return new AppError({
        type: ErrorHandler.inferErrorType(error),
        severity: ErrorHandler.inferErrorSeverity(error),
        code: error.name || 'UNKNOWN_ERROR',
        message: error.message,
        userMessage: ErrorHandler.generateUserMessage(error),
        context,
        metadata,
        originalError: error,
        retryable: ErrorHandler.isRetryable(error)
      });
    }

    // String error
    if (typeof error === 'string') {
      return new AppError({
        type: ErrorType.UNKNOWN,
        severity: ErrorSeverity.MEDIUM,
        code: 'STRING_ERROR',
        message: error,
        userMessage: 'An error occurred. Please try again.',
        context,
        metadata,
        retryable: false
      });
    }

    // Object with message
    if (error && typeof error === 'object' && 'message' in error) {
      return new AppError({
        type: ErrorType.UNKNOWN,
        severity: ErrorSeverity.MEDIUM,
        code: 'OBJECT_ERROR',
        message: String((error as any).message),
        userMessage: 'An error occurred. Please try again.',
        context,
        metadata: { ...metadata, originalError: SecureLogger.sanitizeData(error) },
        retryable: false
      });
    }

    // Unknown error type
    return new AppError({
      type: ErrorType.UNKNOWN,
      severity: ErrorSeverity.MEDIUM,
      code: 'UNKNOWN_ERROR',
      message: 'An unknown error occurred',
      userMessage: 'An unexpected error occurred. Please try again.',
      context,
      metadata: { ...metadata, originalError: SecureLogger.sanitizeData(error) },
      retryable: false
    });
  }

  /**
   * Infer error type from error object
   */
  private static inferErrorType(error: Error): ErrorType {
    const message = error.message.toLowerCase();
    const name = error.name.toLowerCase();

    if (name.includes('validation') || message.includes('validation')) {
      return ErrorType.VALIDATION;
    }

    if (name.includes('auth') || message.includes('auth') || 
        message.includes('unauthorized') || message.includes('forbidden')) {
      return ErrorType.AUTHENTICATION;
    }

    if (message.includes('network') || message.includes('fetch') || 
        message.includes('connection')) {
      return ErrorType.NETWORK;
    }

    if (message.includes('file') || message.includes('upload')) {
      return ErrorType.FILE_UPLOAD;
    }

    if (message.includes('rate') || message.includes('limit')) {
      return ErrorType.RATE_LIMIT;
    }

    return ErrorType.UNKNOWN;
  }

  /**
   * Infer error severity from error object
   */
  private static inferErrorSeverity(error: Error): ErrorSeverity {
    const message = error.message.toLowerCase();
    const name = error.name.toLowerCase();

    if (name.includes('critical') || message.includes('critical') ||
        message.includes('fatal')) {
      return ErrorSeverity.CRITICAL;
    }

    if (name.includes('auth') || message.includes('auth') ||
        message.includes('security')) {
      return ErrorSeverity.HIGH;
    }

    if (name.includes('validation') || message.includes('validation')) {
      return ErrorSeverity.LOW;
    }

    return ErrorSeverity.MEDIUM;
  }

  /**
   * Generate user-friendly message from error
   */
  private static generateUserMessage(error: Error): string {
    const message = error.message.toLowerCase();

    if (message.includes('network') || message.includes('fetch')) {
      return 'Network error. Please check your connection and try again.';
    }

    if (message.includes('validation')) {
      return 'Please check your input and try again.';
    }

    if (message.includes('auth') || message.includes('unauthorized')) {
      return 'Authentication required. Please log in again.';
    }

    if (message.includes('forbidden')) {
      return 'You do not have permission to perform this action.';
    }

    if (message.includes('not found')) {
      return 'The requested resource was not found.';
    }

    return 'An error occurred. Please try again.';
  }

  /**
   * Determine if error is retryable
   */
  private static isRetryable(error: Error): boolean {
    const message = error.message.toLowerCase();

    // Network errors are usually retryable
    if (message.includes('network') || message.includes('fetch') || 
        message.includes('timeout')) {
      return true;
    }

    // Server errors are retryable
    if (message.includes('server') || message.includes('500')) {
      return true;
    }

    // Rate limit errors are retryable after delay
    if (message.includes('rate') || message.includes('limit')) {
      return true;
    }

    // Validation and auth errors are not retryable
    if (message.includes('validation') || message.includes('auth') || 
        message.includes('forbidden')) {
      return false;
    }

    return false;
  }

  /**
   * Log error using secure logger
   */
  private static logError(error: AppError): void {
    const logData = {
      type: error.type,
      severity: error.severity,
      code: error.code,
      context: error.context,
      metadata: error.metadata,
      retryable: error.retryable,
      actionRequired: error.actionRequired
    };

    switch (error.severity) {
      case ErrorSeverity.CRITICAL:
      case ErrorSeverity.HIGH:
        SecureLogger.error(error.message, error, error.context);
        break;
      case ErrorSeverity.MEDIUM:
        SecureLogger.warn(error.message, logData, error.context);
        break;
      case ErrorSeverity.LOW:
        SecureLogger.info(error.message, logData, error.context);
        break;
      default:
        SecureLogger.debug(error.message, logData, error.context);
    }
  }

  /**
   * Create error for display to user (sanitized)
   */
  static createUserError(error: AppError): {
    message: string;
    type: string;
    retryable: boolean;
    actionRequired?: string;
  } {
    return {
      message: error.userMessage,
      type: error.type,
      retryable: error.retryable,
      actionRequired: error.actionRequired
    };
  }

  /**
   * Check if error should trigger retry
   */
  static shouldRetry(error: AppError, attemptCount: number): boolean {
    return error.retryable && 
           attemptCount < ErrorHandler.config.maxRetries &&
           ErrorHandler.config.enableRetry;
  }

  /**
   * Get retry delay for error
   */
  static getRetryDelay(attemptCount: number): number {
    // Exponential backoff
    return ErrorHandler.config.retryDelay * Math.pow(2, attemptCount - 1);
  }
}

export default ErrorHandler;