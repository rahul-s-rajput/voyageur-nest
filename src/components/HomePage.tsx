import React, { useState, useMemo } from 'react';
import { Search, Filter, Plus, Calendar, List, Users, DollarSign, Clock, CheckCircle, X, AlertTriangle } from 'lucide-react';
import { BookingCalendar } from './BookingCalendar';
import { BookingList } from './BookingList';
import { Booking, BookingFilters, ViewMode } from '../types/booking';
import { NewBookingModal } from './NewBookingModal';
import { BookingDetails } from './BookingDetails';
import { bookingService, getSchedulingConflicts } from '../lib/supabase';

interface HomePageProps {
  bookings: Booking[];
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onNewBooking: () => void;
  onSelectBooking: (booking: Booking) => void;
  onEditBooking: (booking: Booking) => void;
  onDeleteBooking: (bookingId: string) => void;
  onCreateInvoice: (booking: Booking) => void;
  onCancelBooking: (bookingId: string) => void;
  onCreateCancellationInvoice: (booking: Booking) => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  bookings,
  viewMode,
  onViewModeChange,
  onNewBooking,
  onSelectBooking,
  onEditBooking,
  onDeleteBooking,
  onCreateInvoice,
  onCancelBooking,
  onCreateCancellationInvoice,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<BookingFilters>({
    showCancelled: true,
  });
  const [showFilters, setShowFilters] = useState(false);
  const [showNewBookingModal, setShowNewBookingModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showConflicts, setShowConflicts] = useState(false);
  const [conflicts, setConflicts] = useState<any[]>([]);

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
        if (!filters.paymentStatus.includes(booking.paymentStatus)) return false;
      }

      // Date range filter
      if (filters.dateRange) {
        const checkIn = new Date(booking.checkIn);
        const checkOut = new Date(booking.checkOut);
        const filterStart = new Date(filters.dateRange.start);
        const filterEnd = new Date(filters.dateRange.end);
        
        if (checkOut < filterStart || checkIn > filterEnd) return false;
      }

      // Cancelled bookings filter
      if (!filters.showCancelled && booking.cancelled) return false;

      return true;
    });
  }, [bookings, searchTerm, filters]);

  // Calculate statistics
  const stats = useMemo(() => {
    const activeBookings = bookings.filter(b => !b.cancelled);
    const totalRevenue = activeBookings.reduce((sum, booking) => sum + booking.totalAmount, 0);
    const paidBookings = activeBookings.filter(b => b.paymentStatus === 'paid');
    const pendingPayments = activeBookings.filter(b => b.paymentStatus === 'unpaid');
    
    return {
      total: bookings.length,
      active: activeBookings.length,
      cancelled: bookings.filter(b => b.cancelled).length,
      revenue: totalRevenue,
      paid: paidBookings.length,
      pending: pendingPayments.length,
    };
  }, [bookings]);

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
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <div className="bg-white p-3 sm:p-4 rounded-lg shadow-sm border">
          <div className="text-xs sm:text-sm font-medium text-gray-500">Total Bookings</div>
          <div className="text-lg sm:text-2xl font-bold text-gray-900">{stats.total}</div>
          </div>
        <div className="bg-white p-3 sm:p-4 rounded-lg shadow-sm border">
          <div className="text-xs sm:text-sm font-medium text-gray-500">Active</div>
          <div className="text-lg sm:text-2xl font-bold text-green-600">{stats.active}</div>
        </div>
        <div className="bg-white p-3 sm:p-4 rounded-lg shadow-sm border">
          <div className="text-xs sm:text-sm font-medium text-gray-500">Cancelled</div>
          <div className="text-lg sm:text-2xl font-bold text-red-600">{stats.cancelled}</div>
      </div>
        <div className="bg-white p-3 sm:p-4 rounded-lg shadow-sm border">
          <div className="text-xs sm:text-sm font-medium text-gray-500">Revenue</div>
          <div className="text-lg sm:text-2xl font-bold text-blue-600">${stats.revenue.toFixed(2)}</div>
          </div>
        <div className="bg-white p-3 sm:p-4 rounded-lg shadow-sm border">
          <div className="text-xs sm:text-sm font-medium text-gray-500">Paid/Pending</div>
          <div className="text-lg sm:text-2xl font-bold text-gray-900">{stats.paid}/{stats.pending}</div>
          </div>
        </div>

        {/* Controls */}
      <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Left side - Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-3 flex-1">
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
                <div className="flex gap-2">
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
                <select
                  multiple
                  value={filters.status || []}
                  onChange={(e) => handleFilterChange({
                    status: Array.from(e.target.selectedOptions, option => option.value) as any
                  })}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                  size={4}
                >
                  <option value="confirmed">Confirmed</option>
                  <option value="pending">Pending</option>
                  <option value="checked-in">Checked In</option>
                  <option value="checked-out">Checked Out</option>
                </select>
              </div>

              {/* Payment Status Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Status</label>
                <select
                  multiple
                  value={filters.paymentStatus || []}
                  onChange={(e) => handleFilterChange({
                    paymentStatus: Array.from(e.target.selectedOptions, option => option.value) as any
                  })}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                  size={3}
                >
                  <option value="paid">Paid</option>
                  <option value="partial">Partial</option>
                  <option value="unpaid">Unpaid</option>
                </select>
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
          {viewMode === 'calendar' ? (
            <BookingCalendar
              bookings={filteredBookings}
            onSelectBooking={onSelectBooking}
            />
          ) : (
            <BookingList
              bookings={filteredBookings}
            onSelectBooking={onSelectBooking}
            onEditBooking={onEditBooking}
            onDeleteBooking={onDeleteBooking}
              onCreateInvoice={onCreateInvoice}
            onCancelBooking={onCancelBooking}
            onCreateCancellationInvoice={onCreateCancellationInvoice}
            />
          )}
      </div>

      {/* New Booking Modal */}
      {showNewBookingModal && (
        <NewBookingModal
          isOpen={showNewBookingModal}
          onClose={() => setShowNewBookingModal(false)}
          onBookingCreated={(booking) => {
            // Close the modal - the parent will handle adding the booking
            setShowNewBookingModal(false);
          }}
        />
      )}

      {/* Booking Details Modal */}
      {selectedBooking && (
        <BookingDetails
          booking={selectedBooking}
          isOpen={!!selectedBooking}
          onClose={() => setSelectedBooking(null)}
          onUpdate={(updatedBooking) => {
            setSelectedBooking(updatedBooking);
          }}
          onCancel={async (bookingId) => {
            try {
              const success = await bookingService.cancelBooking(bookingId);
              if (success && selectedBooking?.id === bookingId) {
                setSelectedBooking(prev => prev ? { ...prev, cancelled: true } : null);
              }
            } catch (error) {
              console.error('Error cancelling booking:', error);
            }
          }}
        />
      )}
    </div>
  );
}; 