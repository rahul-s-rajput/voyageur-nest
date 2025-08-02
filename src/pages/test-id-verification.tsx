import React, { useState } from 'react';
import { CheckInForm } from '../components/CheckInForm';
import StaffDashboard from '../components/StaffDashboard';
import { CheckInFormData } from '../types/checkin';

const TestIDVerification: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'guest' | 'staff'>('guest');
  const [mockBookingId] = useState('test-booking-123');

  const handleCheckInSubmit = async (data: CheckInFormData) => {
    console.log('Check-in form submitted:', data);
    // In a real app, this would submit to the backend
    alert('Check-in form submitted successfully! ID verification is pending.');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">
            ID Verification System Demo
          </h1>
          
          {/* Tab Navigation */}
          <div className="flex justify-center mb-8">
            <div className="bg-white rounded-lg shadow-sm p-1 flex">
              <button
                onClick={() => setActiveTab('guest')}
                className={`px-6 py-2 rounded-md font-medium transition-colors ${
                  activeTab === 'guest'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Guest Check-in
              </button>
              <button
                onClick={() => setActiveTab('staff')}
                className={`px-6 py-2 rounded-md font-medium transition-colors ${
                  activeTab === 'staff'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Staff Dashboard
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="bg-white rounded-lg shadow-lg">
            {activeTab === 'guest' ? (
              <div className="p-6">
                <h2 className="text-2xl font-semibold text-gray-900 mb-6">
                  Guest Check-in Form
                </h2>
                <p className="text-gray-600 mb-6">
                  Complete your check-in and upload your ID documents for verification.
                </p>
                <CheckInForm
                  bookingId={mockBookingId}
                  onSubmit={handleCheckInSubmit}
                />
              </div>
            ) : (
              <div className="p-6">
                <h2 className="text-2xl font-semibold text-gray-900 mb-6">
                  Staff Verification Dashboard
                </h2>
                <p className="text-gray-600 mb-6">
                  Review and verify guest ID documents.
                </p>
                <StaffDashboard 
                  staffId="test-staff-123"
                  staffName="Test Staff Member"
                />
              </div>
            )}
          </div>

          {/* Instructions */}
          <div className="mt-8 bg-blue-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-4">
              How to Test ID Verification
            </h3>
            <div className="space-y-3 text-blue-800">
              <div className="flex items-start">
                <span className="font-semibold mr-2">1.</span>
                <span>Switch to "Guest Check-in" tab and fill out the form with sample data.</span>
              </div>
              <div className="flex items-start">
                <span className="font-semibold mr-2">2.</span>
                <span>Upload ID photos using the ID verification section (you can use any image files for testing).</span>
              </div>
              <div className="flex items-start">
                <span className="font-semibold mr-2">3.</span>
                <span>Submit the form to create a check-in with "pending" verification status.</span>
              </div>
              <div className="flex items-start">
                <span className="font-semibold mr-2">4.</span>
                <span>Switch to "Staff Dashboard" tab to see pending verifications and manage them.</span>
              </div>
              <div className="flex items-start">
                <span className="font-semibold mr-2">5.</span>
                <span>Staff can view uploaded ID photos, update verification status, and add notes.</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestIDVerification;