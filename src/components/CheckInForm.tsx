import React, { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { CheckInFormData, CheckInFormProps } from '../types/checkin';
import IDPhotoUpload from './IDPhotoUpload';
import { StorageService } from '../lib/storage';
import { useTranslation } from '../hooks/useTranslation';
import LanguageSelector from './LanguageSelector';

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
  const [showErrorMessage, setShowErrorMessage] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  
  // Initialize translation hook with the current language
  const { t, isLoading: isTranslating, error: translationError, setLanguage, currentLanguage } = useTranslation(language || 'en-US');

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

  const onFormSubmit = async (data: CheckInFormData) => {
    if (externalErrorHandling) {
      // Let parent component handle errors, but still catch them to prevent form success state
      try {
        setSubmitStatus('idle');
        
        // Handle ID photo uploads if present
        let idPhotoUrls: string[] = [];
        if (data.idPhotos && data.idPhotos.length > 0) {
          const tempCheckInId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          const uploadResults = await StorageService.uploadFiles(data.idPhotos, tempCheckInId);
          idPhotoUrls = uploadResults.filter(result => result.success && result.url).map(result => result.url!);
        }
        
        // Prepare data for submission (remove File objects, add URLs)
        const submissionData = {
          ...data,
          idPhotos: undefined, // Remove File objects
          id_photo_urls: idPhotoUrls, // Add uploaded URLs
        };
        
        await onSubmit(submissionData);
        setSubmitStatus('success');
        // Reset form after successful submission
        setTimeout(() => {
          reset();
          setSubmitStatus('idle');
        }, 3000);
      } catch (error) {
        // Don't set error state, parent will handle it
        // Just ensure we don't show success
        setSubmitStatus('idle');
      }
    } else {
      // Handle errors internally (original behavior)
      try {
        setSubmitStatus('idle');
        
        // Handle ID photo uploads if present
        let idPhotoUrls: string[] = [];
        if (data.idPhotos && data.idPhotos.length > 0) {
          const tempCheckInId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          const uploadResults = await StorageService.uploadFiles(data.idPhotos, tempCheckInId);
          idPhotoUrls = uploadResults.filter(result => result.success && result.url).map(result => result.url!);
        }
        
        // Prepare data for submission (remove File objects, add URLs)
        const submissionData = {
          ...data,
          idPhotos: undefined, // Remove File objects
          id_photo_urls: idPhotoUrls, // Add uploaded URLs
        };
        
        await onSubmit(submissionData);
        setSubmitStatus('success');
        // Reset form after successful submission
        setTimeout(() => {
          reset();
          setSubmitStatus('idle');
        }, 3000);
      } catch (error) {
        console.error('Error submitting check-in form:', error);
        setSubmitStatus('error');
        setTimeout(() => setSubmitStatus('idle'), 5000);
      }
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full text-center">
          <div className="text-green-500 text-6xl mb-4">✓</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">{t('messages.checkInSuccess')}</h2>
          <p className="text-gray-600">{t('messages.thankYou')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header with language selector */}
        <div className="bg-white rounded-lg shadow-lg mb-6 p-6">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800">{t('form.title')}</h1>
            <LanguageSelector
              currentLanguage={currentLanguage}
              onLanguageChange={handleLanguageChange}
              isLoading={isTranslating}
              className="w-48"
            />
          </div>
          
          {/* Translation error */}
          {translationError && (
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded-lg mb-4">
              {t('messages.translationUnavailable')}
            </div>
          )}
          
          {/* Form submission error */}
          {submitStatus === 'error' && !externalErrorHandling && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
              {t('messages.submitError')}
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
          {/* Personal Details Section */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 border-b pb-2">
              {t('form.sections.personalDetails')}
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('form.fields.firstName')} *
                </label>
                <input
                  type="text"
                  {...register('firstName', { 
                    required: t('form.validation.required')
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={t('form.fields.firstName')}
                />
                {errors.firstName && (
                  <p className="text-red-500 text-sm mt-1">{errors.firstName.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('form.fields.lastName')} *
                </label>
                <input
                  type="text"
                  {...register('lastName', { 
                    required: t('form.validation.required')
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={t('form.fields.lastName')}
                />
                {errors.lastName && (
                  <p className="text-red-500 text-sm mt-1">{errors.lastName.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('form.fields.email')} *
                </label>
                <input
                  type="email"
                  {...register('email', { 
                    required: t('form.validation.required'),
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: t('form.validation.invalidEmail')
                    }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={t('form.fields.email')}
                />
                {errors.email && (
                  <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('form.fields.phone')} *
                </label>
                <input
                  type="tel"
                  {...register('phone', { 
                    required: t('form.validation.required'),
                    pattern: {
                      value: /^[+]?[\d\s\-()]{10,}$/,
                      message: t('form.validation.invalidPhone')
                    }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={t('form.fields.phone')}
                />
                {errors.phone && (
                  <p className="text-red-500 text-sm mt-1">{errors.phone.message}</p>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('form.fields.address')} *
                </label>
                <textarea
                  {...register('address', { 
                    required: t('form.validation.required')
                  })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={t('form.fields.address')}
                />
                {errors.address && (
                  <p className="text-red-500 text-sm mt-1">{errors.address.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* ID Verification Section */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 border-b pb-2">
              {t('form.sections.idVerification')}
            </h2>
            
            <div className="mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('form.fields.idType')} *
                </label>
                <select
                  {...register('idType', { 
                    required: t('form.validation.required')
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                {errors.idType && (
                  <p className="text-red-500 text-sm mt-1">{errors.idType.message}</p>
                )}
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('form.fields.uploadIdPhotos')} *
              </label>
              <IDPhotoUpload
                onPhotosChange={(photos) => setValue('idPhotos', photos)}
              />
            </div>
          </div>

          {/* Emergency Contact Section */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 border-b pb-2">
              {t('form.sections.emergencyContact')}
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('form.fields.emergencyContactName')} *
                </label>
                <input
                  type="text"
                  {...register('emergencyContactName', { 
                    required: t('form.validation.required')
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={t('form.fields.emergencyContactName')}
                />
                {errors.emergencyContactName && (
                  <p className="text-red-500 text-sm mt-1">{errors.emergencyContactName.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('form.fields.emergencyContactPhone')} *
                </label>
                <input
                  type="tel"
                  {...register('emergencyContactPhone', { 
                    required: t('form.validation.required'),
                    pattern: {
                      value: /^[+]?[\d\s\-()]{10,}$/,
                      message: t('form.validation.invalidPhone')
                    }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={t('form.fields.emergencyContactPhone')}
                />
                {errors.emergencyContactPhone && (
                  <p className="text-red-500 text-sm mt-1">{errors.emergencyContactPhone.message}</p>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('form.fields.relationship')} *
                </label>
                <input
                  type="text"
                  {...register('emergencyContactRelation', { 
                    required: t('form.validation.required')
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={t('form.fields.relationship')}
                />
                {errors.emergencyContactRelation && (
                  <p className="text-red-500 text-sm mt-1">{errors.emergencyContactRelation.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Purpose of Visit Section */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 border-b pb-2">
              {t('form.sections.purposeOfVisit')}
            </h2>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('form.fields.purposeOfVisit')} *
              </label>
              <select
                {...register('purposeOfVisit', { 
                  required: t('form.validation.required')
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">{t('placeholders.selectPurpose')}</option>
                <option value="leisure">{t('form.purposeOptions.leisure')}</option>
                <option value="business">{t('form.purposeOptions.business')}</option>
                <option value="family">{t('form.purposeOptions.family')}</option>
                <option value="medical">{t('form.purposeOptions.medical')}</option>
                <option value="other">{t('form.purposeOptions.other')}</option>
              </select>
              {errors.purposeOfVisit && (
                <p className="text-red-500 text-sm mt-1">{errors.purposeOfVisit.message}</p>
              )}
            </div>
          </div>

          {/* Additional Guests Section */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex justify-between items-center mb-4 border-b pb-2">
              <h2 className="text-xl font-semibold text-gray-800">
                {t('form.sections.additionalGuests')}
              </h2>
              <button
                type="button"
                onClick={() => append({ name: '', age: undefined, relation: '' })}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
              >
                {t('form.buttons.addGuest')}
              </button>
            </div>
            
            {fields.length === 0 ? (
              <p className="text-gray-500 text-center py-4">{t('messages.noAdditionalGuests')}</p>
            ) : (
              <div className="space-y-3">
                {fields.map((field, index) => (
                  <div key={field.id} className="flex gap-3 items-center">
                    <input
                      type="text"
                      {...register(`additionalGuests.${index}.name` as const)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder={t('placeholders.guestName', { number: (index + 1).toString() })}
                    />
                    <button
                      type="button"
                      onClick={() => remove(index)}
                      className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                    >
                      {t('form.buttons.removeGuest')}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Terms and Conditions */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="space-y-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  {...register('termsAccepted', { required: t('form.validation.termsRequired') })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label className="ml-2 block text-sm text-gray-900">
                  {t('form.fields.termsAccepted')} *
                </label>
              </div>
              {errors.termsAccepted && (
                <p className="text-red-500 text-sm">{errors.termsAccepted.message}</p>
              )}
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  {...register('marketingConsent')}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label className="ml-2 block text-sm text-gray-900">
                  {t('form.fields.marketingConsent')}
                </label>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium text-lg"
            >
              {isSubmitting ? t('form.buttons.submitting') : t('form.buttons.submitCheckIn')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};