import React from 'react';
import { clearGridCalendarSettings } from '../utils/localStorageUtils';
import { RefreshCw } from 'lucide-react';

/**
 * Debug utility component to reset grid calendar settings
 * Add this to your app temporarily if you're experiencing date sync issues
 * Usage: <GridCalendarDebug />
 */
export const GridCalendarDebug: React.FC = () => {
  const handleReset = () => {
    if (window.confirm('This will clear saved calendar settings and reload the page. Continue?')) {
      clearGridCalendarSettings();
      window.location.reload();
    }
  };

  // Only show in development mode
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <button
        onClick={handleReset}
        className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg shadow-lg hover:bg-red-600 transition-colors"
        title="Reset Grid Calendar Settings"
      >
        <RefreshCw className="w-4 h-4" />
        Reset Calendar
      </button>
    </div>
  );
};
