import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useNotification } from './NotificationContainer';

interface QRCodeGeneratorProps {
  bookingId: string;
  size?: number;
  className?: string;
}

export const QRCodeGenerator: React.FC<QRCodeGeneratorProps> = ({
  bookingId,
  size = 200,
  className = ''
}) => {
  const { showSuccess } = useNotification();
  // Generate the check-in URL
  const checkInUrl = `${window.location.origin}/checkin/${bookingId}`;

  const handleDownload = () => {
    const canvas = document.querySelector('#qr-code-canvas') as HTMLCanvasElement;
    if (canvas) {
      const url = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `checkin-qr-${bookingId}.png`;
      link.href = url;
      link.click();
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(checkInUrl);
      showSuccess('Copied!', 'Check-in link copied to clipboard!');
    } catch (error) {
      console.error('Failed to copy link:', error);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = checkInUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      showSuccess('Copied!', 'Check-in link copied to clipboard!');
    }
  };

  return (
    <div className={`qr-code-container ${className}`}>
      <div className="qr-code-wrapper bg-white p-4 rounded-lg shadow-md mb-4">
        <QRCodeSVG
          value={checkInUrl}
          size={size}
          level="M"
          includeMargin={true}
        />
      </div>
      
      <div className="qr-code-info w-full max-w-sm text-center">
        <p className="text-sm text-gray-600 mb-2">
          Scan this QR code or use the link below for digital check-in:
        </p>
        <div className="url-display mb-3">
          <input
            type="text"
            value={checkInUrl}
            readOnly
            className="w-full p-2 text-xs border rounded bg-gray-50"
          />
        </div>
        
        <div className="action-buttons flex gap-2">
          <button
            onClick={handleCopyLink}
            className="flex-1 px-3 py-2 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 transition-colors"
          >
            Copy Link
          </button>
          <button
            onClick={handleDownload}
            className="flex-1 px-3 py-2 bg-green-500 text-white text-sm rounded hover:bg-green-600 transition-colors"
          >
            Download QR
          </button>
        </div>
      </div>
    </div>
  );
};

export default QRCodeGenerator;