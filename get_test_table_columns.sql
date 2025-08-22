-- Get exact column information for tables used in RLS test
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name IN ('properties', 'rooms', 'bookings', 'checkin_data', 'guest_profiles')
ORDER BY table_name, ordinal_position;
