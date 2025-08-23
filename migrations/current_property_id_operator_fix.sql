-- Fix current_property_id() to avoid json ? operator (use ->> checks instead)
BEGIN;

CREATE OR REPLACE FUNCTION public.current_property_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  jwt_claims text;
  prop_id uuid;
BEGIN
  -- Try to read claims text safely
  BEGIN
    jwt_claims := current_setting('request.jwt.claims', true);
  EXCEPTION WHEN OTHERS THEN
    jwt_claims := NULL;
  END;

  -- If present, parse JSON and extract property_id without using '?' operator
  IF jwt_claims IS NOT NULL AND jwt_claims <> '' THEN
    BEGIN
      prop_id := (jwt_claims::json->>'property_id')::uuid;
    EXCEPTION WHEN OTHERS THEN
      prop_id := NULL;
    END;
  END IF;

  -- Fallback to explicit per-request property scope
  IF prop_id IS NULL THEN
    BEGIN
      prop_id := current_setting('request.property_id', true)::uuid;
    EXCEPTION WHEN OTHERS THEN
      prop_id := NULL;
    END;
  END IF;

  RETURN prop_id;
END;
$$;

-- Ensure execute privilege
GRANT EXECUTE ON FUNCTION public.current_property_id() TO anon, authenticated;

COMMIT;
