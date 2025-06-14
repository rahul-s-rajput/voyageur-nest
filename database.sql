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