import React from 'react';
import { X, Printer } from 'lucide-react';
import { Booking } from '../types/booking';
import { format } from 'date-fns';

interface InvoiceTemplateProps {
  booking: Booking;
  invoiceNumber: number;
  onClose: () => void;
}

export const InvoiceTemplate: React.FC<InvoiceTemplateProps> = ({
  booking,
  invoiceNumber,
  onClose
}) => {
  const handlePrint = () => {
    window.print();
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'MMM dd, yyyy');
  };

  const getCurrentISTTime = () => {
    const now = new Date();
    
    // Get IST time using Intl.DateTimeFormat for more reliable formatting
    const istDate = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(now);
    
    const istTime = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    }).format(now);
    
    return `${istDate} ${istTime}`;
  };

  const noOfDays = Math.ceil(
    (new Date(booking.checkOut).getTime() - new Date(booking.checkIn).getTime()) / (1000 * 60 * 60 * 24)
  );

  const isCancellationInvoice = booking.specialRequests?.includes('CANCELLATION INVOICE');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b print:hidden">
          <h2 className="text-xl font-semibold text-gray-900">
            {isCancellationInvoice ? 'Cancellation Invoice' : 'Invoice'}
          </h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              className="flex items-center px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
            >
              <Printer className="w-4 h-4 mr-2" />
              Print
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-8 print:p-0">
          {/* Invoice Header */}
          <div className="mb-8">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Voyageur Nest</h1>
                <p className="text-gray-600">Old Manali, Manali, Himachal Pradesh, 175131, India</p>
                <p className="text-gray-600">Phone: +919876161215</p>
                <p className="text-gray-600">Email: voyageur.nest@gmail.com</p>
              </div>
              <div className="text-right">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  {isCancellationInvoice ? 'CANCELLATION INVOICE' : 'INVOICE'}
                </h2>
                <p className="text-gray-600">Invoice #: 520/{invoiceNumber}</p>
                <p className="text-gray-600">Date: {getCurrentISTTime()}</p>
              </div>
            </div>
          </div>

          {/* Bill To */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Bill To:</h3>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="font-medium text-gray-900">{booking.guestName}</p>
              {booking.contactEmail && <p className="text-gray-600">{booking.contactEmail}</p>}
              {booking.contactPhone && <p className="text-gray-600">{booking.contactPhone}</p>}
            </div>
          </div>

          {/* Booking Details */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Booking Details:</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Room Number</p>
                <p className="font-medium">{booking.roomNo}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Number of Guests</p>
                <p className="font-medium">{booking.noOfPax} ({booking.adultChild})</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Check-in Date</p>
                <p className="font-medium">{formatDate(booking.checkIn)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Check-out Date</p>
                <p className="font-medium">{formatDate(booking.checkOut)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Number of Days</p>
                <p className="font-medium">{noOfDays}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Status</p>
                <p className="font-medium capitalize">
                  {booking.cancelled ? 'Cancelled' : booking.status}
                </p>
              </div>
            </div>
          </div>

          {/* Invoice Items */}
          <div className="mb-8">
            <table className="w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border border-gray-300 px-4 py-2 text-left">Description</th>
                  <th className="border border-gray-300 px-4 py-2 text-right">Days</th>
                  <th className="border border-gray-300 px-4 py-2 text-right">Rate</th>
                  <th className="border border-gray-300 px-4 py-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-gray-300 px-4 py-2">
                    Room {booking.roomNo} - {booking.guestName}
                    {isCancellationInvoice && <span className="text-red-600 font-medium"> (CANCELLED)</span>}
                  </td>
                  <td className="border border-gray-300 px-4 py-2 text-right">{noOfDays}</td>
                  <td className="border border-gray-300 px-4 py-2 text-right">
                    ₹{(booking.totalAmount / noOfDays).toFixed(2)}
                  </td>
                  <td className="border border-gray-300 px-4 py-2 text-right">
                    ₹{booking.totalAmount.toLocaleString()}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="mb-8">
            <div className="flex justify-end">
              <div className="w-64">
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="font-medium">₹{booking.totalAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-600">Tax:</span>
                  <span className="font-medium">₹0.00</span>
                </div>
                <div className="flex justify-between py-2 text-lg font-bold">
                  <span>Total:</span>
                  <span>₹{booking.totalAmount.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Information */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Payment Information:</h3>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Payment Status: 
                <span className={`ml-2 font-medium ${
                  booking.paymentStatus === 'paid' ? 'text-green-600' : 
                  booking.paymentStatus === 'partial' ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {booking.paymentStatus.charAt(0).toUpperCase() + booking.paymentStatus.slice(1)}
                </span>
              </p>
              {booking.paymentStatus === 'paid' && (
                <p className="text-sm text-gray-600">Amount Paid: ₹{booking.totalAmount.toLocaleString()}</p>
              )}
            </div>
          </div>

          {/* Special Requests */}
          {booking.specialRequests && !isCancellationInvoice && (
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Special Requests:</h3>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-gray-700">{booking.specialRequests}</p>
              </div>
            </div>
          )}

          {/* Cancellation Notice */}
          {isCancellationInvoice && (
            <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-lg">
              <h3 className="text-lg font-semibold text-red-900 mb-2">Cancellation Notice</h3>
              <p className="text-red-700">
                This booking has been cancelled. Please contact us for refund information.
              </p>
            </div>
          )}

          {/* Footer */}
          <div className="mt-12 pt-8 border-t border-gray-200">
            <div className="text-center text-sm text-gray-600">
              <p>Thank you for choosing Voyageur Nest!</p>
              <p className="mt-2">For any queries, please contact us at voyageur.nest@gmail.com or +919876161215</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}; 