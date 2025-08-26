import React from 'react';
import { X, Printer } from 'lucide-react';
import { Booking } from '../types/booking';
import { format } from 'date-fns';

// New imports for data fetching
import { useEffect, useMemo, useState } from 'react';
import { bookingChargesService, type BookingCharge } from '../services/bookingChargesService';
import { bookingPaymentsService, type BookingPayment } from '../services/bookingPaymentsService';
import { bookingFinancialsService, type BookingFinancials } from '../services/bookingFinancialsService';

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

  // Currency formatter (INR)
  const inr = useMemo(() => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }), []);
  const fmtINR = (n: number) => inr.format(n ?? 0);

  // Data state
  const [charges, setCharges] = useState<BookingCharge[]>([]);
  const [payments, setPayments] = useState<BookingPayment[]>([]);
  const [financials, setFinancials] = useState<BookingFinancials | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load invoice data
  useEffect(() => {
    const propertyId = booking.propertyId;
    if (!booking.id || !propertyId) return;
    let isCancelled = false;
    setLoading(true);
    setError(null);
    Promise.all([
      bookingChargesService.listByBooking(propertyId, booking.id),
      bookingPaymentsService.listByBooking(propertyId, booking.id),
      bookingFinancialsService.getByBooking(propertyId, booking.id),
    ])
      .then(([c, p, f]) => {
        if (isCancelled) return;
        setCharges(c);
        setPayments(p);
        setFinancials(f);
      })
      .catch((e) => {
        if (isCancelled) return;
        setError(e?.message || 'Failed to load invoice data');
      })
      .finally(() => {
        if (isCancelled) return;
        setLoading(false);
      });
    return () => {
      isCancelled = true;
    };
  }, [booking.id, booking.propertyId]);

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

          {/* Charges Line Items */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold text-gray-900">Charges</h3>
              {loading && <span className="text-sm text-gray-500 print:hidden">Loading…</span>}
            </div>
            {error && (
              <div className="mb-4 text-sm text-red-600 print:hidden">{error}</div>
            )}
            {!booking.propertyId && (
              <div className="mb-4 text-sm text-yellow-700 print:hidden">Property not set on booking. Cannot load detailed invoice.</div>
            )}
            <table className="w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border border-gray-300 px-4 py-2 text-left">Type</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Description</th>
                  <th className="border border-gray-300 px-4 py-2 text-right">Qty</th>
                  <th className="border border-gray-300 px-4 py-2 text-right">Unit</th>
                  <th className="border border-gray-300 px-4 py-2 text-right">Line Total</th>
                </tr>
              </thead>
              <tbody>
                {charges.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="border border-gray-300 px-4 py-6 text-center text-gray-500">No charges</td>
                  </tr>
                ) : (
                  charges.map((ch) => {
                    const isDiscount = ch.chargeType === 'discount';
                    const typeLabel = ch.chargeType.toUpperCase();
                    const amountDisplay = isDiscount ? `- ${fmtINR(Math.abs(ch.amount))}` : fmtINR(ch.amount);
                    return (
                      <tr key={ch.id} className={isDiscount ? 'bg-red-50' : ''}>
                        <td className="border border-gray-300 px-4 py-2 text-left font-medium">{typeLabel}</td>
                        <td className={`border border-gray-300 px-4 py-2 ${isDiscount ? 'text-red-700' : ''}`}>
                          {ch.description || ch.chargeType}
                        </td>
                        <td className="border border-gray-300 px-4 py-2 text-right">{ch.quantity}</td>
                        <td className="border border-gray-300 px-4 py-2 text-right">{fmtINR(ch.unitAmount)}</td>
                        <td className={`border border-gray-300 px-4 py-2 text-right font-medium ${isDiscount ? 'text-red-700' : ''}`}>{amountDisplay}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Payments & Refunds */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Payments & Refunds</h3>
            <table className="w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border border-gray-300 px-4 py-2 text-left">Date</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Mode</th>
                  <th className="border border-gray-300 px-4 py-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {payments.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="border border-gray-300 px-4 py-6 text-center text-gray-500">No payments or refunds</td>
                  </tr>
                ) : (
                  payments.map((p) => {
                    const isRefund = p.paymentType === 'refund';
                    const amountDisplay = isRefund ? `- ${fmtINR(Math.abs(p.amount))}` : fmtINR(p.amount);
                    return (
                      <tr key={p.id} className={isRefund ? 'bg-yellow-50' : ''}>
                        <td className="border border-gray-300 px-4 py-2">{formatDate(p.createdAt)}</td>
                        <td className="border border-gray-300 px-4 py-2">{p.method || '—'}</td>
                        <td className={`border border-gray-300 px-4 py-2 text-right font-medium ${isRefund ? 'text-yellow-700' : ''}`}>{amountDisplay}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Summary (reconciles with booking_financials) */}
          <div className="mb-8">
            <div className="flex justify-end">
              <div className="w-full max-w-md">
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-600">Charges</span>
                  <span className="font-medium">{fmtINR(financials?.chargesTotal ?? 0)}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-600">Discounts</span>
                  <span className="font-medium text-red-700">- {fmtINR(Math.abs(financials?.discountsTotal ?? 0))}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-600">Taxes</span>
                  <span className="font-medium">{fmtINR(financials?.taxesTotal ?? 0)}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-600">Gross</span>
                  <span className="font-medium">{fmtINR(financials?.grossTotal ?? 0)}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-600">Payments</span>
                  <span className="font-medium">{fmtINR(financials?.paymentsTotal ?? 0)}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-600">Refunds</span>
                  <span className="font-medium text-yellow-700">- {fmtINR(Math.abs(financials?.refundsTotal ?? 0))}</span>
                </div>
                <div className="flex justify-between py-2 text-lg font-bold">
                  <span>Balance Due</span>
                  <span>{fmtINR(financials?.balanceDue ?? 0)}</span>
                </div>
                <p className="mt-2 text-xs text-gray-500 text-right">Totals shown are authoritative from booking_financials</p>
              </div>
            </div>
          </div>

          {/* Optional: keep a small status note (non-authoritative) */}
          {booking.paymentStatus && (
            <div className="mb-8 print:hidden">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Payment Status</h3>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Status:
                  <span className={`ml-2 font-medium ${
                    booking.paymentStatus === 'paid' ? 'text-green-600' :
                    booking.paymentStatus === 'partial' ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {booking.paymentStatus.charAt(0).toUpperCase() + booking.paymentStatus.slice(1)}
                  </span>
                </p>
              </div>
            </div>
          )}

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