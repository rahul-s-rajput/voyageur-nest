/**
 * Translation Generation Script
 * 
 * This script generates translations for all popular languages using Gemini API
 * and populates the translations table in the database.
 * 
 * Usage: npm run generate-translations
 */

import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';

// Configuration
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';
const GEMINI_API_KEY = process.env.VITE_GEMINI_API_KEY || '';

// Popular languages to generate translations for
const POPULAR_LANGUAGES = [
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
  { code: 'ur-PK', name: 'Urdu', nativeName: 'اردو' },
  { code: 'th-TH', name: 'Thai', nativeName: 'ไทย' },
  { code: 'vi-VN', name: 'Vietnamese', nativeName: 'Tiếng Việt' },
  { code: 'id-ID', name: 'Indonesian', nativeName: 'Bahasa Indonesia' },
  { code: 'ms-MY', name: 'Malay', nativeName: 'Bahasa Melayu' },
  { code: 'tr-TR', name: 'Turkish', nativeName: 'Türkçe' },
  { code: 'pl-PL', name: 'Polish', nativeName: 'Polski' },
  { code: 'nl-NL', name: 'Dutch', nativeName: 'Nederlands' },
  { code: 'sv-SE', name: 'Swedish', nativeName: 'Svenska' },
  { code: 'da-DK', name: 'Danish', nativeName: 'Dansk' },
  { code: 'no-NO', name: 'Norwegian', nativeName: 'Norsk' }
];

class TranslationGenerator {
  private supabase;
  private genAI;
  private model;

  constructor() {
    this.supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    this.genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
  }

  async generateTranslations() {
    console.log('🚀 Starting translation generation process...');
    
    // Load base English translations
    const baseTranslations = await this.loadBaseTranslations();
    
    // Generate translations for each language
    for (const language of POPULAR_LANGUAGES) {
      try {
        console.log(`\n📝 Generating translations for ${language.name} (${language.code})...`);
        
        // Check if translation already exists
        const existing = await this.checkExistingTranslation(language.code);
        if (existing) {
          console.log(`✅ Translation for ${language.name} already exists, skipping...`);
          continue;
        }
        
        // Generate translation
        const translatedData = await this.translateToLanguage(baseTranslations, language);
        
        // Save to database
        await this.saveTranslation(language, translatedData);
        
        console.log(`✅ Successfully generated and saved ${language.name} translations`);
        
        // Add delay to avoid rate limiting
        await this.delay(2000);
        
      } catch (error) {
        console.error(`❌ Error generating translations for ${language.name}:`, error);
        continue;
      }
    }
    
    console.log('\n🎉 Translation generation process completed!');
  }

  private async loadBaseTranslations(): Promise<any> {
    try {
      const translationsPath = path.join(process.cwd(), 'src', 'lib', 'translations.json');
      const translationsFile = fs.readFileSync(translationsPath, 'utf8');
      const translations = JSON.parse(translationsFile);
      return translations['en-US'];
    } catch (error) {
      throw new Error(`Failed to load base translations: ${error}`);
    }
  }

  private async checkExistingTranslation(languageCode: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from('translations')
      .select('id')
      .eq('language_code', languageCode)
      .single();
    
    return !error && !!data;
  }

  private async translateToLanguage(baseTranslations: any, language: any): Promise<any> {
    const prompt = `You are a professional translator specializing in hospitality and hotel check-in systems. 

Translate the following JSON structure from English to ${language.name} (${language.code}). 

CRITICAL REQUIREMENTS:
1. Maintain the exact same JSON structure and key names
2. Only translate the VALUES, never the keys
3. Preserve all placeholders like {{number}} exactly as they are
4. Use formal, polite language appropriate for hotel guests
5. Ensure cultural appropriateness for the target language
6. For technical terms, use commonly understood translations
7. Return ONLY the translated JSON, no additional text

Source JSON:
${JSON.stringify(baseTranslations, null, 2)}

Translate to ${language.name}:`;

    const result = await this.model.generateContent(prompt);
    const response = await result.response;
    const translatedText = response.text();
    
    // Clean and parse the response
    const cleanedText = translatedText
      .replace(/```json\s*/, '')
      .replace(/```\s*$/, '')
      .trim();
    
    try {
      return JSON.parse(cleanedText);
    } catch (parseError) {
      throw new Error(`Failed to parse translated JSON for ${language.name}: ${parseError}`);
    }
  }

  private async saveTranslation(language: any, translationData: any): Promise<void> {
    const { error } = await this.supabase
      .from('translations')
      .insert({
        language_code: language.code,
        language_name: language.name,
        native_name: language.nativeName,
        translation_data: translationData,
        created_by: 'translation-generator-script',
        quality_score: 9 // High quality since generated by Gemini
      });

    if (error) {
      throw new Error(`Failed to save translation for ${language.name}: ${error.message}`);
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async validateTranslations() {
    console.log('\n🔍 Validating saved translations...');
    
    const { data: translations, error } = await this.supabase
      .from('translations')
      .select('language_code, language_name, translation_data')
      .eq('is_active', true);

    if (error) {
      console.error('❌ Error fetching translations:', error);
      return;
    }

    console.log(`\n📊 Found ${translations.length} translations in database:`);
    
    for (const translation of translations) {
      try {
        const data = translation.translation_data;
        const keyCount = this.countKeys(data);
        console.log(`✅ ${translation.language_name} (${translation.language_code}): ${keyCount} keys`);
      } catch (error) {
        console.log(`❌ ${translation.language_name} (${translation.language_code}): Invalid JSON`);
      }
    }
  }

  private countKeys(obj: any, count = 0): number {
    for (const key in obj) {
      if (typeof obj[key] === 'object' && obj[key] !== null) {
        count = this.countKeys(obj[key], count);
      } else {
        count++;
      }
    }
    return count;
  }
}

// Main execution
async function main() {
  try {
    // Validate environment variables
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !GEMINI_API_KEY) {
      throw new Error('Missing required environment variables. Please check your .env file.');
    }

    const generator = new TranslationGenerator();
    
    // Generate translations
    await generator.generateTranslations();
    
    // Validate results
    await generator.validateTranslations();
    
  } catch (error) {
    console.error('❌ Translation generation failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { TranslationGenerator };