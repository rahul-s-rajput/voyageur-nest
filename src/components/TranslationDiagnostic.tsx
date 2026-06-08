import React, { useState, useEffect } from 'react';
import { databaseTranslationService } from '../lib/translationService';

export const TranslationDiagnostic: React.FC = () => {
  const [diagnostics, setDiagnostics] = useState<{
    cacheStats: any;
    testResults: Array<{key: string; value: string; isWorking: boolean}>;
    lastUpdate: number;
  }>({
    cacheStats: { size: 0, languages: [] },
    testResults: [],
    lastUpdate: Date.now()
  });

  useEffect(() => {
    const runDiagnostics = () => {
      // Get cache stats
      const cacheStats = databaseTranslationService.getCacheStats();
      
      // Test the keys that were showing as raw keys
      const testKeys = [
        'placeholders.selectPurpose',
        'form.options.business', 
        'form.options.leisure',
        'form.options.conference',
        'form.options.other',
        'checkInPage.bookingId',
        'checkInPage.guest', 
        'checkInPage.room',
        'checkInPage.checkInDate',
        'form.title',
        'form.sections.personalDetails',
        'form.fields.firstName'
      ];
      
      const testResults = testKeys.map(key => {
        const value = databaseTranslationService.getTextSync(key, 'en-US');
        return {
          key,
          value,
          isWorking: value !== key && !value.includes('.')
        };
      });
      
      setDiagnostics({
        cacheStats,
        testResults,
        lastUpdate: Date.now()
      });
    };

    runDiagnostics();
    const interval = setInterval(runDiagnostics, 3000);
    
    return () => clearInterval(interval);
  }, []);

  const { cacheStats, testResults, lastUpdate } = diagnostics;
  const workingKeys = testResults.filter(t => t.isWorking).length;
  const totalKeys = testResults.length;

  return (
    <div 
      style={{
        position: 'fixed',
        top: '10px',
        left: '10px',
        background: 'white',
        border: '2px solid #e5e7eb',
        borderRadius: '8px',
        padding: '12px',
        fontSize: '12px',
        fontFamily: 'monospace',
        maxWidth: '400px',
        maxHeight: '80vh',
        overflow: 'auto',
        zIndex: 9999,
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
      }}
    >
      <div style={{ marginBottom: '8px', fontWeight: 'bold', color: '#1f2937' }}>
        🔍 Translation Diagnostic
      </div>
      
      <div style={{ marginBottom: '8px' }}>
        <div>Cache: {cacheStats.size} languages ({cacheStats.languages.join(', ')})</div>
        <div>Keys Working: {workingKeys}/{totalKeys}</div>
        <div>Updated: {new Date(lastUpdate).toLocaleTimeString()}</div>
      </div>
      
      <div style={{ marginBottom: '8px' }}>
        <strong>Translation Tests:</strong>
      </div>
      
      <div style={{ maxHeight: '300px', overflow: 'auto' }}>
        {testResults.map(({ key, value, isWorking }) => (
          <div 
            key={key}
            style={{ 
              marginBottom: '4px',
              color: isWorking ? '#059669' : '#dc2626',
              fontSize: '11px'
            }}
          >
            <div>{isWorking ? '✅' : '❌'} {key}</div>
            <div style={{ marginLeft: '16px', color: '#6b7280' }}>
              "{value}"
            </div>
          </div>
        ))}
      </div>
      
      <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #e5e7eb' }}>
        <button
          onClick={() => {
            console.group('🔍 Manual Translation Debug');
            console.log('Cache stats:', cacheStats);
            console.log('Test results:', testResults);
            console.groupEnd();
          }}
          style={{
            background: '#3b82f6',
            color: 'white',
            border: 'none',
            padding: '4px 8px',
            borderRadius: '4px',
            fontSize: '11px',
            cursor: 'pointer'
          }}
        >
          Debug in Console
        </button>
      </div>
    </div>
  );
};

export default TranslationDiagnostic;
