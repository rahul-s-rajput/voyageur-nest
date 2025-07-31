import React from 'react';
import { Eye, Edit, CreditCard, FileText, Trash2, XCircle, Receipt } from 'lucide-react';
import { Booking } from '../types/booking';
import { format } from 'date-fns';

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
    const statusColors = {
      paid: 'bg-green-100 text-green-800',
      partial: 'bg-yellow-100 text-yellow-800',
      unpaid: 'bg-red-100 text-red-800'
    };

    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusColors[paymentStatus]}`}>
        {paymentStatus.charAt(0).toUpperCase() + paymentStatus.slice(1)}
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'MMM dd, yyyy');
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
                  {getStatusBadge(booking.status, booking.cancelled)}
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
              
              <div className="flex items-center justify-between">
                <div>
                  {getPaymentStatusBadge(booking.paymentStatus)}
                </div>
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
                  {getStatusBadge(booking.status, booking.cancelled)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {getPaymentStatusBadge(booking.paymentStatus)}
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
                            onClick={() => onCancelBooking(booking.id)}
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
                      onClick={() => onDeleteBooking(booking.id)}
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
    </div>
  );
}; 