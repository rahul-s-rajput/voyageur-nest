// Translation Keys Test Script
// Copy and paste this into your browser console to test all the translation keys

(function testTranslationKeys() {
  console.group('🔍 Translation Keys Test');
  
  try {
    // Get the translation service
    const service = window.databaseTranslationService;
    
    if (!service) {
      console.error('❌ Translation service not found in global scope');
      console.log('Try refreshing the page and running this script again');
      return;
    }
    
    console.log('✅ Translation service found');
    
    // Test the keys that were showing as raw keys in your screenshots
    const testKeys = [
      // Purpose of Visit dropdown keys
      'placeholders.selectPurpose',
      'form.options.business', 
      'form.options.leisure',
      'form.options.conference',
      'form.options.other',
      
      // Check-in page keys
      'checkInPage.bookingId',
      'checkInPage.guest', 
      'checkInPage.room',
      'checkInPage.checkInDate',
      
      // ID Type dropdown keys
      'placeholders.selectIdType',
      'form.idTypes.passport',
      'form.idTypes.aadhaar',
      'form.idTypes.panCard',
      
      // Form validation keys
      'form.validation.required',
      'form.validation.termsRequired',
      
      // Button keys
      'form.buttons.submitCheckIn',
      'form.buttons.submitting',
      
      // Messages
      'messages.translationUnavailable',
      'messages.noAdditionalGuests'
    ];
    
    console.group('🧪 Testing Translation Keys');
    let failedKeys = [];
    let successKeys = [];
    
    testKeys.forEach(key => {
      const value = service.getTextSync(key, 'en-US');
      const isSuccess = value !== key && !value.includes('.');
      
      if (isSuccess) {
        successKeys.push(key);
        console.log(`✅ ${key}: "${value}"`);
      } else {
        failedKeys.push(key);
        console.log(`❌ ${key}: "${value}" (key not found)`);
      }
    });
    
    console.groupEnd();
    
    // Summary
    console.group('📊 Test Summary');
    console.log(`✅ Successful: ${successKeys.length}`);
    console.log(`❌ Failed: ${failedKeys.length}`);
    
    if (failedKeys.length > 0) {
      console.log('\n❌ Failed keys that need to be added:');
      failedKeys.forEach(key => console.log(`  - ${key}`));
    }
    
    if (successKeys.length === testKeys.length) {
      console.log('\n🎉 All translation keys are working correctly!');
    } else {
      console.log('\n⚠️ Some keys still need to be fixed');
    }
    console.groupEnd();
    
    // Cache inspection
    console.group('💾 Cache Status');
    const cacheStats = service.getCacheStats();
    console.log('Cached languages:', cacheStats.languages);
    console.log('Cache size:', cacheStats.size);
    
    if (cacheStats.languages.includes('en-US')) {
      console.log('✅ en-US translations are cached');
    } else {
      console.log('❌ en-US translations not in cache');
      console.log('Try running: await service.preloadLanguage("en-US")');
    }
    console.groupEnd();
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
  
  console.groupEnd();
})();

// Also add some helper functions
window.testTranslations = function() {
  const service = window.databaseTranslationService;
  if (!service) {
    console.log('❌ Translation service not available');
    return;
  }
  
  // Quick test of common keys
  const commonKeys = [
    'form.title',
    'checkInPage.bookingId', 
    'form.options.leisure',
    'placeholders.selectPurpose'
  ];
  
  console.log('🔍 Quick Translation Test:');
  commonKeys.forEach(key => {
    const value = service.getTextSync(key, 'en-US');
    console.log(`${value === key ? '❌' : '✅'} ${key}: "${value}"`);
  });
};

console.log('✅ Translation test tools loaded!');
console.log('Run: window.testTranslations() for a quick test');
