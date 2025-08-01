# Device Token Management Guide

## Overview

The booking management system uses device-based authentication to provide secure, persistent access for administrators. This guide explains how to manage device tokens when they expire or when you need access from a new device.

## How Device Tokens Work

- **Device tokens** are unique identifiers that allow persistent login on mobile devices
- Tokens are stored in your browser's localStorage for automatic authentication
- Each token has an expiration date (default: 90 days)
- Tokens can be deactivated or deleted for security

## When You Need a New Token

### 1. Token Expired
- Tokens automatically expire after their set duration (30-365 days)
- You'll see an "Invalid or expired device token" error when trying to log in
- **Solution**: Generate a new token using the Token Management interface

### 2. New Device
- When accessing the admin panel from a new phone, tablet, or browser
- When you clear your browser data/localStorage
- **Solution**: Generate a new token or use an existing active token

### 3. Lost Token
- If you forgot or lost your device token
- **Solution**: Generate a new token using the Token Management interface

## How to Generate New Tokens

### Step 1: Access Token Management
1. Log in to the admin panel with an existing valid token
2. Click on the **"🔐 Device Tokens"** tab in the admin interface
3. You'll see the Token Management page

### Step 2: Generate New Token
1. In the "Generate New Token" section:
   - **Device Name**: Enter a descriptive name (e.g., "John's iPhone", "Office Tablet")
   - **Expires in**: Choose duration (30 days to 1 year)
2. Click **"Generate Token"**
3. A modal will appear with your new token

### Step 3: Save Your Token
1. **Copy the token immediately** - you won't see it again!
2. Save it securely (password manager, secure notes)
3. Use this token to log in from your new device

## Managing Existing Tokens

### View All Tokens
The Token Management interface shows all tokens with:
- Device name and creation date
- Current status (Active/Inactive/Expired)
- Last used date
- Expiration date

### Token Actions
- **Copy**: Copy the token to clipboard (only shows first 8 characters for security)
- **Activate/Deactivate**: Enable or disable a token
- **Delete**: Permanently remove a token (cannot be undone)

## Security Best Practices

### 1. Token Naming
- Use descriptive names: "Sarah's iPhone 13", "Reception Desk iPad"
- Avoid generic names like "Device 1" or "Phone"

### 2. Token Lifecycle
- **Regular cleanup**: Delete tokens for devices you no longer use
- **Deactivate suspicious tokens**: If you suspect unauthorized access
- **Set appropriate expiration**: Shorter for high-security environments

### 3. Token Storage
- **Never share tokens** with unauthorized users
- **Store securely**: Use password managers or secure note apps
- **Don't save in plain text** files or unsecured locations

## Emergency Access

### If You're Locked Out
If all your tokens are expired or lost:

1. **Database Access Required**: You'll need direct database access to create a new token
2. **Run this SQL** in your Supabase SQL editor:
   ```sql
   INSERT INTO device_tokens (device_token, device_name, device_info) 
   VALUES (
     gen_random_uuid(),
     'Emergency Access Token',
     '{"type": "emergency", "created_by": "manual"}'
   );
   
   -- Get the generated token
   SELECT device_token, device_name, created_at
   FROM device_tokens 
   WHERE device_name = 'Emergency Access Token'
   ORDER BY created_at DESC 
   LIMIT 1;
   ```
3. Use the returned token to log in and generate proper tokens

### Prevention
- **Always keep at least 2 active tokens** for different devices
- **Generate new tokens before old ones expire**
- **Keep one long-term token** (1 year) as backup

## Mobile PWA Setup

### Adding to Home Screen
1. Open the admin panel in your mobile browser
2. Navigate to `/admin` 
3. Use browser's "Add to Home Screen" feature
4. The app will remember your token for persistent access

### Token Persistence
- Tokens are stored in localStorage
- Survives app restarts and phone reboots
- Only cleared when you manually log out or clear browser data

## Troubleshooting

### Common Issues

**"Invalid or expired device token"**
- Token has expired → Generate new token
- Token was deactivated → Check token status in management interface
- Wrong token → Double-check the token you're entering

**"Authentication failed"**
- Network connectivity issues → Check internet connection
- Database connection issues → Contact system administrator
- Browser issues → Try clearing cache or different browser

**Token not working on new device**
- Ensure you're using the correct token
- Check if token is still active and not expired
- Verify you're accessing the correct URL (`/admin`)

### Getting Help
If you continue having issues:
1. Check the Token Management interface for token status
2. Verify database connectivity
3. Contact your system administrator
4. Check browser console for error messages

## Technical Details

### Token Format
- Tokens are UUID v4 format (e.g., `550e8400-e29b-41d4-a716-446655440000`)
- Stored in `device_tokens` table in Supabase
- Validated on each admin panel access

### Security Features
- Tokens are checked against database on each use
- `last_used_at` timestamp updated on successful authentication
- Row Level Security (RLS) policies protect token data
- Tokens can be instantly revoked by deactivation

### Browser Storage
- Stored in `localStorage` with key `admin_device_token`
- Automatically cleared on logout
- Persists across browser sessions until manually removed