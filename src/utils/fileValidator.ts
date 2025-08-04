import { fileTypeFromBuffer } from 'file-type';
import { SecureLogger } from './secureLogger';
import { ErrorHandler } from './errorHandler';

export interface ValidationResult {
  valid: boolean;
  error?: string;
  errors?: string[];
  warnings?: string[];
  securityFlags?: string[];
}

export interface FileValidationResult {
  isValid: boolean;
  error?: string;
  securityRisk?: 'low' | 'medium' | 'high';
  details?: string;
}

export interface ImageDimensions {
  width: number;
  height: number;
}

export interface FileValidationConfig {
  maxFileSize: number;
  allowedTypes: string[];
  maxImageWidth?: number;
  maxImageHeight?: number;
  minImageWidth?: number;
  minImageHeight?: number;
}

/**
 * Enhanced file validator with magic number verification and image dimension validation
 * Complements existing Supabase security with additional client-side validation layers
 */
export class EnhancedFileValidator {
  private static readonly DEFAULT_CONFIG: FileValidationConfig = {
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
    maxImageWidth: 4096,
    maxImageHeight: 4096,
    minImageWidth: 100,
    minImageHeight: 100,
  };

  private static readonly MAGIC_NUMBERS = {
    'image/jpeg': [0xFF, 0xD8, 0xFF],
    'image/png': [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A],
    'image/webp': [0x52, 0x49, 0x46, 0x46], // RIFF header
    'application/pdf': [0x25, 0x50, 0x44, 0x46], // %PDF
  };

  /**
   * Comprehensive file validation with magic number verification
   */
  static async validateFile(
    file: File, 
    config: Partial<FileValidationConfig> = {}
  ): Promise<ValidationResult> {
    const finalConfig = { ...this.DEFAULT_CONFIG, ...config };
    const warnings: string[] = [];

    try {
      // 1. Basic file size validation
      if (file.size > finalConfig.maxFileSize) {
        return {
          valid: false,
          error: `File size (${this.formatFileSize(file.size)}) exceeds maximum allowed size (${this.formatFileSize(finalConfig.maxFileSize)})`,
          errors: [`File size (${this.formatFileSize(file.size)}) exceeds maximum allowed size (${this.formatFileSize(finalConfig.maxFileSize)})`],
          securityFlags: ['FILE_SIZE_EXCEEDED']
        };
      }

      // 2. MIME type validation (first layer)
      if (!finalConfig.allowedTypes.includes(file.type)) {
        return {
          valid: false,
          error: `File type "${file.type}" is not allowed. Allowed types: ${finalConfig.allowedTypes.join(', ')}`,
          errors: [`File type "${file.type}" is not allowed. Allowed types: ${finalConfig.allowedTypes.join(', ')}`],
          securityFlags: ['INVALID_MIME_TYPE']
        };
      }

      // 3. Magic number validation (security layer)
      const magicNumberResult = await this.validateMagicNumber(file);
      if (!magicNumberResult.valid) {
        return magicNumberResult;
      }

      // 4. Image dimension validation (if applicable)
      if (file.type.startsWith('image/')) {
        const dimensionResult = await this.validateImageDimensions(file, finalConfig);
        if (!dimensionResult.valid) {
          return dimensionResult;
        }
        if (dimensionResult.warnings) {
          warnings.push(...dimensionResult.warnings);
        }
      }

      // 5. File content validation
      const contentSafe = await this.validateFileContent(file);
      if (!contentSafe) {
        return {
          valid: false,
          error: 'File content contains suspicious patterns that could pose a security risk.',
          errors: ['File content contains suspicious patterns that could pose a security risk.'],
          securityFlags: ['SUSPICIOUS_CONTENT']
        };
      }

      // 6. File name validation
      const nameResult = this.validateFileName(file.name);
      if (!nameResult.valid) {
        return nameResult;
      }
      if (nameResult.warnings) {
        warnings.push(...nameResult.warnings);
      }

      return {
        valid: true,
        warnings: warnings.length > 0 ? warnings : undefined,
        securityFlags: []
      };

    } catch (error) {
      return {
        valid: false,
        error: `Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        errors: [`Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
        securityFlags: ['VALIDATION_ERROR']
      };
    }
  }

  /**
   * Validate file magic numbers to ensure file type authenticity
   */
  private static async validateMagicNumber(file: File): Promise<ValidationResult> {
    try {
      const buffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(buffer);

      // Use file-type library for comprehensive detection
      const detectedType = await fileTypeFromBuffer(buffer);
      
      if (!detectedType) {
        // Fallback to manual magic number checking for basic types
        return this.checkManualMagicNumbers(uint8Array, file.type);
      }

      // Verify detected type matches declared MIME type
      if (detectedType.mime !== file.type) {
        // Special case for WebP which might be detected differently
        if (file.type === 'image/webp' && detectedType.mime === 'image/webp') {
          return { valid: true };
        }
        
        return {
          valid: false,
          error: `File content (${detectedType.mime}) does not match declared type (${file.type}). This could indicate a malicious file.`
        };
      }

      return { valid: true };

    } catch (error) {
      return {
        valid: false,
        error: `Magic number validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Manual magic number checking as fallback
   */
  private static checkManualMagicNumbers(uint8Array: Uint8Array, declaredType: string): ValidationResult {
    const magicNumbers = this.MAGIC_NUMBERS[declaredType as keyof typeof this.MAGIC_NUMBERS];
    
    if (!magicNumbers) {
      return {
        valid: false,
        error: `Cannot validate magic numbers for file type: ${declaredType}`
      };
    }

    // Check if file starts with expected magic numbers
    for (let i = 0; i < magicNumbers.length; i++) {
      if (uint8Array[i] !== magicNumbers[i]) {
        return {
          valid: false,
          error: `File content does not match expected format for ${declaredType}. This could indicate a malicious file.`
        };
      }
    }

    return { valid: true };
  }

  /**
   * Validate image dimensions
   */
  private static async validateImageDimensions(
    file: File, 
    config: FileValidationConfig
  ): Promise<ValidationResult> {
    return new Promise((resolve) => {
      const img = new Image();
      const warnings: string[] = [];

      img.onload = () => {
        const { width, height } = img;
        URL.revokeObjectURL(img.src); // Clean up

        // Check minimum dimensions
        if (config.minImageWidth && width < config.minImageWidth) {
          resolve({
            valid: false,
            error: `Image width (${width}px) is below minimum required (${config.minImageWidth}px)`
          });
          return;
        }

        if (config.minImageHeight && height < config.minImageHeight) {
          resolve({
            valid: false,
            error: `Image height (${height}px) is below minimum required (${config.minImageHeight}px)`
          });
          return;
        }

        // Check maximum dimensions
        if (config.maxImageWidth && width > config.maxImageWidth) {
          warnings.push(`Image width (${width}px) exceeds recommended maximum (${config.maxImageWidth}px). Consider resizing for better performance.`);
        }

        if (config.maxImageHeight && height > config.maxImageHeight) {
          warnings.push(`Image height (${height}px) exceeds recommended maximum (${config.maxImageHeight}px). Consider resizing for better performance.`);
        }

        resolve({
          valid: true,
          warnings: warnings.length > 0 ? warnings : undefined
        });
      };

      img.onerror = () => {
        URL.revokeObjectURL(img.src); // Clean up
        resolve({
          valid: false,
          error: 'Unable to load image. The file may be corrupted or not a valid image.'
        });
      };

      img.src = URL.createObjectURL(file);
    });
  }

  /**
   * Validate file name for security
   */
  private static validateFileName(fileName: string): ValidationResult {
    const warnings: string[] = [];

    // Check for potentially dangerous characters
    const dangerousChars = /[<>:"|?*\x00-\x1f]/;
    if (dangerousChars.test(fileName)) {
      return {
        valid: false,
        error: 'File name contains invalid characters. Please rename the file and try again.'
      };
    }

    // Check for reserved names (Windows)
    const reservedNames = /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(\.|$)/i;
    if (reservedNames.test(fileName)) {
      return {
        valid: false,
        error: 'File name uses a reserved system name. Please rename the file and try again.'
      };
    }

    // Check file name length
    if (fileName.length > 255) {
      return {
        valid: false,
        error: 'File name is too long. Please use a shorter name (max 255 characters).'
      };
    }

    // Warn about very long names
    if (fileName.length > 100) {
      warnings.push('File name is quite long. Consider using a shorter name for better compatibility.');
    }

    // Check for multiple extensions (potential security risk)
    const extensionCount = (fileName.match(/\./g) || []).length;
    if (extensionCount > 1) {
      warnings.push('File has multiple extensions. Ensure this is intentional.');
    }

    return {
      valid: true,
      warnings: warnings.length > 0 ? warnings : undefined
    };
  }

  /**
   * Get image dimensions without validation
   */
  static async getImageDimensions(file: File): Promise<ImageDimensions | null> {
    if (!file.type.startsWith('image/')) {
      return null;
    }

    return new Promise((resolve) => {
      const img = new Image();

      img.onload = () => {
        const dimensions = { width: img.width, height: img.height };
        URL.revokeObjectURL(img.src);
        resolve(dimensions);
      };

      img.onerror = () => {
        URL.revokeObjectURL(img.src);
        resolve(null);
      };

      img.src = URL.createObjectURL(file);
    });
  }

  /**
   * Format file size for human readability
   */
  private static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Validate file content for suspicious patterns
   */
  private static async validateFileContent(file: File): Promise<boolean> {
    try {
      // Read first 1KB of file for content analysis
      const slice = file.slice(0, 1024);
      const text = await slice.text();
      
      // Suspicious patterns that could indicate malicious content
      const suspiciousPatterns = [
        // Script tags and executable content
        /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
        /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
        /javascript:/gi,
        /vbscript:/gi,
        /data:text\/html/gi,
        /data:application\/javascript/gi,
        
        // Executable file signatures in disguised files
        /MZ\x90\x00/g, // PE executable header
        /\x7fELF/g,    // ELF executable header
        /\xca\xfe\xba\xbe/g, // Java class file
        
        // Suspicious URLs or domains
        /https?:\/\/[^\s]*\.(tk|ml|ga|cf)\b/gi,
        
        // Base64 encoded scripts (common in malware)
        /data:text\/html;base64,/gi,
        /data:application\/javascript;base64,/gi,
      ];

      // Check for suspicious patterns
      for (const pattern of suspiciousPatterns) {
        if (pattern.test(text)) {
          // Log security event
          SecureLogger.security('Suspicious file content detected', {
            fileName: file.name,
            fileType: file.type,
            fileSize: file.size,
            pattern: pattern.source
          });
          return false;
        }
      }

      return true;
    } catch (error) {
      // If we can't read the file content, err on the side of caution
      SecureLogger.error('File content validation failed', {
        fileName: file.name,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }



  /**
   * Batch validate multiple files
   */
  static async validateFiles(
    files: File[], 
    config: Partial<FileValidationConfig> = {}
  ): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];
    
    for (const file of files) {
      const result = await this.validateFile(file, config);
      results.push(result);
    }
    
    return results;
  }
}

export default EnhancedFileValidator;