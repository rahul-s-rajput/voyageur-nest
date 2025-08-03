import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useNotification } from './NotificationContainer';

interface DeviceToken {
  id: string;
  device_token: string;
  device_name: string;
  device_info: any;
  created_at: string;
  last_used_at: string;
  is_active: boolean;
  expires_at: string;
}

const TokenManagement: React.FC = () => {
  const { showSuccess, showError, showWarning } = useNotification();
  const [tokens, setTokens] = useState<DeviceToken[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [newTokenName, setNewTokenName] = useState('');
  const [newTokenDays, setNewTokenDays] = useState(90);
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);
  const [showTokenModal, setShowTokenModal] = useState(false);

  useEffect(() => {
    loadTokens();
  }, []);

  const loadTokens = async () => {
    try {
      const { data, error } = await supabase
        .from('device_tokens')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTokens(data || []);
    } catch (error) {
      console.error('Error loading tokens:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateNewToken = async () => {
    if (!newTokenName.trim()) return;

    setIsGenerating(true);
    try {
      const newToken = crypto.randomUUID();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + newTokenDays);

      const { error } = await supabase
        .from('device_tokens')
        .insert({
          device_token: newToken,
          device_name: newTokenName.trim(),
          device_info: {
            type: 'admin',
            generated_by: 'token_management',
            generated_at: new Date().toISOString()
          },
          expires_at: expiresAt.toISOString()
        });

      if (error) throw error;

      setGeneratedToken(newToken);
      setShowTokenModal(true);
      setNewTokenName('');
      setNewTokenDays(90);
      await loadTokens();
    } catch (error) {
      console.error('Error generating token:', error);
      showError('Generation failed', 'Failed to generate token. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleTokenStatus = async (tokenId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('device_tokens')
        .update({ is_active: !currentStatus })
        .eq('id', tokenId);

      if (error) throw error;
      await loadTokens();
    } catch (error) {
      console.error('Error updating token status:', error);
      showError('Update failed', 'Failed to update token status.');
    }
  };

  const deleteToken = async (tokenId: string) => {
    if (!confirm('Are you sure you want to delete this token? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('device_tokens')
        .delete()
        .eq('id', tokenId);

      if (error) throw error;
      await loadTokens();
    } catch (error) {
      console.error('Error deleting token:', error);
      showError('Delete failed', 'Failed to delete token.');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    showSuccess('Copied!', 'Token copied to clipboard!');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isExpired = (expiresAt: string) => {
    return new Date(expiresAt) < new Date();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Device Token Management</h2>
        <p className="text-gray-600">Generate and manage device tokens for admin access</p>
      </div>

      {/* Generate New Token */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Generate New Token</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Device Name
            </label>
            <input
              type="text"
              value={newTokenName}
              onChange={(e) => setNewTokenName(e.target.value)}
              placeholder="e.g., John's iPhone, Office Tablet"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Expires in (days)
            </label>
            <select
              value={newTokenDays}
              onChange={(e) => setNewTokenDays(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={30}>30 days</option>
              <option value={60}>60 days</option>
              <option value={90}>90 days</option>
              <option value={180}>180 days</option>
              <option value={365}>1 year</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={generateNewToken}
              disabled={isGenerating || !newTokenName.trim()}
              className="w-full py-2 px-4 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isGenerating ? 'Generating...' : 'Generate Token'}
            </button>
          </div>
        </div>
      </div>

      {/* Existing Tokens */}
      <div className="bg-white rounded-lg shadow-md">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800">Existing Tokens</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Device Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Token
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Used
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Expires
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {tokens.map((token) => (
                <tr key={token.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {token.device_name}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                        {token.device_token.substring(0, 8)}...
                      </code>
                      <button
                        onClick={() => copyToClipboard(token.device_token)}
                        className="text-blue-500 hover:text-blue-700 text-xs"
                      >
                        Copy
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      !token.is_active 
                        ? 'bg-gray-100 text-gray-800'
                        : isExpired(token.expires_at)
                        ? 'bg-red-100 text-red-800'
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {!token.is_active 
                        ? 'Inactive' 
                        : isExpired(token.expires_at) 
                        ? 'Expired' 
                        : 'Active'
                      }
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(token.created_at)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {token.last_used_at ? formatDate(token.last_used_at) : 'Never'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(token.expires_at)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <button
                      onClick={() => toggleTokenStatus(token.id, token.is_active)}
                      className={`${
                        token.is_active ? 'text-red-600 hover:text-red-900' : 'text-green-600 hover:text-green-900'
                      }`}
                    >
                      {token.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      onClick={() => deleteToken(token.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Token Generated Modal */}
      {showTokenModal && generatedToken && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="text-center mb-4">
              <div className="text-green-500 text-4xl mb-2">✅</div>
              <h3 className="text-lg font-semibold text-gray-800">Token Generated Successfully!</h3>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Your New Device Token:
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={generatedToken}
                  readOnly
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-sm"
                />
                <button
                  onClick={() => copyToClipboard(generatedToken)}
                  className="px-3 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 text-sm"
                >
                  Copy
                </button>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mb-4">
              <p className="text-sm text-yellow-800">
                <strong>Important:</strong> Save this token securely. You won't be able to see it again after closing this dialog.
              </p>
            </div>

            <button
              onClick={() => {
                setShowTokenModal(false);
                setGeneratedToken(null);
              }}
              className="w-full py-2 px-4 bg-gray-500 text-white rounded-md hover:bg-gray-600"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TokenManagement;