import React, { useState } from 'react';
import { GlobeAltIcon } from '@heroicons/react/24/outline';
import { useTranslation } from '../hooks/useTranslation';

interface LanguageSelectorProps {
  currentLanguage: string;
  onLanguageChange: (language: string) => void;
  isLoading?: boolean;
  className?: string;
}

export default function LanguageSelector({ 
  currentLanguage, 
  onLanguageChange, 
  isLoading = false,
  className = ""
}: LanguageSelectorProps) {
  const { t, availableLanguages, isLanguageSupported } = useTranslation();
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customLanguage, setCustomLanguage] = useState('');
  const [customLanguageError, setCustomLanguageError] = useState('');

  const getCurrentLanguageDisplay = () => {
    const current = availableLanguages.find(lang => lang.code === currentLanguage);
    return current ? current.name : 'English';
  };

  const handleLanguageChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedValue = event.target.value;
    if (selectedValue === 'custom') {
      setShowCustomInput(true);
    } else {
      onLanguageChange(selectedValue);
    }
  };

  const handleCustomLanguageSubmit = async () => {
    if (customLanguage.trim()) {
      setCustomLanguageError('');
      const languageCode = customLanguage.trim();
      
      // Check if language is supported
      const supported = await isLanguageSupported(languageCode);
      if (supported) {
        onLanguageChange(languageCode);
        setCustomLanguage('');
        setShowCustomInput(false);
      } else {
        setCustomLanguageError(`Language "${languageCode}" is not available. Please select from the available languages.`);
      }
    }
  };

  return (
    <div className={`relative ${className}`}>
      <div className="flex items-center space-x-2">
        <GlobeAltIcon className="h-4 w-4 text-gray-500" />
        <select
          value={currentLanguage}
          onChange={handleLanguageChange}
          disabled={isLoading || availableLanguages.length === 0}
          className="px-3 py-2 bg-white border border-gray-300 rounded-lg shadow-sm text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {availableLanguages.length === 0 ? (
            <option value={currentLanguage}>
              {currentLanguage === 'en-US' ? 'English (en-US)' : `${currentLanguage}`}
            </option>
          ) : (
            <>
              {availableLanguages.map((language) => (
                <option key={language.code} value={language.code}>
                  {language.name} ({language.code})
                </option>
              ))}
              <option value="custom">Other Language...</option>
            </>
          )}
        </select>
      </div>
      
      {/* Custom Language Input */}
      {showCustomInput && (
        <div className="mt-3 p-3 bg-gray-50 rounded-lg border">
          <div className="space-y-2">
            <input
              type="text"
              value={customLanguage}
              onChange={(e) => {
                setCustomLanguage(e.target.value);
                setCustomLanguageError('');
              }}
              placeholder="Enter language code (e.g., ta-IN, bn-BD)"
              className={`w-full px-3 py-2 text-sm border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                customLanguageError ? 'border-red-300' : 'border-gray-300'
              }`}
              onKeyPress={(e) => e.key === 'Enter' && handleCustomLanguageSubmit()}
            />
            {customLanguageError && (
              <p className="text-xs text-red-600">{customLanguageError}</p>
            )}
            <div className="flex space-x-2">
              <button
                onClick={handleCustomLanguageSubmit}
                disabled={!customLanguage.trim() || isLoading}
                className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                Apply
              </button>
              <button
                onClick={() => {
                  setShowCustomInput(false);
                  setCustomLanguage('');
                  setCustomLanguageError('');
                }}
                className="px-3 py-1 text-xs bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}