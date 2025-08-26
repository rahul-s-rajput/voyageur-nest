# React-PDF Indian Rupee Symbol (₹) Implementation Guide

## Problem Summary
The Indian Rupee symbol (₹) was not displaying in PDF exports using @react-pdf/renderer. Instead of the symbol, users would see either blank space, "Rs" text, or error messages about font registration.

## Root Causes

1. **Font Glyph Support**: Many fonts don't include the Indian Rupee symbol (Unicode U+20B9)
2. **Font Format Limitations**: React-PDF only supports TTF and WOFF formats (not WOFF2)
3. **Registration Syntax**: Font registration requires specific syntax that differs from CSS
4. **Async Loading**: Fonts load asynchronously and PDF generation might occur before loading completes

## Solution Implementation

### 1. Corrected Font Registration

```javascript
// CORRECT: Separate Font.register calls for each weight
Font.register({
  family: 'NotoSans',
  src: 'https://github.com/googlefonts/noto-fonts/raw/main/hinted/ttf/NotoSans/NotoSans-Regular.ttf',
  fontWeight: 400,
});

Font.register({
  family: 'NotoSans',
  src: 'https://github.com/googlefonts/noto-fonts/raw/main/hinted/ttf/NotoSans/NotoSans-Bold.ttf',
  fontWeight: 700,
});

// INCORRECT: Nested fonts array (this was the original error)
Font.register({
  family: 'NotoSans',
  fonts: [
    { src: 'regular.ttf', fontWeight: 400 },
    { src: 'bold.ttf', fontWeight: 700 }
  ]
});
```

### 2. Font Sources That Work

**Recommended fonts with Rupee symbol support:**

1. **Noto Sans** (Google Fonts)
   - Regular: `https://github.com/googlefonts/noto-fonts/raw/main/hinted/ttf/NotoSans/NotoSans-Regular.ttf`
   - Bold: `https://github.com/googlefonts/noto-fonts/raw/main/hinted/ttf/NotoSans/NotoSans-Bold.ttf`

2. **Noto Sans Devanagari** (Specifically for Indian scripts)
   - Regular: `https://github.com/googlefonts/noto-fonts/raw/main/hinted/ttf/NotoSansDevanagari/NotoSansDevanagari-Regular.ttf`

### 3. Style Configuration

```javascript
const styles = StyleSheet.create({
  page: {
    fontFamily: 'NotoSans', // Must match registered family name exactly
    fontWeight: 400, // Use numeric weights
  },
  bold: {
    fontWeight: 700, // For bold text
  }
});
```

### 4. Using the Rupee Symbol

```javascript
// Direct usage in Text components
<Text>Amount: ₹1,000.00</Text>

// Using Unicode escape
<Text>Amount: {'\u20B9'}1,000.00</Text>

// In template literals
<Text>{`Total: ₹${amount}`}</Text>
```

## Common Issues & Solutions

### Issue 1: "Font family not registered" Error
**Solution**: Ensure font family name in styles matches exactly what was registered

### Issue 2: Font loads but Rupee symbol doesn't appear
**Solution**: The font file might not contain the glyph. Use Noto Sans or verify font support

### Issue 3: PDF generation fails intermittently
**Solution**: Add a delay before generation to ensure fonts are loaded:
```javascript
await new Promise(resolve => setTimeout(resolve, 500));
```

### Issue 4: Fonts work locally but not in production
**Solution**: Use CDN-hosted fonts instead of local files, or ensure CORS headers are correct

## Testing Your Implementation

1. **Use the Font Tester Component**:
   ```javascript
   import PDFFontTester from './components/PDFFontTester';
   // Add to your app temporarily to test fonts
   ```

2. **Check Font Registration**:
   ```javascript
   console.log(Font.getRegisteredFontFamilies());
   ```

3. **Verify Font Loading**:
   ```javascript
   try {
     await Font.load({ family: 'NotoSans' });
     console.log('Font loaded successfully');
   } catch (error) {
     console.error('Font loading failed:', error);
   }
   ```

## Fallback Strategy

If the Rupee symbol absolutely won't work, use this fallback approach:

```javascript
// Detect if font supports Rupee and use appropriate format
const formatCurrency = (amount) => {
  const hasRupeeSupport = Font.getRegisteredFontFamilies().includes('NotoSans');
  const formatted = new Intl.NumberFormat('en-IN').format(amount);
  return hasRupeeSupport ? `₹${formatted}` : `INR ${formatted}`;
};
```

## File Structure

```
src/
├── components/
│   ├── InvoicePDF.tsx          # Main PDF component with Rupee support
│   ├── InvoicePDFWithRupee.tsx # Alternative implementation
│   └── PDFFontTester.tsx       # Testing tool for fonts
└── lib/
    └── pdf/
        ├── fontConfig.ts        # Font configuration utilities
        └── fontManager.ts       # Font management with fallbacks
```

## Browser Compatibility

- **Chrome/Edge**: Full support
- **Firefox**: Full support
- **Safari**: May require additional testing
- **Mobile browsers**: Test thoroughly, especially on iOS

## Performance Considerations

1. **Font file size**: Noto Sans files are ~400KB each
2. **Loading time**: Add loading states to prevent user confusion
3. **Caching**: Fonts are cached by browser after first load

## Final Checklist

- [ ] Font files are in TTF or WOFF format (not WOFF2)
- [ ] Font contains Unicode U+20B9 glyph
- [ ] Font.register() called with correct syntax
- [ ] Font family name matches in styles
- [ ] Error handling implemented
- [ ] Loading states added
- [ ] Tested in target browsers
- [ ] Fallback strategy in place

## Resources

- [React-PDF Font Documentation](https://react-pdf.org/fonts)
- [Unicode Character U+20B9](https://www.compart.com/en/unicode/U+20B9)
- [Google Noto Fonts](https://github.com/googlefonts/noto-fonts)
- [Font Testing Tool](https://www.fileformat.info/info/unicode/char/20b9/fontsupport.htm)
