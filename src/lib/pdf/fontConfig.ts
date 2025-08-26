import { Font } from '@react-pdf/renderer';

// Attempt to register custom fonts with proper fallback
export const registerPDFFonts = () => {
  let fontFamily = 'Helvetica'; // Default built-in font
  
  // Only attempt custom font registration if we're in a browser environment
  if (typeof window !== 'undefined') {
    const baseUrl = window.location.origin + (import.meta.env.BASE_URL || '/');
    
    try {
      // Attempt to register local Noto Sans fonts
      Font.register({
        family: 'NotoSans',
        fonts: [
          {
            src: `${baseUrl}fonts/NotoSans-Regular.ttf`,
            fontWeight: 400,
          },
          {
            src: `${baseUrl}fonts/NotoSans-Bold.ttf`,
            fontWeight: 700,
          },
        ],
      });
      
      fontFamily = 'NotoSans';
      console.log('✓ Custom PDF fonts registered successfully');
    } catch (localError) {
      console.warn('Local font registration failed, trying CDN fallback...', localError);
      
      // Try CDN fallback
      try {
        Font.register({
          family: 'Roboto',
          fonts: [
            {
              src: 'https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Me5WZLCzYlKw.ttf',
              fontWeight: 400,
            },
            {
              src: 'https://fonts.gstatic.com/s/roboto/v30/KFOlCnqEu92Fr1MmWUlvAx05IsDqlA.ttf',
              fontWeight: 700,
            },
          ],
        });
        
        fontFamily = 'Roboto';
        console.log('✓ CDN fonts registered as fallback');
      } catch (cdnError) {
        console.warn('CDN font registration also failed, using built-in Helvetica', cdnError);
        // fontFamily remains 'Helvetica'
      }
    }
  }
  
  return fontFamily;
};

// Helper to get the safe font family
export const getSafeFontFamily = () => {
  // Always return Helvetica for now to ensure PDF generation works
  return 'Helvetica';
};
