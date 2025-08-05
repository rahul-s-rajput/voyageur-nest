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

-- Create properties table for multi-property management
CREATE TABLE IF NOT EXISTS public.properties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    address TEXT,
    phone VARCHAR(20),
    email VARCHAR(255),
    description TEXT,
    website_url VARCHAR(255),
    check_in_time TIME DEFAULT '14:00',
    check_out_time TIME DEFAULT '11:00',
    total_rooms INTEGER DEFAULT 0,
    amenities JSONB DEFAULT '[]',
    policies JSONB DEFAULT '{}',
    branding JSONB DEFAULT '{}',
    settings JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create rooms table for property-specific room management
CREATE TABLE IF NOT EXISTS public.rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
    room_number VARCHAR(10) NOT NULL,
    room_type VARCHAR(50) NOT NULL, -- 'standard', 'deluxe', 'twin_single'
    floor INTEGER,
    max_occupancy INTEGER DEFAULT 2,
    base_price DECIMAL(10,2),
    amenities JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(property_id, room_number)
);

-- Enable RLS for properties table
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

-- Policies for properties table
CREATE POLICY "Allow read access to properties" ON public.properties
    FOR SELECT USING (true);

CREATE POLICY "Allow insert access to properties" ON public.properties
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow update access to properties" ON public.properties
    FOR UPDATE USING (true);

CREATE POLICY "Allow delete access to properties" ON public.properties
    FOR DELETE USING (true);

-- Enable RLS for rooms table
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;

-- Policies for rooms table
CREATE POLICY "Allow read access to rooms" ON public.rooms
    FOR SELECT USING (true);

CREATE POLICY "Allow insert access to rooms" ON public.rooms
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow update access to rooms" ON public.rooms
    FOR UPDATE USING (true);

CREATE POLICY "Allow delete access to rooms" ON public.rooms
    FOR DELETE USING (true);

-- Create triggers for properties and rooms tables
CREATE TRIGGER update_properties_updated_at
    BEFORE UPDATE ON public.properties
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rooms_updated_at
    BEFORE UPDATE ON public.rooms
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable real-time subscriptions for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.properties;
ALTER PUBLICATION supabase_realtime ADD TABLE public.rooms;

-- Insert initial property data for Old Manali and Baror
INSERT INTO public.properties (name, address, total_rooms, settings, branding, policies) VALUES 
(
    'Old Manali',
    'Old Manali, Himachal Pradesh, India',
    8,
    '{"target_market": "backpacker", "room_types": ["standard", "twin_single", "deluxe"], "property_type": "backpacker_friendly"}',
    '{"theme_color": "#4F46E5", "secondary_color": "#10B981", "logo_url": "", "property_style": "casual"}',
    '{"cancellation_policy": "flexible", "check_in_instructions": "Backpacker-friendly check-in", "house_rules": ["No smoking", "Quiet hours 10 PM - 8 AM"]}'
),
(
    'Baror',
    'Baror, Himachal Pradesh, India',
    4,
    '{"target_market": "family", "room_types": ["deluxe"], "property_type": "family_oriented"}',
    '{"theme_color": "#7C3AED", "secondary_color": "#F59E0B", "logo_url": "", "property_style": "premium"}',
    '{"cancellation_policy": "moderate", "check_in_instructions": "Family-oriented premium service", "house_rules": ["No smoking", "Family-friendly environment", "Quiet hours 9 PM - 8 AM"]}'
);

-- Insert room data for Old Manali (8 rooms: 102-110, mixed types)
INSERT INTO public.rooms (property_id, room_number, room_type, max_occupancy, base_price, amenities) VALUES 
-- Standard Rooms (102-105)
((SELECT id FROM properties WHERE name = 'Old Manali'), '102', 'standard', 2, 1500.00, '["WiFi", "Shared Bathroom", "Basic Amenities"]'),
((SELECT id FROM properties WHERE name = 'Old Manali'), '103', 'standard', 2, 1500.00, '["WiFi", "Shared Bathroom", "Basic Amenities"]'),
((SELECT id FROM properties WHERE name = 'Old Manali'), '104', 'standard', 2, 1500.00, '["WiFi", "Shared Bathroom", "Basic Amenities"]'),
((SELECT id FROM properties WHERE name = 'Old Manali'), '105', 'standard', 2, 1500.00, '["WiFi", "Shared Bathroom", "Basic Amenities"]'),
-- Twin Single Beds (106) - Special booking capability for separate beds (2 separate individuals)
((SELECT id FROM properties WHERE name = 'Old Manali'), '106', 'twin_single', 2, 800.00, '["WiFi", "Twin Single Beds", "Shared Bathroom", "Individual Booking"]'),
-- Deluxe Rooms (108-110)
((SELECT id FROM properties WHERE name = 'Old Manali'), '108', 'deluxe', 2, 2500.00, '["WiFi", "Private Bathroom", "Mountain View", "Premium Amenities"]'),
((SELECT id FROM properties WHERE name = 'Old Manali'), '109', 'deluxe', 2, 2500.00, '["WiFi", "Private Bathroom", "Mountain View", "Premium Amenities"]'),
((SELECT id FROM properties WHERE name = 'Old Manali'), '110', 'deluxe', 2, 2500.00, '["WiFi", "Private Bathroom", "Mountain View", "Premium Amenities"]');

-- Insert room data for Baror (4 deluxe rooms: 101, 102, 201, 202)
INSERT INTO public.rooms (property_id, room_number, room_type, max_occupancy, base_price, amenities) VALUES 
((SELECT id FROM properties WHERE name = 'Baror'), '101', 'deluxe', 4, 4000.00, '["WiFi", "Private Bathroom", "Family Amenities", "Valley View", "Premium Service"]'),
((SELECT id FROM properties WHERE name = 'Baror'), '102', 'deluxe', 4, 4000.00, '["WiFi", "Private Bathroom", "Family Amenities", "Valley View", "Premium Service"]'),
((SELECT id FROM properties WHERE name = 'Baror'), '201', 'deluxe', 4, 4500.00, '["WiFi", "Private Bathroom", "Family Amenities", "Mountain View", "Premium Service", "Upper Floor"]'),
((SELECT id FROM properties WHERE name = 'Baror'), '202', 'deluxe', 4, 4500.00, '["WiFi", "Private Bathroom", "Family Amenities", "Mountain View", "Premium Service", "Upper Floor"]');