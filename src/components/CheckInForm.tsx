import React, { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { CheckInFormData, CheckInFormProps } from '../types/checkin';
import IDPhotoUpload from './IDPhotoUpload';
import { StorageService } from '../lib/storage';
import { useTranslation } from '../hooks/useTranslation';
import LanguageSelector from './LanguageSelector';
import { ServerRateLimiter } from '../services/serverRateLimiter';
import { SecureLogger } from '../utils/secureLogger';
import { ErrorHandler, ErrorType } from '../utils/errorHandler';
import { useNotification } from './NotificationContainer';
import { GuestProfileService } from '../services/guestProfileService';
import type { GuestProfile } from '../types/guest';

export const CheckInForm: React.FC<CheckInFormProps> = ({
  bookingId,
  onSubmit,
  initialData,
  isSubmitting = false,
  language = 'en-US',
  onLanguageChange,
  externalErrorHandling = false
}) => {
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  
  // Guest profile states (for automatic matching)
  const [matchedGuest, setMatchedGuest] = useState<GuestProfile | null>(null);
  
  // Initialize notification hook
  const { showError, showWarning, showSuccess } = useNotification();
  
  // Initialize translation hook with the current language
  const { t, isLoading: isTranslating, error: translationError, setLanguage, currentLanguage } = useTranslation(language || 'en-US');
  
  // Initialize security utilities
  // ServerRateLimiter and ErrorHandler are used statically, no instance needed

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
    reset,
    setValue
  } = useForm<CheckInFormData>({
    defaultValues: initialData || {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      dateOfBirth: '',
      nationality: '',
      idType: 'passport',
      address: '',
      city: '',
      state: '',
      country: '',
      zipCode: '',
      emergencyContactName: '',
      emergencyContactPhone: '',
      emergencyContactRelation: '',
      purposeOfVisit: 'leisure',
      arrivalDate: '',
      departureDate: '',
      roomNumber: '',
      numberOfGuests: 1,
      additionalGuests: [],
      specialRequests: '',
      preferences: {
        wakeUpCall: false,
        newspaper: false,
        extraTowels: false,
        extraPillows: false,
        roomService: false,
        doNotDisturb: false,
      },
      termsAccepted: false,
      marketingConsent: false,
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'additionalGuests'
  });

  const handleLanguageChange = async (languageCode: string) => {
    await setLanguage(languageCode);
    onLanguageChange?.(languageCode);
  };

  // Automatic guest profile matching
  const findMatchingGuest = async (email: string, phone: string, name: string) => {
    if (!email && !phone) return null;

    try {
      // Search by email first (most reliable)
      if (email) {
        const emailResults = await GuestProfileService.searchGuestProfiles({
          search: email,
          limit: 5,
          offset: 0
        });
        
        const exactEmailMatch = emailResults.find(guest => 
          guest.email?.toLowerCase() === email.toLowerCase()
        );
        if (exactEmailMatch) return exactEmailMatch;
      }

      // Search by phone if no email match
      if (phone) {
        const phoneResults = await GuestProfileService.searchGuestProfiles({
          search: phone,
          limit: 5,
          offset: 0
        });
        
        const exactPhoneMatch = phoneResults.find(guest => 
          guest.phone === phone
        );
        if (exactPhoneMatch) return exactPhoneMatch;
      }

      return null;
    } catch (error) {
      console.error('Error finding matching guest:', error);
      return null;
    }
  };

  const onFormSubmit = async (data: CheckInFormData) => {
    try {
      setSubmitting(true);
      
      // Get client information for rate limiting
      const identifier = bookingId || data.email || 'anonymous';
      const userAgent = navigator.userAgent;
      
      // Check server-side rate limit before submission
      const rateLimitCheck = await ServerRateLimiter.checkRateLimit(
        'checkin-submission', 
        identifier,
        undefined, // IP address will be determined server-side
        userAgent
      );
      
      if (!rateLimitCheck.allowed) {
        const retryTime = rateLimitCheck.retryAfter || 60;
        showError(
          'Rate Limit Exceeded', 
          rateLimitCheck.message || `Please wait ${retryTime} seconds before submitting again. This helps protect our system from abuse.`
        );
        return;
      }

      // Log submission start
      SecureLogger.info('Check-in form submission started', {
        hasIdPhotos: !!data.idPhotos && data.idPhotos.length > 0,
        guestCount: data.additionalGuests?.length || 0
      });

      // Handle guest profile creation/linking with automatic matching
      let guestProfileId: string | null = null;
      
      try {
        // Automatically find matching guest profile
        const fullName = `${data.firstName} ${data.lastName}`.trim();
        const existingGuest = await findMatchingGuest(data.email, data.phone, fullName);
        
        if (existingGuest) {
          // Update existing guest profile with any new information
          guestProfileId = existingGuest.id;
          await GuestProfileService.updateGuestProfile({
            id: existingGuest.id,
            name: fullName,
            email: data.email,
            phone: data.phone,
            address: data.address,
            city: data.city,
            state: data.state,
            country: data.country
          });
          
          // Log that we found and updated an existing guest
          SecureLogger.info('Existing guest profile updated during check-in', {
            guestId: existingGuest.id,
            checkInId: data.id
          });
        } else {
          // Create new guest profile
          const newGuest = await GuestProfileService.createGuestProfile({
            name: fullName,
            email: data.email,
            phone: data.phone,
            address: data.address,
            city: data.city,
            state: data.state,
            country: data.country,
            email_marketing_consent: data.marketingConsent || false,
            sms_marketing_consent: data.marketingConsent || false,
            data_retention_consent: true
          });
          guestProfileId = newGuest.id;
        }
      } catch (guestError) {
        // Log guest profile error but don't fail the check-in
        SecureLogger.warn('Guest profile creation/update failed', {
          checkInId: data.id,
          error: guestError instanceof Error ? guestError.message : 'Unknown error'
        });
      }

      // Handle ID photo upload if present
      if (data.idPhotos && data.idPhotos.length > 0) {
        try {
          const uploadResults = await StorageService.uploadFiles(data.idPhotos, data.id || '');
          const uploadedUrls = uploadResults.filter(result => result.success).map(result => result.url).filter(Boolean) as string[];
          
          // Log successful photo upload
          SecureLogger.info('ID photos uploaded successfully', {
            checkInId: data.id,
            photoCount: uploadedUrls.length
          });

          // Remove file objects and add uploaded URLs and guest profile ID
          const { idPhotos, ...submissionData } = data;
          const finalData = {
            ...submissionData,
            id_photo_urls: uploadedUrls,
            guest_profile_id: guestProfileId
          };

          await onSubmit(finalData);
          
          // Record successful submission
          await ServerRateLimiter.recordAttempt('checkin-submission', identifier, true, undefined, userAgent);
        } catch (uploadError) {
          // Log upload failure
          SecureLogger.warn('ID photo upload failed', {
            checkInId: data.id,
            error: uploadError instanceof Error ? uploadError.message : 'Unknown error'
          });
          
          // Record failed submission
          await ServerRateLimiter.recordAttempt('checkin-submission', identifier, false, undefined, userAgent);
          throw uploadError;
        }
      } else {
        // No photos to upload, submit directly
        const { idPhotos, ...submissionData } = data;
        const finalData = {
          ...submissionData,
          guest_profile_id: guestProfileId
        };
        await onSubmit(finalData);
        
        // Record successful submission
        await ServerRateLimiter.recordAttempt('checkin-submission', identifier, true, undefined, userAgent);
      }
    } catch (error) {
      // Record failed submission for rate limiting
      const identifier = bookingId || data.email || 'anonymous';
      const userAgent = navigator.userAgent;
      await ServerRateLimiter.recordAttempt('checkin-submission', identifier, false, undefined, userAgent);
      
      // Use ErrorHandler for consistent error management
      const handledError = ErrorHandler.handle(error, 'checkin-form-submission', {
        userId: data.id,
        action: 'form-submit'
      });

      if (!externalErrorHandling) {
        showError('Submission Failed', handledError.userMessage);
        setSubmitStatus('error');
      } else {
        throw handledError;
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Update form when initialData changes
  useEffect(() => {
    if (initialData) {
      reset(initialData);
    }
  }, [initialData, reset]);

  if (submitStatus === 'success') {
    return (
      <div className="text-center py-12">
        <div className="floating-element text-6xl mb-8">✨</div>
        <h2 className="dancing-script text-4xl font-bold text-[var(--text-secondary)] mb-4">{t('messages.checkInSuccess')}</h2>
        <p className="text-xl text-[var(--text-primary)] mb-8 leading-relaxed">{t('messages.thankYou')}</p>
        
        <div className="ethereal-card rounded-3xl p-8 max-w-md mx-auto">
          <div className="flex items-center justify-center mb-4">
            <div className="ethereal-section-icon p-3 mr-3">
              <svg className="w-6 h-6 text-[var(--mist-blue)]" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 2L3 7v11a1 1 0 001 1h3v-6h6v6h3a1 1 0 001-1V7l-7-5z"/>
              </svg>
            </div>
            <span className="text-lg font-semibold text-[var(--text-secondary)]">Welcome to Your Stay!</span>
          </div>
          <p className="text-[var(--text-primary)] leading-relaxed">
            Your check-in is complete. We hope you enjoy your experience with us.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Header with language selector */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-8">
        <div>
          <h2 className="dancing-script text-3xl font-bold text-[var(--text-secondary)] mb-2">{t('form.title')}</h2>
          <p className="text-[var(--text-primary)] text-lg">Please fill in all required information</p>
          <div className="mt-2 text-sm text-[var(--text-primary)]/70 flex items-center">
            <svg className="w-4 h-4 mr-1.5 text-[var(--sky-blue)]" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            We'll automatically link your information to any existing guest profile
          </div>
        </div>
        <div className="ethereal-glass rounded-2xl p-2">
          <LanguageSelector
            currentLanguage={currentLanguage}
            onLanguageChange={handleLanguageChange}
            isLoading={isTranslating}
            className="w-48"
          />
        </div>
      </div>


      
      {/* Translation error */}
      {translationError && (
        <div className="bg-gradient-to-r from-[var(--gentle-purple)]/20 to-[var(--mist-blue)]/20 border border-[var(--gentle-purple)]/30 text-[var(--text-primary)] px-6 py-4 rounded-2xl mb-8">
          <div className="flex items-center">
            <div className="ethereal-section-icon p-2 mr-3">
              <svg className="w-5 h-5 text-[var(--gentle-purple)]" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <span className="font-medium">{t('messages.translationUnavailable')}</span>
          </div>
        </div>
      )}
      


      {/* Form submission error */}
      {submitStatus === 'error' && !externalErrorHandling && (
        <div className="ethereal-error border border-red-200 text-red-700 px-6 py-4 rounded-2xl mb-8">
          <div className="flex items-center">
            <div className="ethereal-section-icon p-2 mr-3">
              <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <span className="font-medium">{t('messages.submitError')}</span>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6 sm:space-y-8">
        {/* Personal Details Section */}
        <div className="ethereal-card rounded-2xl sm:rounded-3xl mx-0">
          <div className="ethereal-section-header">
            <div className="flex items-center text-white">
              <div className="ethereal-section-icon mr-3">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                </svg>
              </div>
              <h2 className="text-lg sm:text-xl font-semibold">
                {t('form.sections.personalDetails')}
              </h2>
            </div>
          </div>
          <div className="p-4 sm:p-8">
            <div className="space-y-6">
              <div className="relative">
                <input
                  type="text"
                  {...register('firstName', { 
                    required: t('form.validation.required')
                  })}
                  className="ethereal-input peer placeholder-transparent"
                  placeholder={t('form.fields.firstName')}
                />
                <label className="ethereal-label peer-placeholder-shown:text-base peer-placeholder-shown:text-[var(--text-primary)]/60 peer-placeholder-shown:top-4 peer-focus:-top-2.5 peer-focus:text-sm peer-focus:text-[var(--sky-blue)] peer-[:not(:placeholder-shown)]:-top-2.5 peer-[:not(:placeholder-shown)]:text-sm peer-[:not(:placeholder-shown)]:text-[var(--sky-blue)]">
                  {t('form.fields.firstName')} *
                </label>
                {errors.firstName && (
                  <p className="text-red-500 text-sm mt-2 flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {errors.firstName.message}
                  </p>
                )}
              </div>

              <div className="relative">
                <input
                  type="text"
                  {...register('lastName', { 
                    required: t('form.validation.required')
                  })}
                  className="ethereal-input peer placeholder-transparent"
                  placeholder={t('form.fields.lastName')}
                />
                <label className="ethereal-label peer-placeholder-shown:text-base peer-placeholder-shown:text-[var(--text-primary)]/60 peer-placeholder-shown:top-4 peer-focus:-top-2.5 peer-focus:text-sm peer-focus:text-[var(--sky-blue)] peer-[:not(:placeholder-shown)]:-top-2.5 peer-[:not(:placeholder-shown)]:text-sm peer-[:not(:placeholder-shown)]:text-[var(--sky-blue)]">
                  {t('form.fields.lastName')} *
                </label>
                {errors.lastName && (
                  <p className="text-red-500 text-sm mt-2 flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {errors.lastName.message}
                  </p>
                )}
              </div>

              <div className="relative">
                <input
                  type="email"
                  {...register('email', { 
                    required: t('form.validation.required'),
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: t('form.validation.invalidEmail')
                    }
                  })}
                  className="ethereal-input peer placeholder-transparent"
                  placeholder={t('form.fields.email')}
                />
                <label className="ethereal-label peer-placeholder-shown:text-base peer-placeholder-shown:text-[var(--text-primary)]/60 peer-placeholder-shown:top-4 peer-focus:-top-2.5 peer-focus:text-sm peer-focus:text-[var(--sky-blue)] peer-[:not(:placeholder-shown)]:-top-2.5 peer-[:not(:placeholder-shown)]:text-sm peer-[:not(:placeholder-shown)]:text-[var(--sky-blue)]">
                  {t('form.fields.email')} *
                </label>
                {errors.email && (
                  <p className="text-red-500 text-sm mt-2 flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {errors.email.message}
                  </p>
                )}
              </div>

              <div className="relative">
                <input
                  type="tel"
                  {...register('phone', { 
                    required: t('form.validation.required'),
                    pattern: {
                      value: /^[+]?[\d\s\-()]{10,}$/,
                      message: t('form.validation.invalidPhone')
                    }
                  })}
                  className="ethereal-input peer placeholder-transparent"
                  placeholder={t('form.fields.phone')}
                />
                <label className="ethereal-label peer-placeholder-shown:text-base peer-placeholder-shown:text-[var(--text-primary)]/60 peer-placeholder-shown:top-4 peer-focus:-top-2.5 peer-focus:text-sm peer-focus:text-[var(--sky-blue)] peer-[:not(:placeholder-shown)]:-top-2.5 peer-[:not(:placeholder-shown)]:text-sm peer-[:not(:placeholder-shown)]:text-[var(--sky-blue)]">
                  {t('form.fields.phone')} *
                </label>
                {errors.phone && (
                  <p className="text-red-500 text-sm mt-2 flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {errors.phone.message}
                  </p>
                )}
              </div>

              <div className="relative">
                <textarea
                  {...register('address', { 
                    required: t('form.validation.required')
                  })}
                  className="ethereal-textarea peer placeholder-transparent resize-none h-24"
                  placeholder={t('form.fields.address')}
                />
                <label className="ethereal-label peer-placeholder-shown:text-base peer-placeholder-shown:text-[var(--text-primary)]/60 peer-placeholder-shown:top-4 peer-focus:-top-2.5 peer-focus:text-sm peer-focus:text-[var(--sky-blue)] peer-[:not(:placeholder-shown)]:-top-2.5 peer-[:not(:placeholder-shown)]:text-sm peer-[:not(:placeholder-shown)]:text-[var(--sky-blue)]">
                  {t('form.fields.address')} *
                </label>
                {errors.address && (
                  <p className="text-red-500 text-sm mt-2 flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {errors.address.message}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ID Verification Section */}
        <div className="ethereal-card rounded-2xl sm:rounded-3xl mx-0">
          <div className="ethereal-section-header bg-gradient-to-r from-[var(--mist-blue)] to-[var(--sky-blue)]">
            <div className="flex items-center text-white">
              <div className="ethereal-section-icon mr-3">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                </svg>
              </div>
              <h2 className="text-lg sm:text-xl font-semibold">
                {t('form.sections.idVerification')}
              </h2>
            </div>
          </div>
          <div className="p-4 sm:p-8">
            <div className="mb-6">
              <div className="relative">
                <select
                  {...register('idType', { 
                    required: t('form.validation.required')
                  })}
                  className="ethereal-select peer"
                >
                  <option value="">{t('placeholders.selectIdType')}</option>
                  <option value="passport">{t('form.idTypes.passport')}</option>
                  <option value="aadhaar">{t('form.idTypes.aadhaar')}</option>
                  <option value="pan_card">{t('form.idTypes.panCard')}</option>
                  <option value="driving_license">{t('form.idTypes.drivingLicense')}</option>
                  <option value="voter_id">{t('form.idTypes.voterId')}</option>
                  <option value="ration_card">{t('form.idTypes.rationCard')}</option>
                  <option value="other">{t('form.idTypes.other')}</option>
                </select>
                <label className="absolute left-4 top-2 text-xs font-medium text-[var(--sky-blue)] transition-all duration-200">
                  {t('form.fields.idType')} *
                </label>
                {errors.idType && (
                  <div className="mt-2 flex items-center text-red-600">
                    <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <p className="text-sm">{errors.idType.message}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-3">
                {t('form.fields.uploadIdPhotos')} *
              </label>
              <div className="ethereal-upload-area">
                <IDPhotoUpload
                  onPhotosChange={(files: File[]) => setValue('idPhotos', files)}
                />
              </div>
              {errors.idPhotos && (
                <div className="mt-2 flex items-center text-red-600">
                  <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <p className="text-sm">{errors.idPhotos.message}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Emergency Contact Section */}
        <div className="ethereal-card rounded-2xl sm:rounded-3xl mx-0">
          <div className="ethereal-section-header bg-gradient-to-r from-[var(--gentle-purple)] to-[var(--mist-blue)]">
            <div className="flex items-center text-white">
              <div className="ethereal-section-icon mr-3">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                </svg>
              </div>
              <h2 className="text-lg sm:text-xl font-semibold">
                {t('form.sections.emergencyContact')}
              </h2>
            </div>
          </div>
          <div className="p-4 sm:p-8">
            <div className="space-y-6">
              <div className="relative">
                <input
                  type="text"
                  {...register('emergencyContactName', { 
                    required: t('form.validation.required')
                  })}
                  className="ethereal-input peer placeholder-transparent"
                  placeholder={t('form.fields.emergencyContactName')}
                />
                <label className="ethereal-label peer-placeholder-shown:text-base peer-placeholder-shown:text-[var(--text-primary)]/60 peer-placeholder-shown:top-4 peer-focus:-top-2.5 peer-focus:text-sm peer-focus:text-[var(--gentle-purple)] peer-[:not(:placeholder-shown)]:-top-2.5 peer-[:not(:placeholder-shown)]:text-sm peer-[:not(:placeholder-shown)]:text-[var(--gentle-purple)]">
                  {t('form.fields.emergencyContactName')} *
                </label>
                {errors.emergencyContactName && (
                  <div className="mt-2 flex items-center text-red-600">
                    <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <p className="text-sm">{errors.emergencyContactName.message}</p>
                  </div>
                )}
              </div>

              <div className="relative">
                <input
                  type="tel"
                  {...register('emergencyContactPhone', { 
                    required: t('form.validation.required'),
                    pattern: {
                      value: /^[+]?[\d\s\-()]{10,}$/,
                      message: t('form.validation.invalidPhone')
                    }
                  })}
                  className="ethereal-input peer placeholder-transparent"
                  placeholder={t('form.fields.emergencyContactPhone')}
                />
                <label className="ethereal-label peer-placeholder-shown:text-base peer-placeholder-shown:text-[var(--text-primary)]/60 peer-placeholder-shown:top-4 peer-focus:-top-2.5 peer-focus:text-sm peer-focus:text-[var(--gentle-purple)] peer-[:not(:placeholder-shown)]:-top-2.5 peer-[:not(:placeholder-shown)]:text-sm peer-[:not(:placeholder-shown)]:text-[var(--gentle-purple)]">
                  {t('form.fields.emergencyContactPhone')} *
                </label>
                {errors.emergencyContactPhone && (
                  <div className="mt-2 flex items-center text-red-600">
                    <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <p className="text-sm">{errors.emergencyContactPhone.message}</p>
                  </div>
                )}
              </div>

              <div className="relative">
                <input
                  type="text"
                  {...register('emergencyContactRelation', { 
                    required: t('form.validation.required')
                  })}
                  className="ethereal-input peer placeholder-transparent"
                  placeholder={t('form.fields.relationship')}
                />
                <label className="ethereal-label peer-placeholder-shown:text-base peer-placeholder-shown:text-[var(--text-primary)]/60 peer-placeholder-shown:top-4 peer-focus:-top-2.5 peer-focus:text-sm peer-focus:text-[var(--gentle-purple)] peer-[:not(:placeholder-shown)]:-top-2.5 peer-[:not(:placeholder-shown)]:text-sm peer-[:not(:placeholder-shown)]:text-[var(--gentle-purple)]">
                  {t('form.fields.relationship')} *
                </label>
                {errors.emergencyContactRelation && (
                  <div className="mt-2 flex items-center text-red-600">
                    <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <p className="text-sm">{errors.emergencyContactRelation.message}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Purpose of Visit Section */}
        <div className="ethereal-card rounded-2xl sm:rounded-3xl mx-0">
          <div className="ethereal-section-header bg-gradient-to-r from-[var(--sky-blue)] to-[var(--gentle-purple)]">
            <div className="flex items-center text-white">
              <div className="ethereal-section-icon mr-3">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                </svg>
              </div>
              <h2 className="text-lg sm:text-xl font-semibold">
                {t('form.sections.purposeOfVisit')}
              </h2>
            </div>
          </div>
          <div className="p-4 sm:p-8">
            <div className="relative">
              <select
                {...register('purposeOfVisit', { required: t('form.validation.required') })}
                className="ethereal-select peer"
              >
                <option value="">{t('placeholders.selectPurpose')}</option>
                <option value="business">{t('form.purposeOptions.business')}</option>
                <option value="leisure">{t('form.purposeOptions.leisure')}</option>
                <option value="medical">{t('form.purposeOptions.medical')}</option>
                <option value="other">{t('form.purposeOptions.other')}</option>
              </select>
              <label className="absolute left-4 top-2 text-xs font-medium text-[var(--gentle-purple)] transition-all duration-200">
                {t('form.fields.purposeOfVisit')} *
              </label>
              {errors.purposeOfVisit && (
                <div className="mt-2 flex items-center text-red-600">
                  <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <p className="text-sm">{errors.purposeOfVisit.message}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Additional Guests Section */}
        <div className="ethereal-card rounded-2xl sm:rounded-3xl mx-0">
          <div className="ethereal-section-header">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between text-white space-y-3 sm:space-y-0">
              <div className="flex items-center">
                <div className="ethereal-section-icon mr-3">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
                  </svg>
                </div>
                <h2 className="text-lg sm:text-xl font-semibold">
                  {t('form.sections.additionalGuests')}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => append({ name: '', age: undefined, relation: '' })}
                className="bg-white/20 hover:bg-white/30 text-white px-3 sm:px-4 py-2 rounded-lg transition-all duration-200 flex items-center space-x-2 text-sm sm:text-base"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
                <span>{t('form.buttons.addGuest')}</span>
              </button>
            </div>
          </div>
          <div className="p-4 sm:p-8">
            {fields.length === 0 ? (
              <div className="text-center py-8">
                <svg className="w-12 h-12 mx-auto text-gray-400 mb-3" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
                </svg>
                <p className="text-gray-500">{t('messages.noAdditionalGuests')}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {fields.map((field, index) => (
                  <div key={field.id} className="ethereal-glass rounded-xl p-4 border border-white/30">
                    <div className="flex gap-3 items-center">
                      <div className="flex-1 relative">
                        <input
                          type="text"
                          {...register(`additionalGuests.${index}.name` as const)}
                          className="ethereal-input peer placeholder-transparent"
                          placeholder={`Guest ${index + 1} Name`}
                        />
                        <label className="ethereal-label peer-placeholder-shown:text-base peer-placeholder-shown:text-[var(--text-primary)]/60 peer-placeholder-shown:top-4 peer-focus:-top-2.5 peer-focus:text-sm peer-focus:text-[var(--sky-blue)] peer-[:not(:placeholder-shown)]:-top-2.5 peer-[:not(:placeholder-shown)]:text-sm peer-[:not(:placeholder-shown)]:text-[var(--sky-blue)]">
                          Guest {index + 1} Name
                        </label>
                      </div>
                      <button
                        type="button"
                        onClick={() => remove(index)}
                        className="px-4 py-3 bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white rounded-lg transition-all duration-200 text-sm font-medium flex items-center space-x-2 shadow-lg hover:shadow-xl transform hover:scale-105"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                        <span>Remove</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Submit Button */}
        <div className="ethereal-card rounded-2xl sm:rounded-3xl mx-0 p-4 sm:p-8">
          <button
            type="submit"
            disabled={isSubmitting}
            className="ethereal-button w-full py-3 sm:py-4 px-6 sm:px-8 text-base sm:text-lg font-semibold flex items-center justify-center space-x-3"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>{t('form.buttons.submitting')}</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span>{t('form.buttons.submitCheckIn')}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </>
  );
};