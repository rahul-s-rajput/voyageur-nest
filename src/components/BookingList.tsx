import React, { useState, useEffect } from 'react';
import { Eye, Edit, FileText, Trash2, XCircle, Receipt, CheckCircle, Clock } from 'lucide-react';
import { Booking } from '../types/booking';
import { CheckInData } from '../types/checkin';
import { checkInService } from '../lib/supabase';
import { format } from 'date-fns';
import { createLocalDate } from '../utils/dateUtils';

interface BookingListProps {
  bookings: Booking[];
  onSelectBooking: (booking: Booking) => void;
  onEditBooking: (booking: Booking) => void;
  onDeleteBooking: (bookingId: string) => void;
  onCreateInvoice: (booking: Booking) => void;
  onCancelBooking?: (bookingId: string) => void;
  onCreateCancellationInvoice?: (booking: Booking) => void;
}

export const BookingList: React.FC<BookingListProps> = ({
  bookings,
  onSelectBooking,
  onEditBooking,
  onDeleteBooking,
  onCreateInvoice,
  onCancelBooking,
  onCreateCancellationInvoice
}) => {
  const [checkInData, setCheckInData] = useState<Record<string, CheckInData>>({});
  const [loadingCheckIns, setLoadingCheckIns] = useState(true);
  const [confirm, setConfirm] = useState<{ type: 'cancel' | 'delete'; bookingId: string } | null>(null);

  // Fetch check-in data for all bookings
  useEffect(() => {
    const fetchCheckInData = async () => {
      setLoadingCheckIns(true);
      const checkInMap: Record<string, CheckInData> = {};
      
      try {
        await Promise.all(
          bookings.map(async (booking) => {
            const checkIn = await checkInService.getCheckInDataByBookingId(booking.id);
            if (checkIn) {
              checkInMap[booking.id] = checkIn;
            }
          })
        );
        setCheckInData(checkInMap);
      } catch (error) {
        console.error('Error fetching check-in data:', error);
      } finally {
        setLoadingCheckIns(false);
      }
    };

    if (bookings.length > 0) {
      fetchCheckInData();
    } else {
      setLoadingCheckIns(false);
    }
  }, [bookings]);
  const getCheckInStatusBadge = (bookingId: string) => {
    if (loadingCheckIns) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
          <Clock className="w-3 h-3 mr-1" />
          Loading...
        </span>
      );
    }

    const hasCheckIn = checkInData[bookingId];
    if (hasCheckIn) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <CheckCircle className="w-3 h-3 mr-1" />
          Completed
        </span>
      );
    }

    return (
      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
        <Clock className="w-3 h-3 mr-1" />
        Pending
      </span>
    );
  };

  const getStatusBadge = (status: Booking['status'], cancelled: boolean) => {
    if (cancelled) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
          Cancelled
        </span>
      );
    }

    const statusColors = {
      confirmed: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      'checked-in': 'bg-blue-100 text-blue-800',
      'checked-out': 'bg-gray-100 text-gray-800'
    };

    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusColors[status]}`}>
        {status.charAt(0).toUpperCase() + status.slice(1).replace('-', ' ')}
      </span>
    );
  };

  const getPaymentStatusBadge = (paymentStatus: Booking['paymentStatus']) => {
    const statusColors: Record<'paid' | 'partial' | 'unpaid', string> = {
      paid: 'bg-green-100 text-green-800',
      partial: 'bg-yellow-100 text-yellow-800',
      unpaid: 'bg-red-100 text-red-800'
    };
    const status: 'paid' | 'partial' | 'unpaid' = paymentStatus ?? 'unpaid';

    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusColors[status]}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    // Ensure we parse YYYY-MM-DD as a local date to avoid UTC conversion issues
    // This aligns with calendar/grid which normalize dates in local time
    const [y, m, d] = dateString.split('-').map(Number);
    const date = Number.isInteger(y) && Number.isInteger(m) && Number.isInteger(d)
      ? createLocalDate(dateString)
      : new Date(dateString);
    return format(date, 'MMM dd, yyyy');
  };

  if (bookings.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6 sm:p-8 text-center">
          <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 bg-gray-100 rounded-full flex items-center justify-center">
            <FileText className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400" />
          </div>
          <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">No bookings found</h3>
          <p className="text-sm sm:text-base text-gray-500">Create your first booking to get started.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
      {/* Mobile Card View */}
      <div className="block lg:hidden">
        <div className="divide-y divide-gray-200">
          {bookings.map((booking) => (
            <div key={booking.id} className={`p-4 ${booking.cancelled ? 'opacity-75' : ''}`}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className={`text-sm font-medium truncate ${booking.cancelled ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                    {booking.guestName}
                  </h3>
                  <p className="text-sm text-gray-500">Room {booking.roomNo}</p>
                </div>
                <div className="flex items-center space-x-1">
                  {getStatusBadge(booking.status, !!booking.cancelled)}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                <div>
                  <span className="text-gray-500">Check-in:</span>
                  <p className="font-medium">{formatDate(booking.checkIn)}</p>
                </div>
                <div>
                  <span className="text-gray-500">Check-out:</span>
                  <p className="font-medium">{formatDate(booking.checkOut)}</p>
                </div>
                <div>
                  <span className="text-gray-500">Guests:</span>
                  <p className="font-medium">{booking.noOfPax} ({booking.adultChild})</p>
                </div>
                <div>
                  <span className="text-gray-500">Amount:</span>
                  <p className="font-medium">₹{booking.totalAmount.toLocaleString()}</p>
                </div>
              </div>
              
              <div className="flex items-center justify-between mb-3">
                <div className="flex flex-col space-y-2">
                  {getPaymentStatusBadge(booking.paymentStatus)}
                  <div>
                    <span className="text-gray-500 text-xs">Digital Check-in:</span>
                    <div className="mt-1">
                      {getCheckInStatusBadge(booking.id)}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-end">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => onSelectBooking(booking)}
                    className="p-2 text-blue-600 hover:text-blue-900 transition-colors"
                    title="View Details"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  
                  <button
                    onClick={() => onEditBooking(booking)}
                    className={`p-2 transition-colors ${
                      booking.cancelled 
                        ? 'text-orange-600 hover:text-orange-900' 
                        : 'text-green-600 hover:text-green-900'
                    }`}
                    title={booking.cancelled ? "Edit Cancelled Booking" : "Edit Booking"}
                  >
                    <Edit className="w-4 h-4" />
                  </button>

                  {!booking.cancelled && (
                    <>
                      <button
                        onClick={() => onCreateInvoice(booking)}
                        className="p-2 text-purple-600 hover:text-purple-900 transition-colors"
                        title="Create Invoice"
                      >
                        <FileText className="w-4 h-4" />
                      </button>
                      {onCancelBooking && (
                        <button
                          onClick={() => onCancelBooking(booking.id)}
                          className="p-2 text-orange-600 hover:text-orange-900 transition-colors"
                          title="Cancel Booking"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      )}
                    </>
                  )}
                  
                  {booking.cancelled && onCreateCancellationInvoice && (
                    <button
                      onClick={() => onCreateCancellationInvoice(booking)}
                      className="p-2 text-red-600 hover:text-red-900 transition-colors"
                      title="Print Cancellation Invoice"
                    >
                      <Receipt className="w-4 h-4" />
                    </button>
                  )}
                  
                  <button
                    onClick={() => onDeleteBooking(booking.id)}
                    className="p-2 text-red-600 hover:text-red-900 transition-colors"
                    title="Delete Booking"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Guest
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Room
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Check-in / Check-out
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Guests
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Amount
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Payment
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Check-in Status
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {bookings.map((booking) => (
              <tr key={booking.id} className={`hover:bg-gray-50 ${booking.cancelled ? 'opacity-75' : ''}`}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <div className={`text-sm font-medium ${booking.cancelled ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                      {booking.guestName}
                    </div>
                    {booking.contactEmail && (
                      <div className="text-sm text-gray-500">{booking.contactEmail}</div>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {booking.roomNo}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <div className="text-sm text-gray-900">{formatDate(booking.checkIn)}</div>
                    <div className="text-sm text-gray-500">{formatDate(booking.checkOut)}</div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {booking.noOfPax} ({booking.adultChild})
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  ₹{booking.totalAmount.toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {getStatusBadge(booking.status, !!booking.cancelled)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {getPaymentStatusBadge(booking.paymentStatus)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {getCheckInStatusBadge(booking.id)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex items-center justify-end space-x-2">
                    <button
                      onClick={() => onSelectBooking(booking)}
                      className="text-blue-600 hover:text-blue-900 transition-colors"
                      title="View Details"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    
                    <button
                      onClick={() => onEditBooking(booking)}
                      className={`transition-colors ${
                        booking.cancelled 
                          ? 'text-orange-600 hover:text-orange-900' 
                          : 'text-green-600 hover:text-green-900'
                      }`}
                      title={booking.cancelled ? "Edit Cancelled Booking" : "Edit Booking"}
                    >
                      <Edit className="w-4 h-4" />
                    </button>

                    {!booking.cancelled && (
                      <>
                        <button
                          onClick={() => onCreateInvoice(booking)}
                          className="text-purple-600 hover:text-purple-900 transition-colors"
                          title="Create Invoice"
                        >
                          <FileText className="w-4 h-4" />
                        </button>
                        {onCancelBooking && (
                          <button
                            onClick={() => setConfirm({ type: 'cancel', bookingId: booking.id })}
                            className="text-orange-600 hover:text-orange-900 transition-colors"
                            title="Cancel Booking"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        )}
                      </>
                    )}
                    
                    {booking.cancelled && onCreateCancellationInvoice && (
                      <button
                        onClick={() => onCreateCancellationInvoice(booking)}
                        className="text-red-600 hover:text-red-900 transition-colors"
                        title="Print Cancellation Invoice"
                      >
                        <Receipt className="w-4 h-4" />
                      </button>
                    )}
                    
                    <button
                      onClick={() => setConfirm({ type: 'delete', bookingId: booking.id })}
                      className="text-red-600 hover:text-red-900 transition-colors"
                      title="Delete Booking"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Confirm Dialog */}
      {confirm && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white shadow-xl">
            <div className="border-b px-5 py-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {confirm.type === 'cancel' ? 'Cancel Booking' : 'Delete Booking'}
              </h3>
            </div>
            <div className="px-5 py-4 text-sm text-gray-700">
              {confirm.type === 'cancel'
                ? 'Are you sure you want to cancel this booking?'
                : 'Permanently delete this booking? This cannot be undone.'}
            </div>
            <div className="flex items-center justify-end gap-2 border-t px-5 py-3">
              <button
                onClick={() => setConfirm(null)}
                className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (confirm.type === 'cancel' && onCancelBooking) onCancelBooking(confirm.bookingId);
                  if (confirm.type === 'delete') onDeleteBooking(confirm.bookingId);
                  setConfirm(null);
                }}
                className={`px-4 py-2 text-sm text-white rounded-md transition-colors ${confirm.type === 'cancel' ? 'bg-orange-600 hover:bg-orange-700' : 'bg-red-600 hover:bg-red-700'}`}
              >
                {confirm.type === 'cancel' ? 'Confirm Cancel' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};