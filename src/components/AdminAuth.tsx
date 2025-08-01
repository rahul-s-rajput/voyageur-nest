import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface AdminAuthProps {
  onAuthenticated: () => void;
}

const AdminAuth: React.FC<AdminAuthProps> = ({ onAuthenticated }) => {
  const [deviceToken, setDeviceToken] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isCheckingExisting, setIsCheckingExisting] = useState(true);

  useEffect(() => {
    // Check if device is already authenticated
    checkExistingAuth();
  }, []);

  const checkExistingAuth = async () => {
    try {
      const storedToken = localStorage.getItem('admin_device_token');
      if (storedToken) {
        const isValid = await validateDeviceToken(storedToken);
        if (isValid) {
          onAuthenticated();
          return;
        } else {
          localStorage.removeItem('admin_device_token');
        }
      }
    } catch (error) {
      console.error('Error checking existing auth:', error);
    } finally {
      setIsCheckingExisting(false);
    }
  };

  const validateDeviceToken = async (token: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from('device_tokens')
        .select('*')
        .eq('device_token', token)
        .eq('is_active', true)
        .gte('expires_at', new Date().toISOString())
        .single();

      if (error || !data) {
        return false;
      }

      // Update last_used_at
      await supabase
        .from('device_tokens')
        .update({ last_used_at: new Date().toISOString() })
        .eq('device_token', token);

      return true;
    } catch (error) {
      console.error('Error validating device token:', error);
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const isValid = await validateDeviceToken(deviceToken);
      
      if (isValid) {
        // Store token in localStorage for persistent authentication
        localStorage.setItem('admin_device_token', deviceToken);
        
        // Store device info
        const deviceInfo = {
          userAgent: navigator.userAgent,
          platform: navigator.platform,
          language: navigator.language,
          timestamp: new Date().toISOString()
        };

        await supabase
          .from('device_tokens')
          .update({ 
            device_info: deviceInfo,
            last_used_at: new Date().toISOString()
          })
          .eq('device_token', deviceToken);

        onAuthenticated();
      } else {
        setError('Invalid or expired device token');
      }
    } catch (error) {
      console.error('Authentication error:', error);
      setError('Authentication failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const generateDeviceInfo = () => {
    return {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      screen: `${screen.width}x${screen.height}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    };
  };

  if (isCheckingExisting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Checking authentication...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6">
        <div className="text-center mb-6">
          <div className="text-blue-500 text-4xl mb-4">🔐</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Admin Access</h2>
          <p className="text-gray-600">Enter your device token to access the booking management system</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="deviceToken" className="block text-sm font-medium text-gray-700 mb-1">
              Device Token
            </label>
            <input
              type="text"
              id="deviceToken"
              value={deviceToken}
              onChange={(e) => setDeviceToken(e.target.value)}
              placeholder="Enter your device token"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
              disabled={isLoading}
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || !deviceToken.trim()}
            className="w-full py-2 px-4 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? 'Authenticating...' : 'Access Admin Panel'}
          </button>
        </form>

        <div className="mt-6 p-4 bg-gray-50 rounded-md">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Device Information</h3>
          <div className="text-xs text-gray-500 space-y-1">
            <p><strong>Platform:</strong> {navigator.platform}</p>
            <p><strong>Language:</strong> {navigator.language}</p>
            <p><strong>Screen:</strong> {screen.width}x{screen.height}</p>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            This device will be remembered for 90 days after successful authentication.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminAuth;