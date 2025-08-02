import { useState, useEffect, useCallback } from 'react';
import { databaseTranslationService, LanguageOption } from '../lib/translationService';

export interface UseTranslationReturn {
  t: (key: string, replacements?: { [key: string]: string }) => string;
  isLoading: boolean;
  currentLanguage: string;
  setLanguage: (languageCode: string) => void;
  error: string | null;
  clearError: () => void;
  availableLanguages: LanguageOption[];
  isLanguageSupported: (languageCode: string) => Promise<boolean>;
  preloadLanguage: (languageCode: string) => Promise<boolean>;
}

export const useTranslation = (initialLanguage: string = 'en-US'): UseTranslationReturn => {
  const [currentLanguage, setCurrentLanguage] = useState<string>(initialLanguage);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [availableLanguages, setAvailableLanguages] = useState<LanguageOption[]>([]);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);

  // Load available languages on mount (only once per hook instance)
  useEffect(() => {
    let isMounted = true;
    let initializationAttempted = false;
    
    const loadLanguages = async () => {
      // Prevent multiple initialization attempts
      if (initializationAttempted) return;
      initializationAttempted = true;
      
      try {
        const languages = await databaseTranslationService.getAvailableLanguages();
        if (isMounted) {
          setAvailableLanguages(languages);
          console.log(`[useTranslation] Loaded ${languages.length} available languages`);
        }
      } catch (err) {
        if (isMounted) {
          console.error('[useTranslation] Error loading available languages:', err);
          setError('Failed to load available languages');
        }
      }
    };

    loadLanguages();
    
    return () => {
      isMounted = false;
    };
  }, []); // No dependencies to prevent re-runs

  // Preload initial language (only once per language change)
  useEffect(() => {
    let isMounted = true;
    
    const preloadInitial = async () => {
      if (isInitialized && currentLanguage === initialLanguage) return;
      
      if (initialLanguage) {
        setIsLoading(true);
        try {
          const success = await databaseTranslationService.preloadLanguage(initialLanguage);
          if (isMounted) {
            if (success) {
              setIsInitialized(true);
              console.log(`[useTranslation] Preloaded initial language: ${initialLanguage}`);
            } else {
              console.warn(`[useTranslation] Failed to preload ${initialLanguage}`);
            }
          }
        } catch (err) {
          if (isMounted) {
            console.error(`[useTranslation] Error preloading ${initialLanguage}:`, err);
          }
        } finally {
          if (isMounted) {
            setIsLoading(false);
          }
        }
      }
    };

    preloadInitial();
    
    return () => {
      isMounted = false;
    };
  }, [initialLanguage, isInitialized]); // Depend on isInitialized to prevent multiple calls

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const setLanguage = useCallback(async (languageCode: string) => {
    if (languageCode === currentLanguage) return;

    console.log(`[useTranslation] Changing language from ${currentLanguage} to ${languageCode}`);
    setIsLoading(true);
    setError(null);

    try {
      // Check if language is supported
      const isSupported = await databaseTranslationService.isLanguageSupported(languageCode);
      if (!isSupported) {
        throw new Error(`Language ${languageCode} is not supported`);
      }

      // Preload the language data
      const success = await databaseTranslationService.preloadLanguage(languageCode);
      if (success) {
        setCurrentLanguage(languageCode);
        console.log(`[useTranslation] Successfully changed to ${languageCode}`);
      } else {
        throw new Error(`Failed to load translations for ${languageCode}`);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      console.error(`[useTranslation] Error changing language:`, err);
      setError(errorMessage);
      
      // Fallback to English if current language fails
      if (languageCode !== 'en-US') {
        console.log('[useTranslation] Falling back to English');
        setCurrentLanguage('en-US');
      }
    } finally {
      setIsLoading(false);
    }
  }, [currentLanguage]);

  const t = useCallback((key: string, params?: { [key: string]: string }) => {
    try {
      return databaseTranslationService.getTextSync(key, currentLanguage, params);
    } catch (err) {
      console.error(`[useTranslation] Error getting translation for key '${key}':`, err);
      return key; // Return the key itself as fallback
    }
  }, [currentLanguage]);

  // Enhanced t function that works with async data
  const tAsync = useCallback(async (key: string, params?: { [key: string]: string }) => {
    try {
      return await databaseTranslationService.getText(key, currentLanguage, params);
    } catch (err) {
      console.error(`[useTranslation] Error getting translation for key '${key}':`, err);
      return key; // Return the key itself as fallback
    }
  }, [currentLanguage]);

  const isLanguageSupported = useCallback(async (languageCode: string) => {
    return await databaseTranslationService.isLanguageSupported(languageCode);
  }, []);

  const preloadLanguage = useCallback(async (languageCode: string) => {
    return await databaseTranslationService.preloadLanguage(languageCode);
  }, []);

  return {
    t,
    isLoading,
    currentLanguage,
    setLanguage,
    error,
    clearError,
    availableLanguages,
    isLanguageSupported,
    preloadLanguage
  };
};