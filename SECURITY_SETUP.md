# Voyageur Nest - Booking Management System

A secure hotel booking management system with device-based authentication and guest check-in functionality.

## Security Features

### Device-Based Authentication
- **Persistent Login**: Once authenticated on a device, you won't need to log in again for 90 days
- **Mobile PWA Support**: Can be saved to mobile home screen for app-like experience
- **Device Tokens**: Secure UUID-based authentication system

### Route Separation
- **Guest Routes**: `/checkin/:bookingId` - Public check-in forms for guests
- **Admin Routes**: `/admin` - Protected booking management system

## Setup Instructions

### 1. Database Setup

Run the following SQL migrations in your Supabase SQL Editor:

1. **Device Tokens Table** (Run `device_tokens_migration.sql`):
```sql
-- This creates the device_tokens table and generates an initial admin token
-- Copy the generated token from the query result for first-time login
```

2. **Check-in Data Table** (Run `checkin_data_migration_fixed.sql`):
```sql
-- This creates the check-in data table with snake_case columns only
-- Drop existing checkin_data table first if it exists
```

### 2. First-Time Admin Access

1. Run the `device_tokens_migration.sql` in Supabase SQL Editor
2. Copy the generated device token from the query result
3. Navigate to `/admin` in your browser
4. Enter the device token when prompted
5. Your device will be remembered for 90 days

### 3. Mobile PWA Setup

#### For iOS (Safari):
1. Open the website in Safari
2. Tap the Share button (square with arrow)
3. Scroll down and tap "Add to Home Screen"
4. Tap "Add" to confirm

#### For Android (Chrome):
1. Open the website in Chrome
2. Tap the three-dot menu
3. Tap "Add to Home Screen"
4. Tap "Add" to confirm

#### For Android (Other browsers):
1. Look for "Install App" or "Add to Home Screen" option
2. Follow the browser-specific prompts

## Usage

### Admin Access
- Navigate to `/admin` or the root URL
- Enter your device token (one-time setup per device)
- Access full booking management system
- Logout removes device authentication

### Guest Check-in
- Guests receive links like `/checkin/BOOKING_ID`
- No authentication required
- After successful check-in, guests see completion message
- No access to admin functions

### Device Token Management
- **Built-in Token Management**: Use the admin interface to generate, view, and manage tokens
- **Token Expiration**: Configurable from 30 days to 1 year (default: 90 days)
- **Multiple Devices**: Generate separate tokens for each device/user
- **Security Controls**: Activate, deactivate, or delete tokens as needed
- **Emergency Access**: Manual token generation via SQL if locked out

📖 **See [TOKEN_MANAGEMENT_GUIDE.md](./TOKEN_MANAGEMENT_GUIDE.md) for detailed instructions**

## Security Benefits

1. **No Password Storage**: Uses device tokens instead of traditional passwords
2. **Device Binding**: Each token is tied to specific device information
3. **Automatic Expiry**: Tokens expire after 90 days
4. **Guest Isolation**: Guests cannot access admin functions
5. **Persistent Mobile Auth**: Perfect for mobile devices saved to home screen

## Technical Details

### Device Token System
- UUID-based tokens stored in `device_tokens` table
- Device fingerprinting for additional security
- Automatic token validation and refresh
- localStorage for client-side persistence

### PWA Features
- Manifest file for "Add to Home Screen"
- Standalone display mode
- Custom app icons
- Mobile-optimized experience

### Database Schema
- `device_tokens`: Authentication tokens and device info
- `checkin_data`: Guest check-in information (snake_case columns)
- Real-time subscriptions for live updates

## Troubleshooting

### Token Management Issues

#### "Invalid or expired device token"
- **Solution 1**: Use Token Management interface to generate new token
- **Solution 2**: Check token status in admin panel → Device Tokens tab
- **Solution 3**: Manual SQL token generation (see TOKEN_MANAGEMENT_GUIDE.md)

#### Need token for new device
1. Log in with existing device that has valid token
2. Go to admin panel → Device Tokens tab
3. Generate new token with descriptive name
4. Copy token and use on new device

#### All tokens expired/lost
- Use emergency SQL method in TOKEN_MANAGEMENT_GUIDE.md
- Generate new token via Supabase SQL Editor
- Always keep backup tokens active

### Check-in form errors
- Ensure `checkin_data_migration_fixed.sql` was run
- Verify snake_case column names in database
- Check Supabase connection and permissions

### PWA not installing
- Ensure HTTPS connection (required for PWA)
- Check manifest.json is accessible
- Verify browser PWA support

### Token Management Best Practices
- **Generate tokens before expiry**: Don't wait until tokens expire
- **Use descriptive names**: "John's iPhone", "Reception iPad"
- **Regular cleanup**: Delete unused tokens monthly
- **Keep backup tokens**: Always have 2+ active tokens