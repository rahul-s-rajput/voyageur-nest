export interface CheckInData {
  id: string;
  booking_id: string;
  guest_profile_id?: string;
  // Personal Details
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth?: string;
  nationality?: string;
  idType: 'passport' | 'aadhaar' | 'pan_card' | 'driving_license' | 'voter_id' | 'ration_card' | 'other';
  idNumber?: string;
  
  // Address
  address: string;
  city?: string;
  state?: string;
  country?: string;
  zipCode?: string;
  
  // Emergency Contact
  emergencyContactName: string;
  emergencyContactPhone: string;
  emergencyContactRelation: string;
  
  // Visit Details
  purposeOfVisit: 'leisure' | 'business' | 'family' | 'medical' | 'other';
  arrivalDate: string;
  departureDate: string;
  roomNumber: string;
  numberOfGuests: number;
  
  // Additional Guests
  additionalGuests: Array<{
    name: string;
    age?: number;
    relation?: string;
  }>;
  
  // Special Requests
  specialRequests?: string;
  
  // Preferences
  preferences: {
    wakeUpCall: boolean;
    newspaper: boolean;
    extraTowels: boolean;
    extraPillows: boolean;
    roomService: boolean;
    doNotDisturb: boolean;
  };
  
  // Agreement
  termsAccepted: boolean;
  marketingConsent: boolean;
  
  // ID Verification
  id_document_urls?: string[];
  id_photo_urls?: string[];
  id_verification_status?: 'pending' | 'verified' | 'rejected' | 'requires_review';
  verification_notes?: string;
  verified_by?: string;
  verified_at?: string;
  extracted_id_data?: Record<string, any>;
  
  form_completed_at: string;
  created_at: string;
  updated_at?: string;
}

export interface CheckInFormData {
  // Personal Details
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth?: string;
  nationality?: string;
  idType: 'passport' | 'aadhaar' | 'pan_card' | 'driving_license' | 'voter_id' | 'ration_card' | 'other';
  idNumber?: string;
  
  // Address
  address: string;
  city?: string;
  state?: string;
  country?: string;
  zipCode?: string;
  
  // Emergency Contact
  emergencyContactName: string;
  emergencyContactPhone: string;
  emergencyContactRelation: string;
  
  // Visit Details
  purposeOfVisit: 'leisure' | 'business' | 'family' | 'medical' | 'other';
  arrivalDate: string;
  departureDate: string;
  roomNumber: string;
  numberOfGuests: number;
  
  // Additional Guests
  additionalGuests: Array<{
    name: string;
    age?: number;
    relation?: string;
  }>;
  
  // Special Requests
  specialRequests?: string;
  
  // Preferences
  preferences: {
    wakeUpCall: boolean;
    newspaper: boolean;
    extraTowels: boolean;
    extraPillows: boolean;
    roomService: boolean;
    doNotDisturb: boolean;
  };
  
  // Agreement
  termsAccepted: boolean;
  marketingConsent: boolean;
  
  // ID Photos (for form submission)
  idPhotos?: File[];
  id_photo_urls?: string[];
}

export interface CheckInFormProps {
  bookingId?: string;
  onSubmit: (data: CheckInFormData) => Promise<void>;
  initialData?: CheckInFormData;
  isSubmitting?: boolean;
  language?: string; // Any language code (e.g., 'en-US', 'hi-IN', 'fr-FR', 'es-ES', etc.)
  onLanguageChange?: (language: string) => void;
  externalErrorHandling?: boolean; // When true, parent handles errors
}

export interface CheckInFormTranslations {
  en: {
    title: string;
    personalDetails: string;
    name: string;
    email: string;
    phone: string;
    address: string;
    emergencyContact: string;
    emergencyName: string;
    emergencyPhone: string;
    relationship: string;
    purposeOfVisit: string;
    additionalGuests: string;
    addGuest: string;
    removeGuest: string;
    submit: string;
    submitting: string;
    success: string;
    error: string;
    required: string;
    invalidEmail: string;
    invalidPhone: string;
    languageSwitch: string;
    idVerification: string;
    idType: string;
    uploadIdPhotos: string;
  };
  hi: {
    title: string;
    personalDetails: string;
    name: string;
    email: string;
    phone: string;
    address: string;
    emergencyContact: string;
    emergencyName: string;
    emergencyPhone: string;
    relationship: string;
    purposeOfVisit: string;
    additionalGuests: string;
    addGuest: string;
    removeGuest: string;
    submit: string;
    submitting: string;
    success: string;
    error: string;
    required: string;
    invalidEmail: string;
    invalidPhone: string;
    languageSwitch: string;
    idVerification: string;
    idType: string;
    uploadIdPhotos: string;
  };
}