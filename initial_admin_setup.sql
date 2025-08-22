-- Initial Admin User Setup
-- Replace the email below with your real admin email before running.
DO $$
DECLARE
  admin_email TEXT := 'rahulsrajput016@gmail.com'; -- TODO: replace
  admin_user_id uuid;
BEGIN
  -- Find user by email (user must already be created in Supabase Auth)
  SELECT id INTO admin_user_id
  FROM auth.users
  WHERE email = admin_email;

  IF admin_user_id IS NOT NULL THEN
    -- Assign admin role if not present
    INSERT INTO public.user_roles (user_id, role)
    VALUES (admin_user_id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;

    -- Create admin profile if not present
    INSERT INTO public.admin_profiles (user_id, full_name, position)
    VALUES (admin_user_id, 'System Administrator', 'Admin')
    ON CONFLICT (user_id) DO NOTHING;

    RAISE NOTICE 'Admin user setup completed for: %', admin_user_id;
  ELSE
    RAISE NOTICE 'Admin user not found for email: % . Please create the user first in Supabase Auth.', admin_email;
  END IF;
END$$;
