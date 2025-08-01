-- Device Tokens Table for Persistent Authentication
CREATE TABLE IF NOT EXISTS device_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  device_token UUID NOT NULL UNIQUE,
  device_name VARCHAR(255),
  device_info JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '90 days')
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_device_tokens_token ON device_tokens(device_token);
CREATE INDEX IF NOT EXISTS idx_device_tokens_active ON device_tokens(is_active);

-- Insert a default admin device token (you can change this)
INSERT INTO device_tokens (device_token, device_name, device_info) 
VALUES (
  gen_random_uuid(),
  'Admin Device',
  '{"type": "admin", "description": "Default admin device"}'
) ON CONFLICT (device_token) DO NOTHING;

-- Display the generated token for initial setup
SELECT 
  device_token,
  device_name,
  created_at
FROM device_tokens 
WHERE device_name = 'Admin Device'
ORDER BY created_at DESC 
LIMIT 1;