import { CheckInData, CheckInFormData } from '../../types/checkin'
import { Booking } from '../../types/booking'

export const mockBooking: Booking = {
  id: 'test-booking-123',
  guestName: 'John Doe',
  roomNo: '101',
  numberOfRooms: 1,
  checkIn: '2024-01-15',
  checkOut: '2024-01-17',
  noOfPax: 2,
  adultChild: '2 Adults',
  status: 'confirmed',
  cancelled: false,
  totalAmount: 5000,
  paymentStatus: 'paid',
  paymentAmount: 5000,
  paymentMode: 'card',
  contactPhone: '+91-9876543210',
  contactEmail: 'john.doe@example.com',
  specialRequests: 'Late check-in',
  bookingDate: '2024-01-10',
  folioNumber: '520/391',
  createdAt: '2024-01-10T10:00:00Z',
  updatedAt: '2024-01-10T10:00:00Z'
}

export const mockCheckInFormData: CheckInFormData = {
  firstName: 'John',
  lastName: 'Doe',
  email: 'john.doe@example.com',
  phone: '+91-9876543210',
  dateOfBirth: '1990-01-01',
  nationality: 'Indian',
  idType: 'passport',
  idNumber: 'A1234567',
  address: '123 Main Street, Mumbai',
  city: 'Mumbai',
  state: 'Maharashtra',
  country: 'India',
  zipCode: '400001',
  emergencyContactName: 'Jane Doe',
  emergencyContactPhone: '+91-9876543211',
  emergencyContactRelation: 'Spouse',
  purposeOfVisit: 'leisure',
  arrivalDate: '2024-01-15',
  departureDate: '2024-01-17',
  roomNumber: '101',
  numberOfGuests: 2,
  additionalGuests: [
    {
      name: 'Jane Doe',
      age: 28,
      relation: 'Spouse'
    }
  ],
  specialRequests: 'Late check-in',
  preferences: {
    wakeUpCall: false,
    newspaper: true,
    extraTowels: false,
    extraPillows: true,
    roomService: false,
    doNotDisturb: false
  },
  termsAccepted: true,
  marketingConsent: false
}

export const mockCheckInData: CheckInData = {
  id: 'checkin-123',
  booking_id: 'test-booking-123',
  guest_profile_id: 'guest-123',
  ...mockCheckInFormData,
  id_document_urls: [],
  form_completed_at: '2024-01-15T14:00:00Z',
  created_at: '2024-01-15T14:00:00Z',
  updated_at: '2024-01-15T14:00:00Z'
}

export const mockTranslations = {
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
    removeGuest: 'Remove Guest',
    submit: 'Submit Check-in',
    submitting: 'Submitting...',
    success: 'Check-in completed successfully!',
    error: 'Error submitting check-in',
    required: 'This field is required',
    invalidEmail: 'Please enter a valid email',
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
    emergencyName: 'आपातकालीन संपर्क नाम',
    emergencyPhone: 'आपातकालीन संपर्क फोन',
    relationship: 'रिश्ता',
    purposeOfVisit: 'यात्रा का उद्देश्य',
    additionalGuests: 'अतिरिक्त मेहमान',
    addGuest: 'मेहमान जोड़ें',
    removeGuest: 'मेहमान हटाएं',
    submit: 'चेक-इन जमा करें',
    submitting: 'जमा कर रहे हैं...',
    success: 'चेक-इन सफलतापूर्वक पूरा हुआ!',
    error: 'चेक-इन जमा करने में त्रुटि',
    required: 'यह फील्ड आवश्यक है',
    invalidEmail: 'कृपया एक वैध ईमेल दर्ज करें',
    invalidPhone: 'कृपया एक वैध फोन नंबर दर्ज करें',
    languageSwitch: 'English'
  }
}