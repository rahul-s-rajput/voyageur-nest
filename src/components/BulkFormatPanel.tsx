import React, { useState, useCallback } from 'react';
import { Download, Copy, Eye, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { BulkUpdateFormat } from '../services/bulkFormatService';
import { OTABooking } from '../types/ota';

interface BulkFormatPanelProps {
  platform: 'booking.com' | 'gommt';
  bookings: OTABooking[];
  onFormatGenerated?: (format: BulkUpdateFormat) => void;
}

interface FormatOption {
  id: string;
  name: string;
  description: string;
  format: 'csv' | 'excel' | 'json' | 'calendar-grid';
  icon: React.ReactNode;
  recommended?: boolean;
}

const BulkFormatPanel: React.FC<BulkFormatPanelProps> = ({
  platform,
  bookings,
  onFormatGenerated
}) => {
  const [selectedFormat, setSelectedFormat] = useState<string>('');
  const [generatedFormat, setGeneratedFormat] = useState<BulkUpdateFormat | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  // Platform-specific format options
  const formatOptions: FormatOption[] = platform === 'booking.com' ? [
    {
      id: 'csv',
      name: 'CSV Format',
      description: 'Comma-separated values for bulk import',
      format: 'csv',
      icon: <Download className="w-4 h-4" />,
      recommended: true
    },
    {
      id: 'calendar-grid',
      name: 'Calendar Grid',
      description: 'Visual grid format for manual entry',
      format: 'calendar-grid',
      icon: <Eye className="w-4 h-4" />
    }
  ] : [
    {
      id: 'json',
      name: 'JSON Format',
      description: 'Mobile app compatible JSON data',
      format: 'json',
      icon: <Download className="w-4 h-4" />,
      recommended: true
    }
  ];

  const generateBulkFormat = useCallback(async (formatType: 'csv' | 'excel' | 'json' | 'calendar-grid') => {
    setIsGenerating(true);
    try {
      // Import the service dynamically to avoid circular dependencies
      const { bulkFormatService } = await import('../services/bulkFormatService');
      const format = bulkFormatService.generateBulkUpdate(platform, formatType, bookings);
      setGeneratedFormat(format);
      onFormatGenerated?.(format);
    } catch (error) {
      console.error('Error generating bulk format:', error);
    } finally {
      setIsGenerating(false);
    }
  }, [platform, bookings, onFormatGenerated]);

  const handleFormatSelect = (option: FormatOption) => {
    setSelectedFormat(option.id);
    generateBulkFormat(option.format);
  };

  const copyToClipboard = async () => {
    if (!generatedFormat) return;

    try {
      let textToCopy = '';
      
      if (typeof generatedFormat.data === 'string') {
        textToCopy = generatedFormat.data;
      } else {
        textToCopy = JSON.stringify(generatedFormat.data, null, 2);
      }

      await navigator.clipboard.writeText(textToCopy);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  const downloadFormat = () => {
    if (!generatedFormat) return;

    let content = '';
    let filename = '';
    let mimeType = '';

    if (generatedFormat.format === 'csv') {
      content = generatedFormat.data;
      filename = `${platform}-bulk-update-${new Date().toISOString().split('T')[0]}.csv`;
      mimeType = 'text/csv';
    } else if (generatedFormat.format === 'json') {
      content = JSON.stringify(generatedFormat.data, null, 2);
      filename = `${platform}-bulk-update-${new Date().toISOString().split('T')[0]}.json`;
      mimeType = 'application/json';
    } else {
      content = JSON.stringify(generatedFormat.data, null, 2);
      filename = `${platform}-bulk-update-${new Date().toISOString().split('T')[0]}.txt`;
      mimeType = 'text/plain';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatPreview = () => {
    if (!generatedFormat) return null;

    let preview = '';
    if (typeof generatedFormat.data === 'string') {
      preview = generatedFormat.data.substring(0, 500);
    } else {
      preview = JSON.stringify(generatedFormat.data, null, 2).substring(0, 500);
    }

    return preview + (preview.length >= 500 ? '...' : '');
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Bulk Format Generator
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Generate copy-paste ready formats for {platform === 'booking.com' ? 'Booking.com' : 'GoMMT'} updates
          </p>
        </div>
        <div className="flex items-center space-x-2 text-sm text-gray-500">
          <Clock className="w-4 h-4" />
          <span>{bookings.length} bookings</span>
        </div>
      </div>

      {/* Format Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {formatOptions.map((option) => (
          <button
            key={option.id}
            onClick={() => handleFormatSelect(option)}
            disabled={isGenerating}
            className={`
              relative p-4 border-2 rounded-lg text-left transition-all duration-200
              ${selectedFormat === option.id
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }
              ${isGenerating ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
          >
            {option.recommended && (
              <div className="absolute top-2 right-2">
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Recommended
                </span>
              </div>
            )}
            
            <div className="flex items-center space-x-3">
              <div className={`
                p-2 rounded-lg
                ${selectedFormat === option.id ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}
              `}>
                {option.icon}
              </div>
              <div>
                <h4 className="font-medium text-gray-900">{option.name}</h4>
                <p className="text-sm text-gray-600">{option.description}</p>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Loading State */}
      {isGenerating && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Generating bulk format...</span>
        </div>
      )}

      {/* Generated Format Display */}
      {generatedFormat && !isGenerating && (
        <div className="space-y-4">
          {/* Format Info */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-gray-900">Generated Format</h4>
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-600">
                  Est. {generatedFormat.estimatedTime} min
                </span>
              </div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Platform:</span>
                <p className="font-medium capitalize">{generatedFormat.platform}</p>
              </div>
              <div>
                <span className="text-gray-500">Format:</span>
                <p className="font-medium uppercase">{generatedFormat.format}</p>
              </div>
              <div>
                <span className="text-gray-500">Bookings:</span>
                <p className="font-medium">{generatedFormat.metadata.totalBookings}</p>
              </div>
              <div>
                <span className="text-gray-500">Date Range:</span>
                <p className="font-medium">
                  {generatedFormat.metadata.dateRange.start} to {generatedFormat.metadata.dateRange.end}
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-3">
            <button
              onClick={copyToClipboard}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              {copySuccess ? (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copy to Clipboard</span>
                </>
              )}
            </button>

            <button
              onClick={downloadFormat}
              className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Download</span>
            </button>

            <button
              onClick={() => setShowPreview(!showPreview)}
              className="flex items-center space-x-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Eye className="w-4 h-4" />
              <span>{showPreview ? 'Hide' : 'Show'} Preview</span>
            </button>
          </div>

          {/* Preview */}
          {showPreview && (
            <div className="bg-gray-900 text-gray-100 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Data Preview</span>
                <span className="text-xs text-gray-400">
                  {generatedFormat.copyPasteReady ? 'Copy-paste ready' : 'Manual formatting required'}
                </span>
              </div>
              <pre className="text-xs overflow-x-auto whitespace-pre-wrap">
                {formatPreview()}
              </pre>
            </div>
          )}

          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <h5 className="font-medium text-blue-900 mb-2">Instructions</h5>
                <ol className="text-sm text-blue-800 space-y-1">
                  {generatedFormat.instructions.map((instruction, index) => (
                    <li key={index} className="flex">
                      <span className="mr-2">{index + 1}.</span>
                      <span>{instruction}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BulkFormatPanel;