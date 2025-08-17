#!/bin/bash
# Script to update Supabase CLI and deploy the translation worker

echo "Updating Supabase CLI..."

# For npm users
npm update supabase --save-dev

# OR for global npm installation
# npm install -g supabase@latest

# OR for Homebrew (macOS/Linux)
# brew upgrade supabase

# OR for Scoop (Windows)
# scoop update supabase

echo "Checking Supabase CLI version..."
supabase --version

echo "Setting up Edge Function secrets (if not already set)..."
# Uncomment and add your actual API key
# supabase secrets set GEMINI_API_KEY=your_actual_gemini_api_key_here

echo "Deploying translation-worker function..."
# Deploy using the new API method (bypasses Docker requirement)
supabase functions deploy translation-worker --no-verify-jwt

echo "Deployment complete!"
echo "Check logs with: supabase functions logs translation-worker --tail"
