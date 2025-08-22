-- ============================================================================
-- GET ACTUAL TABLE SCHEMAS FOR RLS TEST FILE CORRECTION
-- Run this in Supabase SQL Editor to get exact column names and types
-- ============================================================================

-- Get all columns for tables used in the test file
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name IN (
    'properties', 
    'rooms', 
    'bookings', 
    'checkin_data',
    'menu_items',
    'menu_categories',
    'guest_profiles',
    'expenses',
    'email_messages',
    'user_roles'
  )
ORDER BY table_name, ordinal_position;

-- Also get primary keys for each table
SELECT 
  tc.table_name,
  kcu.column_name as primary_key_column
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
  ON tc.constraint_name = kcu.constraint_name
WHERE tc.constraint_type = 'PRIMARY KEY'
  AND tc.table_schema = 'public'
  AND tc.table_name IN (
    'properties', 
    'rooms', 
    'bookings', 
    'checkin_data',
    'menu_items',
    'menu_categories',
    'guest_profiles',
    'expenses',
    'email_messages',
    'user_roles'
  )
ORDER BY tc.table_name;

-- Get foreign key relationships
SELECT 
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints tc 
JOIN information_schema.key_column_usage kcu 
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu 
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
  AND tc.table_name IN (
    'properties', 
    'rooms', 
    'bookings', 
    'checkin_data',
    'guest_profiles'
  )
ORDER BY tc.table_name;

-- Check what tables actually exist in public schema
SELECT 
  table_name,
  table_type
FROM information_schema.tables 
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;
