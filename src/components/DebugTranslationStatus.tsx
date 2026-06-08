import React, { useState, useEffect } from 'react';
import { databaseTranslationService } from '../lib/translationService';

interface DebugTranslationStatusProps {
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}

export const DebugTranslationStatus: React.FC<DebugTranslationStatusProps> = ({
  position = 'top-right'
}) => {
  const [status, setStatus] = useState({
    initialized: false,
    cacheSize: 0,
    availableLanguages: 0,
    useFallback: true,
    lastUpdate: Date.now()
  });

  useEffect(() => {
    const updateStatus = () => {
      const cacheStats = databaseTranslationService.getCacheStats();
      setStatus({
        initialized: true, // Service is always initialized now
        cacheSize: cacheStats.size,
        availableLanguages: 0, // Will be updated async
        useFallback: (databaseTranslationService as any).useFallback || false,
        lastUpdate: Date.now()
      });
    };

    const loadLanguages = async () => {
      try {
        const languages = await databaseTranslationService.getAvailableLanguages();
        setStatus(prev => ({
          ...prev,
          availableLanguages: languages.length
        }));
      } catch (error) {
        console.error('Debug status error:', error);
      }
    };

    updateStatus();
    loadLanguages();

    const interval = setInterval(updateStatus, 2000);
    return () => clearInterval(interval);
  }, []);

  const positionClasses = {
    'top-left': 'top-4 left-4',
    'top-right': 'top-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-right': 'bottom-4 right-4'
  };

  const statusColor = status.cacheSize > 0 ? '#10B981' : '#F59E0B';

  return (
    <div
      className={`fixed ${positionClasses[position]} z-50 bg-white rounded-lg shadow-lg border p-3 text-xs font-mono max-w-xs`}
      style={{ fontSize: '11px' }}
    >
      <div className="flex items-center gap-2 mb-2">
        <div 
          className="w-3 h-3 rounded-full"
          style={{ backgroundColor: statusColor }}
        />
        <strong>Translation Status</strong>
      </div>
      
      <div className="space-y-1 text-gray-600">
        <div>Cache: {status.cacheSize} languages</div>
        <div>Available: {status.availableLanguages}</div>
        <div>Mode: {status.useFallback ? 'Fallback' : 'Database'}</div>
        <div>Updated: {new Date(status.lastUpdate).toLocaleTimeString()}</div>
      </div>
      
      <div className="mt-2 pt-2 border-t border-gray-200">
        <button
          onClick={() => {
            console.group('🔍 Manual Translation Debug');
            console.log('Service:', databaseTranslationService);
            console.log('Cache stats:', databaseTranslationService.getCacheStats());
            
            // Test some translations
            const testKeys = ['form.title', 'idUpload.takePhoto', 'messages.loading'];
            testKeys.forEach(key => {
              const value = databaseTranslationService.getTextSync(key, 'en-US');
              console.log(`${value === key ? '❌' : '✅'} ${key}: "${value}"`);
            });
            
            console.groupEnd();
          }}
          className="text-blue-600 hover:text-blue-800 text-xs"
        >
          Debug in Console
        </button>
      </div>
    </div>
  );
};

export default DebugTranslationStatus;
