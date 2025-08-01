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
  idType: 'passport' | 'license' | 'national_id' | 'other';
  idNumber: string;
  
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
  
  id_document_urls?: string[];
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
  idType: 'passport' | 'license' | 'national_id' | 'other';
  idNumber: string;
  
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
}

export interface CheckInFormProps {
  bookingId?: string;
  onSubmit: (data: CheckInFormData) => Promise<void>;
  initialData?: CheckInFormData;
  isSubmitting?: boolean;
  language?: 'en' | 'hi';
  onLanguageChange?: (language: 'en' | 'hi') => void;
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
  };
}