import { supabase } from './supabase';
import { EnhancedFileValidator, ValidationResult } from '../utils/fileValidator';
import { RateLimiter } from '../utils/rateLimiter';
import SecureLogger from '../utils/secureLogger';
import ErrorHandler, { AppError } from '../utils/errorHandler';

export interface UploadResult {
  success: boolean;
  url?: string;
  error?: string;
  path?: string;
  validationDetails?: ValidationResult;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export class StorageService {
  private static readonly BUCKET_NAME = 'id-documents';
  private static readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  private static readonly ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
  


  /**
   * Initialize the storage bucket with proper policies
   */
  static async initializeBucket(): Promise<boolean> {
    try {
      // Check if bucket exists
      const { data: buckets, error: listError } = await supabase.storage.listBuckets();
      
      if (listError) {
        console.error('Error listing buckets:', listError);
        return false;
      }

      const bucketExists = buckets?.some(bucket => bucket.name === this.BUCKET_NAME);

      if (!bucketExists) {
        // Create bucket
        const { error: createError } = await supabase.storage.createBucket(this.BUCKET_NAME, {
          public: false, // Private bucket for security
          allowedMimeTypes: this.ALLOWED_TYPES,
          fileSizeLimit: this.MAX_FILE_SIZE
        });

        if (createError) {
          console.error('Error creating bucket:', createError);
          return false;
        }

        console.log('ID documents bucket created successfully');
      }

      return true;
    } catch (error) {
      console.error('Error initializing bucket:', error);
      return false;
    }
  }

  /**
   * Upload a single file to the storage bucket with enhanced security
   */
  static async uploadFile(
    file: File, 
    checkInId: string,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<UploadResult> {
    const context = 'StorageService.uploadFile';
    
    try {
      // Check rate limiting for file uploads using static method
      const rateLimitCheck = RateLimiter.checkRateLimit('file-upload', 'storage');
      if (!rateLimitCheck.allowed) {
        const error = ErrorHandler.handleRateLimit(
          'file upload',
          rateLimitCheck.retryAfter,
          context
        );
        
        SecureLogger.security('File upload rate limit exceeded', {
          checkInId,
          fileName: file.name,
          fileSize: file.size,
          retryAfter: rateLimitCheck.retryAfter
        }, context);
        
        return { 
          success: false, 
          error: error.userMessage,
          validationDetails: {
            valid: false,
            errors: [error.userMessage],
            securityFlags: ['RATE_LIMITED']
          }
        };
      }

      // Record the upload attempt
      RateLimiter.recordAttempt('file-upload', 'storage');

      // Enhanced file validation
      const validation = await EnhancedFileValidator.validateFile(file);
      if (!validation.valid) {
        const errorMessages = validation.errors?.length 
          ? validation.errors.join(', ')
          : validation.error || 'File validation failed';
        
        const error = ErrorHandler.handleFileUpload(
          `File validation failed: ${errorMessages}`,
          file.name,
          file.size,
          context
        );
        
        SecureLogger.warn('File validation failed', {
          checkInId,
          fileName: file.name,
          fileSize: file.size,
          validationErrors: validation.errors,
          securityFlags: validation.securityFlags
        }, context);
        
        return { 
          success: false, 
          error: error.userMessage,
          validationDetails: validation
        };
      }

      // Log successful validation
      SecureLogger.info('File validation passed', {
        checkInId,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type
      }, context);

      // Generate unique file path with additional security
      const timestamp = Date.now();
      const randomId = crypto.getRandomValues(new Uint32Array(1))[0].toString(36);
      const fileExtension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${checkInId}/${timestamp}-${randomId}.${fileExtension}`;

      // Compress image if needed (skip compression for PDFs)
      const processedFile = file.type === 'application/pdf' 
        ? file 
        : await this.compressImage(file);

      // Upload file with enhanced error handling
      const { data, error } = await supabase.storage
        .from(this.BUCKET_NAME)
        .upload(fileName, processedFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        const appError = ErrorHandler.handleFileUpload(
          `Upload failed: ${error.message}`,
          file.name,
          file.size,
          context
        );
        
        SecureLogger.error('File upload failed', appError, context);
        
        return { 
          success: false, 
          error: appError.userMessage,
          validationDetails: validation
        };
      }

      // Get signed URL for private bucket
      const { data: urlData } = await supabase.storage
        .from(this.BUCKET_NAME)
        .createSignedUrl(fileName, 60 * 60 * 24 * 365); // 1 year expiry

      // Log successful upload (without sensitive data)
      SecureLogger.info('File uploaded successfully', {
        checkInId,
        fileName: file.name,
        fileSize: file.size,
        uploadPath: fileName
      }, context);

      return {
        success: true,
        url: urlData?.signedUrl,
        path: fileName,
        validationDetails: validation
      };

    } catch (error) {
      const appError = ErrorHandler.handle(error, context, {
        checkInId,
        fileName: file.name,
        fileSize: file.size
      });
      
      SecureLogger.error('Unexpected error during file upload', appError, context);
      
      return { 
        success: false, 
        error: appError.userMessage,
        validationDetails: {
          valid: false,
          errors: ['An unexpected error occurred during upload'],
          securityFlags: ['SYSTEM_ERROR']
        }
      };
    }
  }

  /**
   * Upload multiple files with enhanced security
   */
  static async uploadFiles(
    files: File[], 
    checkInId: string,
    onProgress?: (fileIndex: number, progress: UploadProgress) => void
  ): Promise<UploadResult[]> {
    const context = 'StorageService.uploadFiles';
    const results: UploadResult[] = [];

    // Log batch upload attempt
    SecureLogger.info('Batch file upload started', {
      checkInId,
      fileCount: files.length,
      totalSize: files.reduce((sum, file) => sum + file.size, 0)
    }, context);

    // Validate all files first using enhanced validator
    const validationPromises = files.map(file => 
      EnhancedFileValidator.validateFile(file)
    );
    
    try {
      const validations = await Promise.all(validationPromises);
      
      // Check if any files failed validation
      const failedValidations = validations.filter(v => !v.valid);
      if (failedValidations.length > 0) {
        SecureLogger.warn('Batch validation failed for some files', {
          checkInId,
          failedCount: failedValidations.length,
          totalCount: files.length
        }, context);
      }

      // Upload files sequentially to avoid overwhelming the system
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const validation = validations[i];
        
        if (!validation.valid) {
          // Skip invalid files but include them in results
          const errorMessages = validation.errors?.length 
            ? validation.errors.join(', ')
            : validation.error || 'File validation failed';
          
          results.push({
            success: false,
            error: `File validation failed: ${errorMessages}`,
            validationDetails: validation
          });
          continue;
        }
        
        const result = await this.uploadFile(
          file, 
          checkInId, 
          onProgress ? (progress) => onProgress(i, progress) : undefined
        );
        results.push(result);
      }

      // Log batch upload completion
      const successCount = results.filter(r => r.success).length;
      SecureLogger.info('Batch file upload completed', {
        checkInId,
        totalFiles: files.length,
        successCount,
        failureCount: files.length - successCount
      }, context);

      return results;
      
    } catch (error) {
      const appError = ErrorHandler.handle(error, context, {
        checkInId,
        fileCount: files.length
      });
      
      SecureLogger.error('Batch file upload failed', appError, context);
      
      // Return error for all files
      return files.map(() => ({
        success: false,
        error: appError.userMessage,
        validationDetails: {
          valid: false,
          errors: ['Batch upload failed'],
          securityFlags: ['SYSTEM_ERROR']
        }
      }));
    }
  }

  /**
   * Delete a file from storage
   */
  static async deleteFile(filePath: string): Promise<boolean> {
    try {
      const { error } = await supabase.storage
        .from(this.BUCKET_NAME)
        .remove([filePath]);

      if (error) {
        console.error('Delete error:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error deleting file:', error);
      return false;
    }
  }

  /**
   * Get a signed URL for a private file
   */
  static async getSignedUrl(filePath: string, expiresIn: number = 3600): Promise<string | null> {
    try {
      const { data, error } = await supabase.storage
        .from(this.BUCKET_NAME)
        .createSignedUrl(filePath, expiresIn);

      if (error) {
        console.error('Error creating signed URL:', error);
        return null;
      }

      return data?.signedUrl || null;
    } catch (error) {
      console.error('Error getting signed URL:', error);
      return null;
    }
  }

  /**
   * Legacy validation method - now using EnhancedFileValidator
   * @deprecated Use EnhancedFileValidator.validateFile() instead
   */
  private static validateFile(file: File): { valid: boolean; error?: string } {
    // Basic validation for backward compatibility
    if (file.size > this.MAX_FILE_SIZE) {
      return { 
        valid: false, 
        error: `File size must be less than ${this.MAX_FILE_SIZE / (1024 * 1024)}MB` 
      };
    }

    if (!this.ALLOWED_TYPES.includes(file.type)) {
      return { 
        valid: false, 
        error: 'Only JPEG, PNG, WebP images and PDF files are allowed' 
      };
    }

    return { valid: true };
  }

  /**
   * Compress image to reduce file size
   */
  private static async compressImage(file: File, quality: number = 0.8): Promise<File> {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        // Calculate new dimensions (max 1920x1080)
        const maxWidth = 1920;
        const maxHeight = 1080;
        let { width, height } = img;

        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width *= ratio;
          height *= ratio;
        }

        canvas.width = width;
        canvas.height = height;

        // Draw and compress
        ctx?.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name, {
                type: file.type,
                lastModified: Date.now()
              });
              resolve(compressedFile);
            } else {
              resolve(file); // Fallback to original file
            }
          },
          file.type,
          quality
        );
      };

      img.onerror = () => resolve(file); // Fallback to original file
      img.src = URL.createObjectURL(file);
    });
  }

  /**
   * Get file metadata
   */
  static async getFileMetadata(filePath: string) {
    try {
      const { data, error } = await supabase.storage
        .from(this.BUCKET_NAME)
        .list(filePath.split('/').slice(0, -1).join('/'), {
          search: filePath.split('/').pop()
        });

      if (error) {
        console.error('Error getting file metadata:', error);
        return null;
      }

      return data?.[0] || null;
    } catch (error) {
      console.error('Error getting file metadata:', error);
      return null;
    }
  }

  /**
   * List files for a specific check-in
   */
  static async listFiles(checkInId: string) {
    try {
      const { data, error } = await supabase.storage
        .from(this.BUCKET_NAME)
        .list(checkInId);

      if (error) {
        console.error('Error listing files:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error listing files:', error);
      return [];
    }
  }
}

export default StorageService;