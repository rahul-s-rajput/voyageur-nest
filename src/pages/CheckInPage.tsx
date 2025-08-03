import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CheckInForm } from '../components/CheckInForm';
import { checkInService, bookingService } from '../lib/supabase';
import { CheckInFormData, CheckInData } from '../types/checkin';
import { Booking } from '../types/booking';
import { useTranslation } from '../hooks/useTranslation';
import EtherealHero from '../components/EtherealHero';
import { useNotification } from '../components/NotificationContainer';

interface CheckInPageProps {
  language?: string;
}

export const CheckInPage: React.FC<CheckInPageProps> = ({ language = 'en-US' }) => {
  const { bookingId } = useParams<{ bookingId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation(language);
  const { showSuccess, showError, showWarning } = useNotification();
  
  const [booking, setBooking] = useState<Booking | null>(null);
  const [existingCheckIn, setExistingCheckIn] = useState<CheckInData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const loadBookingData = useCallback(async () => {
    if (!bookingId) {
      setError('Invalid booking ID');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // Load booking details
      const bookingData = await bookingService.getBookingById(bookingId);
      if (!bookingData) {
        setError('Booking not found');
        setLoading(false);
        return;
      }
      
      setBooking(bookingData);
      
      // Check if check-in data already exists
      const checkInData = await checkInService.getCheckInDataByBookingId(bookingId);
      setExistingCheckIn(checkInData);
      
      setLoading(false);
    } catch (error) {
      console.error('Error loading booking data:', error);
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Failed to load booking information. Please check the link and try again.';
      setError(errorMessage);
      showError('Loading Error', errorMessage);
    } finally {
      setLoading(false);
    }
  }, [bookingId]);

  useEffect(() => {
    if (bookingId) {
      loadBookingData();
    }
  }, [bookingId, loadBookingData]);

  const handleFormSubmit = async (formData: CheckInFormData) => {
    if (!bookingId) return;

    try {
      setSubmitting(true);
      setSubmissionError(null);
      
      if (existingCheckIn) {
        const result = await checkInService.updateCheckInData(existingCheckIn.id, formData);
        if (result) {
          setSuccess(true);
          setExistingCheckIn(result);
        } else {
          throw new Error('Failed to update check-in data');
        }
      } else {
        const result = await checkInService.createCheckInData(bookingId, formData);
        if (result) {
          setSuccess(true);
          setExistingCheckIn(result);
          showSuccess('Check-in Complete!', 'Your check-in has been successfully submitted. Welcome to your stay!');
        } else {
          throw new Error('Failed to save check-in data');
        }
      }
    } catch (error) {
      console.error('Error submitting check-in form:', error);
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Failed to submit check-in form. Please try again.';
      setSubmissionError(errorMessage);
      showError('Submission Failed', errorMessage);
      throw error;
    } finally {
      setSubmitting(false);
    }
  };

  const getInitialFormData = (booking: Booking, existingCheckIn?: CheckInData): CheckInFormData => {
    return {
      firstName: existingCheckIn?.firstName || booking.guestName.split(' ')[0] || '',
      lastName: existingCheckIn?.lastName || booking.guestName.split(' ').slice(1).join(' ') || '',
      email: existingCheckIn?.email || booking.contactEmail || '',
      phone: existingCheckIn?.phone || booking.contactPhone || '',
      dateOfBirth: existingCheckIn?.dateOfBirth || '',
      nationality: existingCheckIn?.nationality || '',
      idType: existingCheckIn?.idType || 'passport',
      idNumber: existingCheckIn?.idNumber || '',
      address: existingCheckIn?.address || '',
      city: existingCheckIn?.city || '',
      state: existingCheckIn?.state || '',
      country: existingCheckIn?.country || '',
      zipCode: existingCheckIn?.zipCode || '',
      emergencyContactName: existingCheckIn?.emergencyContactName || '',
      emergencyContactPhone: existingCheckIn?.emergencyContactPhone || '',
      emergencyContactRelation: existingCheckIn?.emergencyContactRelation || '',
      purposeOfVisit: existingCheckIn?.purposeOfVisit || 'leisure',
      arrivalDate: existingCheckIn?.arrivalDate || booking.checkIn || '',
      departureDate: existingCheckIn?.departureDate || booking.checkOut || '',
      roomNumber: existingCheckIn?.roomNumber || booking.roomNo || '',
      numberOfGuests: existingCheckIn?.numberOfGuests || booking.noOfPax || 1,
      additionalGuests: existingCheckIn?.additionalGuests || [],
      specialRequests: existingCheckIn?.specialRequests || booking.specialRequests || '',
      preferences: existingCheckIn?.preferences || {
        wakeUpCall: false,
        newspaper: false,
        extraTowels: false,
        extraPillows: false,
        roomService: false,
        doNotDisturb: false,
      },
      termsAccepted: existingCheckIn?.termsAccepted || false,
      marketingConsent: existingCheckIn?.marketingConsent || false,
    };
  };

  if (loading) {
    return (
      <div className="min-h-screen relative bg-gradient-to-b from-[#F8FBFF] via-[#F0F8FF] to-[#F5F8FF] flex items-center justify-center">
        {/* Subtle background elements */}
        <div className="absolute top-20 left-10 opacity-5">
          <svg width="120" height="120" viewBox="0 0 120 120" fill="none">
            <path d="M20 90 L40 50 L60 70 L80 40 L100 90 Z" fill="rgba(168,208,230,0.3)"/>
          </svg>
        </div>
        <div className="absolute bottom-20 right-20 opacity-4">
          <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
            <path d="M40 10 L30 30 L50 30 Z" fill="rgba(200,230,245,0.2)"/>
            <rect x="36" y="30" width="8" height="16" fill="rgba(139,69,19,0.1)"/>
          </svg>
        </div>
        <div className="relative z-10 text-center ethereal-glass rounded-3xl p-12 max-w-md mx-auto">
          <div className="relative">
            <div className="animate-spin rounded-full h-20 w-20 border-4 border-transparent border-t-[var(--mist-blue)] mx-auto"></div>
            <div className="absolute inset-0 rounded-full border-4 border-[var(--sky-blue)] opacity-20"></div>
          </div>
          <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-2 mt-6">Welcome to Your Check-In</h3>
          <p className="text-[var(--text-primary)] font-medium text-lg">
            {t('checkInPage.loading')}
          </p>
          <div className="mt-4 flex justify-center space-x-1">
            <div className="w-2 h-2 bg-[var(--mist-blue)] rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-[var(--sky-blue)] rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
            <div className="w-2 h-2 bg-[var(--gentle-purple)] rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen relative bg-gradient-to-b from-[#F8FBFF] via-[#F0F8FF] to-[#F5F8FF] flex items-center justify-center p-4">
        {/* Subtle background elements */}
        <div className="absolute top-20 right-10 opacity-5">
          <svg width="100" height="100" viewBox="0 0 100 100" fill="none">
            <path d="M50 10 L40 30 L60 30 Z" fill="rgba(168,208,230,0.2)"/>
            <path d="M50 24 L36 44 L64 44 Z" fill="rgba(168,208,230,0.15)"/>
          </svg>
        </div>
        <div className="absolute bottom-20 left-20 opacity-4">
          <svg width="60" height="60" viewBox="0 0 60 60" fill="none">
            <path d="M30 5 L30 55 M5 30 L55 30" stroke="rgba(200,230,245,0.2)" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </div>
        <div className="relative z-10 max-w-md w-full ethereal-glass rounded-3xl p-12 text-center">
          <div className="text-6xl mb-6 floating-element">🏔️</div>
          <h2 className="dancing-script text-3xl font-bold text-[var(--text-secondary)] mb-4">
            {t('checkInPage.error')}
          </h2>
          <p className="text-[var(--text-primary)] mb-8 leading-relaxed">{error}</p>
          <div className="bg-[var(--soft-gray)]/30 rounded-xl p-4 border border-[var(--sky-blue)]/20">
            <div className="flex items-center justify-center mb-2">
              <svg className="w-5 h-5 text-[var(--mist-blue)] mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"/>
              </svg>
              <span className="text-sm font-medium text-[var(--text-primary)]">Need Assistance?</span>
            </div>
            <p className="text-sm text-[var(--text-primary)] mb-2">
              {t('checkInPage.canClosePageNow')}
            </p>
            <p className="text-xs text-[var(--misty-gray)]">
              {t('checkInPage.processCompleted')}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen relative bg-gradient-to-b from-[#F8FBFF] via-[#F0F8FF] to-[#F5F8FF] flex items-center justify-center p-4">
        {/* Celebratory background elements */}
        <div className="absolute top-16 left-16 opacity-6">
          <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
            <path d="M40 10 L30 30 L50 30 Z" fill="rgba(168,208,230,0.3)"/>
            <path d="M40 24 L26 44 L54 44 Z" fill="rgba(168,208,230,0.2)"/>
          </svg>
        </div>
        <div className="absolute top-20 right-16 opacity-5">
          <svg width="60" height="60" viewBox="0 0 60 60" fill="none">
            <path d="M30 5 L30 55 M5 30 L55 30 M15 15 L45 45 M45 15 L15 45" 
                  stroke="rgba(200,230,245,0.3)" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </div>
        <div className="absolute bottom-20 left-1/4 opacity-4">
          <svg width="100" height="40" viewBox="0 0 100 40" fill="none">
            <path d="M15,30 Q5,15 20,15 Q25,5 40,15 Q55,5 70,15 Q85,5 95,15 Q100,25 85,30 Z" 
                  fill="rgba(168,208,230,0.2)" />
          </svg>
        </div>
        <div className="relative z-10 max-w-lg w-full ethereal-glass rounded-3xl p-12 text-center">
          <div className="text-6xl mb-6 floating-element">✨</div>
          <h2 className="dancing-script text-4xl font-bold text-[var(--text-secondary)] mb-4">
            {t('checkInPage.checkInComplete')}
          </h2>
          <p className="text-lg text-[var(--text-primary)] mb-8 leading-relaxed">
            {t('checkInPage.checkInSuccess')}
          </p>
          
          <div className="bg-gradient-to-r from-[var(--mist-blue)]/20 to-[var(--sky-blue)]/20 rounded-xl p-6 border border-[var(--sky-blue)]/30 mb-6">
            <div className="flex items-center justify-center mb-3">
              <svg className="w-6 h-6 text-[var(--mist-blue)] mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 2L3 7v11a1 1 0 001 1h3v-6h6v6h3a1 1 0 001-1V7l-7-5z"/>
              </svg>
              <span className="text-lg font-semibold text-[var(--text-secondary)]">Welcome to Your Stay!</span>
            </div>
            <p className="text-[var(--text-primary)] text-sm">
              Your check-in is complete. We hope you enjoy your experience with us.
            </p>
          </div>

          <div className="bg-[var(--soft-gray)]/30 rounded-xl p-4 border border-[var(--sky-blue)]/20">
            <div className="flex items-center justify-center mb-2">
              <svg className="w-5 h-5 text-[var(--text-primary)] mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"/>
              </svg>
              <span className="text-sm font-medium text-[var(--text-primary)]">Next Steps</span>
            </div>
            <p className="text-sm text-[var(--text-primary)] mb-2">
              {t('checkInPage.canClosePageNow')}
            </p>
            <p className="text-xs text-[var(--misty-gray)]">
              {t('checkInPage.processCompleted')}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative">
      {/* Ethereal Hero Section */}
      <EtherealHero 
        title={t('checkInPage.digitalCheckIn')}
        subtitle="Complete your check-in process"
      />

      {/* Complementary Background for Content */}
      <div className="absolute inset-0 top-[400px] bg-gradient-to-b from-[#F8FBFF] via-[#F0F8FF] to-[#F5F8FF] -z-10">
        {/* Subtle floating elements inspired by hero */}
        <div className="absolute top-20 left-10 opacity-5">
          <svg width="120" height="120" viewBox="0 0 120 120" fill="none">
            <path d="M20 90 L40 50 L60 70 L80 40 L100 90 Z" fill="rgba(168,208,230,0.3)"/>
          </svg>
        </div>
        <div className="absolute top-40 right-20 opacity-4">
          <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
            <path d="M40 10 L30 30 L50 30 Z" fill="rgba(200,230,245,0.2)"/>
            <path d="M40 24 L26 44 L54 44 Z" fill="rgba(200,230,245,0.15)"/>
            <rect x="36" y="44" width="8" height="16" fill="rgba(139,69,19,0.1)"/>
          </svg>
        </div>
        <div className="absolute bottom-40 left-1/3 opacity-3">
          <svg width="60" height="60" viewBox="0 0 60 60" fill="none">
            <path d="M30 5 L30 55 M5 30 L55 30 M15 15 L45 45 M45 15 L15 45" 
                  stroke="rgba(168,208,230,0.2)" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </div>
        {/* Subtle cloud patterns */}
        <div className="absolute top-60 right-1/4 opacity-3">
          <svg width="200" height="60" viewBox="0 0 200 60" fill="none">
            <path d="M25,45 Q10,25 30,25 Q40,10 60,25 Q80,10 100,25 Q120,10 140,25 Q160,10 180,25 Q190,35 175,45 Z" 
                  fill="rgba(200,230,245,0.15)" />
          </svg>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 container mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="max-w-5xl mx-auto">

          {/* Status Messages */}
          {existingCheckIn && (
            <div className="mb-6 p-4 bg-[var(--gentle-purple)]/20 border border-[var(--gentle-purple)]/30 rounded-xl">
              <p className="text-sm text-[var(--text-primary)]">
                {t('checkInPage.alreadyCompleted')}
              </p>
            </div>
          )}
          
          {submissionError && (
            <div className="mb-6 p-4 bg-red-100/50 border border-red-200 rounded-xl">
              <p className="text-sm text-red-800">
                {t('checkInPage.errorPrefix')}{submissionError}
              </p>
            </div>
          )}

          {/* Form Container - removed redundant ethereal-card wrapper */}
          <CheckInForm
            language={language}
            onSubmit={handleFormSubmit}
            initialData={booking ? getInitialFormData(booking, existingCheckIn || undefined) : undefined}
            isSubmitting={submitting}
            bookingId={bookingId}
            externalErrorHandling={true}
          />

          
        </div>
      </div>
    </div>
  );
};

export default CheckInPage;