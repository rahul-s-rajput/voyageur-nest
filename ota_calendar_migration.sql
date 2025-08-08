-- OTA Calendar Synchronization Migration
-- Story 4.2: Database Schema for OTA Calendar Management
-- Run this SQL in your Supabase SQL editor

-- Create ota_platforms table with platform configurations
CREATE TABLE IF NOT EXISTS public.ota_platforms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE, -- 'Airbnb', 'VRBO', 'Booking.com', 'GoMMT/MakeMyTrip'
    display_name VARCHAR(100) NOT NULL, -- User-friendly display name
    type VARCHAR(20) NOT NULL CHECK (type IN ('ical', 'manual')), -- 'ical' for automated, 'manual' for checklist-based
    ical_export_url TEXT, -- URL for exporting our calendar to OTA
    ical_import_url TEXT, -- URL for importing OTA bookings
    sync_interval INTEGER DEFAULT 60, -- Sync interval in minutes (30-60 recommended)
    sync_enabled BOOLEAN DEFAULT true, -- Whether sync is enabled for this platform
    is_active BOOLEAN DEFAULT true,
    configuration JSONB DEFAULT '{}', -- Platform-specific settings
    credentials JSONB DEFAULT '{}', -- Encrypted platform credentials (if needed)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create ota_sync_logs table for tracking sync operations
CREATE TABLE IF NOT EXISTS public.ota_sync_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    platform_id UUID REFERENCES ota_platforms(id) ON DELETE CASCADE,
    property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
    sync_type VARCHAR(20) NOT NULL CHECK (sync_type IN ('export', 'import', 'full')),
    status VARCHAR(20) NOT NULL CHECK (status IN ('success', 'failed', 'pending', 'partial')),
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    records_processed INTEGER DEFAULT 0,
    records_failed INTEGER DEFAULT 0,
    error_message TEXT,
    error_details JSONB,
    sync_data JSONB, -- Summary of what was synced
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create calendar_conflicts table for conflict management
CREATE TABLE IF NOT EXISTS public.calendar_conflicts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
    conflict_date DATE NOT NULL,
    conflict_end_date DATE, -- For multi-day conflicts
    platforms TEXT[] NOT NULL, -- Array of platform names involved in conflict
    severity VARCHAR(10) NOT NULL CHECK (severity IN ('low', 'medium', 'high')),
    status VARCHAR(20) NOT NULL DEFAULT 'detected' CHECK (status IN ('detected', 'resolving', 'resolved', 'ignored')),
    conflict_type VARCHAR(30) NOT NULL, -- 'double_booking', 'availability_mismatch', 'pricing_conflict'
    description TEXT,
    resolution TEXT,
    resolved_by TEXT, -- User who resolved the conflict
    resolved_at TIMESTAMP WITH TIME ZONE,
    booking_ids UUID[], -- Related booking IDs
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create manual_update_checklists table for non-iCal platforms
CREATE TABLE IF NOT EXISTS public.manual_update_checklists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    platform_id UUID REFERENCES ota_platforms(id) ON DELETE CASCADE,
    property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
    booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
    checklist_type VARCHAR(30) NOT NULL, -- 'new_booking', 'modification', 'cancellation'
    checklist_data JSONB NOT NULL, -- Platform-specific checklist items
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'skipped')),
    assigned_to TEXT, -- User assigned to complete the checklist
    completed_by TEXT, -- User who completed the checklist
    completed_at TIMESTAMP WITH TIME ZONE,
    due_date TIMESTAMP WITH TIME ZONE, -- When the update should be completed
    reminder_sent_at TIMESTAMP WITH TIME ZONE,
    notes TEXT, -- Additional notes from the user
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add calendar sync fields to existing bookings table
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS ota_platform_id UUID REFERENCES ota_platforms(id),
ADD COLUMN IF NOT EXISTS ota_booking_id TEXT, -- External booking ID from OTA
ADD COLUMN IF NOT EXISTS ota_sync_status VARCHAR(20) DEFAULT 'pending' CHECK (ota_sync_status IN ('pending', 'synced', 'failed', 'manual')),
ADD COLUMN IF NOT EXISTS ota_last_sync TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS ota_sync_errors JSONB,
ADD COLUMN IF NOT EXISTS source VARCHAR(20) DEFAULT 'direct' CHECK (source IN ('direct', 'ota', 'ical_import'));

-- Create indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_ota_platforms_type ON ota_platforms(type);
CREATE INDEX IF NOT EXISTS idx_ota_platforms_active ON ota_platforms(is_active);
CREATE INDEX IF NOT EXISTS idx_ota_sync_logs_platform_property ON ota_sync_logs(platform_id, property_id);
CREATE INDEX IF NOT EXISTS idx_ota_sync_logs_status ON ota_sync_logs(status);
CREATE INDEX IF NOT EXISTS idx_ota_sync_logs_created_at ON ota_sync_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_calendar_conflicts_property_date ON calendar_conflicts(property_id, conflict_date);
CREATE INDEX IF NOT EXISTS idx_calendar_conflicts_status ON calendar_conflicts(status);
CREATE INDEX IF NOT EXISTS idx_manual_checklists_platform_property ON manual_update_checklists(platform_id, property_id);
CREATE INDEX IF NOT EXISTS idx_manual_checklists_status ON manual_update_checklists(status);
CREATE INDEX IF NOT EXISTS idx_manual_checklists_due_date ON manual_update_checklists(due_date);
CREATE INDEX IF NOT EXISTS idx_bookings_ota_platform ON bookings(ota_platform_id);
CREATE INDEX IF NOT EXISTS idx_bookings_ota_sync_status ON bookings(ota_sync_status);
CREATE INDEX IF NOT EXISTS idx_bookings_check_in_out ON bookings(check_in, check_out);

-- Enable RLS for all new tables
ALTER TABLE public.ota_platforms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ota_sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_conflicts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manual_update_checklists ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for ota_platforms
CREATE POLICY "Allow read access to ota_platforms" ON public.ota_platforms
    FOR SELECT USING (true);
CREATE POLICY "Allow insert access to ota_platforms" ON public.ota_platforms
    FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update access to ota_platforms" ON public.ota_platforms
    FOR UPDATE USING (true);
CREATE POLICY "Allow delete access to ota_platforms" ON public.ota_platforms
    FOR DELETE USING (true);

-- Create RLS policies for ota_sync_logs
CREATE POLICY "Allow read access to ota_sync_logs" ON public.ota_sync_logs
    FOR SELECT USING (true);
CREATE POLICY "Allow insert access to ota_sync_logs" ON public.ota_sync_logs
    FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update access to ota_sync_logs" ON public.ota_sync_logs
    FOR UPDATE USING (true);

-- Create RLS policies for calendar_conflicts
CREATE POLICY "Allow read access to calendar_conflicts" ON public.calendar_conflicts
    FOR SELECT USING (true);
CREATE POLICY "Allow insert access to calendar_conflicts" ON public.calendar_conflicts
    FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update access to calendar_conflicts" ON public.calendar_conflicts
    FOR UPDATE USING (true);
CREATE POLICY "Allow delete access to calendar_conflicts" ON public.calendar_conflicts
    FOR DELETE USING (true);

-- Create RLS policies for manual_update_checklists
CREATE POLICY "Allow read access to manual_update_checklists" ON public.manual_update_checklists
    FOR SELECT USING (true);
CREATE POLICY "Allow insert access to manual_update_checklists" ON public.manual_update_checklists
    FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update access to manual_update_checklists" ON public.manual_update_checklists
    FOR UPDATE USING (true);
CREATE POLICY "Allow delete access to manual_update_checklists" ON public.manual_update_checklists
    FOR DELETE USING (true);

-- Create triggers for updated_at columns
CREATE TRIGGER update_ota_platforms_updated_at
    BEFORE UPDATE ON public.ota_platforms
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_calendar_conflicts_updated_at
    BEFORE UPDATE ON public.calendar_conflicts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_manual_update_checklists_updated_at
    BEFORE UPDATE ON public.manual_update_checklists
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable real-time subscriptions for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.ota_platforms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ota_sync_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.calendar_conflicts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.manual_update_checklists;

-- Insert initial OTA platform configurations
INSERT INTO public.ota_platforms (name, display_name, type, sync_interval, configuration) VALUES 
(
    'airbnb',
    'Airbnb',
    'ical',
    60,
    '{"supports_export": true, "supports_import": true, "timezone": "Asia/Kolkata", "date_format": "YYYY-MM-DD"}'
),
(
    'vrbo',
    'VRBO',
    'ical',
    60,
    '{"supports_export": true, "supports_import": true, "timezone": "Asia/Kolkata", "date_format": "YYYY-MM-DD"}'
),
(
    'booking_com',
    'Booking.com',
    'manual',
    null,
    '{"update_method": "extranet_calendar", "bulk_editing": true, "platform_url": "https://admin.booking.com", "instructions": "Use Extranet calendar grid for bulk date range updates"}'
),
(
    'gommt',
    'GoMMT/MakeMyTrip',
    'manual',
    null,
    '{"update_method": "connect_app", "app_name": "MakeMyTrip Connect", "sync_feature": true, "instructions": "Use Connect mobile app for real-time updates and built-in OTA sync"}'
);

-- Create function to detect calendar conflicts
CREATE OR REPLACE FUNCTION detect_calendar_conflicts()
RETURNS TRIGGER AS $$
DECLARE
    conflict_count INTEGER;
    existing_platforms TEXT[];
BEGIN
    -- Check for overlapping bookings on the same property
    SELECT COUNT(*), ARRAY_AGG(DISTINCT COALESCE(op.name, 'direct'))
    INTO conflict_count, existing_platforms
    FROM bookings b
    LEFT JOIN ota_platforms op ON b.ota_platform_id = op.id
    WHERE b.property_id = (
        SELECT property_id FROM rooms WHERE room_number = NEW.room_no LIMIT 1
    )
    AND b.id != NEW.id
    AND b.cancelled = false
    AND (
        (NEW.check_in >= b.check_in AND NEW.check_in < b.check_out) OR
        (NEW.check_out > b.check_in AND NEW.check_out <= b.check_out) OR
        (NEW.check_in <= b.check_in AND NEW.check_out >= b.check_out)
    );

    -- If conflicts detected, create conflict record
    IF conflict_count > 0 THEN
        INSERT INTO calendar_conflicts (
            property_id,
            conflict_date,
            conflict_end_date,
            platforms,
            severity,
            conflict_type,
            description,
            booking_ids
        ) VALUES (
            (SELECT property_id FROM rooms WHERE room_number = NEW.room_no LIMIT 1),
            NEW.check_in,
            NEW.check_out,
            existing_platforms || ARRAY[COALESCE((SELECT name FROM ota_platforms WHERE id = NEW.ota_platform_id), 'direct')],
            CASE 
                WHEN conflict_count >= 2 THEN 'high'
                WHEN conflict_count = 1 THEN 'medium'
                ELSE 'low'
            END,
            'double_booking',
            'Overlapping booking detected for room ' || NEW.room_no || ' from ' || NEW.check_in || ' to ' || NEW.check_out,
            ARRAY[NEW.id] || (
                SELECT ARRAY_AGG(b.id) 
                FROM bookings b 
                WHERE b.property_id = (SELECT property_id FROM rooms WHERE room_number = NEW.room_no LIMIT 1)
                AND b.id != NEW.id
                AND b.cancelled = false
                AND (
                    (NEW.check_in >= b.check_in AND NEW.check_in < b.check_out) OR
                    (NEW.check_out > b.check_in AND NEW.check_out <= b.check_out) OR
                    (NEW.check_in <= b.check_in AND NEW.check_out >= b.check_out)
                )
            )
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for conflict detection on new bookings
CREATE TRIGGER detect_booking_conflicts
    AFTER INSERT OR UPDATE ON public.bookings
    FOR EACH ROW
    EXECUTE FUNCTION detect_calendar_conflicts();

-- Create function to generate manual update checklists
CREATE OR REPLACE FUNCTION generate_manual_checklists()
RETURNS TRIGGER AS $$
DECLARE
    platform_record RECORD;
    checklist_items JSONB;
BEGIN
    -- Generate checklists for manual platforms when booking is created/updated
    FOR platform_record IN 
        SELECT * FROM ota_platforms WHERE type = 'manual' AND is_active = true
    LOOP
        -- Generate platform-specific checklist items
        IF platform_record.name = 'booking_com' THEN
            checklist_items := jsonb_build_object(
                'items', jsonb_build_array(
                    jsonb_build_object('task', 'Login to Booking.com Extranet', 'completed', false, 'url', 'https://admin.booking.com'),
                    jsonb_build_object('task', 'Navigate to Calendar & Pricing section', 'completed', false),
                    jsonb_build_object('task', 'Select property: ' || (SELECT name FROM properties p JOIN rooms r ON p.id = r.property_id WHERE r.room_number = NEW.room_no LIMIT 1), 'completed', false),
                    jsonb_build_object('task', 'Update availability for dates: ' || NEW.check_in || ' to ' || NEW.check_out, 'completed', false),
                    jsonb_build_object('task', 'Set room ' || NEW.room_no || ' as unavailable', 'completed', false),
                    jsonb_build_object('task', 'Save changes and verify update', 'completed', false)
                ),
                'priority', 'high',
                'estimated_time', '5-10 minutes'
            );
        ELSIF platform_record.name = 'gommt' THEN
            checklist_items := jsonb_build_object(
                'items', jsonb_build_array(
                    jsonb_build_object('task', 'Open MakeMyTrip Connect mobile app', 'completed', false),
                    jsonb_build_object('task', 'Select property: ' || (SELECT name FROM properties p JOIN rooms r ON p.id = r.property_id WHERE r.room_number = NEW.room_no LIMIT 1), 'completed', false),
                    jsonb_build_object('task', 'Navigate to Calendar/Inventory section', 'completed', false),
                    jsonb_build_object('task', 'Update availability for dates: ' || NEW.check_in || ' to ' || NEW.check_out, 'completed', false),
                    jsonb_build_object('task', 'Use built-in sync feature to update other OTAs', 'completed', false),
                    jsonb_build_object('task', 'Verify sync completion across platforms', 'completed', false)
                ),
                'priority', 'medium',
                'estimated_time', '3-5 minutes'
            );
        END IF;

        -- Insert checklist record
        INSERT INTO manual_update_checklists (
            platform_id,
            property_id,
            booking_id,
            checklist_type,
            checklist_data,
            due_date
        ) VALUES (
            platform_record.id,
            (SELECT property_id FROM rooms WHERE room_number = NEW.room_no LIMIT 1),
            NEW.id,
            CASE 
                WHEN TG_OP = 'INSERT' THEN 'new_booking'
                WHEN TG_OP = 'UPDATE' AND OLD.cancelled = false AND NEW.cancelled = true THEN 'cancellation'
                ELSE 'modification'
            END,
            checklist_items,
            NOW() + INTERVAL '2 hours' -- Due in 2 hours
        );
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for manual checklist generation
CREATE TRIGGER generate_booking_checklists
    AFTER INSERT OR UPDATE ON public.bookings
    FOR EACH ROW
    EXECUTE FUNCTION generate_manual_checklists();

-- Add comments for documentation
COMMENT ON TABLE public.ota_platforms IS 'Configuration for OTA platforms (Airbnb, VRBO, Booking.com, etc.)';
COMMENT ON TABLE public.ota_sync_logs IS 'Logs of all synchronization operations with OTA platforms';
COMMENT ON TABLE public.calendar_conflicts IS 'Detected conflicts between bookings across platforms';
COMMENT ON TABLE public.manual_update_checklists IS 'Checklists for manual updates on platforms without iCal support';

COMMENT ON COLUMN public.ota_platforms.type IS 'Platform type: ical for automated sync, manual for checklist-based updates';
COMMENT ON COLUMN public.ota_platforms.sync_interval IS 'Sync interval in minutes for iCal platforms';
COMMENT ON COLUMN public.calendar_conflicts.severity IS 'Conflict severity: low, medium, high based on impact';
COMMENT ON COLUMN public.manual_update_checklists.checklist_type IS 'Type of update: new_booking, modification, cancellation';