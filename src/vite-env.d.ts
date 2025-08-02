/// <reference types="vite/client" />

// Global debug functions for development
declare global {
  interface Window {
    databaseTranslationService?: any;
    debugTranslationService?: () => void;
    quickDebug?: () => void;
    debugTranslations?: () => void;
  }
}
