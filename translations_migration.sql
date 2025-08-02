-- Migration to create translations table for multi-language support
-- Run this SQL in your Supabase SQL editor

-- Create translations table
CREATE TABLE IF NOT EXISTS public.translations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    language_code TEXT NOT NULL, -- e.g., 'en-US', 'hi-IN', 'es-ES'
    language_name TEXT NOT NULL, -- e.g., 'English', 'हिंदी', 'Español'
    native_name TEXT NOT NULL, -- e.g., 'English', 'हिंदी', 'Español'
    translation_data JSONB NOT NULL, -- Complete translation JSON structure
    is_active BOOLEAN NOT NULL DEFAULT true,
    quality_score INTEGER DEFAULT 10 CHECK (quality_score >= 1 AND quality_score <= 10),
    created_by TEXT, -- Who created/generated this translation
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure unique language codes
    UNIQUE(language_code)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_translations_language_code ON public.translations(language_code);
CREATE INDEX IF NOT EXISTS idx_translations_active ON public.translations(is_active);
CREATE INDEX IF NOT EXISTS idx_translations_created_at ON public.translations(created_at);

-- Enable real-time subscriptions
ALTER PUBLICATION supabase_realtime ADD TABLE public.translations;

-- Add RLS (Row Level Security) policies
ALTER TABLE public.translations ENABLE ROW LEVEL SECURITY;

-- Policy to allow read access to active translations
CREATE POLICY "Allow read access to active translations" ON public.translations
    FOR SELECT USING (is_active = true);

-- Policy to allow insert access (for admin/system)
CREATE POLICY "Allow insert access to translations" ON public.translations
    FOR INSERT WITH CHECK (true);

-- Policy to allow update access (for admin/system)
CREATE POLICY "Allow update access to translations" ON public.translations
    FOR UPDATE USING (true);

-- Policy to allow delete access (for admin/system)
CREATE POLICY "Allow delete access to translations" ON public.translations
    FOR DELETE USING (true);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_translations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_translations_updated_at
    BEFORE UPDATE ON public.translations
    FOR EACH ROW
    EXECUTE FUNCTION update_translations_updated_at();

-- Insert base English translation
INSERT INTO public.translations (
    language_code,
    language_name,
    native_name,
    translation_data,
    created_by,
    quality_score
) VALUES (
    'en-US',
    'English',
    'English',
    '{
        "app": {
            "title": "ID Verification System Demo",
            "subtitle": "Guest Check-in"
        },
        "form": {
            "title": "Digital Check-in Form",
            "sections": {
                "personalDetails": "Personal Details",
                "idVerification": "ID Verification",
                "emergencyContact": "Emergency Contact",
                "purposeOfVisit": "Purpose of Visit",
                "additionalGuests": "Additional Guests"
            },
            "fields": {
                "firstName": "First Name",
                "lastName": "Last Name",
                "email": "Email Address",
                "phone": "Phone Number",
                "address": "Address",
                "idType": "ID Type",
                "selectIdType": "Select ID Type",
                "uploadIdPhotos": "Upload ID Photos",
                "emergencyContactName": "Emergency Contact Name",
                "emergencyContactPhone": "Emergency Contact Phone",
                "relationship": "Relationship",
                "purposeOfVisit": "Purpose of Visit",
                "termsAccepted": "I accept the terms and conditions",
                "marketingConsent": "I consent to receive marketing communications"
            },
            "purposeOptions": {
                "leisure": "Tourism / Vacation",
                "business": "Business",
                "family": "Family Visit",
                "medical": "Medical",
                "other": "Other"
            },
            "idTypes": {
                "passport": "Passport",
                "aadhaar": "Aadhaar Card",
                "panCard": "PAN Card",
                "drivingLicense": "Driving License",
                "voterId": "Voter ID Card",
                "rationCard": "Ration Card",
                "other": "Other"
            },
            "buttons": {
                "addGuest": "Add Guest",
                "removeGuest": "Remove",
                "submitting": "Submitting...",
                "submitCheckIn": "Submit Check-In"
            },
            "validation": {
                "required": "This field is required",
                "emailInvalid": "Please enter a valid email address",
                "invalidEmail": "Please enter a valid email address",
                "phoneInvalid": "Please enter a valid phone number",
                "invalidPhone": "Please enter a valid phone number",
                "termsRequired": "You must accept the terms and conditions"
            }
        },
        "placeholders": {
            "enterFirstName": "Enter your first name",
            "enterLastName": "Enter your last name",
            "enterEmail": "Enter your email address",
            "enterPhone": "Enter your phone number",
            "enterAddress": "Enter your address",
            "selectIdType": "Select ID Type",
            "selectPurpose": "Select purpose",
            "enterEmergencyName": "Enter emergency contact name",
            "enterEmergencyPhone": "Enter emergency contact phone",
            "enterRelationship": "Enter relationship",
            "guestName": "Guest {{number}} name"
        },
        "options": {
            "purposes": {
                "tourism": "Tourism / Vacation",
                "business": "Business",
                "medical": "Medical",
                "education": "Education",
                "family": "Family Visit",
                "other": "Other"
            },
            "relationships": {
                "spouse": "Spouse",
                "parent": "Parent",
                "child": "Child",
                "sibling": "Sibling",
                "friend": "Friend",
                "colleague": "Colleague",
                "other": "Other"
            }
        },
        "terms": {
            "agreeToTerms": "I agree to the terms and conditions",
            "consentToDataProcessing": "I consent to data processing requirements"
        },
        "messages": {
            "checkInSuccess": "Check-in completed successfully!",
            "checkInError": "An error occurred during check-in. Please try again.",
            "translationUnavailable": "Translation service temporarily unavailable. Showing English text.",
            "noAdditionalGuests": "No additional guests added",
            "thankYou": "Thank you for completing the check-in process.",
            "submitError": "Failed to submit check-in form. Please try again."
        },
        "languageSelector": {
            "loading": "Loading..."
        },
        "idUpload": {
            "frontSide": "Front Side",
            "backSide": "Back Side",
            "uploadFront": "Upload Front",
            "uploadBack": "Upload Back",
            "dragDropText": "Drag and drop your ID photo here, or click to select",
            "fileTypeSupport": "Supports: JPG, PNG, PDF (Max 5MB)",
            "takePhoto": "Take Photo",
            "chooseFiles": "Choose Files",
            "uploading": "Uploading...",
            "remove": "Remove",
            "retake": "Retake"
        },
        "checkInPage": {
            "loading": "Loading...",
            "error": "Error",
            "digitalCheckIn": "Digital Check-in",
            "bookingId": "Booking ID:",
            "guest": "Guest:",
            "room": "Room:",
            "checkInDate": "Check-in Date:",
            "checkInComplete": "Check-in Complete!",
            "checkInSuccess": "Your check-in form has been submitted successfully.",
            "alreadyCompleted": "You have already completed the check-in form. You can update it below.",
            "canClosePageNow": "You can now close this page.",
            "processCompleted": "Check-in process completed.",
            "errorPrefix": "Error: "
        }
    }',
    'system',
    10
) ON CONFLICT (language_code) DO NOTHING;

-- Add comments for documentation
COMMENT ON TABLE public.translations IS 'Stores pre-generated translations for all supported languages';
COMMENT ON COLUMN public.translations.language_code IS 'ISO language code (e.g., en-US, hi-IN)';
COMMENT ON COLUMN public.translations.translation_data IS 'Complete JSON structure containing all translations for this language';
COMMENT ON COLUMN public.translations.quality_score IS 'Translation quality score from 1-10 (10 being highest quality)';