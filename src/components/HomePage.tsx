import React, { useState } from 'react';
import { Calendar, List, Plus, Filter, Search, Users, Bed, CreditCard } from 'lucide-react';
import { Booking, BookingFilters, ViewMode } from '../types/booking';
import { BookingCalendar } from './BookingCalendar';
import { BookingList } from './BookingList';
import { BookingFiltersPanel } from './BookingFiltersPanel';
import { NewBookingModal } from './NewBookingModal';

// Mock data for demonstration
const mockBookings: Booking[] = [
  {
    id: '1',
    guestName: 'John Doe',
    roomNo: '101',
    checkIn: '2024-01-15',
    checkOut: '2024-01-18',
    noOfPax: 2,
    adultChild: '2/0',
    status: 'confirmed',
    totalAmount: 4800,
    paymentStatus: 'paid',
    contactPhone: '+1234567890',
    contactEmail: 'john.doe@email.com',
    createdAt: '2024-01-10T10:00:00Z',
    updatedAt: '2024-01-10T10:00:00Z'
  },
  {
    id: '2',
    guestName: 'Jane Smith',
    roomNo: '205',
    checkIn: '2024-01-16',
    checkOut: '2024-01-20',
    noOfPax: 3,
    adultChild: '2/1',
    status: 'pending',
    totalAmount: 6400,
    paymentStatus: 'partial',
    contactPhone: '+1987654321',
    contactEmail: 'jane.smith@email.com',
    createdAt: '2024-01-12T14:30:00Z',
    updatedAt: '2024-01-12T14:30:00Z'
  },
  {
    id: '3',
    guestName: 'Mike Johnson',
    roomNo: '109',
    checkIn: '2024-01-14',
    checkOut: '2024-01-17',
    noOfPax: 1,
    adultChild: '1/0',
    status: 'checked-in',
    totalAmount: 4800,
    paymentStatus: 'paid',
    contactPhone: '+1122334455',
    contactEmail: 'mike.johnson@email.com',
    createdAt: '2024-01-08T09:15:00Z',
    updatedAt: '2024-01-14T15:00:00Z'
  }
];

interface HomePageProps {
  onCreateInvoice: (booking: Booking) => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onCreateInvoice }) => {
  const [viewMode, setViewMode] = useState<ViewMode>('calendar');
  const [bookings, setBookings] = useState<Booking[]>(mockBookings);
  const [filteredBookings, setFilteredBookings] = useState<Booking[]>(mockBookings);
  const [filters, setFilters] = useState<BookingFilters>({});
  const [showFilters, setShowFilters] = useState(false);
  const [showNewBookingModal, setShowNewBookingModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Apply filters and search
  React.useEffect(() => {
    let filtered = bookings;

    // Apply search
    if (searchTerm) {
      filtered = filtered.filter(booking =>
        booking.guestName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        booking.roomNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        booking.contactEmail?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply filters
    if (filters.dateRange) {
      filtered = filtered.filter(booking =>
        booking.checkIn >= filters.dateRange!.start &&
        booking.checkOut <= filters.dateRange!.end
      );
    }

    if (filters.guestName) {
      filtered = filtered.filter(booking =>
        booking.guestName.toLowerCase().includes(filters.guestName!.toLowerCase())
      );
    }

    if (filters.roomNo) {
      filtered = filtered.filter(booking =>
        booking.roomNo.toLowerCase().includes(filters.roomNo!.toLowerCase())
      );
    }

    if (filters.status && filters.status.length > 0) {
      filtered = filtered.filter(booking =>
        filters.status!.includes(booking.status)
      );
    }

    if (filters.paymentStatus && filters.paymentStatus.length > 0) {
      filtered = filtered.filter(booking =>
        filters.paymentStatus!.includes(booking.paymentStatus)
      );
    }

    setFilteredBookings(filtered);
  }, [bookings, filters, searchTerm]);

  const handleNewBooking = (bookingData: Omit<Booking, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newBooking: Booking = {
      ...bookingData,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    setBookings([...bookings, newBooking]);
    setShowNewBookingModal(false);
  };

  const handleUpdateBooking = (updatedBooking: Booking) => {
    setBookings(bookings.map(booking =>
      booking.id === updatedBooking.id
        ? { ...updatedBooking, updatedAt: new Date().toISOString() }
        : booking
    ));
  };

  const getStats = () => {
    const totalBookings = bookings.length;
    const checkedIn = bookings.filter(b => b.status === 'checked-in').length;
    const pending = bookings.filter(b => b.status === 'pending').length;
    const totalRevenue = bookings.reduce((sum, b) => sum + b.totalAmount, 0);
    
    return { totalBookings, checkedIn, pending, totalRevenue };
  };

  const stats = getStats();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-bold text-gray-900">Hotel Management Dashboard</h1>
            <button
              onClick={() => setShowNewBookingModal(true)}
              className="flex items-center px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Booking
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center">
              <Bed className="w-8 h-8 text-blue-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Bookings</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalBookings}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center">
              <Users className="w-8 h-8 text-green-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Checked In</p>
                <p className="text-2xl font-bold text-gray-900">{stats.checkedIn}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center">
              <Calendar className="w-8 h-8 text-yellow-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-gray-900">{stats.pending}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center">
              <CreditCard className="w-8 h-8 text-purple-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Revenue</p>
                <p className="text-2xl font-bold text-gray-900">₹{stats.totalRevenue.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="bg-white p-4 rounded-lg shadow-sm mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by guest name, room, or email..."
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center px-3 py-2 rounded-md transition-colors ${
                  showFilters
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Filter className="w-4 h-4 mr-2" />
                Filters
              </button>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setViewMode('calendar')}
                className={`flex items-center px-3 py-2 rounded-md transition-colors ${
                  viewMode === 'calendar'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Calendar className="w-4 h-4 mr-2" />
                Calendar
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`flex items-center px-3 py-2 rounded-md transition-colors ${
                  viewMode === 'list'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <List className="w-4 h-4 mr-2" />
                List
              </button>
            </div>
          </div>

          {/* Filters Panel */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <BookingFiltersPanel
                filters={filters}
                onChange={setFilters}
                onClear={() => setFilters({})}
              />
            </div>
          )}
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-lg shadow-sm">
          {viewMode === 'calendar' ? (
            <BookingCalendar
              bookings={filteredBookings}
              onUpdateBooking={handleUpdateBooking}
              onCreateInvoice={onCreateInvoice}
            />
          ) : (
            <BookingList
              bookings={filteredBookings}
              onUpdateBooking={handleUpdateBooking}
              onCreateInvoice={onCreateInvoice}
            />
          )}
        </div>
      </div>

      {/* New Booking Modal */}
      {showNewBookingModal && (
        <NewBookingModal
          onClose={() => setShowNewBookingModal(false)}
          onSave={handleNewBooking}
        />
      )}
    </div>
  );
}; 