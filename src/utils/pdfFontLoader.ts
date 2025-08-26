// Font configuration for @react-pdf/renderer
// This module handles font registration with multiple fallback options

import { Font } from '@react-pdf/renderer';

export const initializePDFFonts = () => {
  let fontsLoaded = false;
  
  // Try multiple font sources with fallback
  const fontSources = [
    {
      name: 'Local Fonts',
      fonts: [
        { 
          src: '/fonts/NotoSans-Regular.ttf',
          fontWeight: 400
        },
        { 
          src: '/fonts/NotoSans-Bold.ttf',
          fontWeight: 700
        }
      ]
    },
    {
      name: 'CDN Fonts (jsdelivr)',
      fonts: [
        { 
          src: 'https://cdn.jsdelivr.net/gh/googlefonts/noto-fonts@main/hinted/ttf/NotoSans/NotoSans-Regular.ttf',
          fontWeight: 400
        },
        { 
          src: 'https://cdn.jsdelivr.net/gh/googlefonts/noto-fonts@main/hinted/ttf/NotoSans/NotoSans-Bold.ttf',
          fontWeight: 700
        }
      ]
    },
    {
      name: 'Google Fonts Direct',
      fonts: [
        { 
          src: 'https://fonts.gstatic.com/s/notosans/v36/o-0mIpQlx3QUlC5A4PNB6Ryti20_6n1iPHjcz6L1SoM-jCpoiyD9A99d.ttf',
          fontWeight: 400
        },
        { 
          src: 'https://fonts.gstatic.com/s/notosans/v36/o-0mIpQlx3QUlC5A4PNB6Ryti20_6n1iPHjcz6L1SoM-jCpoiyD9A-Fd.ttf',
          fontWeight: 700
        }
      ]
    }
  ];

  // Try each source until one works
  for (const source of fontSources) {
    if (fontsLoaded) break;
    
    try {
      Font.register({
        family: 'NotoSans',
        fonts: source.fonts
      });
      
      console.log(`✅ PDF Fonts loaded successfully from: ${source.name}`);
      fontsLoaded = true;
    } catch (error) {
      console.warn(`⚠️ Failed to load fonts from ${source.name}:`, error);
    }
  }

  if (!fontsLoaded) {
    console.error('❌ All font sources failed. PDFs will use default fonts.');
  }

  return fontsLoaded;
};

// Alternative: Individual font registration (if the array format doesn't work)
export const registerIndividualFonts = () => {
  const fontConfigs = [
    {
      family: 'NotoSansRegular',
      src: '/fonts/NotoSans-Regular.ttf'
    },
    {
      family: 'NotoSansBold',
      src: '/fonts/NotoSans-Bold.ttf'
    }
  ];

  let successCount = 0;

  fontConfigs.forEach(config => {
    try {
      Font.register(config);
      successCount++;
      console.log(`✅ Registered font: ${config.family}`);
    } catch (error) {
      // Try CDN fallback
      const cdnSrc = config.family.includes('Bold') 
        ? 'https://cdn.jsdelivr.net/gh/googlefonts/noto-fonts@main/hinted/ttf/NotoSans/NotoSans-Bold.ttf'
        : 'https://cdn.jsdelivr.net/gh/googlefonts/noto-fonts@main/hinted/ttf/NotoSans/NotoSans-Regular.ttf';
      
      try {
        Font.register({
          family: config.family,
          src: cdnSrc
        });
        successCount++;
        console.log(`✅ Registered font from CDN: ${config.family}`);
      } catch (cdnError) {
        console.error(`❌ Failed to register ${config.family}:`, cdnError);
      }
    }
  });

  return successCount > 0;
};
