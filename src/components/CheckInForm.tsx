import React, { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { CheckInFormData, CheckInFormProps, CheckInFormTranslations } from '../types/checkin';

const translations: CheckInFormTranslations = {
  en: {
    title: 'Digital Check-in Form',
    personalDetails: 'Personal Details',
    name: 'Full Name',
    email: 'Email Address',
    phone: 'Phone Number',
    address: 'Address',
    emergencyContact: 'Emergency Contact',
    emergencyName: 'Emergency Contact Name',
    emergencyPhone: 'Emergency Contact Phone',
    relationship: 'Relationship',
    purposeOfVisit: 'Purpose of Visit',
    additionalGuests: 'Additional Guests',
    addGuest: 'Add Guest',
    removeGuest: 'Remove',
    submit: 'Complete Check-in',
    submitting: 'Submitting...',
    success: 'Check-in completed successfully!',
    error: 'Error submitting form. Please try again.',
    required: 'This field is required',
    invalidEmail: 'Please enter a valid email address',
    invalidPhone: 'Please enter a valid phone number',
    languageSwitch: 'हिंदी'
  },
  hi: {
    title: 'डिजिटल चेक-इन फॉर्म',
    personalDetails: 'व्यक्तिगत विवरण',
    name: 'पूरा नाम',
    email: 'ईमेल पता',
    phone: 'फोन नंबर',
    address: 'पता',
    emergencyContact: 'आपातकालीन संपर्क',
    emergencyName: 'आपातकालीन संपर्क का नाम',
    emergencyPhone: 'आपातकालीन संपर्क फोन',
    relationship: 'रिश्ता',
    purposeOfVisit: 'यात्रा का उद्देश्य',
    additionalGuests: 'अतिरिक्त मेहमान',
    addGuest: 'मेहमान जोड़ें',
    removeGuest: 'हटाएं',
    submit: 'चेक-इन पूरा करें',
    submitting: 'जमा कर रहे हैं...',
    success: 'चेक-इन सफलतापूर्वक पूरा हुआ!',
    error: 'फॉर्म जमा करने में त्रुटि। कृपया पुनः प्रयास करें।',
    required: 'यह फील्ड आवश्यक है',
    invalidEmail: 'कृपया एक वैध ईमेल पता दर्ज करें',
    invalidPhone: 'कृपया एक वैध फोन नंबर दर्ज करें',
    languageSwitch: 'English'
  }
};

export const CheckInForm: React.FC<CheckInFormProps> = ({
  bookingId,
  onSubmit,
  initialData,
  isSubmitting = false,
  language = 'en',
  onLanguageChange,
  externalErrorHandling = false
}) => {
  const [currentLanguage, setCurrentLanguage] = useState<'en' | 'hi'>(language);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const t = translations[currentLanguage];

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
      idNumber: '',
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

  const handleLanguageToggle = () => {
    const newLanguage = currentLanguage === 'en' ? 'hi' : 'en';
    setCurrentLanguage(newLanguage);
    onLanguageChange?.(newLanguage);
  };

  const onFormSubmit = async (data: CheckInFormData) => {
    if (externalErrorHandling) {
      // Let parent component handle errors, but still catch them to prevent form success state
      try {
        setSubmitStatus('idle');
        await onSubmit(data);
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
        await onSubmit(data);
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
          <h2 className="text-2xl font-bold text-gray-800 mb-2">{t.success}</h2>
          <p className="text-gray-600">Thank you for completing your check-in.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header with language toggle */}
        <div className="bg-white rounded-lg shadow-lg mb-6 p-6">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800">{t.title}</h1>
            <button
              type="button"
              onClick={handleLanguageToggle}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              {t.languageSwitch}
            </button>
          </div>
          
          {submitStatus === 'error' && !externalErrorHandling && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
              {t.error}
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
          {/* Personal Details Section */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 border-b pb-2">
              {t.personalDetails}
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  First Name *
                </label>
                <input
                  type="text"
                  {...register('firstName', { 
                    required: t.required 
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="First Name"
                />
                {errors.firstName && (
                  <p className="text-red-500 text-sm mt-1">{errors.firstName.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Last Name *
                </label>
                <input
                  type="text"
                  {...register('lastName', { 
                    required: t.required 
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Last Name"
                />
                {errors.lastName && (
                  <p className="text-red-500 text-sm mt-1">{errors.lastName.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t.email} *
                </label>
                <input
                  type="email"
                  {...register('email', { 
                    required: t.required,
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: t.invalidEmail
                    }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={t.email}
                />
                {errors.email && (
                  <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t.phone} *
                </label>
                <input
                  type="tel"
                  {...register('phone', { 
                    required: t.required,
                    pattern: {
                      value: /^[+]?[\d\s\-()]{10,}$/,
                      message: t.invalidPhone
                    }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={t.phone}
                />
                {errors.phone && (
                  <p className="text-red-500 text-sm mt-1">{errors.phone.message}</p>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t.address} *
                </label>
                <textarea
                  {...register('address', { 
                    required: t.required 
                  })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={t.address}
                />
                {errors.address && (
                  <p className="text-red-500 text-sm mt-1">{errors.address.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Emergency Contact Section */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 border-b pb-2">
              {t.emergencyContact}
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t.emergencyName} *
                </label>
                <input
                  type="text"
                  {...register('emergencyContactName', { 
                    required: t.required 
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={t.emergencyName}
                />
                {errors.emergencyContactName && (
                  <p className="text-red-500 text-sm mt-1">{errors.emergencyContactName.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t.emergencyPhone} *
                </label>
                <input
                  type="tel"
                  {...register('emergencyContactPhone', { 
                    required: t.required,
                    pattern: {
                      value: /^[+]?[\d\s\-()]{10,}$/,
                      message: t.invalidPhone
                    }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={t.emergencyPhone}
                />
                {errors.emergencyContactPhone && (
                  <p className="text-red-500 text-sm mt-1">{errors.emergencyContactPhone.message}</p>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t.relationship} *
                </label>
                <input
                  type="text"
                  {...register('emergencyContactRelation', { 
                    required: t.required 
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={t.relationship}
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
              {t.purposeOfVisit}
            </h2>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t.purposeOfVisit} *
              </label>
              <select
                {...register('purposeOfVisit', { 
                  required: t.required 
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select purpose</option>
                <option value="leisure">Tourism / Vacation</option>
                <option value="business">Business</option>
                <option value="family">Family Visit</option>
                <option value="medical">Medical</option>
                <option value="other">Other</option>
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
                {t.additionalGuests}
              </h2>
              <button
                type="button"
                onClick={() => append({ name: '', age: undefined, relation: '' })}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
              >
                {t.addGuest}
              </button>
            </div>
            
            {fields.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No additional guests added</p>
            ) : (
              <div className="space-y-3">
                {fields.map((field, index) => (
                  <div key={field.id} className="flex gap-3 items-center">
                    <input
                      type="text"
                      {...register(`additionalGuests.${index}.name` as const)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder={`Guest ${index + 1} name`}
                    />
                    <button
                      type="button"
                      onClick={() => remove(index)}
                      className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                    >
                      {t.removeGuest}
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
                  {...register('termsAccepted', { required: 'You must accept the terms and conditions' })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label className="ml-2 block text-sm text-gray-900">
                  I accept the terms and conditions *
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
                  I consent to receive marketing communications
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
              {isSubmitting ? t.submitting : t.submit}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};