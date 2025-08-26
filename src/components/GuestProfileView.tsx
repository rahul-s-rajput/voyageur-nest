import React, { useState, useEffect } from 'react';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  DollarSign, 
  Users, 
  Edit, 
  X, 
  Shield,
  History,
  TrendingUp,
  Clock
} from 'lucide-react';
import { GuestProfileService } from '../services/guestProfileService';
import type { GuestProfile, GuestBookingHistory, GuestEmailMessage, GuestProfileViewProps } from '../types/guest';

export const GuestProfileView: React.FC<GuestProfileViewProps> = ({ 
  guestId, 
  onClose, 
  onEdit 
}) => {
  const [guest, setGuest] = useState<GuestProfile | null>(null);
  const [bookingHistory, setBookingHistory] = useState<GuestBookingHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'profile' | 'history' | 'communications' | 'privacy'>('profile');
  const [emails, setEmails] = useState<GuestEmailMessage[]>([]);

  useEffect(() => {
    loadGuestData();
  }, [guestId]);

  const loadGuestData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [guestData, historyData] = await Promise.all([
        GuestProfileService.getGuestProfile(guestId),
        GuestProfileService.getGuestBookingHistory(guestId)
      ]);

      if (!guestData) {
        setError('Guest profile not found');
        return;
      }

      setGuest(guestData);
      setBookingHistory(historyData);
      // Load recent communications if email is available
      if (guestData?.email) {
        try {
          const comms = await GuestProfileService.getCommunicationHistoryByEmail(guestData.email, 5);
          setEmails(comms);
        } catch (e) {
          console.warn('Failed to load communications', e);
        }
      } else {
        setEmails([]);
      }
    } catch (err) {
      console.error('Error loading guest data:', err);
      setError('Failed to load guest data');
    } finally {
      setLoading(false);
    }
  };

  const extractTags = (text?: string): string[] => {
    if (!text) return [];
    const matches = text.match(/#([A-Za-z0-9_]+)/g) || [];
    const tags = matches.map(t => t.replace('#', ''));
    return Array.from(new Set(tags));
  };

  const handlePrivacyUpdate = async (field: string, value: boolean) => {
    if (!guest) return;

    try {
      await GuestProfileService.updatePrivacySettings(guest.id, {
        [field]: value,
        consent_date: new Date().toISOString(),
      } as any);

      // Update local state
      setGuest(prev => prev ? {
        ...prev,
        [field]: value
      } : null);
    } catch (err) {
      console.error('Error updating privacy settings:', err);
      alert('Failed to update privacy settings');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading guest profile...</p>
        </div>
      </div>
    );
  }

  if (error || !guest) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 max-w-md">
          <div className="text-center">
            <X className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Error</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-blue-600 text-white p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="bg-blue-500 rounded-full p-3">
                <User className="h-8 w-8" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">{guest.name}</h2>
                <p className="text-blue-100">Guest Profile</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {onEdit && (
                <button
                  onClick={() => onEdit(guest)}
                  className="p-2 bg-blue-500 rounded-md hover:bg-blue-400 transition-colors"
                  title="Edit Profile"
                >
                  <Edit className="h-5 w-5" />
                </button>
              )}
              <button
                onClick={onClose}
                className="p-2 bg-blue-500 rounded-md hover:bg-blue-400 transition-colors"
                title="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'profile', label: 'Profile', icon: User },
              { id: 'history', label: 'Booking History', icon: History },
              { id: 'communications', label: 'Communications', icon: Mail },
              { id: 'privacy', label: 'Privacy Settings', icon: Shield }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-4 px-2 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {activeTab === 'profile' && (
            <div className="space-y-6">
              {/* Statistics Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="flex items-center">
                    <TrendingUp className="h-8 w-8 text-green-600" />
                    <div className="ml-3">
                      <p className="text-sm font-medium text-green-600">Total Stays</p>
                      <p className="text-2xl font-bold text-green-900">{guest.total_stays}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="flex items-center">
                    <DollarSign className="h-8 w-8 text-blue-600" />
                    <div className="ml-3">
                      <p className="text-sm font-medium text-blue-600">Total Spent</p>
                      <p className="text-2xl font-bold text-blue-900">{formatCurrency(guest.total_spent)}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="flex items-center">
                    <Users className="h-8 w-8 text-purple-600" />
                    <div className="ml-3">
                      <p className="text-sm font-medium text-purple-600">Typical Group</p>
                      <p className="text-2xl font-bold text-purple-900">{guest.typical_group_size}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-orange-50 p-4 rounded-lg">
                  <div className="flex items-center">
                    <Clock className="h-8 w-8 text-orange-600" />
                    <div className="ml-3">
                      <p className="text-sm font-medium text-orange-600">Last Stay</p>
                      <p className="text-sm font-bold text-orange-900">
                        {guest.last_stay_date ? formatDate(guest.last_stay_date) : 'Never'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {guest.email && (
                    <div className="flex items-center space-x-3">
                      <Mail className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-500">Email</p>
                        <p className="font-medium">{guest.email}</p>
                      </div>
                    </div>
                  )}
                  {guest.phone && (
                    <div className="flex items-center space-x-3">
                      <Phone className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-500">Phone</p>
                        <p className="font-medium">{guest.phone}</p>
                      </div>
                    </div>
                  )}
                  {guest.address && (
                    <div className="flex items-center space-x-3 md:col-span-2">
                      <MapPin className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-500">Address</p>
                        <p className="font-medium">
                          {guest.address}
                          {guest.city && `, ${guest.city}`}
                          {guest.state && `, ${guest.state}`}
                          {guest.country && `, ${guest.country}`}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Staff Notes */}
              {guest.notes && (
                <div className="bg-yellow-50 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Staff Notes</h3>
                  {/* Hashtag chips */}
                  {extractTags(guest.notes).length > 0 && (
                    <div className="mb-2 flex flex-wrap gap-2">
                      {extractTags(guest.notes).map(tag => (
                        <span key={tag} className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                  <p className="text-gray-700 whitespace-pre-line">{guest.notes}</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Booking History</h3>
              {bookingHistory.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No booking history found</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {bookingHistory.map((booking) => (
                    <div key={booking.id} className="bg-white border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-4">
                            <div>
                              <p className="font-semibold text-gray-900">Room {booking.room_no}</p>
                              <p className="text-sm text-gray-500">
                                {formatDate(booking.check_in)} - {formatDate(booking.check_out)}
                              </p>
                            </div>
                            {/* Property badge */}
                            <div className="flex items-center space-x-2">
                              <MapPin className="h-4 w-4 text-gray-400" />
                              <span className="text-sm text-gray-700">
                                {booking.property_name || 'Unknown property'}
                              </span>
                            </div>
                            <div className="text-center">
                              <p className="text-sm text-gray-500">Guests</p>
                              <p className="font-medium">{booking.no_of_pax}</p>
                            </div>
                            {/* Group-size chip */}
                            <div className="text-center">
                              {(() => {
                                const pax = booking.no_of_pax;
                                const label = pax <= 1 ? 'Solo' : pax === 2 ? 'Couple' : pax <= 5 ? 'Family' : 'Group';
                                const classes = label === 'Solo'
                                  ? 'bg-gray-100 text-gray-800'
                                  : label === 'Couple'
                                  ? 'bg-purple-100 text-purple-800'
                                  : label === 'Family'
                                  ? 'bg-orange-100 text-orange-800'
                                  : 'bg-rose-100 text-rose-800';
                                return (
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${classes}`}>{label}</span>
                                );
                              })()}
                            </div>
                            <div className="text-center">
                              <p className="text-sm text-gray-500">Amount</p>
                              <p className="font-medium">{formatCurrency(booking.total_amount)}</p>
                            </div>
                          </div>
                          {booking.additional_guest_names && (
                            <p className="text-sm text-gray-600 mt-2">
                              <span className="font-medium">With:</span> {booking.additional_guest_names}
                            </p>
                          )}
                          {booking.special_requests && (
                            <p className="text-sm text-gray-600 mt-2">
                              <span className="font-medium">Special Requests:</span> {booking.special_requests}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-col items-end space-y-1">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            booking.status === 'checked-out' ? 'bg-green-100 text-green-800' :
                            booking.status === 'checked-in' ? 'bg-blue-100 text-blue-800' :
                            booking.status === 'confirmed' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {booking.status}
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            booking.payment_status === 'paid' ? 'bg-green-100 text-green-800' :
                            booking.payment_status === 'partial' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {booking.payment_status}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'communications' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Recent Communications</h3>
              {!guest.email ? (
                <div className="text-center py-8">
                  <Mail className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No email on file for this guest.</p>
                </div>
              ) : emails.length === 0 ? (
                <div className="text-center py-8">
                  <Mail className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No recent emails found</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {emails.map((m) => (
                    <div key={m.id} className="bg-white border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate">{m.subject || '(no subject)'}</p>
                          <p className="text-sm text-gray-500 truncate">{m.snippet}</p>
                          <p className="text-xs text-gray-500 mt-1 truncate">From: {m.sender} → To: {m.recipient}</p>
                        </div>
                        {m.received_at && (
                          <span className="text-xs text-gray-400 ml-4 whitespace-nowrap">{formatDateTime(m.received_at)}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'privacy' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">Privacy Settings</h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <h4 className="font-medium text-gray-900">Email Marketing</h4>
                    <p className="text-sm text-gray-500">Receive promotional emails and offers</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={guest.email_marketing_consent}
                      onChange={(e) => handlePrivacyUpdate('email_marketing_consent', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <h4 className="font-medium text-gray-900">SMS Marketing</h4>
                    <p className="text-sm text-gray-500">Receive promotional SMS messages</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={guest.sms_marketing_consent}
                      onChange={(e) => handlePrivacyUpdate('sms_marketing_consent', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <h4 className="font-medium text-gray-900">Data Retention</h4>
                    <p className="text-sm text-gray-500">Allow us to store your data for future bookings</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={guest.data_retention_consent}
                      onChange={(e) => handlePrivacyUpdate('data_retention_consent', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">GDPR Compliance</h4>
                <p className="text-sm text-blue-700 mb-3">
                  You have the right to access, update, or delete your personal data at any time.
                </p>
                <div className="space-y-2">
                  <button className="text-sm text-blue-600 hover:text-blue-800 underline block">
                    Request Data Export
                  </button>
                  <button className="text-sm text-red-600 hover:text-red-800 underline block">
                    Request Data Deletion
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};