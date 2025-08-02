import React, { useState, useEffect } from 'react';
import { checkDatabaseHealth, type DatabaseHealth } from '../utils/dbHealthCheck';

interface HealthStatusProps {
  showInProduction?: boolean;
}

export const HealthStatusIndicator: React.FC<HealthStatusProps> = ({ 
  showInProduction = false 
}) => {
  const [health, setHealth] = useState<DatabaseHealth | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  // Don't show in production unless explicitly enabled
  const isDevelopment = import.meta.env.DEV;
  if (!isDevelopment && !showInProduction) {
    return null;
  }

  useEffect(() => {
    const checkHealth = async () => {
      const healthData = await checkDatabaseHealth();
      setHealth(healthData);
      
      // Auto-show if there are issues
      if (!healthData.isHealthy) {
        setIsVisible(true);
      }
    };

    checkHealth();
    
    // Check every 30 seconds in development
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  if (!health) return null;

  const statusColor = health.isHealthy ? '#10B981' : '#EF4444';
  const statusIcon = health.isHealthy ? '✅' : '❌';

  return (
    <>
      {/* Floating status indicator */}
      <div
        onClick={() => setIsVisible(!isVisible)}
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          width: '50px',
          height: '50px',
          borderRadius: '50%',
          backgroundColor: statusColor,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          zIndex: 1000,
          fontSize: '20px',
          transition: 'transform 0.2s ease',
          transform: isVisible ? 'scale(1.1)' : 'scale(1)'
        }}
        title={`Database Health: ${health.isHealthy ? 'Healthy' : 'Issues Found'} (Click for details)`}
      >
        {statusIcon}
      </div>

      {/* Detailed status panel */}
      {isVisible && (
        <div
          style={{
            position: 'fixed',
            bottom: '80px',
            right: '20px',
            width: '400px',
            maxHeight: '500px',
            backgroundColor: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
            zIndex: 1001,
            overflow: 'hidden'
          }}
        >
          {/* Header */}
          <div
            style={{
              background: health.isHealthy ? '#10B981' : '#EF4444',
              color: 'white',
              padding: '12px 16px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>
              Database Health Status
            </h3>
            <button
              onClick={() => setIsVisible(false)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'white',
                fontSize: '18px',
                cursor: 'pointer',
                padding: '4px'
              }}
            >
              ×
            </button>
          </div>

          {/* Content */}
          <div style={{ padding: '16px', maxHeight: '400px', overflow: 'auto' }}>
            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span>Supabase Connected:</span>
                <span>{health.supabaseConnected ? '✅' : '❌'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span>Translations Table:</span>
                <span>{health.translationsTableExists ? '✅' : '❌'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span>Translation Count:</span>
                <span style={{ fontWeight: '600' }}>{health.translationCount}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span>English Available:</span>
                <span>{health.englishTranslationExists ? '✅' : '❌'}</span>
              </div>
            </div>

            {health.issues.length > 0 && (
              <div>
                <h4 style={{ 
                  margin: '0 0 8px 0', 
                  fontSize: '14px', 
                  fontWeight: '600',
                  color: '#EF4444'
                }}>
                  Issues Found:
                </h4>
                <ul style={{ 
                  margin: 0, 
                  paddingLeft: '16px',
                  fontSize: '13px',
                  lineHeight: '1.5'
                }}>
                  {health.issues.map((issue, index) => (
                    <li key={index} style={{ marginBottom: '4px', color: '#7f1d1d' }}>
                      {issue}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Quick actions */}
            <div style={{ 
              marginTop: '16px', 
              paddingTop: '16px', 
              borderTop: '1px solid #e5e7eb' 
            }}>
              <button
                onClick={async () => {
                  const newHealth = await checkDatabaseHealth();
                  setHealth(newHealth);
                }}
                style={{
                  background: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  padding: '8px 12px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  cursor: 'pointer',
                  marginRight: '8px'
                }}
              >
                Refresh Status
              </button>
              <button
                onClick={() => {
                  // Copy health info to clipboard
                  const info = `Database Health Check:\n${JSON.stringify(health, null, 2)}`;
                  navigator.clipboard.writeText(info);
                }}
                style={{
                  background: '#6b7280',
                  color: 'white',
                  border: 'none',
                  padding: '8px 12px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
              >
                Copy Info
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default HealthStatusIndicator;
