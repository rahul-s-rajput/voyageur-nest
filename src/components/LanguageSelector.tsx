import React from 'react';
import { GlobeAltIcon } from '@heroicons/react/24/outline';

interface LanguageSelectorProps {
  currentLanguage: string;
  onLanguageChange: (language: string) => void;
  isLoading?: boolean;
  className?: string;
}

// Only the languages we actually support with vetted check-in translations.
// Intentionally no free-text "Other language" option — that triggered on-demand
// Gemini translation for arbitrary locales (filling net._http_response / translation
// jobs) and showed languages we don't truly maintain.
const SUPPORTED_LANGUAGES: { code: string; name: string }[] = [
  { code: 'en-US', name: 'English' },
  { code: 'hi-IN', name: 'हिन्दी (Hindi)' },
];

export default function LanguageSelector({
  currentLanguage,
  onLanguageChange,
  isLoading = false,
  className = ""
}: LanguageSelectorProps) {
  return (
    <div className={`relative ${className}`}>
      <div className="flex items-center space-x-2">
        <GlobeAltIcon className="h-4 w-4 text-gray-500" />
        <select
          value={SUPPORTED_LANGUAGES.some(l => l.code === currentLanguage) ? currentLanguage : 'en-US'}
          onChange={(e) => onLanguageChange(e.target.value)}
          disabled={isLoading}
          className="px-3 py-2 bg-white border border-gray-300 rounded-lg shadow-sm text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {SUPPORTED_LANGUAGES.map((language) => (
            <option key={language.code} value={language.code}>
              {language.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
