@echo off
REM TypeScript Validation Script for Windows
REM Run this to verify all TypeScript errors are fixed

echo 🔍 TypeScript Validation Check
echo ==================================

echo.
echo 1. 📋 Checking CheckInForm.tsx syntax...

REM Run TypeScript check on the specific file
call npx tsc --noEmit src/components/CheckInForm.tsx

if %ERRORLEVEL% EQU 0 (
    echo ✅ CheckInForm.tsx: No TypeScript errors found!
) else (
    echo ❌ CheckInForm.tsx: TypeScript errors still exist
    echo.
    echo 🔧 Common fixes to try:
    echo   - Check for missing closing tags
    echo   - Verify all JSX expressions are properly closed
    echo   - Ensure parentheses and braces are balanced
)

echo.
echo 2. 🔄 Checking entire project...

REM Run full project TypeScript check
call npx tsc --noEmit

if %ERRORLEVEL% EQU 0 (
    echo ✅ Entire project: No TypeScript errors!
) else (
    echo ⚠️ Some TypeScript errors still exist in other files
)

echo.
echo 3. 🧪 Quick validation tests...
echo 📁 File structure validation:

if exist "src\components\CheckInForm.tsx" (
    echo   CheckInForm.tsx exists: ✅
) else (
    echo   CheckInForm.tsx exists: ❌
)

echo.
echo 🎯 Next steps if errors persist:
echo   1. Check the exact error lines mentioned in the output
echo   2. Look for unmatched brackets or parentheses  
echo   3. Verify all JSX elements have proper opening/closing tags
echo   4. Check for missing semicolons or commas

echo.
echo ✅ Validation complete!
pause
