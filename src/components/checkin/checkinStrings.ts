// EN/HI string tables + option lists for the public guest check-in page
// ("Himalayan Boutique" design). Self-contained so the consumer-facing page
// doesn't depend on the dynamic DB translation pipeline.

import type { CheckInData } from '../../types/checkin';

export type Lang = 'en' | 'hi';

export interface FieldStr {
  l: string;
  p: string;
}

export interface CheckinStrings {
  subtitle: string;
  secure: string;
  prefilled: string;
  loading: string;
  bkFor: string;
  s: {
    personal: string;
    id: string;
    address: string;
    emergency: string;
    visit: string;
    guests: string;
  };
  f: Record<
    | 'first' | 'last' | 'email' | 'phone' | 'dob' | 'nat'
    | 'idType' | 'idNum' | 'addr' | 'city' | 'state' | 'country' | 'zip'
    | 'purpose' | 'guestsNum' | 'room' | 'arrival' | 'departure' | 'special'
    | 'gName' | 'gAge' | 'ecName' | 'ecPhone' | 'ecRel',
    FieldStr
  >;
  val: {
    email: string;
    phone: string;
    required: string;
    terms: string;
    summary: string;
    idRequired: string;
    guestId: string;
    guestsMin: string;
  };
  up: { title: string; drop: string; hint: string };
  ui: {
    submit: string;
    submitting: string;
    addGuest: string;
    terms: string;
    update: string;
    done: string;
    chooseFiles: string;
    uploading: string;
    remove: string;
    gAdult: string;
    gUpload: string;
  };
  suc: { title: string; body: string; ref: string; done: string };
  alr: { title: string; body: string };
  err: { title: string; body: string; cta: string };
}

export const STR: Record<Lang, CheckinStrings> = {
  en: {
    subtitle: 'Digital Check-in',
    secure: 'Secure & encrypted',
    prefilled: 'Pre-filled from your booking',
    loading: 'Loading your booking…',
    bkFor: 'Check-in for',
    s: {
      personal: 'Personal Details',
      id: 'ID Verification',
      address: 'Address',
      emergency: 'Emergency Contact',
      visit: 'Visit Details',
      guests: 'Additional Guests',
    },
    f: {
      first: { l: 'First Name', p: 'Enter your first name' },
      last: { l: 'Last Name', p: 'Enter your last name' },
      email: { l: 'Email Address', p: 'Enter your email address' },
      phone: { l: 'Phone Number', p: 'Enter your phone number' },
      dob: { l: 'Date of Birth', p: 'DD / MM / YYYY' },
      nat: { l: 'Nationality', p: 'e.g. Indian' },
      idType: { l: 'ID Type', p: 'Select ID type' },
      idNum: { l: 'ID Number', p: 'Enter ID number' },
      addr: { l: 'Address', p: 'Enter your address' },
      city: { l: 'City', p: 'City' },
      state: { l: 'State', p: 'State' },
      country: { l: 'Country', p: 'Country' },
      zip: { l: 'Zip Code', p: 'Zip' },
      purpose: { l: 'Purpose of Visit', p: 'Select purpose' },
      guestsNum: { l: 'Number of Guests', p: '1' },
      room: { l: 'Room Number', p: '—' },
      arrival: { l: 'Arrival Date', p: 'DD / MM / YYYY' },
      departure: { l: 'Departure Date', p: 'DD / MM / YYYY' },
      special: { l: 'Special Requests', p: 'Anything we should know before you arrive?' },
      gName: { l: 'Name', p: 'Guest name' },
      gAge: { l: 'Age', p: 'Age' },
      ecName: { l: 'Emergency Contact Name', p: 'Enter emergency contact name' },
      ecPhone: { l: 'Emergency Contact Phone', p: 'Enter emergency contact phone' },
      ecRel: { l: 'Relationship', p: 'Select relationship' },
    },
    val: {
      email: 'Please enter a valid email address',
      phone: 'Please enter a valid phone number',
      required: 'This field is required',
      terms: 'You must accept the terms and conditions',
      summary: 'Please fix the highlighted fields before submitting.',
      idRequired: 'Please upload at least one ID photo',
      guestId: 'An ID photo is required for adult guests',
      guestsMin: 'Number of guests must be at least 1',
    },
    up: {
      title: 'Upload ID Photos',
      drop: 'Drag and drop your ID photo here, or click to select',
      hint: 'Supports: JPG, PNG, PDF (Max 5MB)',
    },
    ui: {
      submit: 'Submit Check-In',
      submitting: 'Submitting…',
      addGuest: 'Add Guest',
      terms: 'I accept the terms and conditions',
      update: 'Update Check-In',
      done: 'Done',
      chooseFiles: 'Choose files',
      uploading: 'Uploading…',
      remove: 'Remove',
      gAdult: 'Adult — ID required',
      gUpload: 'Upload ID photo',
    },
    suc: {
      title: 'Check-in Complete!',
      body: 'Thank you. Your details have been received and our team will review them shortly. You can close this page — we look forward to welcoming you to the mountains.',
      ref: 'Booking',
      done: 'Done',
    },
    alr: {
      title: 'You have already completed the check-in form.',
      body: 'Your details are pre-filled below — you can update them if anything has changed.',
    },
    err: {
      title: 'Booking not found',
      body: 'This check-in link looks invalid or has expired. Please re-scan the QR code at reception, or contact the front desk and we will help you right away.',
      cta: 'Contact front desk',
    },
  },
  hi: {
    subtitle: 'डिजिटल चेक-इन',
    secure: 'सुरक्षित और एन्क्रिप्टेड',
    prefilled: 'आपकी बुकिंग से भरा गया',
    loading: 'आपकी बुकिंग लोड हो रही है…',
    bkFor: 'चेक-इन',
    s: {
      personal: 'व्यक्तिगत विवरण',
      id: 'पहचान सत्यापन',
      address: 'पता',
      emergency: 'आपातकालीन संपर्क',
      visit: 'यात्रा विवरण',
      guests: 'अतिरिक्त अतिथि',
    },
    f: {
      first: { l: 'पहला नाम', p: 'अपना पहला नाम दर्ज करें' },
      last: { l: 'उपनाम', p: 'अपना उपनाम दर्ज करें' },
      email: { l: 'ईमेल पता', p: 'अपना ईमेल पता दर्ज करें' },
      phone: { l: 'फ़ोन नंबर', p: 'अपना फ़ोन नंबर दर्ज करें' },
      dob: { l: 'जन्म तिथि', p: 'दिन / माह / वर्ष' },
      nat: { l: 'राष्ट्रीयता', p: 'जैसे भारतीय' },
      idType: { l: 'पहचान प्रकार', p: 'पहचान प्रकार चुनें' },
      idNum: { l: 'पहचान संख्या', p: 'पहचान संख्या दर्ज करें' },
      addr: { l: 'पता', p: 'अपना पता दर्ज करें' },
      city: { l: 'शहर', p: 'शहर' },
      state: { l: 'राज्य', p: 'राज्य' },
      country: { l: 'देश', p: 'देश' },
      zip: { l: 'पिन कोड', p: 'पिन' },
      purpose: { l: 'यात्रा का उद्देश्य', p: 'उद्देश्य चुनें' },
      guestsNum: { l: 'अतिथियों की संख्या', p: '1' },
      room: { l: 'कमरा नंबर', p: '—' },
      arrival: { l: 'आगमन तिथि', p: 'दिन / माह / वर्ष' },
      departure: { l: 'प्रस्थान तिथि', p: 'दिन / माह / वर्ष' },
      special: { l: 'विशेष अनुरोध', p: 'आगमन से पहले हमें कुछ बताना चाहें?' },
      gName: { l: 'नाम', p: 'अतिथि का नाम' },
      gAge: { l: 'आयु', p: 'आयु' },
      ecName: { l: 'आपातकालीन संपर्क का नाम', p: 'आपातकालीन संपर्क का नाम दर्ज करें' },
      ecPhone: { l: 'आपातकालीन संपर्क फ़ोन', p: 'आपातकालीन संपर्क फ़ोन दर्ज करें' },
      ecRel: { l: 'संबंध', p: 'संबंध चुनें' },
    },
    val: {
      email: 'कृपया एक मान्य ईमेल पता दर्ज करें',
      phone: 'कृपया एक मान्य फ़ोन नंबर दर्ज करें',
      required: 'यह फ़ील्ड आवश्यक है',
      terms: 'आपको नियम और शर्तें स्वीकार करनी होंगी',
      summary: 'सबमिट करने से पहले कृपया चिह्नित फ़ील्ड ठीक करें।',
      idRequired: 'कृपया कम से कम एक पहचान फ़ोटो अपलोड करें',
      guestId: 'वयस्क अतिथियों के लिए पहचान फ़ोटो आवश्यक है',
      guestsMin: 'अतिथियों की संख्या कम से कम 1 होनी चाहिए',
    },
    up: {
      title: 'पहचान की तस्वीरें अपलोड करें',
      drop: 'अपनी पहचान की तस्वीर यहाँ खींचें, या चुनने के लिए क्लिक करें',
      hint: 'समर्थित: JPG, PNG, PDF (अधिकतम 5MB)',
    },
    ui: {
      submit: 'चेक-इन सबमिट करें',
      submitting: 'सबमिट हो रहा है…',
      addGuest: 'अतिथि जोड़ें',
      terms: 'मैं नियम और शर्तें स्वीकार करता/करती हूँ',
      update: 'चेक-इन अपडेट करें',
      done: 'पूर्ण',
      chooseFiles: 'फ़ाइलें चुनें',
      uploading: 'अपलोड हो रहा है…',
      remove: 'हटाएँ',
      gAdult: 'वयस्क — पहचान आवश्यक',
      gUpload: 'पहचान फ़ोटो अपलोड करें',
    },
    suc: {
      title: 'चेक-इन पूर्ण हुआ!',
      body: 'धन्यवाद। आपका विवरण प्राप्त हो गया है और हमारी टीम शीघ्र ही इसकी समीक्षा करेगी। आप यह पृष्ठ बंद कर सकते हैं — हम पहाड़ों में आपका स्वागत करने के लिए उत्सुक हैं।',
      ref: 'बुकिंग',
      done: 'पूर्ण',
    },
    alr: {
      title: 'आप पहले ही चेक-इन फ़ॉर्म पूरा कर चुके हैं।',
      body: 'आपका विवरण नीचे पहले से भरा हुआ है — कुछ बदला हो तो आप उसे अपडेट कर सकते हैं।',
    },
    err: {
      title: 'बुकिंग नहीं मिली',
      body: 'यह चेक-इन लिंक अमान्य या समाप्त लगता है। कृपया रिसेप्शन पर QR कोड दोबारा स्कैन करें, या फ्रंट डेस्क से संपर्क करें — हम तुरंत आपकी मदद करेंगे।',
      cta: 'फ्रंट डेस्क से संपर्क करें',
    },
  },
};

export const ID_TYPES: { value: CheckInData['idType']; en: string; hi: string }[] = [
  { value: 'passport', en: 'Passport', hi: 'पासपोर्ट' },
  { value: 'aadhaar', en: 'Aadhaar Card', hi: 'आधार कार्ड' },
  { value: 'pan_card', en: 'PAN Card', hi: 'पैन कार्ड' },
  { value: 'driving_license', en: 'Driving License', hi: 'ड्राइविंग लाइसेंस' },
  { value: 'voter_id', en: 'Voter ID Card', hi: 'मतदाता पहचान पत्र' },
  { value: 'ration_card', en: 'Ration Card', hi: 'राशन कार्ड' },
  { value: 'other', en: 'Other', hi: 'अन्य' },
];

export const PURPOSES: { value: CheckInData['purposeOfVisit']; en: string; hi: string }[] = [
  { value: 'leisure', en: 'Tourism / Vacation', hi: 'पर्यटन / अवकाश' },
  { value: 'business', en: 'Business', hi: 'व्यवसाय' },
  { value: 'family', en: 'Family Visit', hi: 'पारिवारिक भेंट' },
  { value: 'medical', en: 'Medical', hi: 'चिकित्सा' },
  { value: 'other', en: 'Other', hi: 'अन्य' },
];

// Stored as the English canonical value (the DB column is free text).
export const RELATIONSHIPS: { value: string; en: string; hi: string }[] = [
  { value: 'Spouse', en: 'Spouse', hi: 'जीवनसाथी' },
  { value: 'Parent', en: 'Parent', hi: 'माता/पिता' },
  { value: 'Child', en: 'Child', hi: 'संतान' },
  { value: 'Sibling', en: 'Sibling', hi: 'भाई/बहन' },
  { value: 'Friend', en: 'Friend', hi: 'मित्र' },
  { value: 'Colleague', en: 'Colleague', hi: 'सहकर्मी' },
  { value: 'Other', en: 'Other', hi: 'अन्य' },
];

export const langFromCode = (code?: string): Lang =>
  (code || '').toLowerCase().startsWith('hi') ? 'hi' : 'en';
