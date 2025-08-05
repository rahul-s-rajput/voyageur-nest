@echo off
echo ========================================
echo Pricing Rules Authentication Fix
echo ========================================
echo.
echo This script will help you apply the fix for pricing rules authentication issues.
echo.
echo OPTION 1: Apply RLS Policy Fix (Recommended for Development)
echo - Updates the database policy to allow anonymous users
echo - Immediate fix, no environment variables needed
echo.
echo OPTION 2: Use Service Role Key (Recommended for Production)
echo - Add VITE_SUPABASE_SERVICE_ROLE_KEY to your .env file
echo - More secure approach
echo.
echo ========================================
echo To apply OPTION 1:
echo ========================================
echo 1. Open your Supabase project dashboard
echo 2. Go to SQL Editor
echo 3. Copy and paste the contents of 'fix_pricing_rules_rls.sql'
echo 4. Run the SQL script
echo 5. Test creating a pricing rule
echo.
echo ========================================
echo To apply OPTION 2:
echo ========================================
echo 1. Get your service role key from Supabase dashboard
echo 2. Add this line to your .env file:
echo    VITE_SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
echo 3. Restart your development server
echo 4. Test creating a pricing rule
echo.
echo ========================================
echo Files created for this fix:
echo ========================================
echo - fix_pricing_rules_rls.sql (SQL migration)
echo - PRICING_RULES_AUTH_FIX.md (Documentation)
echo - apply-pricing-rules-fix.bat (This script)
echo.
echo For detailed instructions, see PRICING_RULES_AUTH_FIX.md
echo.
pause