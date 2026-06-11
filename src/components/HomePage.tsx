import React, { useState, useMemo } from 'react';
import { Search, Filter, Plus, Calendar, List, Grid, X, AlertTriangle, Edit3 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';

import { BookingList } from './BookingList';
import { CalendarViewManager } from './CalendarViewManager';
import { Booking, BookingFilters, ViewMode } from '../types/booking';
import { NewBookingModal } from './NewBookingModal';
import { BulkEditModal } from './BulkEditModal';
import { getSchedulingConflicts } from '../lib/supabase';
import EnhancedKPIDashboard from './EnhancedKPIDashboard';
import { BulkEditResult } from '../types/bulkEdit';
import { useProperty } from '../contexts/PropertyContext';
import { bookingsQueryKey } from '../hooks/useBookings';

interface HomePageProps {
  bookings: Booking[];
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;

  onSelectBooking: (booking: Booking) => void;
  onEditBooking: (booking: Booking) => void;
  onDeleteBooking: (bookingId: string) => void;
  onCreateInvoice: (booking: Booking) => void;
  onCancelBooking: (bookingId: string) => void;
  onCreateCancellationInvoice: (booking: Booking) => void;
  onOpenActions?: () => void;
  /** Notify the parent of a newly created booking so it can show it without a refresh. */
  onBookingCreated?: (booking: Booking) => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  bookings,
  viewMode,
  onViewModeChange,
  onSelectBooking,
  onEditBooking,
  onDeleteBooking,
  onCreateInvoice,
  onCancelBooking,
  onCreateCancellationInvoice,
  onOpenActions,
  onBookingCreated,
}) => {
  const queryClient = useQueryClient();
  const { currentProperty } = useProperty();
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<BookingFilters>({
    showCancelled: true,
  });
  const [showFilters, setShowFilters] = useState(false);
  const [showNewBookingModal, setShowNewBookingModal] = useState(false);
  const [showConflicts, setShowConflicts] = useState(false);
  const [conflicts, setConflicts] = useState<any[]>([]);
  const [showBulkEditModal, setShowBulkEditModal] = useState(false);

  const formatDateForDisplay = (dateString: string) => {
    if (!dateString) return 'Not specified';
    
    // If the date is in YYYY-MM-DD format, format it as DD/MM/YYYY
    if (dateString.includes('-') && dateString.length === 10) {
      const [year, month, day] = dateString.split('-');
      return `${day}/${month}/${year}`;
    }
    
    // If it's already in DD/MM/YYYY format, return as is
    if (dateString.includes('/')) {
      return dateString;
    }
    
    // Fallback: try to parse and format
    try {
      const date = new Date(dateString);
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    } catch {
      return dateString; // Return original if parsing fails
    }
  };

  // Filter bookings based on search and filters
  const filteredBookings = useMemo(() => {
    return bookings.filter(booking => {
      // Search filter
    if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch = 
          booking.guestName.toLowerCase().includes(searchLower) ||
          booking.roomNo.toLowerCase().includes(searchLower) ||
          booking.contactEmail?.toLowerCase().includes(searchLower) ||
          booking.contactPhone?.includes(searchTerm);
        
        if (!matchesSearch) return false;
      }

      // Status filter
    if (filters.status && filters.status.length > 0) {
        if (!filters.status.includes(booking.status)) return false;
    }

      // Payment status filter
    if (filters.paymentStatus && filters.paymentStatus.length > 0) {
        if (!booking.paymentStatus || !filters.paymentStatus.includes(booking.paymentStatus)) return false;
      }

      // Date range filter (compare YYYY-MM-DD strings to avoid timezone issues)
      if (filters.dateRange) {
        const checkInStr = booking.checkIn;
        const checkOutStr = booking.checkOut;
        const filterStartStr = filters.dateRange.start;
        const filterEndStr = filters.dateRange.end;

        if (filterStartStr && checkOutStr < filterStartStr) return false;
        if (filterEndStr && checkInStr > filterEndStr) return false;
      }

      // Cancelled bookings filter
      if (!filters.showCancelled && booking.cancelled) return false;

      return true;
    });
  }, [bookings, searchTerm, filters]);



  const handleFilterChange = (newFilters: Partial<BookingFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const clearFilters = () => {
    setFilters({ showCancelled: true });
    setSearchTerm('');
  };

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.status && filters.status.length > 0) count++;
    if (filters.paymentStatus && filters.paymentStatus.length > 0) count++;
    if (filters.dateRange) count++;
    if (!filters.showCancelled) count++;
    return count;
  }, [filters]);

  const checkConflicts = async () => {
    try {
      const result = await getSchedulingConflicts();
      setConflicts(result.conflicts);
      setShowConflicts(true);
    } catch (error) {
      console.error('Error checking conflicts:', error);
      toast.error('Could not check for scheduling conflicts. Please try again.');
    }
  };

  const handleBulkEditSuccess = (result: BulkEditResult) => {
    const errorCount = result?.errors?.length ?? 0;
    if (result?.success && errorCount === 0) {
      toast.success(`Updated ${result.updatedRooms} room(s) across ${result.updatedDates} date(s).`);
    } else {
      toast.error(`Bulk edit completed with ${errorCount} error(s).`);
    }
    // Refresh the cached bookings so the list/grid reflect the bulk changes.
    queryClient.invalidateQueries({ queryKey: bookingsQueryKey(currentProperty?.id) });
    try { window.dispatchEvent(new CustomEvent('voyageur:bookings-changed')); } catch { /* no-op */ }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Enhanced KPI Dashboard */}
      <EnhancedKPIDashboard bookings={bookings} onOpenActions={onOpenActions} />

        {/* Controls */}
      <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Left side - Search and Filters */}
          <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3 flex-1">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                placeholder="Search bookings..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>

            {/* Filter Toggle */}
              <button
                onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center px-3 py-2 border rounded-md transition-colors text-sm ${
                showFilters || activeFilterCount > 0
                  ? 'bg-blue-50 border-blue-300 text-blue-700'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Filter className="w-4 h-4 mr-2" />
                Filters
              {activeFilterCount > 0 && (
                <span className="ml-2 bg-blue-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>

            {/* Conflict Check */}
            <button
              onClick={checkConflicts}
              className="flex items-center px-3 py-2 border border-orange-300 text-orange-700 rounded-md hover:bg-orange-50 transition-colors text-sm"
            >
              <AlertTriangle className="w-4 h-4 mr-2" />
              Check Conflicts
            </button>

            {/* Bulk Edit */}
            <button
              onClick={() => setShowBulkEditModal(true)}
              className="flex items-center px-3 py-2 border border-purple-300 text-purple-700 rounded-md hover:bg-purple-50 transition-colors text-sm"
            >
              <Edit3 className="w-4 h-4 mr-2" />
              Bulk Edit
            </button>
            </div>

          {/* Right side - View Toggle and New Booking */}
          <div className="flex items-center gap-3">
            {/* View Mode Toggle */}
            <div className="flex bg-gray-100 rounded-md p-1">
              <button
                onClick={() => onViewModeChange('calendar')}
                className={`flex items-center px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                  viewMode === 'calendar'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Calendar className="w-4 h-4 mr-1.5" />
                Calendar
              </button>
              <button
                onClick={() => onViewModeChange('grid')}
                className={`flex items-center px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Grid className="w-4 h-4 mr-1.5" />
                Grid
              </button>
              <button
                onClick={() => onViewModeChange('list')}
                className={`flex items-center px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                  viewMode === 'list'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <List className="w-4 h-4 mr-1.5" />
                List
              </button>
            </div>
            
            <button
              onClick={() => setShowNewBookingModal(true)}
              className="flex items-center px-3 sm:px-4 py-2 sm:py-2.5 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors text-sm sm:text-base"
            >
              <Plus className="w-4 h-4 mr-1.5 sm:mr-2" />
              <span className="hidden sm:inline">New Booking</span>
              <span className="sm:hidden">New</span>
              </button>
            </div>
          </div>

        {/* Expanded Filters */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Date Range Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date Range</label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="date"
                    value={filters.dateRange?.start || ''}
                    onChange={(e) => handleFilterChange({
                      dateRange: {
                        start: e.target.value,
                        end: filters.dateRange?.end || e.target.value
                      }
                    })}
                    className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                  />
                  <input
                    type="date"
                    value={filters.dateRange?.end || ''}
                    onChange={(e) => handleFilterChange({
                      dateRange: {
                        start: filters.dateRange?.start || e.target.value,
                        end: e.target.value
                      }
                    })}
                    className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                  />
                </div>
              </div>

              {/* Status Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <div className="flex flex-wrap gap-2">
                  {([
                    { value: 'confirmed', label: 'Confirmed' },
                    { value: 'pending', label: 'Pending' },
                    { value: 'checked-in', label: 'Checked In' },
                    { value: 'checked-out', label: 'Checked Out' },
                  ] as const).map(({ value, label }) => {
                    const selected = (filters.status || []).includes(value);
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => handleFilterChange({
                          status: (selected
                            ? (filters.status || []).filter(v => v !== value)
                            : [...(filters.status || []), value]) as ('confirmed' | 'pending' | 'checked-in' | 'checked-out')[]
                        })}
                        className={`px-3 py-2 min-h-[40px] rounded-md border text-sm transition-colors ${
                          selected ? 'bg-blue-50 border-blue-300 text-blue-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Payment Status Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Status</label>
                <div className="flex flex-wrap gap-2">
                  {([
                    { value: 'paid', label: 'Paid' },
                    { value: 'partial', label: 'Partial' },
                    { value: 'unpaid', label: 'Unpaid' },
                  ] as const).map(({ value, label }) => {
                    const selected = (filters.paymentStatus || []).includes(value);
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => handleFilterChange({
                          paymentStatus: (selected
                            ? (filters.paymentStatus || []).filter(v => v !== value)
                            : [...(filters.paymentStatus || []), value]) as ('paid' | 'partial' | 'unpaid')[]
                        })}
                        className={`px-3 py-2 min-h-[40px] rounded-md border text-sm transition-colors ${
                          selected ? 'bg-blue-50 border-blue-300 text-blue-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Show Cancelled */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Options</label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={filters.showCancelled || false}
                    onChange={(e) => handleFilterChange({ showCancelled: e.target.checked })}
                    className="mr-2"
                  />
                  <span className="text-sm">Show cancelled bookings</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end mt-4">
              <button
                onClick={clearFilters}
                className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                Clear all filters
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Conflicts Display */}
      {showConflicts && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-medium text-red-800 flex items-center">
              <AlertTriangle className="w-5 h-5 mr-2" />
              Room Conflicts Detected
            </h3>
            <button
              onClick={() => setShowConflicts(false)}
              className="text-red-600 hover:text-red-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          {conflicts.length === 0 ? (
            <p className="text-red-700">No conflicts found! All room bookings are properly scheduled.</p>
          ) : (
            <div className="space-y-3">
              {conflicts.map((conflict, index) => (
                <div key={index} className="bg-white p-3 rounded border border-red-200">
                  <h4 className="font-medium text-red-800">Room {conflict.room} - {formatDateForDisplay(conflict.date)}</h4>
                  <div className="mt-2 space-y-1">
                    {conflict.bookings.map((booking: any, bookingIndex: number) => (
                      <div key={bookingIndex} className="text-sm text-red-700">
                        • {booking.guestName}: {formatDateForDisplay(booking.checkIn)} - {formatDateForDisplay(booking.checkOut)}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

        {/* Main Content */}
      <div className="bg-white rounded-lg shadow-sm border">
          {viewMode === 'list' ? (
            <BookingList
              bookings={filteredBookings}
            onSelectBooking={onSelectBooking}
            onEditBooking={onEditBooking}
            onDeleteBooking={onDeleteBooking}
              onCreateInvoice={onCreateInvoice}
            onCancelBooking={onCancelBooking}
            onCreateCancellationInvoice={onCreateCancellationInvoice}
            />
          ) : (
            <CalendarViewManager
              bookings={filteredBookings}
              onSelectBooking={onSelectBooking}
              viewMode={viewMode}
            />
          )}
      </div>

      {/* New Booking Modal */}
      {showNewBookingModal && (
        <NewBookingModal
          isOpen={showNewBookingModal}
          onClose={() => setShowNewBookingModal(false)}
          onBookingCreated={(booking) => {
            // Bubble the new booking up so the parent appends it to the list
            // immediately (no refresh needed), then close the modal.
            onBookingCreated?.(booking);
            setShowNewBookingModal(false);
          }}
        />
      )}

      {/* Booking Details Modal is controlled by parent (BookingManagement) */}

      {/* Bulk Edit Modal */}
      {showBulkEditModal && (
        <BulkEditModal
          isOpen={showBulkEditModal}
          onClose={() => setShowBulkEditModal(false)}
          onSuccess={handleBulkEditSuccess}
        />
      )}
    </div>
  );
};