import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CheckInForm } from '../components/CheckInForm';
import { checkInService, bookingService } from '../lib/supabase';
import { CheckInFormData, CheckInData } from '../types/checkin';
import { Booking } from '../types/booking';

interface CheckInPageProps {
  language?: 'en' | 'hi';
}

export const CheckInPage: React.FC<CheckInPageProps> = ({ language = 'en' }) => {
  const { bookingId } = useParams<{ bookingId: string }>();
  const navigate = useNavigate();
  
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
      setError('Failed to load booking information');
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
      setSubmissionError(null); // Clear any previous submission errors
      
      if (existingCheckIn) {
        // Update existing check-in data
        const result = await checkInService.updateCheckInData(existingCheckIn.id, formData);
        if (result) {
          setSuccess(true);
          setExistingCheckIn(result);
        } else {
          throw new Error('Failed to update check-in data');
        }
      } else {
        // Create new check-in data
        const result = await checkInService.createCheckInData(bookingId, formData);
        if (result) {
          setSuccess(true);
          setExistingCheckIn(result);
        } else {
          throw new Error('Failed to save check-in data');
        }
      }
    } catch (error) {
      console.error('Error submitting check-in form:', error);
      // Set submission error instead of general error to keep user on the form
      setSubmissionError(
        error instanceof Error 
          ? error.message 
          : 'Failed to submit check-in form. Please try again.'
      );
      // Re-throw the error so CheckInForm knows submission failed
      throw error;
    } finally {
      setSubmitting(false);
    }
  };

  const getInitialFormData = (booking: Booking, existingCheckIn?: CheckInData): CheckInFormData => {
    return {
      // Personal Details
      firstName: existingCheckIn?.firstName || booking.guestName.split(' ')[0] || '',
      lastName: existingCheckIn?.lastName || booking.guestName.split(' ').slice(1).join(' ') || '',
      email: existingCheckIn?.email || booking.contactEmail || '',
      phone: existingCheckIn?.phone || booking.contactPhone || '',
      dateOfBirth: existingCheckIn?.dateOfBirth || '',
      nationality: existingCheckIn?.nationality || '',
      idType: existingCheckIn?.idType || 'passport',
      idNumber: existingCheckIn?.idNumber || '',
      
      // Address
      address: existingCheckIn?.address || '',
      city: existingCheckIn?.city || '',
      state: existingCheckIn?.state || '',
      country: existingCheckIn?.country || '',
      zipCode: existingCheckIn?.zipCode || '',
      
      // Emergency Contact
      emergencyContactName: existingCheckIn?.emergencyContactName || '',
      emergencyContactPhone: existingCheckIn?.emergencyContactPhone || '',
      emergencyContactRelation: existingCheckIn?.emergencyContactRelation || '',
      
      // Visit Details
      purposeOfVisit: existingCheckIn?.purposeOfVisit || 'leisure',
      arrivalDate: existingCheckIn?.arrivalDate || booking.checkIn || '',
      departureDate: existingCheckIn?.departureDate || booking.checkOut || '',
      roomNumber: existingCheckIn?.roomNumber || booking.roomNo || '',
      numberOfGuests: existingCheckIn?.numberOfGuests || booking.noOfPax || 1,
      
      // Additional Guests
      additionalGuests: existingCheckIn?.additionalGuests || [],
      
      // Special Requests
      specialRequests: existingCheckIn?.specialRequests || booking.specialRequests || '',
      
      // Preferences
      preferences: existingCheckIn?.preferences || {
        wakeUpCall: false,
        newspaper: false,
        extraTowels: false,
        extraPillows: false,
        roomService: false,
        doNotDisturb: false,
      },
      
      // Agreement
      termsAccepted: existingCheckIn?.termsAccepted || false,
      marketingConsent: existingCheckIn?.marketingConsent || false,
    };
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">
            {language === 'hi' ? 'लोड हो रहा है...' : 'Loading...'}
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6 text-center">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            {language === 'hi' ? 'त्रुटि' : 'Error'}
          </h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <div className="text-center">
            <p className="text-sm text-gray-500 mb-2">
              {language === 'hi' 
                ? 'आप अब इस पेज को बंद कर सकते हैं।'
                : 'You can now close this page.'
              }
            </p>
            <p className="text-xs text-gray-400">
              {language === 'hi' 
                ? 'चेक-इन पूरा हो गया है।'
                : 'Check-in process completed.'
              }
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6 text-center">
          <div className="text-green-500 text-5xl mb-4">✅</div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            {language === 'hi' ? 'चेक-इन पूरा हुआ!' : 'Check-in Complete!'}
          </h2>
          <p className="text-gray-600 mb-4">
            {language === 'hi' 
              ? 'आपका चेक-इन फॉर्म सफलतापूर्वक जमा हो गया है।'
              : 'Your check-in form has been submitted successfully.'
            }
          </p>
          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <p className="text-sm text-gray-600">
              <strong>{language === 'hi' ? 'बुकिंग ID:' : 'Booking ID:'}</strong> {bookingId}
            </p>
            {booking && (
              <>
                <p className="text-sm text-gray-600">
                  <strong>{language === 'hi' ? 'अतिथि:' : 'Guest:'}</strong> {booking.guestName}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>{language === 'hi' ? 'कमरा:' : 'Room:'}</strong> {booking.roomNo}
                </p>
              </>
            )}
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-500 mb-2">
              {language === 'hi' 
                ? 'आप अब इस पेज को बंद कर सकते हैं।'
                : 'You can now close this page.'
              }
            </p>
            <p className="text-xs text-gray-400">
              {language === 'hi' 
                ? 'चेक-इन प्रक्रिया पूरी हो गई है।'
                : 'Check-in process completed.'
              }
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            {language === 'hi' ? 'डिजिटल चेक-इन' : 'Digital Check-in'}
          </h1>
          {booking && (
            <div className="text-sm text-gray-600">
              <p>
                <strong>{language === 'hi' ? 'बुकिंग ID:' : 'Booking ID:'}</strong> {bookingId}
              </p>
              <p>
                <strong>{language === 'hi' ? 'अतिथि:' : 'Guest:'}</strong> {booking.guestName}
              </p>
              <p>
                <strong>{language === 'hi' ? 'कमरा:' : 'Room:'}</strong> {booking.roomNo}
              </p>
              <p>
                <strong>{language === 'hi' ? 'चेक-इन तिथि:' : 'Check-in Date:'}</strong>{' '}
                {new Date(booking.checkIn).toLocaleDateString()}
              </p>
            </div>
          )}
          {existingCheckIn && (
            <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
              <p className="text-sm text-yellow-800">
                {language === 'hi' 
                  ? 'आपने पहले से ही चेक-इन फॉर्म भरा है। आप इसे अपडेट कर सकते हैं।'
                  : 'You have already completed the check-in form. You can update it below.'
                }
              </p>
            </div>
          )}
          {submissionError && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded">
              <p className="text-sm text-red-800">
                {language === 'hi' ? 'त्रुटि: ' : 'Error: '}{submissionError}
              </p>
            </div>
          )}
        </div>

        {/* Check-in Form */}
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
  );
};

export default CheckInPage;