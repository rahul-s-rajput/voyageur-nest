/**
 * Database-driven Translation Service
 * 
 * This service manages translations stored in the database instead of using real-time API calls.
 * Provides fast, reliable, and cost-effective translation management.
 */

import { supabase } from './supabase';

export interface Translation {
  id: string;
  language_code: string;
  language_name: string;
  native_name: string;
  translation_data: any;
  is_active: boolean;
  quality_score: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface LanguageOption {
  code: string;
  name: string;
  nativeName: string;
  isActive: boolean;
  qualityScore: number;
}

// Fallback translations from the existing JSON file
const FALLBACK_TRANSLATIONS = {
  'en-US': {
    "app": {
      "title": "Digital Check-in System"
    },
    "form": {
      "title": "Guest Check-in Form",
      "fields": {
        "firstName": "First Name",
        "lastName": "Last Name",
        "email": "Email Address",
        "phone": "Phone Number",
        "address": "Address",
        "city": "City",
        "state": "State/Province",
        "zipCode": "ZIP/Postal Code",
        "country": "Country",
        "dateOfBirth": "Date of Birth",
        "nationality": "Nationality",
        "idType": "ID Type",
        "idNumber": "ID Number",
        "emergencyContact": "Emergency Contact",
        "emergencyPhone": "Emergency Phone",
        "checkInDate": "Check-in Date",
        "checkOutDate": "Check-out Date",
        "numberOfGuests": "Number of Guests",
        "roomType": "Room Type",
        "specialRequests": "Special Requests"
      },
      "sections": {
        "personalInfo": "Personal Information",
        "contactInfo": "Contact Information",
        "identification": "Identification",
        "emergencyInfo": "Emergency Contact",
        "stayDetails": "Stay Details",
        "preferences": "Preferences & Requests"
      },
      "buttons": {
        "next": "Next",
        "previous": "Previous",
        "submit": "Submit Check-in",
        "addGuest": "Add Guest",
        "removeGuest": "Remove Guest",
        "uploadId": "Upload ID Document"
      },
      "validation": {
        "required": "This field is required",
        "email": "Please enter a valid email address",
        "phone": "Please enter a valid phone number",
        "date": "Please enter a valid date",
        "minAge": "Guest must be at least 18 years old"
      },
      "placeholders": {
        "firstName": "Enter your first name",
        "lastName": "Enter your last name",
        "email": "your.email@example.com",
        "phone": "+1 (555) 123-4567",
        "address": "123 Main Street",
        "city": "Enter your city",
        "state": "Enter your state/province",
        "zipCode": "Enter ZIP/postal code",
        "country": "Select your country",
        "nationality": "Select your nationality",
        "idNumber": "Enter your ID number",
        "emergencyContact": "Emergency contact name",
        "emergencyPhone": "Emergency contact phone",
        "specialRequests": "Any special requests or preferences..."
      },
      "options": {
        "roomTypes": {
          "standard": "Standard Room",
          "deluxe": "Deluxe Room",
          "suite": "Suite",
          "family": "Family Room"
        }
      },
      "idTypes": {
        "passport": "Passport",
        "drivingLicense": "Driving License",
        "nationalId": "National ID",
        "other": "Other"
      },
      "terms": {
        "agreement": "I agree to the terms and conditions",
        "privacy": "I consent to the processing of my personal data",
        "marketing": "I agree to receive marketing communications (optional)"
      }
    },
    "messages": {
      "loading": "Loading...",
      "submitting": "Submitting your check-in...",
      "success": "Check-in completed successfully!",
      "error": "An error occurred. Please try again.",
      "checkInSuccess": "Welcome! Your check-in has been completed successfully.",
      "uploadSuccess": "Document uploaded successfully",
      "uploadError": "Failed to upload document. Please try again."
    },
    "languageSelector": {
      "loading": "Loading languages..."
    },
    "idUpload": {
      "title": "Upload ID Document",
      "description": "Please upload a clear photo of your identification document",
      "dragDrop": "Drag and drop your ID document here, or click to browse",
      "fileTypes": "Supported formats: JPG, PNG, PDF (max 10MB)",
      "uploading": "Uploading...",
      "success": "Document uploaded successfully",
      "error": "Upload failed. Please try again.",
      "retry": "Try Again",
      "remove": "Remove",
      "takePhoto": "Take Photo",
      "chooseFiles": "Choose Files",
      "frontSide": "Front Side",
      "backSide": "Back Side",
      "uploadFront": "Upload Front",
      "uploadBack": "Upload Back"
    },
    "checkInPage": {
      "loading": "Loading check-in details...",
      "error": "Error loading check-in information",
      "title": "Digital Check-in",
      "bookingId": "Booking ID",
      "guest": "Guest",
      "room": "Room",
      "checkInDate": "Check-in Date",
      "alreadyCompleted": "Check-in already completed",
      "notFound": "Booking not found"
    }
  }
};

const FALLBACK_LANGUAGES: LanguageOption[] = [
  { code: 'en-US', name: 'English', nativeName: 'English', isActive: true, qualityScore: 100 },
  { code: 'hi-IN', name: 'Hindi', nativeName: 'हिन्दी', isActive: true, qualityScore: 85 },
  { code: 'es-ES', name: 'Spanish', nativeName: 'Español', isActive: true, qualityScore: 90 },
  { code: 'fr-FR', name: 'French', nativeName: 'Français', isActive: true, qualityScore: 88 },
  { code: 'de-DE', name: 'German', nativeName: 'Deutsch', isActive: true, qualityScore: 87 },
  { code: 'zh-CN', name: 'Chinese', nativeName: '中文', isActive: true, qualityScore: 85 },
  { code: 'ja-JP', name: 'Japanese', nativeName: '日本語', isActive: true, qualityScore: 83 },
  { code: 'ko-KR', name: 'Korean', nativeName: '한국어', isActive: true, qualityScore: 82 },
  { code: 'ar-SA', name: 'Arabic', nativeName: 'العربية', isActive: true, qualityScore: 80 },
  { code: 'pt-BR', name: 'Portuguese', nativeName: 'Português', isActive: true, qualityScore: 86 }
];

class DatabaseTranslationService {
  private static instance: DatabaseTranslationService | null = null;
  private cache: Map<string, any> = new Map();
  private availableLanguages: LanguageOption[] = [];
  private isInitialized = false;
  private useFallback = true; // Start in fallback mode
  private isUpgrading = false;

  /**
   * Singleton pattern to prevent multiple instances
   */
  public static getInstance(): DatabaseTranslationService {
    if (!DatabaseTranslationService.instance) {
      DatabaseTranslationService.instance = new DatabaseTranslationService();
    }
    return DatabaseTranslationService.instance;
  }

  /**
   * Normalize language codes to match database storage format
   */
  private normalizeLanguageCode(code: string): string {
    const mapping: Record<string, string> = {
      'en': 'en-US',
      'en-US': 'en-US',
      'hi': 'hi-IN',
      'hi-IN': 'hi-IN',
      'es': 'es-ES',
      'es-ES': 'es-ES',
      'fr': 'fr-FR',
      'fr-FR': 'fr-FR',
      'de': 'de-DE',
      'de-DE': 'de-DE',
      'ar': 'ar-SA',
      'ar-SA': 'ar-SA',
      'ja': 'ja-JP',
      'ja-JP': 'ja-JP',
      'zh': 'zh-CN',
      'zh-CN': 'zh-CN',
      'pt': 'pt-BR',
      'pt-BR': 'pt-BR',
      'it': 'it-IT',
      'it-IT': 'it-IT',
      'ko': 'ko-KR',
      'ko-KR': 'ko-KR'
    };
    return mapping[code] || 'en-US';
  }

  private constructor() {
    // Initialize fallback immediately for synchronous access
    this.initializeFallbackForBootstrap();
    // Then try to upgrade to database mode asynchronously
    this.upgradeToDatabase();
  }

  /**
   * Initialize with fallback data immediately for synchronous access
   */
  private initializeFallbackForBootstrap(): void {
    this.availableLanguages = [...FALLBACK_LANGUAGES];
    this.cache.set('en-US', FALLBACK_TRANSLATIONS['en-US']);
    this.isInitialized = true;
    console.log('[TranslationService] Bootstrap initialized with fallback translations');
  }

  /**
   * Try to upgrade from fallback to database mode
   */
  private async upgradeToDatabase(): Promise<void> {
    // Prevent multiple simultaneous upgrades
    if (this.isUpgrading || !this.useFallback) {
      return;
    }
    
    this.isUpgrading = true;
    
    try {
      // Try to load from database
      if (supabase) {
        const { data, error } = await supabase
          .from('translations')
          .select('language_code, language_name, native_name, is_active, quality_score')
          .eq('is_active', true)
          .order('language_name');

        if (error) {
          console.warn('[TranslationService] Database upgrade failed, staying in fallback mode:', error);
          return;
        }

        if (data && data.length > 0) {
          // Successfully connected to database
          this.useFallback = false;
          this.availableLanguages = data.map(lang => ({
            code: lang.language_code,
            name: lang.language_name,
            nativeName: lang.native_name,
            isActive: lang.is_active,
            qualityScore: lang.quality_score
          }));
          
          // Clear fallback cache and reload from database
          this.cache.clear();
          await this.loadTranslationData('en-US');
          
          console.log('[TranslationService] Successfully upgraded to database mode with', this.availableLanguages.length, 'languages');
        } else {
          console.warn('[TranslationService] No translations in database, staying in fallback mode');
        }
      } else {
        console.warn('[TranslationService] Supabase not available, staying in fallback mode');
      }
    } catch (error) {
      console.warn('[TranslationService] Database upgrade failed, staying in fallback mode:', error);
    } finally {
      this.isUpgrading = false;
    }
  }

  /**
   * Initialize the service by loading available languages (legacy method)
   */
  private async initializeService(): Promise<void> {
    try {
      // Try to load from database first
      if (supabase) {
        await this.loadAvailableLanguages();
        if (this.availableLanguages.length === 0) {
          throw new Error('No languages loaded from database');
        }
      } else {
        throw new Error('Supabase not available');
      }
      this.isInitialized = true;
      console.log('[TranslationService] Initialized with', this.availableLanguages.length, 'languages');
    } catch (error) {
      console.warn('[TranslationService] Database initialization failed, using fallback:', error);
      console.warn('[TranslationService] Run database health check for detailed diagnostics');
      this.initializeFallback();
    }
  }

  /**
   * Initialize with fallback data when database is not available
   */
  private initializeFallback(): void {
    this.useFallback = true;
    this.availableLanguages = [...FALLBACK_LANGUAGES];
    this.cache.set('en-US', FALLBACK_TRANSLATIONS['en-US']);
    this.isInitialized = true;
    console.log('[TranslationService] Initialized with fallback translations');
  }

  /**
   * Load all available languages from the database
   */
  private async loadAvailableLanguages(): Promise<void> {
    if (this.useFallback || !supabase) {
      return;
    }

    try {
      const { data, error } = await supabase
        .from('translations')
        .select('language_code, language_name, native_name, is_active, quality_score')
        .eq('is_active', true)
        .order('language_name');

      if (error) {
        console.error('[TranslationService] Error loading languages:', error);
        throw error;
      }

      this.availableLanguages = (data || []).map(lang => ({
        code: lang.language_code,
        name: lang.language_name,
        nativeName: lang.native_name,
        isActive: lang.is_active,
        qualityScore: lang.quality_score
      }));
    } catch (error) {
      console.error('[TranslationService] Failed to load languages from database:', error);
      throw error;
    }
  }

  /**
   * Get all available languages
   */
  async getAvailableLanguages(): Promise<LanguageOption[]> {
    if (!this.isInitialized) {
      await this.initializeService();
    }
    return this.availableLanguages;
  }

  /**
   * Check if a language is supported
   */
  async isLanguageSupported(languageCode: string): Promise<boolean> {
    const normalizedCode = this.normalizeLanguageCode(languageCode);
    const languages = await this.getAvailableLanguages();
    return languages.some(lang => lang.code === normalizedCode);
  }

  /**
   * Load translation data for a specific language
   */
  private async loadTranslationData(languageCode: string): Promise<any> {
    // Normalize language code to match database format
    const normalizedCode = this.normalizeLanguageCode(languageCode);
    
    // Check cache first with normalized code
    if (this.cache.has(normalizedCode)) {
      console.log(`[TranslationService] Using cached data for ${normalizedCode}`);
      return this.cache.get(normalizedCode);
    }

    // If using fallback mode
    if (this.useFallback) {
      if (normalizedCode === 'en-US' && FALLBACK_TRANSLATIONS[normalizedCode]) {
        const data = FALLBACK_TRANSLATIONS[normalizedCode];
        this.cache.set(normalizedCode, data);
        return data;
      }
      
      // For other languages in fallback mode, return English
      if (normalizedCode !== 'en-US') {
        console.log(`[TranslationService] Fallback mode: using English for ${normalizedCode}`);
        return this.loadTranslationData('en-US');
      }
      
      throw new Error(`No fallback translations available for ${normalizedCode}`);
    }

    // Load from database
    try {
      const { data, error } = await supabase
        .from('translations')
        .select('translation_data')
        .eq('language_code', normalizedCode)
        .eq('is_active', true)
        .single();

      if (error) {
        console.error(`[TranslationService] Error loading ${normalizedCode}:`, error);
        
        // Fallback to English if available
        if (normalizedCode !== 'en-US') {
          console.log(`[TranslationService] Falling back to English for ${normalizedCode}`);
          return this.loadTranslationData('en-US');
        }
        
        throw new Error(`Failed to load translations for ${normalizedCode}`);
      }

      // Cache the data with normalized code
      this.cache.set(normalizedCode, data.translation_data);
      console.log(`[TranslationService] Loaded and cached ${normalizedCode} translations`);
      
      return data.translation_data;
    } catch (error) {
      console.error(`[TranslationService] Database error for ${normalizedCode}:`, error);
      
      // Fallback to English if available
      if (normalizedCode !== 'en-US') {
        console.log(`[TranslationService] Database error: falling back to English for ${normalizedCode}`);
        return this.loadTranslationData('en-US');
      }
      
      throw error;
    }
  }

  /**
   * Get translated text for a specific key and language (async version)
   */
  async getText(
    key: string, 
    languageCode: string = 'en-US', 
    params?: { [key: string]: string }
  ): Promise<string> {
    try {
      const normalizedCode = this.normalizeLanguageCode(languageCode);
      
      // Load translation if not cached
      if (!this.cache.has(normalizedCode)) {
        await this.loadTranslationData(languageCode);
      }

      return this.getTextSync(key, normalizedCode, params);
    } catch (error) {
      console.error(`[TranslationService] Error getting text for key '${key}':`, error);
      return key;
    }
  }

  /**
   * Get translated text synchronously (requires data to be preloaded)
   */
  getTextSync(
    key: string, 
    languageCode: string = 'en-US', 
    params?: { [key: string]: string }
  ): string {
    try {
      const normalizedCode = this.normalizeLanguageCode(languageCode);
      
      const translationData = this.cache.get(normalizedCode);
      if (!translationData) {
        console.warn(`[TranslationService] No translation found for language: ${normalizedCode}`);
        // Fallback to English
        if (normalizedCode !== 'en-US' && this.cache.has('en-US')) {
          return this.getTextSync(key, 'en-US', params);
        }
        // If in fallback mode, try to use fallback translations
        if (this.useFallback && FALLBACK_TRANSLATIONS['en-US']) {
          return this.extractKeyFromFallback(key, FALLBACK_TRANSLATIONS['en-US'], params);
        }
        return key;
      }

      // Navigate through nested keys (e.g., "form.fields.firstName")
      const keys = key.split('.');
      let value: any = translationData;
      
      for (const k of keys) {
        if (value && typeof value === 'object' && k in value) {
          value = value[k];
        } else {
          console.warn(`[TranslationService] Translation key not found: ${key} in ${normalizedCode}`);
          // Fallback to English if not the current language
          if (normalizedCode !== 'en-US' && this.cache.has('en-US')) {
            return this.getTextSync(key, 'en-US', params);
          }
          return key;
        }
      }

      let result = typeof value === 'string' ? value : key;

      // Replace parameters if provided
      if (params && typeof result === 'string') {
        Object.entries(params).forEach(([paramKey, paramValue]) => {
          result = result.replace(new RegExp(`{{${paramKey}}}`, 'g'), paramValue);
        });
      }

      return result;
    } catch (error) {
      console.error(`[TranslationService] Error getting text sync for key '${key}':`, error);
      return key;
    }
  }

  /**
   * Preload a language for faster access
   */
  async preloadLanguage(languageCode: string): Promise<boolean> {
    try {
      const normalizedCode = this.normalizeLanguageCode(languageCode);
      await this.loadTranslationData(languageCode);
      console.log(`[TranslationService] Preloaded language: ${normalizedCode}`);
      return true;
    } catch (error) {
      const normalizedCode = this.normalizeLanguageCode(languageCode);
      console.error(`[TranslationService] Error preloading language ${normalizedCode}:`, error);
      return false;
    }
  }

  /**
   * Clear cache for a specific language or all languages
   */
  clearCache(languageCode?: string): void {
    if (languageCode) {
      this.cache.delete(languageCode);
      console.log(`[TranslationService] Cleared cache for ${languageCode}`);
    } else {
      this.cache.clear();
      console.log('[TranslationService] Cleared all translation cache');
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; languages: string[] } {
    return {
      size: this.cache.size,
      languages: Array.from(this.cache.keys())
    };
  }

  /**
   * Refresh available languages (useful after adding new translations)
   */
  async refreshLanguages(): Promise<void> {
    if (this.useFallback) {
      console.log('[TranslationService] Cannot refresh languages in fallback mode');
      return;
    }
    await this.loadAvailableLanguages();
    console.log('[TranslationService] Refreshed available languages');
  }

  /**
   * Add a new translation to the database
   */
  async addTranslation(translation: Omit<Translation, 'id' | 'created_at' | 'updated_at'>): Promise<boolean> {
    if (this.useFallback) {
      console.warn('[TranslationService] Cannot add translation in fallback mode');
      return false;
    }

    try {
      const { error } = await supabase
        .from('translations')
        .insert(translation);

      if (error) {
        console.error('[TranslationService] Error adding translation:', error);
        return false;
      }

      // Refresh available languages and clear cache
      await this.refreshLanguages();
      this.clearCache(translation.language_code);
      
      console.log(`[TranslationService] Successfully added translation for ${translation.language_code}`);
      return true;
      
    } catch (error) {
      console.error('[TranslationService] Error adding translation:', error);
      return false;
    }
  }

  /**
   * Update an existing translation
   */
  async updateTranslation(languageCode: string, translationData: any): Promise<boolean> {
    if (this.useFallback) {
      console.warn('[TranslationService] Cannot update translation in fallback mode');
      return false;
    }

    try {
      const { error } = await supabase
        .from('translations')
        .update({ 
          translation_data: translationData,
          updated_at: new Date().toISOString()
        })
        .eq('language_code', languageCode);

      if (error) {
        console.error('[TranslationService] Error updating translation:', error);
        return false;
      }

      // Clear cache for this language
      this.clearCache(languageCode);
      
      console.log(`[TranslationService] Successfully updated translation for ${languageCode}`);
      return true;
      
    } catch (error) {
      console.error('[TranslationService] Error updating translation:', error);
      return false;
    }
  }

  /**
   * Delete a translation
   */
  async deleteTranslation(languageCode: string): Promise<boolean> {
    if (this.useFallback) {
      console.warn('[TranslationService] Cannot delete translation in fallback mode');
      return false;
    }

    try {
      const { error } = await supabase
        .from('translations')
        .delete()
        .eq('language_code', languageCode);

      if (error) {
        console.error('[TranslationService] Error deleting translation:', error);
        return false;
      }

      // Refresh available languages and clear cache
      await this.refreshLanguages();
      this.clearCache(languageCode);
      
      console.log(`[TranslationService] Successfully deleted translation for ${languageCode}`);
      return true;
      
    } catch (error) {
      console.error('[TranslationService] Error deleting translation:', error);
      return false;
    }
  }

  /**
   * Get translation statistics
   */
  async getTranslationStats(): Promise<{
    totalLanguages: number;
    activeLanguages: number;
    averageQualityScore: number;
    languageBreakdown: Array<{
      code: string;
      name: string;
      qualityScore: number;
      keyCount: number;
    }>;
  }> {
    if (this.useFallback) {
      const fallbackStats = this.availableLanguages.map(lang => ({
        code: lang.code,
        name: lang.name,
        qualityScore: lang.qualityScore,
        keyCount: lang.code === 'en-US' ? this.countKeys(FALLBACK_TRANSLATIONS['en-US']) : 0
      }));

      const totalQuality = fallbackStats.reduce((sum, t) => sum + t.qualityScore, 0);
      
      return {
        totalLanguages: this.availableLanguages.length,
        activeLanguages: this.availableLanguages.filter(l => l.isActive).length,
        averageQualityScore: this.availableLanguages.length > 0 ? totalQuality / this.availableLanguages.length : 0,
        languageBreakdown: fallbackStats
      };
    }

    const { data, error } = await supabase
      .from('translations')
      .select('language_code, language_name, quality_score, translation_data, is_active');

    if (error) {
      console.error('[TranslationService] Error getting stats:', error);
      return {
        totalLanguages: 0,
        activeLanguages: 0,
        averageQualityScore: 0,
        languageBreakdown: []
      };
    }

    const activeLanguages = data.filter(t => t.is_active);
    const totalQuality = activeLanguages.reduce((sum, t) => sum + (t.quality_score || 0), 0);
    
    return {
      totalLanguages: data.length,
      activeLanguages: activeLanguages.length,
      averageQualityScore: activeLanguages.length > 0 ? totalQuality / activeLanguages.length : 0,
      languageBreakdown: data.map(t => ({
        code: t.language_code,
        name: t.language_name,
        qualityScore: t.quality_score || 0,
        keyCount: this.countKeys(t.translation_data)
      }))
    };
  }

  /**
   * Extract translation key from fallback translations
   */
  private extractKeyFromFallback(
    key: string, 
    fallbackData: any, 
    params?: { [key: string]: string }
  ): string {
    try {
      const keys = key.split('.');
      let value: any = fallbackData;
      
      for (const k of keys) {
        if (value && typeof value === 'object' && k in value) {
          value = value[k];
        } else {
          return key; // Key not found in fallback
        }
      }

      let result = typeof value === 'string' ? value : key;

      // Replace parameters if provided
      if (params && typeof result === 'string') {
        Object.entries(params).forEach(([paramKey, paramValue]) => {
          result = result.replace(new RegExp(`{{${paramKey}}}`, 'g'), paramValue);
        });
      }

      return result;
    } catch (error) {
      return key;
    }
  }

  /**
   * Count the number of translation keys in a translation object
   */
  private countKeys(obj: any, count = 0): number {
    if (!obj || typeof obj !== 'object') return count;
    
    for (const key in obj) {
      if (typeof obj[key] === 'object' && obj[key] !== null) {
        count = this.countKeys(obj[key], count);
      } else {
        count++;
      }
    }
    return count;
  }

  /**
   * Run database health check for diagnostics
   */
  async runHealthCheck(): Promise<void> {
    try {
      const { logHealthStatus } = await import('../utils/dbHealthCheck');
      await logHealthStatus();
    } catch (error) {
      console.error('[TranslationService] Health check failed:', error);
    }
  }
}

// Create singleton instance
export const databaseTranslationService = DatabaseTranslationService.getInstance();

// Export for backward compatibility
export default databaseTranslationService;

// // Add to global scope for debugging in development
// if (typeof window !== 'undefined' && import.meta.env.DEV) {
//   window.databaseTranslationService = databaseTranslationService;
//   window.debugTranslationService = () => {
//     console.group('🔍 Translation Service Debug');
//     console.log('Service instance:', databaseTranslationService);
//     console.log('Cache stats:', databaseTranslationService.getCacheStats());
//     console.log('Available languages:', databaseTranslationService.getAvailableLanguages());
//     console.groupEnd();
//   };
// }