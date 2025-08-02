-- Migration to add ID verification fields to checkin_data table
-- Run this SQL in your Supabase SQL editor

-- Add ID verification fields to checkin_data table
ALTER TABLE public.checkin_data 
ADD COLUMN IF NOT EXISTS id_verification_status TEXT DEFAULT 'pending' CHECK (id_verification_status IN ('pending', 'verified', 'rejected', 'requires_review')),
ADD COLUMN IF NOT EXISTS verification_notes TEXT,
ADD COLUMN IF NOT EXISTS verified_by TEXT,
ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS id_photo_urls TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS extracted_id_data JSONB DEFAULT '{}';

-- Create index for verification status for better performance
CREATE INDEX IF NOT EXISTS idx_checkin_data_verification_status ON public.checkin_data(id_verification_status);
CREATE INDEX IF NOT EXISTS idx_checkin_data_verified_at ON public.checkin_data(verified_at);

-- Update RLS policies to include new fields
-- The existing policies should already cover these new fields

-- Add comment for documentation
COMMENT ON COLUMN public.checkin_data.id_verification_status IS 'Status of ID verification: pending, verified, rejected, requires_review';
COMMENT ON COLUMN public.checkin_data.verification_notes IS 'Notes from staff during verification process';
COMMENT ON COLUMN public.checkin_data.verified_by IS 'Staff member who verified the ID';
COMMENT ON COLUMN public.checkin_data.verified_at IS 'Timestamp when ID was verified';
COMMENT ON COLUMN public.checkin_data.id_photo_urls IS 'Array of URLs for uploaded ID photos';
COMMENT ON COLUMN public.checkin_data.extracted_id_data IS 'JSON object containing extracted data from ID (if OCR is used)';