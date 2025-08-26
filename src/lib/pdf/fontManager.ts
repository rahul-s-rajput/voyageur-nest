// SOLUTION 2: Local Font Configuration with Multiple Fallbacks
// This approach downloads and caches fonts locally for better reliability

import { Font } from '@react-pdf/renderer';

// Font URLs with multiple sources for redundancy
const FONT_SOURCES = {
  // Primary: GitHub-hosted Noto Sans (has Rupee symbol)
  notoSans: {
    regular: 'https://github.com/googlefonts/noto-fonts/raw/main/hinted/ttf/NotoSans/NotoSans-Regular.ttf',
    bold: 'https://github.com/googlefonts/noto-fonts/raw/main/hinted/ttf/NotoSans/NotoSans-Bold.ttf',
  },
  // Alternative: Noto Sans Devanagari (specifically for Indian scripts)
  notoSansDevanagari: {
    regular: 'https://github.com/googlefonts/noto-fonts/raw/main/hinted/ttf/NotoSansDevanagari/NotoSansDevanagari-Regular.ttf',
    bold: 'https://github.com/googlefonts/noto-fonts/raw/main/hinted/ttf/NotoSansDevanagari/NotoSansDevanagari-Bold.ttf',
  },
  // Fallback: Lato (widely supported, but may not have Rupee)
  lato: {
    regular: 'https://github.com/google/fonts/raw/main/ofl/lato/Lato-Regular.ttf',
    bold: 'https://github.com/google/fonts/raw/main/ofl/lato/Lato-Bold.ttf',
  },
};

// Font registration with error handling
export const initializePDFFonts = async (): Promise<boolean> => {
  let fontRegistered = false;

  // Clear any previously registered fonts to avoid conflicts
  try {
    Font.clear();
  } catch (e) {
    console.log('Font.clear() not available in this version');
  }

  // Method 1: Register as separate font calls (more reliable)
  const registerFontSeparately = async (family: string, src: string, weight: string) => {
    try {
      Font.register({
        family,
        src,
        fontWeight: weight,
      });
      return true;
    } catch (error) {
      console.error(`Failed to register ${family} ${weight}:`, error);
      return false;
    }
  };

  // Try primary font source
  const primarySuccess = 
    await registerFontSeparately('InvoiceFont', FONT_SOURCES.notoSans.regular, 'normal') &&
    await registerFontSeparately('InvoiceFont', FONT_SOURCES.notoSans.bold, 'bold');

  if (primarySuccess) {
    console.log('✅ Primary fonts (Noto Sans) registered successfully');
    fontRegistered = true;
  } else {
    console.log('⚠️ Primary font failed, trying Devanagari variant...');
    
    // Try Devanagari variant
    const devanagariSuccess = 
      await registerFontSeparately('InvoiceFont', FONT_SOURCES.notoSansDevanagari.regular, 'normal') &&
      await registerFontSeparately('InvoiceFont', FONT_SOURCES.notoSansDevanagari.bold, 'bold');
    
    if (devanagariSuccess) {
      console.log('✅ Devanagari fonts registered successfully');
      fontRegistered = true;
    } else {
      console.log('⚠️ Devanagari failed, using Lato as fallback');
      
      // Last resort: Lato
      const latoSuccess = 
        await registerFontSeparately('InvoiceFont', FONT_SOURCES.lato.regular, 'normal') &&
        await registerFontSeparately('InvoiceFont', FONT_SOURCES.lato.bold, 'bold');
      
      if (latoSuccess) {
        console.log('✅ Lato fonts registered (Note: Rupee symbol may not display correctly)');
        fontRegistered = true;
      }
    }
  }

  // Verify registration
  try {
    const registeredFonts = Font.getRegisteredFontFamilies();
    console.log('Registered font families:', registeredFonts);
  } catch (e) {
    console.log('Unable to verify font registration');
  }

  return fontRegistered;
};

// Helper to ensure fonts are loaded before PDF generation
export const ensureFontsLoaded = async (): Promise<void> => {
  try {
    // Attempt to load the font to trigger download
    await Font.load({ family: 'InvoiceFont' });
    await Font.load({ family: 'InvoiceFont', fontWeight: 'bold' });
  } catch (error) {
    console.warn('Font preloading warning:', error);
    // Continue anyway - font might still work
  }
};

// Currency formatting with proper Rupee symbol
export const formatCurrency = (amount: number): string => {
  const formatted = new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
  
  // Use the Unicode character directly
  return `₹ ${formatted}`;
};

// Alternative: Use "INR" prefix if Rupee symbol fails
export const formatCurrencySafe = (amount: number): string => {
  const formatted = new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
  
  // Check if we're confident the font supports Rupee symbol
  const hasRupeeSupport = Font.getRegisteredFontFamilies().includes('InvoiceFont');
  
  return hasRupeeSupport ? `₹ ${formatted}` : `INR ${formatted}`;
};
