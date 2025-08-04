import React, { useState, useRef, useCallback } from 'react';
import { Camera, Upload, X, Check, AlertCircle } from 'lucide-react';
import { useTranslation } from '../hooks/useTranslation';
import { EnhancedFileValidator } from '../utils/fileValidator';
import { useNotification } from './NotificationContainer';

interface IDPhotoUploadProps {
  onPhotosChange: (photos: File[]) => void;
  maxFiles?: number;
  maxSizePerFile?: number; // in MB
  acceptedTypes?: string[];
  disabled?: boolean;
  existingPhotos?: string[];
}

interface UploadedPhoto {
  file: File;
  preview: string;
  id: string;
}

const IDPhotoUpload: React.FC<IDPhotoUploadProps> = ({
  onPhotosChange,
  maxFiles = 5,
  maxSizePerFile = 25,
  acceptedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
  disabled = false,
  existingPhotos = []
}) => {
  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const { t } = useTranslation();
  const { showError, showWarning } = useNotification();

  const validateFile = async (file: File): Promise<string | null> => {
    // Use EnhancedFileValidator for comprehensive validation including magic numbers
    const validationResult = await EnhancedFileValidator.validateFile(file, {
      maxFileSize: maxSizePerFile * 1024 * 1024,
      allowedTypes: acceptedTypes
    });

    if (!validationResult.valid) {
      return validationResult.error || 'File validation failed';
    }

    return null;
  };

  const processFiles = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const validFiles: File[] = [];

    // Check total file count
    if (photos.length + fileArray.length > maxFiles) {
      showError('Too Many Files', `Maximum ${maxFiles} files allowed. You selected ${fileArray.length} files but can only add ${maxFiles - photos.length} more.`);
      return;
    }

    setUploading(true);
    setErrors([]);

    try {
      // Validate each file with enhanced validation
      for (const file of fileArray) {
        const error = await validateFile(file);
        if (error) {
          showError('File Validation Failed', `${file.name}: ${error}`);
        } else {
          validFiles.push(file);
        }
      }

      if (validFiles.length === 0) {
        setUploading(false);
        return;
      }

      // Show warning if some files were rejected
      if (validFiles.length < fileArray.length) {
        const rejectedCount = fileArray.length - validFiles.length;
        showWarning('Some Files Rejected', `${rejectedCount} file(s) were rejected due to validation errors. ${validFiles.length} file(s) will be uploaded.`);
      }

      const newPhotos: UploadedPhoto[] = [];
      
      for (const file of validFiles) {
        // Create preview URL
        const preview = URL.createObjectURL(file);
        const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        newPhotos.push({
          file,
          preview,
          id
        });
      }

      const updatedPhotos = [...photos, ...newPhotos];
      setPhotos(updatedPhotos);
      
      // Notify parent component
      onPhotosChange(updatedPhotos.map(p => p.file));
      
    } catch (error) {
      console.error('Error processing files:', error);
      showError('Upload Failed', 'An unexpected error occurred while processing your files. Please try again.');
    } finally {
      setUploading(false);
    }
  }, [photos, maxFiles, validateFile, onPhotosChange, showError, showWarning]);



  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFiles(files);
    }
    // Reset input value to allow selecting the same file again
    e.target.value = '';
  }, [processFiles]);

  const removePhoto = useCallback((id: string) => {
    const updatedPhotos = photos.filter(photo => {
      if (photo.id === id) {
        URL.revokeObjectURL(photo.preview);
        return false;
      }
      return true;
    });
    
    setPhotos(updatedPhotos);
    onPhotosChange(updatedPhotos.map(p => p.file));
    setErrors([]);
  }, [photos, onPhotosChange]);

  const openFileDialog = () => {
    if (!disabled && !uploading) {
      // On mobile devices, use camera input which provides camera/gallery options
      if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
        cameraInputRef.current?.click();
      } else {
        // On desktop, use regular file input
        fileInputRef.current?.click();
      }
    }
  };

  return (
    <div className="w-full space-y-4">
      {/* Upload Button */}
      <div className="flex justify-center">
        <button
          type="button"
          onClick={openFileDialog}
          disabled={disabled || uploading}
          className="ethereal-button inline-flex items-center px-6 py-3 text-white font-semibold rounded-2xl hover:transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:transform-none transition-all duration-300 shadow-lg"
        >
          <Upload className="h-5 w-5 mr-3" />
          <span className="text-base">
            {/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) 
              ? t('form.fields.uploadIdPhotos') || 'Upload ID Photos'
              : t('idUpload.chooseFiles') || 'Choose Files'
            }
          </span>
        </button>
      </div>

      {uploading && (
        <div className="flex items-center justify-center py-4">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span className="text-blue-600 font-medium">{t('idUpload.uploading')}</span>
          </div>
        </div>
      )}

      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={acceptedTypes.join(',')}
        onChange={handleFileSelect}
        className="hidden"
      />
      
      <input
        ref={cameraInputRef}
        type="file"
        multiple
        accept="image/*,application/pdf"
        capture="environment"
        onChange={handleFileSelect}
        className="hidden"
      />



      {/* Error Messages */}
      {errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center mb-2">
            <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
            <h4 className="font-medium text-red-800">Upload Errors</h4>
          </div>
          <ul className="text-sm text-red-700 space-y-1">
            {errors.map((error, index) => (
              <li key={index}>• {error}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Uploaded Documents Preview */}
      {photos.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-medium text-gray-800">Uploaded Documents ({photos.length}/{maxFiles})</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {photos.map((photo) => (
              <div key={photo.id} className="relative group">
                <div className="aspect-w-3 aspect-h-2 bg-gray-100 rounded-lg overflow-hidden">
                  {photo.file.type === 'application/pdf' ? (
                    <div className="w-full h-48 flex items-center justify-center bg-red-50">
                      <div className="text-center">
                        <div className="text-red-600 text-4xl mb-2">📄</div>
                        <div className="text-sm text-gray-600">PDF Document</div>
                      </div>
                    </div>
                  ) : (
                    <img
                      src={photo.preview}
                      alt="ID Document"
                      className="w-full h-48 object-cover"
                    />
                  )}
                </div>
                
                <div className="absolute top-2 right-2 flex space-x-1">
                  <button
                    type="button"
                    onClick={() => removePhoto(photo.id)}
                    className="p-1 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors opacity-0 group-hover:opacity-100"
                    title={t('idUpload.remove')}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                
                <div className="absolute bottom-2 left-2 right-2">
                  <div className="bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                    {photo.file.name}
                  </div>
                </div>
                
                <div className="absolute top-2 left-2">
                  <div className="bg-green-600 text-white p-1 rounded-full">
                    <Check className="h-3 w-3" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Existing Photos */}
      {existingPhotos.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-medium text-gray-800">Previously Uploaded</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {existingPhotos.map((url, index) => (
              <div key={index} className="relative">
                <div className="aspect-w-3 aspect-h-2 bg-gray-100 rounded-lg overflow-hidden">
                  <img
                    src={url}
                    alt={`Existing ID Document ${index + 1}`}
                    className="w-full h-48 object-cover"
                  />
                </div>
                <div className="absolute top-2 left-2">
                  <div className="bg-blue-600 text-white p-1 rounded-full">
                    <Check className="h-3 w-3" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default IDPhotoUpload;