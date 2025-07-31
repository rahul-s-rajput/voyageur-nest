-- Create invoice_counter table
CREATE TABLE IF NOT EXISTS public.invoice_counter (
    id INTEGER PRIMARY KEY DEFAULT 1,
    value INTEGER NOT NULL DEFAULT 391,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert initial counter value
INSERT INTO public.invoice_counter (id, value) 
VALUES (1, 391) 
ON CONFLICT (id) DO NOTHING;

-- Enable real-time subscriptions
ALTER PUBLICATION supabase_realtime ADD TABLE public.invoice_counter;

-- Optional: Add RLS (Row Level Security) policies if needed
-- For now, we'll allow all operations since this is a simple counter
ALTER TABLE public.invoice_counter ENABLE ROW LEVEL SECURITY;

-- Policy to allow read access
CREATE POLICY "Allow read access to invoice_counter" ON public.invoice_counter
    FOR SELECT USING (true);

-- Policy to allow update access  
CREATE POLICY "Allow update access to invoice_counter" ON public.invoice_counter
    FOR UPDATE USING (true);

-- Policy to allow insert access
CREATE POLICY "Allow insert access to invoice_counter" ON public.invoice_counter
    FOR INSERT WITH CHECK (true);

-- Create bookings table
CREATE TABLE IF NOT EXISTS public.bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guest_name TEXT NOT NULL,
    room_no TEXT NOT NULL,
    check_in DATE NOT NULL,
    check_out DATE NOT NULL,
    no_of_pax INTEGER NOT NULL DEFAULT 1,
    adult_child TEXT NOT NULL DEFAULT '1/0',
    status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'pending', 'checked-in', 'checked-out')),
    cancelled BOOLEAN NOT NULL DEFAULT false,
    total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    payment_status TEXT NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('paid', 'partial', 'unpaid')),
    payment_amount DECIMAL(10,2) DEFAULT 0,
    payment_mode TEXT,
    contact_phone TEXT,
    contact_email TEXT,
    special_requests TEXT,
    booking_date DATE,
    invoice_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable real-time subscriptions for bookings
ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;

-- Add RLS policies for bookings
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- Policy to allow read access to bookings
CREATE POLICY "Allow read access to bookings" ON public.bookings
    FOR SELECT USING (true);

-- Policy to allow insert access to bookings
CREATE POLICY "Allow insert access to bookings" ON public.bookings
    FOR INSERT WITH CHECK (true);

-- Policy to allow update access to bookings
CREATE POLICY "Allow update access to bookings" ON public.bookings
    FOR UPDATE USING (true);

-- Policy to allow delete access to bookings
CREATE POLICY "Allow delete access to bookings" ON public.bookings
    FOR DELETE USING (true);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_bookings_updated_at
    BEFORE UPDATE ON public.bookings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column(); 