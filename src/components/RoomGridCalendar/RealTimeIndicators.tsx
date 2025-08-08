import React from 'react';
import { CheckCircle, Loader, AlertCircle, RefreshCw } from 'lucide-react';
import { GridUpdateEvent } from '../../hooks/useRealTimeGrid';

interface ConnectionStatusProps {
  status: 'connecting' | 'connected' | 'disconnected';
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ status }) => (
  <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
    status === 'connected' ? 'bg-green-50 text-green-700 border border-green-200' :
    status === 'connecting' ? 'bg-yellow-50 text-yellow-700 border border-yellow-200' :
    'bg-red-50 text-red-700 border border-red-200'
  }`}>
    <div className="flex items-center">
      {status === 'connected' && <CheckCircle className="w-4 h-4 text-green-500" />}
      {status === 'connecting' && <Loader className="w-4 h-4 text-yellow-500 animate-spin" />}
      {status === 'disconnected' && <AlertCircle className="w-4 h-4 text-red-500" />}
    </div>
    <span>
      {status === 'connected' && 'Live updates active'}
      {status === 'connecting' && 'Connecting...'}
      {status === 'disconnected' && 'Connection lost - retrying...'}
    </span>
  </div>
);

interface PendingUpdatesIndicatorProps {
  updates: GridUpdateEvent[];
}

export const PendingUpdatesIndicator: React.FC<PendingUpdatesIndicatorProps> = ({ updates }) => {
  if (updates.length === 0) return null;

  return (
    <div className="flex items-center justify-center">
      <div className="flex items-center space-x-2 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium border border-blue-200">
        <RefreshCw className="w-3 h-3 animate-spin" />
        <span>{updates.length} pending update{updates.length !== 1 ? 's' : ''}</span>
      </div>
    </div>
  );
};

interface RealTimeStatusBarProps {
  pendingUpdates: GridUpdateEvent[];
  className?: string;
}

export const RealTimeStatusBar: React.FC<RealTimeStatusBarProps> = ({
  pendingUpdates,
  className = ''
}) => {
  // Only show when there are pending updates
  if (pendingUpdates.length === 0) {
    return null;
  }

  return (
    <div className={`flex items-center justify-between p-2 bg-blue-50 border-b border-blue-200 ${className}`}>
      <PendingUpdatesIndicator updates={pendingUpdates} />
      
      <div className="text-xs text-blue-600">
        Processing updates...
      </div>
    </div>
  );
};