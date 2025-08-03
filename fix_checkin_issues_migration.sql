-- Comprehensive Migration to Fix Check-in Issues
-- This script addresses:
-- 1. Missing id_photo_urls column in checkin_data table
-- 2. Missing ID verification fields
-- 3. Storage bucket creation (note: bucket creation needs to be done via Supabase dashboard or API)

-- Run this SQL in your Supabase SQL editor

-- Add missing ID verification fields to checkin_data table
ALTER TABLE public.checkin_data 
ADD COLUMN IF NOT EXISTS id_verification_status TEXT DEFAULT 'pending' CHECK (id_verification_status IN ('pending', 'verified', 'rejected', 'requires_review')),
ADD COLUMN IF NOT EXISTS verification_notes TEXT,
ADD COLUMN IF NOT EXISTS verified_by TEXT,
ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS id_photo_urls TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS extracted_id_data JSONB DEFAULT '{}';

-- Create indexes for verification fields for better performance
CREATE INDEX IF NOT EXISTS idx_checkin_data_verification_status ON public.checkin_data(id_verification_status);
CREATE INDEX IF NOT EXISTS idx_checkin_data_verified_at ON public.checkin_data(verified_at);

-- Add comments for documentation
COMMENT ON COLUMN public.checkin_data.id_verification_status IS 'Status of ID verification: pending, verified, rejected, requires_review';
COMMENT ON COLUMN public.checkin_data.verification_notes IS 'Notes from staff during verification process';
COMMENT ON COLUMN public.checkin_data.verified_by IS 'Staff member who verified the ID';
COMMENT ON COLUMN public.checkin_data.verified_at IS 'Timestamp when ID was verified';
COMMENT ON COLUMN public.checkin_data.id_photo_urls IS 'Array of URLs for uploaded ID photos';
COMMENT ON COLUMN public.checkin_data.extracted_id_data IS 'JSON object containing extracted data from ID (if OCR is used)';

-- Verify the table structure
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'checkin_data' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Note: Storage bucket creation
-- The 'id-documents' storage bucket needs to be created manually in Supabase.
-- You can do this by:
-- 1. Going to Storage in your Supabase dashboard
-- 2. Creating a new bucket named 'id-documents'
-- 3. Setting it as private (not public)
-- 4. Configuring these settings:
--    - File size limit: 10MB
--    - Allowed MIME types: image/jpeg, image/png, image/webp, application/pdf
-- 5. Configuring appropriate policies

-- Storage bucket policies (REQUIRED - run after creating the bucket)
-- These RLS policies are MANDATORY for the storage bucket to work
-- Run these SQL commands in your Supabase SQL editor:

-- Allow anonymous users to upload files to id-documents bucket
CREATE POLICY "Allow anonymous uploads to id-documents" 
ON storage.objects 
FOR INSERT 
TO anon 
WITH CHECK (bucket_id = 'id-documents');

-- Allow anonymous users to read files from id-documents bucket
CREATE POLICY "Allow anonymous reads from id-documents" 
ON storage.objects 
FOR SELECT 
TO anon 
USING (bucket_id = 'id-documents');

-- Allow anonymous users to update files in id-documents bucket (for upsert functionality)
CREATE POLICY "Allow anonymous updates to id-documents" 
ON storage.objects 
FOR UPDATE 
TO anon 
USING (bucket_id = 'id-documents') 
WITH CHECK (bucket_id = 'id-documents');

-- Allow anonymous users to delete files from id-documents bucket
CREATE POLICY "Allow anonymous deletes from id-documents" 
ON storage.objects 
FOR DELETE 
TO anon 
USING (bucket_id = 'id-documents');

-- Refresh the schema cache to ensure new columns are recognized
NOTIFY pgrst, 'reload schema';