import { GoogleGenerativeAI } from '@google/generative-ai';
import baseTranslations from './translations.json';

export interface TranslationData {
  [languageCode: string]: {
    [category: string]: {
      [key: string]: string | { [subKey: string]: string };
    };
  };
}

export interface TranslationRequest {
  targetLanguage: string;
  sourceLanguage: string;
  texts: TranslationData['en-US'];
}

export interface TranslationResponse {
  translations: TranslationData['en-US'];
}

class TranslationManager {
  private genAI: GoogleGenerativeAI | null = null;
  private translations: TranslationData = baseTranslations as TranslationData;
  private cache: Map<string, TranslationData['en-US']> = new Map();
  
  constructor() {
    this.initializeAPI();
    this.loadCachedTranslations();
  }

  private initializeAPI(): void {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (apiKey) {
      this.genAI = new GoogleGenerativeAI(apiKey);
    } else {
      console.warn('Gemini API key not found. Translation will fall back to English.');
    }
  }

  async translateText(text: string, targetLanguage: string): Promise<string> {
    try {
      if (!this.genAI) {
        await this.initializeAPI();
      }

      if (!this.genAI) {
        console.warn('Gemini API not available, returning original text');
        return text;
      }

      // Skip translation for English
      if (targetLanguage.startsWith('en')) {
        return text;
      }

      const model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
      
      // Get language name from language code for better translation
      const languageName = this.getLanguageName(targetLanguage);
      
      const prompt = `Translate the following text to ${languageName}. Only return the translated text, no explanations or additional content:

${text}`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const translatedText = response.text();

      return translatedText.trim();
    } catch (error) {
      console.error('Translation error:', error);
      return text; // Return original text on error
    }
  }

  private getLanguageName(languageCode: string): string {
    const languageMap: { [key: string]: string } = {
      'hi-IN': 'Hindi',
      'hi': 'Hindi',
      'es-ES': 'Spanish',
      'es': 'Spanish',
      'fr-FR': 'French',
      'fr': 'French',
      'de-DE': 'German',
      'de': 'German',
      'zh-CN': 'Chinese (Simplified)',
      'zh': 'Chinese',
      'ja-JP': 'Japanese',
      'ja': 'Japanese',
      'ko-KR': 'Korean',
      'ko': 'Korean',
      'ar-SA': 'Arabic',
      'ar': 'Arabic',
      'pt-BR': 'Portuguese (Brazil)',
      'pt': 'Portuguese',
      'ru-RU': 'Russian',
      'ru': 'Russian',
      'it-IT': 'Italian',
      'it': 'Italian',
      'nl-NL': 'Dutch',
      'nl': 'Dutch',
      'sv-SE': 'Swedish',
      'sv': 'Swedish',
      'da-DK': 'Danish',
      'da': 'Danish',
      'no-NO': 'Norwegian',
      'no': 'Norwegian',
      'fi-FI': 'Finnish',
      'fi': 'Finnish',
      'pl-PL': 'Polish',
      'pl': 'Polish',
      'tr-TR': 'Turkish',
      'tr': 'Turkish',
      'th-TH': 'Thai',
      'th': 'Thai',
      'vi-VN': 'Vietnamese',
      'vi': 'Vietnamese',
      'id-ID': 'Indonesian',
      'id': 'Indonesian',
      'ms-MY': 'Malay',
      'ms': 'Malay',
      'ta-IN': 'Tamil',
      'ta': 'Tamil',
      'te-IN': 'Telugu',
      'te': 'Telugu',
      'bn-BD': 'Bengali',
      'bn': 'Bengali',
      'gu-IN': 'Gujarati',
      'gu': 'Gujarati',
      'kn-IN': 'Kannada',
      'kn': 'Kannada',
      'ml-IN': 'Malayalam',
      'ml': 'Malayalam',
      'mr-IN': 'Marathi',
      'mr': 'Marathi',
      'pa-IN': 'Punjabi',
      'pa': 'Punjabi',
      'ur-PK': 'Urdu',
      'ur': 'Urdu'
    };

    // Try exact match first
    if (languageMap[languageCode]) {
      return languageMap[languageCode];
    }

    // Try language part only (e.g., 'hi' from 'hi-IN')
    const languagePart = languageCode.split('-')[0];
    if (languageMap[languagePart]) {
      return languageMap[languagePart];
    }

    // If not found, return the language code itself
    return languageCode;
  }

  private loadCachedTranslations(): void {
    try {
      const cached = localStorage.getItem('translation_manager_cache');
      if (cached) {
        const parsedCache = JSON.parse(cached);
        this.cache = new Map(Object.entries(parsedCache));
        console.log('[TranslationManager] Loaded cached translations for languages:', Array.from(this.cache.keys()));
      }
    } catch (error) {
      console.error('[TranslationManager] Error loading cached translations:', error);
    }
  }

  private saveCachedTranslations(): void {
    try {
      const cacheObject = Object.fromEntries(this.cache);
      localStorage.setItem('translation_manager_cache', JSON.stringify(cacheObject));
    } catch (error) {
      console.error('[TranslationManager] Error saving cached translations:', error);
    }
  }

  private flattenTranslations(obj: any, prefix = ''): { [key: string]: string } {
    const flattened: { [key: string]: string } = {};
    
    for (const [key, value] of Object.entries(obj)) {
      const newKey = prefix ? `${prefix}.${key}` : key;
      
      if (typeof value === 'string') {
        flattened[newKey] = value;
      } else if (typeof value === 'object' && value !== null) {
        Object.assign(flattened, this.flattenTranslations(value, newKey));
      }
    }
    
    return flattened;
  }

  private unflattenTranslations(flattened: { [key: string]: string }): any {
    const result: any = {};
    
    for (const [key, value] of Object.entries(flattened)) {
      const keys = key.split('.');
      let current = result;
      
      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) {
          current[keys[i]] = {};
        }
        current = current[keys[i]];
      }
      
      current[keys[keys.length - 1]] = value;
    }
    
    return result;
  }

  async translateToLanguage(targetLanguage: string): Promise<boolean> {
    if (targetLanguage === 'en-US') {
      return true; // No translation needed for English
    }

    // Only support Hindi translation for now
    if (targetLanguage !== 'hi-IN') {
      console.warn(`[TranslationManager] Unsupported language: ${targetLanguage}`);
      return false;
    }

    // Check if we already have translations for this language
    if (this.cache.has(targetLanguage)) {
      console.log(`[TranslationManager] Using cached translations for ${targetLanguage}`);
      this.translations[targetLanguage] = this.cache.get(targetLanguage)!;
      return true;
    }

    if (!this.genAI) {
      console.error('[TranslationManager] Gemini API not available');
      return false;
    }

    try {
      console.log(`[TranslationManager] Translating to Hindi...`);
      
      const sourceTexts = this.translations['en-US'];
      const flattenedTexts = this.flattenTranslations(sourceTexts);
      
      // Create a simpler prompt for Hindi translation
      const prompt = `Translate the following English text to Hindi. Maintain the exact JSON structure and only translate the values, not the keys. Preserve any placeholders like {{number}} exactly as they are.

${JSON.stringify(flattenedTexts, null, 2)}

Return only the translated JSON:`;

      const model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const translatedText = response.text();

      // Parse the response
      let translatedFlattened: { [key: string]: string };
      try {
        // Try to extract JSON from the response
        const jsonMatch = translatedText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          translatedFlattened = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('No JSON found in response');
        }
      } catch (parseError) {
        console.error('[TranslationManager] Error parsing Gemini response:', parseError);
        console.log('[TranslationManager] Raw response:', translatedText);
        return false;
      }

      // Unflatten and store the translations
      const translatedStructure = this.unflattenTranslations(translatedFlattened);
      this.translations[targetLanguage] = translatedStructure;
      this.cache.set(targetLanguage, translatedStructure);
      this.saveCachedTranslations();

      console.log(`[TranslationManager] Successfully translated to Hindi`);
      return true;

    } catch (error) {
      console.error(`[TranslationManager] Error translating to Hindi:`, error);
      return false;
    }
  }

  getText(key: string, language: string = 'en-US', params?: Record<string, any>): string {
    const languageData = this.translations[language] || this.translations['en-US'];
    
    // Navigate through the nested structure
    const keys = key.split('.');
    let current: any = languageData;
    
    for (const k of keys) {
      if (current && typeof current === 'object' && k in current) {
        current = current[k];
      } else {
        // Fallback to English if key not found
        current = this.translations['en-US'];
        for (const fallbackKey of keys) {
          if (current && typeof current === 'object' && fallbackKey in current) {
            current = current[fallbackKey];
          } else {
            console.warn(`[TranslationManager] Translation key not found: ${key}`);
            return key; // Return the key itself as fallback
          }
        }
        break;
      }
    }

    let result = typeof current === 'string' ? current : key;

    // Handle template parameters
    if (params && typeof result === 'string') {
      Object.keys(params).forEach(param => {
        const placeholder = `{{${param}}}`;
        result = result.replace(new RegExp(placeholder, 'g'), params[param]);
      });
    }

    return result;
  }

  getAvailableLanguages(): string[] {
    return Object.keys(this.translations);
  }

  clearCache(): void {
    this.cache.clear();
    localStorage.removeItem('translation_manager_cache');
    // Keep only English translations
    this.translations = { 'en-US': baseTranslations['en-US'] } as TranslationData;
    console.log('[TranslationManager] Cache cleared');
  }

  isLanguageAvailable(language: string): boolean {
    return language in this.translations || this.cache.has(language);
  }
}

export const translationManager = new TranslationManager();
export default translationManager;