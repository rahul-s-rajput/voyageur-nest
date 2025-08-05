-- Multi-Property Migration Script
-- This script adds property_id foreign keys to existing tables and migrates existing data

-- Add property_id column to bookings table
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS property_id UUID REFERENCES properties(id);

-- Create index for better performance on property_id queries
CREATE INDEX IF NOT EXISTS idx_bookings_property_id ON public.bookings(property_id);

-- Set default property for existing bookings (assuming Old Manali as default)
UPDATE public.bookings 
SET property_id = (SELECT id FROM properties WHERE name = 'Old Manali' LIMIT 1)
WHERE property_id IS NULL;

-- Make property_id NOT NULL after setting defaults
ALTER TABLE public.bookings 
ALTER COLUMN property_id SET NOT NULL;

-- Check if guest_profiles table exists and add property_id if it does
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'guest_profiles') THEN
        -- Add property_id to guest_profiles for cross-property guest recognition
        ALTER TABLE public.guest_profiles 
        ADD COLUMN IF NOT EXISTS property_id UUID REFERENCES properties(id);
        
        -- Create index for guest_profiles property_id
        CREATE INDEX IF NOT EXISTS idx_guest_profiles_property_id ON public.guest_profiles(property_id);
        
        -- Set default property for existing guest profiles
        UPDATE public.guest_profiles 
        SET property_id = (SELECT id FROM properties WHERE name = 'Old Manali' LIMIT 1)
        WHERE property_id IS NULL;
    END IF;
END $$;

-- Create property-specific settings table for advanced configurations
CREATE TABLE IF NOT EXISTS public.property_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
    setting_key VARCHAR(100) NOT NULL,
    setting_value JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(property_id, setting_key)
);

-- Enable RLS for property_settings
ALTER TABLE public.property_settings ENABLE ROW LEVEL SECURITY;

-- Policies for property_settings table
CREATE POLICY "Allow read access to property_settings" ON public.property_settings
    FOR SELECT USING (true);

CREATE POLICY "Allow insert access to property_settings" ON public.property_settings
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow update access to property_settings" ON public.property_settings
    FOR UPDATE USING (true);

CREATE POLICY "Allow delete access to property_settings" ON public.property_settings
    FOR DELETE USING (true);

-- Create trigger for property_settings
CREATE TRIGGER update_property_settings_updated_at
    BEFORE UPDATE ON public.property_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable real-time subscriptions for property_settings
ALTER PUBLICATION supabase_realtime ADD TABLE public.property_settings;

-- Insert default settings for both properties
INSERT INTO public.property_settings (property_id, setting_key, setting_value) VALUES
-- Old Manali settings
((SELECT id FROM properties WHERE name = 'Old Manali'), 'booking_policies', '{"min_stay": 1, "max_stay": 30, "advance_booking_days": 365, "same_day_booking": true}'),
((SELECT id FROM properties WHERE name = 'Old Manali'), 'payment_settings', '{"accepted_methods": ["cash", "upi", "card"], "advance_payment_required": false, "cancellation_charges": 0}'),
((SELECT id FROM properties WHERE name = 'Old Manali'), 'notification_preferences', '{"email_notifications": true, "sms_notifications": false, "booking_confirmations": true, "check_in_reminders": true}'),
((SELECT id FROM properties WHERE name = 'Old Manali'), 'operational_hours', '{"check_in_start": "12:00", "check_in_end": "22:00", "check_out_start": "08:00", "check_out_end": "11:00", "office_hours": "08:00-20:00"}'),

-- Baror settings
((SELECT id FROM properties WHERE name = 'Baror'), 'booking_policies', '{"min_stay": 2, "max_stay": 14, "advance_booking_days": 365, "same_day_booking": false}'),
((SELECT id FROM properties WHERE name = 'Baror'), 'payment_settings', '{"accepted_methods": ["cash", "upi", "card", "bank_transfer"], "advance_payment_required": true, "advance_payment_percentage": 30, "cancellation_charges": 20}'),
((SELECT id FROM properties WHERE name = 'Baror'), 'notification_preferences', '{"email_notifications": true, "sms_notifications": true, "booking_confirmations": true, "check_in_reminders": true, "welcome_messages": true}'),
((SELECT id FROM properties WHERE name = 'Baror'), 'operational_hours', '{"check_in_start": "14:00", "check_in_end": "20:00", "check_out_start": "08:00", "check_out_end": "11:00", "office_hours": "09:00-18:00"}');

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_properties_name ON public.properties(name);
CREATE INDEX IF NOT EXISTS idx_properties_is_active ON public.properties(is_active);
CREATE INDEX IF NOT EXISTS idx_rooms_property_id_room_number ON public.rooms(property_id, room_number);
CREATE INDEX IF NOT EXISTS idx_rooms_room_type ON public.rooms(room_type);
CREATE INDEX IF NOT EXISTS idx_rooms_is_active ON public.rooms(is_active);

-- Verify migration by checking data
SELECT 
    p.name as property_name,
    p.total_rooms,
    COUNT(r.id) as actual_rooms,
    array_agg(DISTINCT r.room_type) as room_types
FROM properties p
LEFT JOIN rooms r ON p.id = r.property_id
GROUP BY p.id, p.name, p.total_rooms
ORDER BY p.name;