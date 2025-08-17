# PowerShell script to update Supabase CLI and deploy the translation worker

Write-Host "Updating Supabase CLI..." -ForegroundColor Green

# For npm users (most common)
npm update supabase --save-dev

# OR for global npm installation
# npm install -g supabase@latest

# OR for Scoop (Windows)
# scoop update supabase

Write-Host "Checking Supabase CLI version..." -ForegroundColor Yellow
supabase --version

Write-Host "Setting up Edge Function secrets (if not already set)..." -ForegroundColor Yellow
# Uncomment and add your actual API key
# supabase secrets set GEMINI_API_KEY=your_actual_gemini_api_key_here

Write-Host "Deploying translation-worker function..." -ForegroundColor Green
# Deploy using the standard method
supabase functions deploy translation-worker --no-verify-jwt

Write-Host "Deployment complete!" -ForegroundColor Green
Write-Host "Check logs with: supabase functions logs translation-worker --tail" -ForegroundColor Cyan
