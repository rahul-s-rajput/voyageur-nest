/**
 * Static Translation Service
 *
 * UI strings for the guest check-in flow live in src/locales/<lang>.json and
 * are bundled at build time. There are NO network, database, or LLM calls:
 * adding a language is just dropping a JSON file into src/locales and listing
 * it in SUPPORTED_LANGUAGES. Any requested locale without a bundled dictionary
 * falls back to English.
 *
 * The exported singleton keeps the historical name/shape (`databaseTranslationService`,
 * getText / getTextSync / getAvailableLanguages / preloadLanguage /
 * isLanguageSupported / clearCache / getCacheStats) so consumers don't change.
 */

export interface LanguageOption {
  code: string;
  name: string;
  nativeName: string;
  isActive: boolean;
  qualityScore: number;
}

// Bundled locale dictionaries, keyed by language code, e.g. { 'en-US': {...} }.
const localeModules = import.meta.glob('../locales/*.json', { eager: true }) as Record<string, any>;
const STATIC_TRANSLATIONS: Record<string, any> = {};
for (const [path, mod] of Object.entries(localeModules)) {
  const code = (path.split('/').pop() || '').replace('.json', '');
  if (code) STATIC_TRANSLATIONS[code] = (mod as any)?.default ?? mod;
}

// Languages offered in the selector. Only those with a bundled JSON render in
// their own language; the rest gracefully fall back to English.
const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: 'en-US', name: 'English', nativeName: 'English', isActive: true, qualityScore: 100 },
  { code: 'hi-IN', name: 'Hindi', nativeName: 'हिन्दी', isActive: true, qualityScore: 85 },
  { code: 'es-ES', name: 'Spanish', nativeName: 'Español', isActive: true, qualityScore: 90 },
  { code: 'fr-FR', name: 'French', nativeName: 'Français', isActive: true, qualityScore: 88 },
  { code: 'de-DE', name: 'German', nativeName: 'Deutsch', isActive: true, qualityScore: 87 },
  { code: 'zh-CN', name: 'Chinese', nativeName: '中文', isActive: true, qualityScore: 85 },
  { code: 'ja-JP', name: 'Japanese', nativeName: '日本語', isActive: true, qualityScore: 83 },
  { code: 'ko-KR', name: 'Korean', nativeName: '한국어', isActive: true, qualityScore: 82 },
  { code: 'ar-SA', name: 'Arabic', nativeName: 'العربية', isActive: true, qualityScore: 80 },
  { code: 'pt-BR', name: 'Portuguese', nativeName: 'Português', isActive: true, qualityScore: 86 },
];

const LANGUAGE_ALIASES: Record<string, string> = {
  en: 'en-US', 'en-US': 'en-US',
  hi: 'hi-IN', 'hi-IN': 'hi-IN',
  es: 'es-ES', 'es-ES': 'es-ES',
  fr: 'fr-FR', 'fr-FR': 'fr-FR',
  de: 'de-DE', 'de-DE': 'de-DE',
  ar: 'ar-SA', 'ar-SA': 'ar-SA',
  ja: 'ja-JP', 'ja-JP': 'ja-JP',
  zh: 'zh-CN', 'zh-CN': 'zh-CN',
  pt: 'pt-BR', 'pt-BR': 'pt-BR',
  it: 'it-IT', 'it-IT': 'it-IT',
  ko: 'ko-KR', 'ko-KR': 'ko-KR',
};

class StaticTranslationService {
  private cache: Map<string, any> = new Map();

  constructor() {
    for (const [code, data] of Object.entries(STATIC_TRANSLATIONS)) {
      this.cache.set(code, data);
    }
  }

  private normalizeLanguageCode(code: string): string {
    return LANGUAGE_ALIASES[code] || (STATIC_TRANSLATIONS[code] ? code : 'en-US');
  }

  async getAvailableLanguages(): Promise<LanguageOption[]> {
    return SUPPORTED_LANGUAGES;
  }

  async isLanguageSupported(languageCode: string): Promise<boolean> {
    const normalized = this.normalizeLanguageCode(languageCode);
    return SUPPORTED_LANGUAGES.some((l) => l.code === normalized);
  }

  // Everything is bundled, so there is nothing to preload; kept for API parity.
  async preloadLanguage(_languageCode: string): Promise<boolean> {
    return true;
  }

  async getText(key: string, languageCode: string = 'en-US', params?: { [key: string]: string }): Promise<string> {
    return this.getTextSync(key, languageCode, params);
  }

  getTextSync(key: string, languageCode: string = 'en-US', params?: { [key: string]: string }): string {
    try {
      const normalized = this.normalizeLanguageCode(languageCode);
      const data = this.cache.get(normalized) ?? this.cache.get('en-US');
      if (!data) return key;

      const value = this.resolveKey(data, key);
      if (value === undefined && normalized !== 'en-US') {
        // Fall back to English for any missing key.
        return this.getTextSync(key, 'en-US', params);
      }
      let result = typeof value === 'string' ? value : key;

      if (params && typeof result === 'string') {
        Object.entries(params).forEach(([paramKey, paramValue]) => {
          result = result.replace(new RegExp(`{{${paramKey}}}`, 'g'), paramValue);
        });
      }
      return result;
    } catch {
      return key;
    }
  }

  private resolveKey(data: any, key: string): any {
    let value: any = data;
    for (const k of key.split('.')) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        return undefined;
      }
    }
    return value;
  }

  clearCache(languageCode?: string): void {
    if (languageCode) {
      this.cache.delete(languageCode);
    } else {
      this.cache.clear();
      for (const [code, data] of Object.entries(STATIC_TRANSLATIONS)) {
        this.cache.set(code, data);
      }
    }
  }

  getCacheStats(): { size: number; languages: string[] } {
    return { size: this.cache.size, languages: Array.from(this.cache.keys()) };
  }
}

// Singleton (historical export name retained for backward compatibility).
export const databaseTranslationService = new StaticTranslationService();

export default databaseTranslationService;
