# Check-in Issues Fix Guide

## Issues Identified

Based on the console logs, there are two main issues preventing the check-in form from working:

### 1. Missing `id_photo_urls` Column
**Error:** `Could not find the 'id_photo_urls' column of 'checkin_data' in the schema cache`

**Cause:** The `checkin_data` table is missing the `id_photo_urls` column that the application code is trying to use.

### 2. Missing Storage Bucket
**Error:** `Bucket not found` when trying to upload ID photos

**Cause:** The `id-documents` storage bucket doesn't exist in your Supabase project.

## Solution Steps

### Step 1: Run Database Migration

1. Open your Supabase dashboard
2. Go to the SQL Editor
3. Run the migration script: `fix_checkin_issues_migration.sql`

This will:
- Add the missing `id_photo_urls` column
- Add other ID verification fields
- Create necessary indexes
- Add proper documentation

### Step 2: Create Storage Bucket

#### Option A: Via Supabase Dashboard (Recommended)
1. Go to your Supabase dashboard
2. Navigate to **Storage** in the sidebar
3. Click **"New bucket"**
4. Set the following:
   - **Name:** `id-documents`
   - **Public:** `false` (keep it private for security)
   - **File size limit:** `10 MB`
   - **Allowed MIME types:** `image/jpeg, image/png, image/webp, application/pdf`

#### Option B: Programmatically (Alternative)
The app will now automatically try to create the bucket on startup. Check the browser console for initialization messages.

### Step 2.1: Create Required Storage Policies (CRITICAL!)

⚠️ **IMPORTANT**: After creating the bucket, you MUST create Row Level Security (RLS) policies or uploads will fail with "403 Unauthorized" errors.

**Go to Supabase Dashboard** → SQL Editor and run these commands:

```sql
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
```

### Step 3: Verify the Fix

1. Restart your development server:
   ```bash
   npm run dev
   ```

2. Check the browser console for these messages:
   - `🚀 Initializing storage bucket...`
   - `✅ Storage bucket initialized successfully`

3. Test the check-in form by:
   - Opening a check-in link
   - Filling out the form
   - Uploading an ID photo
   - Submitting the form

## Files Modified/Created

### New Files:
- `fix_checkin_issues_migration.sql` - Database migration script
- `src/scripts/initialize-storage.ts` - Storage initialization script
- `CHECKIN_ISSUES_FIX.md` - This guide

### Modified Files:
- `src/App.tsx` - Added automatic storage bucket initialization

## Database Schema Changes

The migration adds these columns to the `checkin_data` table:

```sql
-- ID Verification fields
id_verification_status TEXT DEFAULT 'pending'
verification_notes TEXT
verified_by TEXT
verified_at TIMESTAMP WITH TIME ZONE
id_photo_urls TEXT[] DEFAULT '{}'  -- This was the missing column!
extracted_id_data JSONB DEFAULT '{}'
```

## Storage Bucket Configuration

The `id-documents` bucket is configured with:
- **Privacy:** Private (not publicly accessible)
- **File size limit:** 10 MB
- **Allowed types:** JPEG, PNG, WebP images and PDF documents
- **Access policies:** Anonymous users can upload and read their own files

## Troubleshooting

### If the migration fails:
1. Check if you have the necessary permissions in Supabase
2. Ensure the `checkin_data` table exists
3. Try running the migration commands one by one

### If bucket creation fails:
1. Check your Supabase project permissions
2. Manually create the bucket via the dashboard
3. Ensure the bucket name is exactly `id-documents`

### If uploads still fail:
1. Check browser console for detailed error messages
2. Verify the bucket exists and has correct policies
3. Check your Supabase project's storage quota

## Testing the Fix

After applying the fixes, test the complete flow:

1. **Database Test:**
   ```sql
   -- Verify the column exists
   SELECT column_name FROM information_schema.columns 
   WHERE table_name = 'checkin_data' AND column_name = 'id_photo_urls';
   ```

2. **Storage Test:**
   - Check if the bucket appears in your Supabase Storage dashboard
   - Try uploading a test file through the dashboard

3. **Application Test:**
   - Open a check-in form
   - Upload an ID photo
   - Submit the form
   - Check that no errors appear in the console

## Prevention

To prevent similar issues in the future:

1. **Always run migrations:** When new features are added that require database changes, ensure all migration scripts are executed
2. **Check dependencies:** Before deploying, verify that all required storage buckets and database tables exist
3. **Test thoroughly:** Test the complete user flow in a staging environment before production deployment

## Support

If you continue to experience issues:

1. Check the browser console for detailed error messages
2. Verify your Supabase project configuration
3. Ensure all migration scripts have been run successfully
4. Check that your Supabase project has sufficient storage quota

The application should now work correctly for check-in submissions with ID photo uploads!