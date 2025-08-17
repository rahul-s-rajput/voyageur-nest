-- Set up Supabase Storage bucket for receipts with authenticated access

-- Create bucket if not exists
INSERT INTO storage.buckets (id, name, public)
SELECT 'receipts', 'receipts', false
WHERE NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'receipts');

-- Storage policies: allow authenticated users to manage objects in 'receipts'
DO $$
BEGIN
  -- Drop existing policies for clean replacement
  FOR policy_name IN SELECT name FROM storage.policies WHERE bucket_id = 'receipts' LOOP
    EXECUTE format('DROP POLICY %I ON storage.objects', policy_name);
  END LOOP;

  -- Read (signed URL generation happens via API; allow select for listing/metadata if needed)
  CREATE POLICY receipts_read_authenticated
    ON storage.objects FOR SELECT TO authenticated
    USING (bucket_id = 'receipts');

  -- Upload/insert
  CREATE POLICY receipts_insert_authenticated
    ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'receipts');

  -- Update (e.g., replace or metadata)
  CREATE POLICY receipts_update_authenticated
    ON storage.objects FOR UPDATE TO authenticated
    USING (bucket_id = 'receipts')
    WITH CHECK (bucket_id = 'receipts');

  -- Delete
  CREATE POLICY receipts_delete_authenticated
    ON storage.objects FOR DELETE TO authenticated
    USING (bucket_id = 'receipts');
END$$;


