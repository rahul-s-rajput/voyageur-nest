-- Atomic invoice/folio number reservation.
--
-- Problem: bookingService.createBooking previously read the counter and then
-- wrote counter+1 as two separate calls. Two concurrent booking creations could
-- both read the same value and produce the SAME folio number (520/{n}).
--
-- Fix: a single locked statement that advances the counter and returns the
-- number to use. The UPDATE takes a row lock, so concurrent callers serialize
-- and every caller gets a distinct number.
--
-- SECURITY INVOKER: the function runs as the caller and therefore respects the
-- existing admin-only RLS on invoice_counter (no privilege escalation).
--
-- Semantics match the old code: returns the CURRENT value (the number to use)
-- and leaves the stored value at current+1 for the next caller. The counter
-- starts at 391 if the row does not yet exist.

CREATE OR REPLACE FUNCTION public.next_invoice_number()
RETURNS integer
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  used integer;
BEGIN
  -- Make sure the singleton row exists without disturbing an existing value.
  INSERT INTO public.invoice_counter (id, value)
  VALUES (1, 391)
  ON CONFLICT (id) DO NOTHING;

  -- Atomically reserve the next number under a row lock.
  UPDATE public.invoice_counter
  SET value = value + 1
  WHERE id = 1
  RETURNING value - 1 INTO used;

  RETURN used;
END;
$$;

-- anon/authenticated may call it; the admin-only RLS on invoice_counter still
-- gates whether the underlying UPDATE succeeds.
GRANT EXECUTE ON FUNCTION public.next_invoice_number() TO authenticated, anon;
