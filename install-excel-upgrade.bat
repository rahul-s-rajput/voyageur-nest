@echo off
echo.
echo 📦 Installing enhanced Excel export library...
echo.

REM Remove old xlsx package if exists
npm uninstall xlsx 2>nul

REM Install xlsx-js-style
npm install xlsx-js-style@^1.2.0

echo.
echo ✅ Installation complete!
echo.
echo 🎨 The Excel export has been upgraded with:
echo   • Professional cover page with branding
echo   • Color-coded cells for better readability
echo   • Conditional formatting for KPIs
echo   • Auto-calculated totals
echo   • Frozen headers and autofilters
echo   • Optimized column widths
echo   • Status indicators with colors
echo   • Professional typography and layout
echo   • Print-ready formatting
echo.
echo 🚀 Run 'npm run dev' to start the application
echo.
pause
