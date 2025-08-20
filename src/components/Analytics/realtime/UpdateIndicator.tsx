import React from 'react';
import { RefreshCw, Wifi, WifiOff, AlertCircle, Clock } from 'lucide-react';
import { useRealtimeStatus } from '../../../hooks/useRealtimeAnalytics';
import { formatRelativeTime } from '../../../lib/utils';
import { ConnectionState } from '../../../services/analytics/RealtimeManager';

export interface UpdateIndicatorProps {
  className?: string;
  showLastUpdated?: boolean;
  showConnectionDot?: boolean;
  compact?: boolean;
}

export const UpdateIndicator: React.FC<UpdateIndicatorProps> = ({
  className = '',
  showLastUpdated = true,
  showConnectionDot = true,
  compact = false,
}) => {
  const { isUpdating, lastUpdated, connectionState, isOffline } = useRealtimeStatus();

  if (compact) {
    return (
      <div className={`flex items-center gap-1 ${className}`}>
        {showConnectionDot && <ConnectionDot status={connectionState} isOffline={isOffline} />}
        {isUpdating && (
          <RefreshCw className="h-3 w-3 animate-spin text-blue-500" />
        )}
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Connection Status */}
      {showConnectionDot && <ConnectionDot status={connectionState} isOffline={isOffline} />}
      
      {/* Update Animation */}
      {isUpdating && (
        <div className="flex items-center gap-1">
          <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />
          <span className="text-xs text-blue-600 font-medium">Updating...</span>
        </div>
      )}
      
      {/* Last Updated */}
      {showLastUpdated && !isUpdating && (
        <span className="text-xs text-gray-500 flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {lastUpdated ? (
            <>Updated {formatRelativeTime(lastUpdated)}</>
          ) : (
            'Waiting for data...'
          )}
        </span>
      )}

      {/* Offline Indicator */}
      {isOffline && (
        <div className="flex items-center gap-1 text-amber-600">
          <WifiOff className="h-4 w-4" />
          <span className="text-xs font-medium">Offline</span>
        </div>
      )}
    </div>
  );
};

interface ConnectionDotProps {
  status: ConnectionState;
  isOffline: boolean;
}

const ConnectionDot: React.FC<ConnectionDotProps> = ({ status, isOffline }) => {
  if (isOffline) {
    return (
      <div className="relative">
        <div className="h-2 w-2 rounded-full bg-amber-500" />
        <div className="absolute inset-0 h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
      </div>
    );
  }

  const colors = {
    connected: 'bg-green-500',
    connecting: 'bg-yellow-500 animate-pulse',
    disconnected: 'bg-red-500',
    error: 'bg-red-600'
  };

  const shouldPing = status === 'connected';

  return (
    <div className="relative">
      <div className={`h-2 w-2 rounded-full ${colors[status]}`} />
      {shouldPing && (
        <div className="absolute inset-0 h-2 w-2 rounded-full bg-green-500 animate-ping opacity-75" />
      )}
    </div>
  );
};

// Status badge component
export const ConnectionStatusBadge: React.FC<{ status: ConnectionState; isOffline: boolean }> = ({ 
  status, 
  isOffline 
}) => {
  if (isOffline) {
    return (
      <div className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-amber-100 text-amber-800 rounded-full">
        <WifiOff className="h-3 w-3" />
        Offline
      </div>
    );
  }

  const variants = {
    connected: {
      icon: Wifi,
      text: 'Connected',
      className: 'bg-green-100 text-green-800'
    },
    connecting: {
      icon: RefreshCw,
      text: 'Connecting',
      className: 'bg-yellow-100 text-yellow-800'
    },
    disconnected: {
      icon: WifiOff,
      text: 'Disconnected',
      className: 'bg-red-100 text-red-800'
    },
    error: {
      icon: AlertCircle,
      text: 'Connection Error',
      className: 'bg-red-100 text-red-800'
    }
  };

  const variant = variants[status];
  const Icon = variant.icon;

  return (
    <div className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${variant.className}`}>
      <Icon className={`h-3 w-3 ${status === 'connecting' ? 'animate-spin' : ''}`} />
      {variant.text}
    </div>
  );
};

// Simple loading skeleton for data that's updating
export const UpdateSkeleton: React.FC<{ isUpdating: boolean; children: React.ReactNode }> = ({ 
  isUpdating, 
  children 
}) => {
  if (!isUpdating) {
    return <>{children}</>;
  }

  return (
    <div className="relative">
      <div className="opacity-50">{children}</div>
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
    </div>
  );
};
