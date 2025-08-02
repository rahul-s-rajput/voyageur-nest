// Translation service using Google Gemini API with Gemini 1.5 Flash model
// Gemini API provides structured output support with JSON mode for reliable batch translations

export interface TranslationCache {
  [key: string]: string;
}

export interface Language {
  code: string;
  name: string;
  nativeName: string;
}

// Popular languages for quick selection
export const POPULAR_LANGUAGES: Language[] = [
  { code: 'en-US', name: 'English', nativeName: 'English' },
  { code: 'hi-IN', name: 'Hindi', nativeName: 'हिंदी' },
  { code: 'es-ES', name: 'Spanish', nativeName: 'Español' },
  { code: 'fr-FR', name: 'French', nativeName: 'Français' },
  { code: 'de-DE', name: 'German', nativeName: 'Deutsch' },
  { code: 'it-IT', name: 'Italian', nativeName: 'Italiano' },
  { code: 'pt-PT', name: 'Portuguese', nativeName: 'Português' },
  { code: 'ru-RU', name: 'Russian', nativeName: 'Русский' },
  { code: 'ja-JP', name: 'Japanese', nativeName: '日本語' },
  { code: 'ko-KR', name: 'Korean', nativeName: '한국어' },
  { code: 'zh-CN', name: 'Chinese (Simplified)', nativeName: '简体中文' },
  { code: 'ar-SA', name: 'Arabic', nativeName: 'العربية' },
  { code: 'bn-BD', name: 'Bengali', nativeName: 'বাংলা' },
  { code: 'ta-IN', name: 'Tamil', nativeName: 'தமிழ்' },
  { code: 'te-IN', name: 'Telugu', nativeName: 'తెలుగు' },
  { code: 'mr-IN', name: 'Marathi', nativeName: 'मराठी' },
  { code: 'gu-IN', name: 'Gujarati', nativeName: 'ગુજરાતી' },
  { code: 'kn-IN', name: 'Kannada', nativeName: 'ಕನ್ನಡ' },
  { code: 'ml-IN', name: 'Malayalam', nativeName: 'മലയാളം' },
  { code: 'pa-IN', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ' },
];

class TranslationService {
  private cache: TranslationCache = {};
  private readonly apiKey: string;
  private readonly baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models';
  private readonly model = 'gemini-2.0-flash'; // Using Gemini 2.0Flash for structured output support

  constructor(apiKey?: string) {
    this.apiKey = apiKey || import.meta.env.VITE_GEMINI_API_KEY || '';
    
    // Debug API key availability
    console.log('[Translation Debug] Constructor - API Key from env:', !!import.meta.env.VITE_GEMINI_API_KEY);
    console.log('[Translation Debug] Constructor - API Key provided:', !!apiKey);
    console.log('[Translation Debug] Constructor - Final API Key available:', !!this.apiKey);
    console.log('[Translation Debug] Constructor - API Key length:', this.apiKey.length);
    
    if (!this.apiKey) {
      console.error('[Translation Debug] ❌ NO API KEY FOUND!');
      console.error('[Translation Debug] Please create a .env file with VITE_GEMINI_API_KEY=your_api_key');
      console.error('[Translation Debug] Get your API key from: https://aistudio.google.com/app/apikey');
    } else {
      console.log('[Translation Debug] ✅ API Key is available');
    }
    // Load cache from localStorage
    this.loadCache();
  }

  private getCacheKey(text: string, fromLang: string, toLang: string): string {
    return `${fromLang}|${toLang}|${text}`;
  }

  private saveCache(): void {
    try {
      localStorage.setItem('translation_cache', JSON.stringify(this.cache));
    } catch (error) {
      console.warn('Failed to save translation cache:', error);
    }
  }

  private loadCache(): void {
    try {
      const cached = localStorage.getItem('translation_cache');
      if (cached) {
        this.cache = JSON.parse(cached);
      }
    } catch (error) {
      console.warn('Failed to load translation cache:', error);
    }
  }

  private getLanguageName(code: string): string {
    // Convert language codes to human-readable names for better prompting
    const languageMap: Record<string, string> = {
      'en-US': 'English',
      'hi-IN': 'Hindi',
      'es-ES': 'Spanish',
      'fr-FR': 'French',
      'de-DE': 'German',
      'it-IT': 'Italian',
      'pt-PT': 'Portuguese',
      'ru-RU': 'Russian',
      'ja-JP': 'Japanese',
      'ko-KR': 'Korean',
      'zh-CN': 'Chinese (Simplified)',
      'ar-SA': 'Arabic',
      'bn-BD': 'Bengali',
      'ta-IN': 'Tamil',
      'te-IN': 'Telugu',
      'mr-IN': 'Marathi',
      'gu-IN': 'Gujarati',
      'kn-IN': 'Kannada',
      'ml-IN': 'Malayalam',
      'pa-IN': 'Punjabi',
    };
    
    return languageMap[code] || code.split('-')[0].toUpperCase();
  }

  async translate(
    text: string, 
    fromLang: string = 'en-US', 
    toLang: string = 'hi-IN'
  ): Promise<string> {
    // Return original text if same language
    if (fromLang === toLang) {
      console.log('[Translation Debug] Same language detected, returning original text');
      return text;
    }

    // Check cache first
    const cacheKey = this.getCacheKey(text, fromLang, toLang);
    if (this.cache[cacheKey]) {
      console.log('[Translation Debug] Cache hit for:', text.substring(0, 50) + '...');
      return this.cache[cacheKey];
    }

    if (!this.apiKey) {
      console.error('[Translation Debug] No API key provided');
      throw new Error('Gemini API key is required for translation');
    }

    console.log('[Translation Debug] Starting translation request');
    console.log('[Translation Debug] From:', fromLang, 'To:', toLang);
    console.log('[Translation Debug] Text:', text.substring(0, 100) + '...');
    console.log('[Translation Debug] API Key present:', !!this.apiKey);
    console.log('[Translation Debug] API Key length:', this.apiKey.length);

    try {
      const fromLanguage = this.getLanguageName(fromLang);
      const toLanguage = this.getLanguageName(toLang);

      // Create a focused prompt for translation
      const prompt = `Translate the following text from ${fromLanguage} to ${toLanguage}. 
Only return the translated text, nothing else. Maintain the original meaning and tone.

Text to translate: "${text}"

Translation:`;

      const requestBody = {
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.1, // Low temperature for consistent translations
          maxOutputTokens: 1000,
          topP: 0.8,
          topK: 10
        }
      };

      const requestUrl = `${this.baseUrl}/${this.model}:generateContent?key=${this.apiKey}`;
      console.log('[Translation Debug] Request URL:', requestUrl.replace(this.apiKey, 'API_KEY_HIDDEN'));
      console.log('[Translation Debug] Request body:', JSON.stringify(requestBody, null, 2));

      const response = await fetch(requestUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      console.log('[Translation Debug] Response status:', response.status);
      console.log('[Translation Debug] Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
          console.error('[Translation Debug] Full error response:', JSON.stringify(errorData, null, 2));
        } catch (parseError) {
          console.error('[Translation Debug] Failed to parse error response:', parseError);
          errorData = {};
        }
        
        // Log specific error details for 429 errors
        if (response.status === 429) {
          console.error('[Translation Debug] Rate limit exceeded!');
          console.error('[Translation Debug] This could be due to:');
          console.error('- Exceeded daily quota (14,400 requests/day)');
          console.error('- Too many requests per minute');
          console.error('- Invalid API key or billing issues');
        }
        
        throw new Error(`Gemini API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();
      console.log('[Translation Debug] Full API response:', JSON.stringify(data, null, 2));
      
      if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
        console.error('[Translation Debug] Invalid response structure:', data);
        throw new Error('Invalid response format from Gemini API');
      }

      const translatedText = data.candidates[0].content.parts[0].text.trim();
      console.log('[Translation Debug] Raw translated text:', translatedText);
      
      // Remove any quotes that might be added by the model
      const cleanedTranslation = translatedText.replace(/^["']|["']$/g, '');
      console.log('[Translation Debug] Cleaned translation:', cleanedTranslation);

      // Validate translation before caching
      if (cleanedTranslation && cleanedTranslation.trim() !== text.trim()) {
        // Cache the result
        this.cache[cacheKey] = cleanedTranslation;
        this.saveCache();
        console.log(`[Translation Debug] Translation cached successfully: "${text}" -> "${cleanedTranslation}" (key: ${cacheKey})`);
      } else {
        console.warn(`[Translation Debug] Invalid translation received, not caching: "${cleanedTranslation}"`);
      }

      return cleanedTranslation;
    } catch (error) {
      console.error('[Translation Debug] Translation error details:', error);
      console.error('[Translation Debug] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      throw error;
    }
  }

  // Batch translation for efficiency using structured JSON output
  async translateBatch(
    texts: string[],
    fromLang: string = 'en-US',
    toLang: string = 'hi-IN'
  ): Promise<string[]> {
    if (fromLang === toLang) {
      return texts;
    }

    console.log(`[Translation Debug] Starting batch translation for ${texts.length} texts`);

    const results: string[] = [];
    const uncachedTexts: { index: number; text: string }[] = [];

    // Check cache for each text
    texts.forEach((text, index) => {
      const cacheKey = this.getCacheKey(text, fromLang, toLang);
      if (this.cache[cacheKey]) {
        results[index] = this.cache[cacheKey];
        console.log(`[Translation Debug] Cache hit for: "${text}"`);
      } else {
        uncachedTexts.push({ index, text });
      }
    });

    console.log(`[Translation Debug] Found ${uncachedTexts.length} uncached texts to translate`);

    // Translate uncached texts using structured JSON output
    if (uncachedTexts.length > 0) {
      const fromLanguage = this.getLanguageName(fromLang);
      const toLanguage = this.getLanguageName(toLang);

      // Process all uncached texts in a single request using structured output
      try {
        // Create the input data structure
        const textsToTranslate = uncachedTexts.map((item, index) => ({
          id: index,
          text: item.text
        }));

        const prompt = `You are a professional translator. Translate the following texts from ${fromLanguage} to ${toLanguage}. 
Maintain the original meaning, tone, and context. Return the translations in the exact same order as provided.

Input texts:
${textsToTranslate.map(item => `${item.id}: "${item.text}"`).join('\n')}

Provide the translations in JSON format with the structure: {"translations": ["translation1", "translation2", ...]}`;

        const requestBody = {
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 4000,
            topP: 0.8,
            topK: 10,
            responseMimeType: "application/json",
            responseSchema: {
              type: "object",
              properties: {
                translations: {
                  type: "array",
                  items: {
                    type: "string"
                  }
                }
              },
              required: ["translations"]
            }
          }
        };

        console.log(`[Translation Debug] Sending batch request for ${uncachedTexts.length} texts`);
        console.log(`[Translation Debug] Request URL: ${this.baseUrl}/${this.model}:generateContent`);

        const response = await fetch(
          `${this.baseUrl}/${this.model}:generateContent?key=${this.apiKey}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
          }
        );

        console.log(`[Translation Debug] Batch response status: ${response.status}`);

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`[Translation Debug] Batch API error: ${response.status} - ${errorText}`);
          throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        console.log('[Translation Debug] Raw batch response:', JSON.stringify(data, null, 2));

        // Parse the structured JSON response
        const responseText = data.candidates[0].content.parts[0].text;
        const translationData = JSON.parse(responseText);
        
        if (!translationData.translations || !Array.isArray(translationData.translations)) {
          throw new Error('Invalid response format: missing translations array');
        }

        const translations = translationData.translations;
        console.log(`[Translation Debug] Received ${translations.length} translations`);

        // Map translations back to original indices and cache them
        uncachedTexts.forEach((item, batchIndex) => {
          if (batchIndex < translations.length && translations[batchIndex]) {
            const translation = translations[batchIndex];
            results[item.index] = translation;
            
            // Cache the result with validation
            if (translation && translation.trim() !== item.text.trim()) {
              const cacheKey = this.getCacheKey(item.text, fromLang, toLang);
              this.cache[cacheKey] = translation;
              console.log(`[Translation Debug] Cached: "${item.text}" -> "${translation}" (key: ${cacheKey})`);
            } else {
              console.warn(`[Translation Debug] Invalid batch translation, not caching: "${item.text}" -> "${translation}"`);
            }
          } else {
            // Fallback to original text if translation is missing
            results[item.index] = item.text;
            console.warn(`[Translation Debug] Missing translation for: "${item.text}", using original`);
          }
        });

        this.saveCache();
        console.log(`[Translation Debug] Batch translation completed successfully`);

      } catch (error) {
        console.error('[Translation Debug] Batch translation error:', error);
        
        // Fallback: use original texts for all failed translations
        uncachedTexts.forEach(item => {
          if (!results[item.index]) {
            results[item.index] = item.text;
          }
        });
        
        // Re-throw the error so calling code can handle it
        throw error;
      }
    }

    return results;
  }

  // Clear cache
  clearCache(): void {
    this.cache = {};
    localStorage.removeItem('translation_cache');
  }

  // Get cache size
  getCacheSize(): number {
    return Object.keys(this.cache).length;
  }

  // Test API key with a simple request
  async testApiKey(): Promise<boolean> {
    if (!this.apiKey) {
      console.error('[Translation Debug] Cannot test API key - no key provided');
      return false;
    }

    console.log('[Translation Debug] Testing API key...');

    try {
      const requestBody = {
        contents: [{
          parts: [{
            text: 'Hello'
          }]
        }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 10,
          topP: 0.8,
          topK: 10
        }
      };

      const requestUrl = `${this.baseUrl}/${this.model}:generateContent?key=${this.apiKey}`;
      console.log('[Translation Debug] Test request URL:', requestUrl.replace(this.apiKey, 'API_KEY_HIDDEN'));

      const response = await fetch(requestUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      console.log('[Translation Debug] Test response status:', response.status);

      if (response.status === 429) {
        console.error('[Translation Debug] ❌ API Key test failed - Rate limit exceeded (429)');
        console.error('[Translation Debug] This means your API quota is exhausted');
        return false;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('[Translation Debug] ❌ API Key test failed:', response.status, errorData);
        return false;
      }

      console.log('[Translation Debug] ✅ API Key test successful');
      return true;
    } catch (error) {
      console.error('[Translation Debug] ❌ API Key test error:', error);
      return false;
    }
  }

  // Preload common translations for better performance
  async preloadTranslations(): Promise<void> {
    console.log('[Translation Debug] Starting preload translations...');
    
    // First test the API key
    const isApiKeyValid = await this.testApiKey();
    if (!isApiKeyValid) {
      throw new Error('API key test failed - cannot proceed with preloading');
    }
    
    const commonTexts = [
      'Welcome',
      'Submit',
      'Cancel',
      'Save',
      'Delete'
    ];

    console.log(`[Translation Debug] Attempting to preload ${commonTexts.length} translations`);
    console.log('[Translation Debug] API Key available:', !!this.apiKey);

    try {
      // Use batch translation for all texts in a single API call
      console.log('[Translation Debug] Starting batch translation...');
      const translations = await this.translateBatch(commonTexts, 'en-US', 'hi-IN');
      
      console.log(`[Translation Debug] Successfully preloaded ${translations.length} translations`);
      console.log('[Translation Debug] Sample translations:', translations.slice(0, 5));
    } catch (error) {
      console.error('[Translation Debug] Failed to preload translations:', error);
      console.error('[Translation Debug] Error details:', error instanceof Error ? error.message : 'Unknown error');
      console.error('[Translation Debug] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      throw error;
    }
  }
}

// Create singleton instance
export const translationService = new TranslationService();

// Helper function to set API key
export const setTranslationApiKey = (apiKey: string) => {
  (translationService as any).apiKey = apiKey;
};

// Helper function to find language by code
export const findLanguageByCode = (code: string): Language | undefined => {
  return POPULAR_LANGUAGES.find(lang => lang.code === code);
};

// Helper function to validate language code format
export const isValidLanguageCode = (code: string): boolean => {
  // Basic validation for language codes (e.g., en-US, hi-IN)
  return /^[a-z]{2}-[A-Z]{2}$/.test(code);
};