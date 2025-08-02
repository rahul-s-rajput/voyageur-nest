import React, { useState, useEffect } from 'react';
import { CheckInData } from '../types/checkin';

interface StaffVerificationInterfaceProps {
  checkInData: CheckInData;
  onVerificationUpdate: (
    checkInId: string, 
    status: 'verified' | 'rejected' | 'requires_review',
    notes?: string
  ) => Promise<void>;
  staffId: string;
  staffName: string;
}

export const StaffVerificationInterface: React.FC<StaffVerificationInterfaceProps> = ({
  checkInData,
  onVerificationUpdate,
  staffId,
  staffName
}) => {
  const [verificationStatus, setVerificationStatus] = useState<'pending' | 'verified' | 'rejected' | 'requires_review'>(
    checkInData.id_verification_status || 'pending'
  );
  const [notes, setNotes] = useState(checkInData.verification_notes || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  const handleVerificationSubmit = async () => {
    if (!verificationStatus || verificationStatus === 'pending') {
      alert('Please select a verification status');
      return;
    }

    setIsSubmitting(true);
    try {
      await onVerificationUpdate(checkInData.id, verificationStatus, notes);
      alert('Verification status updated successfully');
    } catch (error) {
      console.error('Error updating verification:', error);
      alert('Error updating verification status');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'verified': return 'text-green-600 bg-green-50 border-green-200';
      case 'rejected': return 'text-red-600 bg-red-50 border-red-200';
      case 'requires_review': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-4xl mx-auto">
      <div className="border-b pb-4 mb-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-2xl font-bold text-gray-800">ID Verification Review</h2>
          <button
            onClick={() => window.history.back()}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            ← Back to Dashboard
          </button>
        </div>
        <div className="text-sm text-gray-600">
          <p><strong>Guest:</strong> {checkInData.firstName} {checkInData.lastName}</p>
          <p><strong>Email:</strong> {checkInData.email}</p>
          <p><strong>Phone:</strong> {checkInData.phone}</p>
          <p><strong>Check-in ID:</strong> {checkInData.id}</p>
          <p><strong>Submitted:</strong> {formatDate(checkInData.form_completed_at)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Guest Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-800">Guest Information</h3>
          
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-700">ID Type:</span>
                <p className="capitalize">{checkInData.idType.replace('_', ' ')}</p>
              </div>
              <div>
                <span className="font-medium text-gray-700">ID Number:</span>
                <p>{checkInData.idNumber}</p>
              </div>
              <div>
                <span className="font-medium text-gray-700">Date of Birth:</span>
                <p>{checkInData.dateOfBirth || 'Not provided'}</p>
              </div>
              <div>
                <span className="font-medium text-gray-700">Nationality:</span>
                <p>{checkInData.nationality || 'Not provided'}</p>
              </div>
            </div>
          </div>

          {/* Current Status */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium text-gray-700 mb-2">Current Status</h4>
            <div className={`inline-flex px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(checkInData.id_verification_status || 'pending')}`}>
              {(checkInData.id_verification_status || 'pending').replace('_', ' ').toUpperCase()}
            </div>
            
            {checkInData.verified_by && (
              <div className="mt-2 text-sm text-gray-600">
                <p><strong>Verified by:</strong> {checkInData.verified_by}</p>
                <p><strong>Verified at:</strong> {checkInData.verified_at ? formatDate(checkInData.verified_at) : 'N/A'}</p>
              </div>
            )}
            
            {checkInData.verification_notes && (
              <div className="mt-2">
                <p className="font-medium text-gray-700">Previous Notes:</p>
                <p className="text-sm text-gray-600 bg-white p-2 rounded border">{checkInData.verification_notes}</p>
              </div>
            )}
          </div>
        </div>

        {/* ID Photos */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-800">ID Document Photos</h3>
          
          {checkInData.id_photo_urls && checkInData.id_photo_urls.length > 0 ? (
            <div className="grid grid-cols-2 gap-4">
              {checkInData.id_photo_urls.map((url, index) => (
                <div key={index} className="relative">
                  <img
                    src={url}
                    alt={`ID Document ${index + 1}`}
                    className="w-full h-48 object-cover rounded-lg border cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => {
                      setSelectedImageIndex(index);
                      setShowImageModal(true);
                    }}
                  />
                  <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-xs">
                    Photo {index + 1}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>No ID photos uploaded</p>
            </div>
          )}
        </div>
      </div>

      {/* Verification Actions */}
      <div className="mt-8 border-t pt-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Verification Decision</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Verification Status
            </label>
            <select
              value={verificationStatus}
              onChange={(e) => setVerificationStatus(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="pending">Pending Review</option>
              <option value="verified">Verified</option>
              <option value="rejected">Rejected</option>
              <option value="requires_review">Requires Further Review</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Add any notes about the verification decision..."
            />
          </div>

          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={handleVerificationSubmit}
              disabled={isSubmitting || verificationStatus === 'pending'}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? 'Updating...' : 'Update Verification Status'}
            </button>
          </div>
        </div>
      </div>

      {/* Image Modal */}
      {showImageModal && checkInData.id_photo_urls && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="relative max-w-4xl max-h-full">
            <img
              src={checkInData.id_photo_urls[selectedImageIndex]}
              alt={`ID Document ${selectedImageIndex + 1}`}
              className="max-w-full max-h-full object-contain"
            />
            <button
              onClick={() => setShowImageModal(false)}
              className="absolute top-4 right-4 bg-white text-black rounded-full w-8 h-8 flex items-center justify-center hover:bg-gray-200 transition-colors"
            >
              ×
            </button>
            {checkInData.id_photo_urls.length > 1 && (
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
                {checkInData.id_photo_urls.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImageIndex(index)}
                    className={`w-3 h-3 rounded-full ${
                      index === selectedImageIndex ? 'bg-white' : 'bg-gray-400'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffVerificationInterface;