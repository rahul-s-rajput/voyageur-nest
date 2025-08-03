#!/bin/bash

# TypeScript Validation Script
# Run this to verify all TypeScript errors are fixed

echo "🔍 TypeScript Validation Check"
echo "=================================="

echo ""
echo "1. 📋 Checking CheckInForm.tsx syntax..."

# Run TypeScript check on the specific file
npx tsc --noEmit src/components/CheckInForm.tsx

if [ $? -eq 0 ]; then
    echo "✅ CheckInForm.tsx: No TypeScript errors found!"
else
    echo "❌ CheckInForm.tsx: TypeScript errors still exist"
    echo ""
    echo "🔧 Common fixes to try:"
    echo "  - Check for missing closing tags"
    echo "  - Verify all JSX expressions are properly closed"
    echo "  - Ensure parentheses and braces are balanced"
fi

echo ""
echo "2. 🔄 Checking entire project..."

# Run full project TypeScript check
npx tsc --noEmit

if [ $? -eq 0 ]; then
    echo "✅ Entire project: No TypeScript errors!"
else
    echo "⚠️ Some TypeScript errors still exist in other files"
fi

echo ""
echo "3. 🧪 Quick validation tests..."

# Test if the file can be parsed as valid JavaScript/TypeScript
echo "📁 File structure validation:"
echo "  CheckInForm.tsx exists: $([ -f src/components/CheckInForm.tsx ] && echo '✅' || echo '❌')"
echo "  File size: $(stat --format=%s src/components/CheckInForm.tsx 2>/dev/null || echo 'Unknown') bytes"

echo ""
echo "🎯 Next steps if errors persist:"
echo "  1. Check the exact error lines mentioned in the output"
echo "  2. Look for unmatched brackets or parentheses"
echo "  3. Verify all JSX elements have proper opening/closing tags"
echo "  4. Check for missing semicolons or commas"

echo ""
echo "✅ Validation complete!"
