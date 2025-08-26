import React, { useState, useEffect } from 'react';
import { Search, Plus, Eye, Edit, Trash2, Filter, Download, Users, Calendar, Mail, Phone, GitMerge } from 'lucide-react';
import { GuestProfileService } from '../services/guestProfileService';
import { GuestProfileForm } from './GuestProfileForm';
import { GuestProfileView } from './GuestProfileView';
import { GuestDuplicateManager } from './GuestDuplicateManager';
import type { 
  GuestProfile, 
  GuestProfileFilters, 
  CreateGuestProfileData, 
  UpdateGuestProfileData,
  GuestProfileListProps 
} from '../types/guest';

export const GuestProfileList: React.FC<GuestProfileListProps> = ({
  onSelectGuest,
  selectedGuestId,
  showActions = true
}) => {
  const [guests, setGuests] = useState<GuestProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingGuest, setEditingGuest] = useState<GuestProfile | null>(null);
  const [viewingGuest, setViewingGuest] = useState<GuestProfile | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDuplicateManager, setShowDuplicateManager] = useState(false);
  const [duplicateCount, setDuplicateCount] = useState<number | null>(null);
  const [loadingDupCount, setLoadingDupCount] = useState<boolean>(false);
  
  const [filters, setFilters] = useState<GuestProfileFilters>({
    search: '',
    hasEmail: undefined,
    hasPhone: undefined,
    emailMarketingConsent: undefined,
    smsMarketingConsent: undefined,
    sortBy: 'created_at',
    sortOrder: 'desc',
    limit: 50,
    offset: 0
  });

  useEffect(() => {
    loadGuests();
  }, [filters]);

  useEffect(() => {
    // Load duplicate cluster count once on mount
    void loadDuplicateCount();
  }, []);

  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      setFilters(prev => ({ ...prev, search: searchTerm, offset: 0 }));
    }, 300);

    return () => clearTimeout(delayedSearch);
  }, [searchTerm]);

  const loadGuests = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await GuestProfileService.searchGuestProfiles(filters);
      setGuests(data);
    } catch (err) {
      console.error('Error loading guests:', err);
      setError(err instanceof Error ? err.message : 'Failed to load guest profiles');
    } finally {
      setLoading(false);
    }
  };

  const loadDuplicateCount = async () => {
    try {
      setLoadingDupCount(true);
      const clusters = await GuestProfileService.findDuplicateClusters();
      setDuplicateCount(clusters.length);
    } catch (e) {
      console.warn('Failed to load duplicate clusters count', e);
      setDuplicateCount(null);
    } finally {
      setLoadingDupCount(false);
    }
  };

  const handleCreateGuest = async (data: CreateGuestProfileData) => {
    try {
      setIsSubmitting(true);
      const newGuest = await GuestProfileService.createGuestProfile(data);
      setGuests(prev => [newGuest, ...prev]);
      setShowCreateForm(false);
    } catch (err) {
      console.error('Error creating guest:', err);
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateGuest = async (data: UpdateGuestProfileData) => {
    try {
      setIsSubmitting(true);
      const updatedGuest = await GuestProfileService.updateGuestProfile(data);
      setGuests(prev => prev.map(g => g.id === updatedGuest.id ? updatedGuest : g));
      setEditingGuest(null);
    } catch (err) {
      console.error('Error updating guest:', err);
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteGuest = async (guestId: string) => {
    if (!confirm('Are you sure you want to delete this guest profile? This action cannot be undone.')) {
      return;
    }

    try {
      await GuestProfileService.deleteGuestProfile(guestId);
      setGuests(prev => prev.filter(g => g.id !== guestId));
    } catch (err) {
      console.error('Error deleting guest:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete guest profile');
    }
  };

  const handleExportData = async () => {
    try {
      // This would typically generate a CSV or Excel file
      const csvData = guests.map(guest => ({
        Name: guest.name,
        Email: guest.email || '',
        Phone: guest.phone || '',
        City: guest.city || '',
        State: guest.state || '',
        Country: guest.country || '',
        'Total Bookings': (guest.total_stays ?? guest.total_bookings ?? 0).toString(),
        'Last Visit': (guest.last_stay_date || guest.last_visit_date)
          ? new Date((guest.last_stay_date || guest.last_visit_date) as string).toLocaleDateString()
          : '',
        'Created Date': new Date(guest.created_at).toLocaleDateString()
      }));

      const csvContent = [
        Object.keys(csvData[0]).join(','),
        ...csvData.map(row => Object.values(row).map(val => `"${val}"`).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `guest-profiles-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error exporting data:', err);
      setError('Failed to export guest data');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading && guests.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading guest profiles...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Users className="h-6 w-6 text-blue-600" />
          <h2 className="text-2xl font-bold text-gray-900">Guest Profiles</h2>
          <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm font-medium">
            {guests.length} guests
          </span>
        </div>
        
        {showActions && (
          <div className="flex items-center space-x-3">
            <button
              onClick={() => {
                setShowDuplicateManager(true);
                // Also refresh count when opening
                void loadDuplicateCount();
              }}
              className="relative flex items-center space-x-2 px-4 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700 transition-colors"
              title="Find and merge duplicate profiles"
            >
              <GitMerge className="h-4 w-4" />
              <span>Find Duplicates</span>
              {duplicateCount !== null && (
                <span className="ml-2 inline-flex items-center justify-center px-2 py-0.5 text-xs font-medium rounded-full bg-white text-amber-700">
                  {loadingDupCount ? '…' : duplicateCount}
                </span>
              )}
            </button>

            <button
              onClick={handleExportData}
              className="flex items-center space-x-2 px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              disabled={guests.length === 0}
            >
              <Download className="h-4 w-4" />
              <span>Export</span>
            </button>
            
            <button
              onClick={() => setShowCreateForm(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Add Guest</span>
            </button>
          </div>
        )}
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <div className="flex items-center space-x-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search guests by name, email, or phone..."
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-colors ${
              showFilters ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Filter className="h-4 w-4" />
            <span>Filters</span>
          </button>
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Has Email
                </label>
                <select
                  value={filters.hasEmail === undefined ? '' : filters.hasEmail.toString()}
                  onChange={(e) => setFilters(prev => ({
                    ...prev,
                    hasEmail: e.target.value === '' ? undefined : e.target.value === 'true',
                    offset: 0
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All</option>
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Has Phone
                </label>
                <select
                  value={filters.hasPhone === undefined ? '' : filters.hasPhone.toString()}
                  onChange={(e) => setFilters(prev => ({
                    ...prev,
                    hasPhone: e.target.value === '' ? undefined : e.target.value === 'true',
                    offset: 0
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All</option>
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sort By
                </label>
                <select
                  value={filters.sortBy}
                  onChange={(e) => setFilters(prev => ({
                    ...prev,
                    sortBy: e.target.value as any,
                    offset: 0
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="created_at">Created Date</option>
                  <option value="name">Name</option>
                  <option value="last_visit_date">Last Visit</option>
                  <option value="total_bookings">Total Bookings</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Order
                </label>
                <select
                  value={filters.sortOrder}
                  onChange={(e) => setFilters(prev => ({
                    ...prev,
                    sortOrder: e.target.value as 'asc' | 'desc',
                    offset: 0
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="desc">Newest First</option>
                  <option value="asc">Oldest First</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Guest List */}
      {guests.length === 0 ? (
        <div className="text-center py-12">
          <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No guest profiles found</h3>
          <p className="text-gray-500 mb-4">
            {searchTerm ? 'Try adjusting your search criteria' : 'Get started by creating your first guest profile'}
          </p>
          {showActions && !searchTerm && (
            <button
              onClick={() => setShowCreateForm(true)}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Add First Guest</span>
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Guest
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Location
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Bookings
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Visit
                  </th>
                  {showActions && (
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {guests.map((guest) => (
                  <tr
                    key={guest.id}
                    className={`hover:bg-gray-50 cursor-pointer ${
                      selectedGuestId === guest.id ? 'bg-blue-50' : ''
                    }`}
                    onClick={() => onSelectGuest?.(guest)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <span className="text-sm font-medium text-blue-600">
                              {guest.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{guest.name}</div>
                          <div className="text-sm text-gray-500">ID: {guest.id.slice(0, 8)}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="space-y-1">
                        {guest.email && (
                          <div className="flex items-center text-sm text-gray-900">
                            <Mail className="h-4 w-4 text-gray-400 mr-2" />
                            {guest.email}
                          </div>
                        )}
                        {guest.phone && (
                          <div className="flex items-center text-sm text-gray-900">
                            <Phone className="h-4 w-4 text-gray-400 mr-2" />
                            {guest.phone}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {[guest.city, guest.state, guest.country].filter(Boolean).join(', ') || 'Not specified'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="text-sm text-gray-900">{guest.total_stays ?? guest.total_bookings ?? 0}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {(guest.last_stay_date || guest.last_visit_date)
                        ? formatDate((guest.last_stay_date || guest.last_visit_date) as string)
                        : 'Never'}
                    </td>
                    {showActions && (
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setViewingGuest(guest);
                            }}
                            className="text-blue-600 hover:text-blue-900 p-1"
                            title="View Profile"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingGuest(guest);
                            }}
                            className="text-gray-600 hover:text-gray-900 p-1"
                            title="Edit Profile"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          {/* Duplicate management moved to top-level button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteGuest(guest.id);
                            }}
                            className="text-red-600 hover:text-red-900 p-1"
                            title="Delete Profile"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modals */}
      {showCreateForm && (
        <GuestProfileForm
          onSubmit={handleCreateGuest}
          onCancel={() => setShowCreateForm(false)}
          isSubmitting={isSubmitting}
        />
      )}

      {editingGuest && (
        <GuestProfileForm
          guest={editingGuest}
          onSubmit={handleUpdateGuest}
          onCancel={() => setEditingGuest(null)}
          isSubmitting={isSubmitting}
        />
      )}

      {viewingGuest && (
        <GuestProfileView
          guestId={viewingGuest.id}
          onClose={() => setViewingGuest(null)}
          onEdit={() => {
            setEditingGuest(viewingGuest);
            setViewingGuest(null);
          }}
        />
      )}

      {showDuplicateManager && (
        <GuestDuplicateManager
          onClose={() => setShowDuplicateManager(false)}
          onMerged={() => {
            setShowDuplicateManager(false);
            loadGuests();
            void loadDuplicateCount();
          }}
        />
      )}
    </div>
  );
};