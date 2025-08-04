/**
 * Secure logging utility that sanitizes sensitive data for GDPR compliance
 * Prevents sensitive information from being exposed in error logs
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: string;
  sanitizedData?: any;
  error?: Error;
}

export interface SensitiveDataConfig {
  fieldsToMask: string[];
  fieldsToRemove: string[];
  customMaskingRules?: Record<string, (value: any) => string>;
}

export class SecureLogger {
  private context: string;

  constructor(context: string = 'default') {
    this.context = context;
  }

  /**
   * Instance method for debug logging
   */
  debug(message: string, data?: any): void {
    SecureLogger.debug(message, data, this.context);
  }

  /**
   * Instance method for info logging
   */
  info(message: string, data?: any): void {
    SecureLogger.info(message, data, this.context);
  }

  /**
   * Instance method for warning logging
   */
  warn(message: string, data?: any): void {
    SecureLogger.warn(message, data, this.context);
  }

  /**
   * Instance method for error logging
   */
  error(message: string, error?: any): void {
    SecureLogger.error(message, error, this.context);
  }

  /**
   * Instance method for security logging
   */
  security(message: string, data?: any): void {
    SecureLogger.security(message, data, this.context);
  }

  private static readonly SENSITIVE_FIELDS = [
    // Personal Information
    'firstName', 'lastName', 'fullName', 'name',
    'email', 'phone', 'phoneNumber', 'mobile',
    'dateOfBirth', 'dob', 'birthDate',
    'address', 'street', 'city', 'zipCode', 'postalCode',
    'nationality', 'country',
    
    // Identification
    'idNumber', 'passportNumber', 'drivingLicense',
    'socialSecurityNumber', 'ssn', 'taxId',
    
    // Emergency Contacts
    'emergencyContactName', 'emergencyContactPhone',
    'emergencyContactEmail', 'emergencyContactRelation',
    
    // Authentication & Security
    'password', 'token', 'apiKey', 'secret',
    'accessToken', 'refreshToken', 'sessionId',
    
    // Payment Information
    'creditCard', 'cardNumber', 'cvv', 'expiryDate',
    'bankAccount', 'iban', 'routingNumber',
    
    // File Paths (may contain sensitive info)
    'filePath', 'fileName', 'uploadPath',
    
    // IP and Device Info
    'ipAddress', 'userAgent', 'deviceId',
  ];

  private static readonly FIELDS_TO_REMOVE = [
    'password', 'token', 'apiKey', 'secret',
    'accessToken', 'refreshToken', 'sessionId',
    'creditCard', 'cardNumber', 'cvv',
    'bankAccount', 'iban', 'routingNumber',
  ];

  private static readonly DEFAULT_CONFIG: SensitiveDataConfig = {
    fieldsToMask: SecureLogger.SENSITIVE_FIELDS,
    fieldsToRemove: SecureLogger.FIELDS_TO_REMOVE,
    customMaskingRules: {
      email: (value: string) => SecureLogger.maskEmail(value),
      phone: (value: string) => SecureLogger.maskPhone(value),
      phoneNumber: (value: string) => SecureLogger.maskPhone(value),
      idNumber: (value: string) => SecureLogger.maskIdNumber(value),
      passportNumber: (value: string) => SecureLogger.maskIdNumber(value),
    }
  };

  /**
   * Log debug message with data sanitization
   */
  static debug(message: string, data?: any, context?: string): void {
    this.log('debug', message, data, context);
  }

  /**
   * Log info message with data sanitization
   */
  static info(message: string, data?: any, context?: string): void {
    this.log('info', message, data, context);
  }

  /**
   * Log warning message with data sanitization
   */
  static warn(message: string, data?: any, context?: string): void {
    this.log('warn', message, data, context);
  }

  /**
   * Log error message with data sanitization
   */
  static error(message: string, error?: Error | any, context?: string): void {
    let errorObj: Error | undefined;
    let data: any;

    if (error instanceof Error) {
      errorObj = error;
      data = undefined;
    } else {
      data = error;
      errorObj = undefined;
    }

    this.log('error', message, data, context, errorObj);
  }

  /**
   * Log security event (always sanitized)
   */
  static security(message: string, data?: any, context?: string): void {
    const sanitizedData = this.sanitizeData(data, {
      ...this.DEFAULT_CONFIG,
      fieldsToRemove: [...this.DEFAULT_CONFIG.fieldsToRemove, ...this.DEFAULT_CONFIG.fieldsToMask]
    });
    
    this.log('warn', `[SECURITY] ${message}`, sanitizedData, context);
  }

  /**
   * Core logging method with sanitization
   */
  private static log(
    level: LogLevel,
    message: string,
    data?: any,
    context?: string,
    error?: Error
  ): void {
    try {
      const sanitizedData = data ? this.sanitizeData(data) : undefined;
      
      const logEntry: LogEntry = {
        level,
        message: this.sanitizeMessage(message),
        timestamp: new Date().toISOString(),
        context,
        sanitizedData,
        error: error ? this.sanitizeError(error) : undefined
      };

      // Use appropriate console method
      const consoleMethod = console[level] || console.log;
      
      if (sanitizedData || error) {
        consoleMethod(
          `[${logEntry.timestamp}] ${level.toUpperCase()}${context ? ` [${context}]` : ''}: ${logEntry.message}`,
          sanitizedData || error
        );
      } else {
        consoleMethod(
          `[${logEntry.timestamp}] ${level.toUpperCase()}${context ? ` [${context}]` : ''}: ${logEntry.message}`
        );
      }

    } catch (loggingError) {
      // Fallback logging if sanitization fails
      console.error('Logging error:', loggingError);
      console.log(`[FALLBACK] ${level.toUpperCase()}: ${message}`);
    }
  }

  /**
   * Sanitize data object by masking or removing sensitive fields
   */
  static sanitizeData(
    data: any,
    config: SensitiveDataConfig = SecureLogger.DEFAULT_CONFIG
  ): any {
    if (!data) return data;

    try {
      // Handle different data types
      if (typeof data === 'string') {
        return this.sanitizeString(data);
      }

      if (typeof data === 'number' || typeof data === 'boolean') {
        return data;
      }

      if (data instanceof Date) {
        return data.toISOString();
      }

      if (data instanceof Error) {
        return this.sanitizeError(data);
      }

      if (Array.isArray(data)) {
        return data.map(item => this.sanitizeData(item, config));
      }

      if (typeof data === 'object') {
        return this.sanitizeObject(data, config);
      }

      return data;

    } catch (error) {
      return '[SANITIZATION_ERROR]';
    }
  }

  /**
   * Sanitize object by processing each field
   */
  private static sanitizeObject(
    obj: Record<string, any>,
    config: SensitiveDataConfig
  ): Record<string, any> {
    const sanitized: Record<string, any> = {};

    for (const [key, value] of Object.entries(obj)) {
      const lowerKey = key.toLowerCase();

      // Remove sensitive fields completely
      if (config.fieldsToRemove.some(field => lowerKey.includes(field.toLowerCase()))) {
        sanitized[key] = '[REMOVED]';
        continue;
      }

      // Apply custom masking rules
      if (config.customMaskingRules && config.customMaskingRules[lowerKey]) {
        sanitized[key] = config.customMaskingRules[lowerKey](value);
        continue;
      }

      // Mask sensitive fields
      if (config.fieldsToMask.some(field => lowerKey.includes(field.toLowerCase()))) {
        sanitized[key] = this.maskValue(value);
        continue;
      }

      // Recursively sanitize nested objects
      sanitized[key] = this.sanitizeData(value, config);
    }

    return sanitized;
  }

  /**
   * Sanitize error objects
   */
  private static sanitizeError(error: Error): any {
    return {
      name: error.name,
      message: this.sanitizeMessage(error.message),
      stack: error.stack ? this.sanitizeStackTrace(error.stack) : undefined
    };
  }

  /**
   * Sanitize message strings
   */
  private static sanitizeMessage(message: string): string {
    if (!message || typeof message !== 'string') return message;

    let sanitized = message;

    // Remove potential email addresses
    sanitized = sanitized.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL]');

    // Remove potential phone numbers
    sanitized = sanitized.replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, '[PHONE]');

    // Remove potential IDs/tokens (long alphanumeric strings)
    sanitized = sanitized.replace(/\b[A-Za-z0-9]{20,}\b/g, '[TOKEN]');

    return sanitized;
  }

  /**
   * Sanitize string values
   */
  private static sanitizeString(value: string): string {
    if (!value || typeof value !== 'string') return value;

    // Check if it looks like sensitive data
    if (value.includes('@')) {
      return this.maskEmail(value);
    }

    if (/^\d{10,}$/.test(value.replace(/\D/g, ''))) {
      return this.maskPhone(value);
    }

    return value;
  }

  /**
   * Sanitize stack traces
   */
  private static sanitizeStackTrace(stack: string): string {
    if (!stack) return stack;

    // Remove file paths that might contain sensitive info
    return stack.replace(/\/[^\s]+/g, '[PATH]');
  }

  /**
   * Generic value masking
   */
  private static maskValue(value: any): string {
    if (!value) return value;

    const str = String(value);
    if (str.length <= 2) return '[MASKED]';
    if (str.length <= 4) return str[0] + '*'.repeat(str.length - 1);
    
    return str.substring(0, 2) + '*'.repeat(str.length - 4) + str.substring(str.length - 2);
  }

  /**
   * Mask email addresses
   */
  private static maskEmail(email: string): string {
    if (!email || !email.includes('@')) return '[MASKED_EMAIL]';

    const [local, domain] = email.split('@');
    const maskedLocal = local.length > 2 
      ? local[0] + '*'.repeat(local.length - 2) + local[local.length - 1]
      : '*'.repeat(local.length);
    
    return `${maskedLocal}@${domain}`;
  }

  /**
   * Mask phone numbers
   */
  private static maskPhone(phone: string): string {
    if (!phone) return '[MASKED_PHONE]';

    const digits = phone.replace(/\D/g, '');
    if (digits.length < 4) return '[MASKED_PHONE]';

    const masked = '*'.repeat(digits.length - 4) + digits.slice(-4);
    return phone.replace(/\d/g, (match, index) => {
      const digitIndex = phone.substring(0, index + 1).replace(/\D/g, '').length - 1;
      return digitIndex < digits.length - 4 ? '*' : match;
    });
  }

  /**
   * Mask ID numbers
   */
  private static maskIdNumber(id: string): string {
    if (!id) return '[MASKED_ID]';

    if (id.length <= 4) return '*'.repeat(id.length);
    return '*'.repeat(id.length - 4) + id.slice(-4);
  }

  /**
   * Create a sanitized copy of data for external logging services
   */
  static createSanitizedCopy(data: any): any {
    return this.sanitizeData(data, {
      fieldsToMask: [],
      fieldsToRemove: [...this.SENSITIVE_FIELDS, ...this.FIELDS_TO_REMOVE],
    });
  }

  /**
   * Check if a value contains sensitive data
   */
  static containsSensitiveData(value: any): boolean {
    if (!value) return false;

    const str = String(value).toLowerCase();
    
    return this.SENSITIVE_FIELDS.some(field => 
      str.includes(field.toLowerCase())
    ) || /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/.test(str);
  }

  /**
   * Sanitize a single value (alias for sanitizeData for backward compatibility)
   */
  static sanitize(value: any): any {
    return this.sanitizeData(value);
  }
}

export default SecureLogger;