import React, { useMemo } from 'react';
import type { Booking } from '../types/booking';
import type { BookingCharge } from '../services/bookingChargesService';
import type { BookingPayment } from '../services/bookingPaymentsService';
import type { BookingFinancials } from '../services/bookingFinancialsService';

interface CompanyInfo {
  name: string;
  address: string;
  phone: string;
  email: string;
  gstin?: string;
  pan?: string;
}

interface InvoicePerLineProps {
  booking: Booking;
  invoiceNumber: string | number;
  charges: BookingCharge[];
  payments: BookingPayment[];
  financials: BookingFinancials | null;
  company: CompanyInfo;
}

const inr = (n: number) =>
  new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

const fmtDate = (d: string | Date | undefined | null) => {
  if (!d) return '';
  const date = typeof d === 'string' ? new Date(d) : d;
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
};

const fmtTime = (d: string | Date | undefined | null) => {
  if (!d) return '';
  const date = typeof d === 'string' ? new Date(d) : d;
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${ampm}`;
};

const nowIST = () => {
  const date = new Date();
  const istDate = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata', day: '2-digit', month: '2-digit', year: 'numeric'
  }).format(date);
  const istTime = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
  }).format(date);
  return `${istDate} ${istTime}`;
};

export const InvoicePerLine: React.FC<InvoicePerLineProps> = ({
  booking,
  invoiceNumber,
  charges,
  payments,
  financials,
  company,
}) => {
  const noOfDays = useMemo(() => {
    if (!booking.checkIn || !booking.checkOut) return 1;
    const days = Math.ceil(
      (new Date(booking.checkOut).getTime() - new Date(booking.checkIn).getTime()) / (1000 * 60 * 60 * 24)
    );
    return days || 1;
  }, [booking.checkIn, booking.checkOut]);

  const amountInWords = (num: number) => {
    const a = [ '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen' ];
    const b = [ '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety' ];

    const n = Math.floor(Math.abs(num));
    if (n === 0) return 'Zero Rupees Only';

    const toWords = (num2: number): string => {
      if (num2 < 20) return a[num2];
      if (num2 < 100) return b[Math.floor(num2 / 10)] + (num2 % 10 ? ' ' + a[num2 % 10] : '');
      if (num2 < 1000) return a[Math.floor(num2 / 100)] + ' Hundred' + (num2 % 100 ? ' ' + toWords(num2 % 100) : '');
      if (num2 < 100000) return toWords(Math.floor(num2 / 1000)) + ' Thousand' + (num2 % 1000 ? ' ' + toWords(num2 % 1000) : '');
      if (num2 < 10000000) return toWords(Math.floor(num2 / 100000)) + ' Lakh' + (num2 % 100000 ? ' ' + toWords(num2 % 100000) : '');
      return toWords(Math.floor(num2 / 10000000)) + ' Crore' + (num2 % 10000000 ? ' ' + toWords(num2 % 10000000) : '');
    };

    return toWords(n) + ' Rupees Only';
  };

  return (
    <div className="invoice-container">
      <style>{`
        /* Base styles for HTML preview */
        .invoice-container { 
          font-family: 'Segoe UI', Tahoma, Arial, sans-serif; 
          font-size: 12px; 
          line-height: 1.4; 
          color: #000; 
          background: #fff; 
          max-width: 210mm; 
          margin: 0 auto; 
          padding: 10px; 
        }
        
        .invoice-page { 
          display: flex; 
          flex-direction: column; 
          border: 2px solid #000; 
          width: 100%; 
          min-height: 297mm;
          position: relative;
        }
        
        /* Header styles */
        .invoice-header-main { 
          border-bottom: 2px solid #000; 
          padding: 15px; 
          text-align: center;
          position: relative;
        }
        .hotel-name { 
          font-size: 20px; 
          font-weight: bold; 
          margin-bottom: 5px; 
          letter-spacing: 1px; 
        }
        .hotel-address, .hotel-contact { 
          font-size: 11px; 
        }
        .invoice-title { 
          font-size: 14px; 
          font-weight: bold; 
          margin-top: 10px; 
          text-decoration: underline; 
        }
        
        /* Content wrapper */
        .invoice-content { 
          flex: 1; 
          display: flex; 
          flex-direction: column; 
        }
        
        .invoice-main {
          flex: 0 0 auto;
        }
        
        /* Tables */
        .invoice-info-table, .details-table, .charges-table, .summary-table { 
          width: 100%; 
          border-collapse: collapse; 
        }
        .invoice-info-table td { 
          border: 1px solid #000; 
          padding: 5px 8px; 
          font-size: 11px; 
        }
        .invoice-info-table .label { 
          font-weight: bold; 
          width: 120px; 
          background: #f5f5f5; 
        }
        
        .section-title { 
          background: #333; 
          color: #fff; 
          padding: 4px 8px; 
          font-size: 11px; 
          font-weight: bold; 
          text-transform: uppercase;
        }
        
        .details-table th, .details-table td { 
          border: 1px solid #000; 
          padding: 6px; 
          text-align: center; 
          font-size: 11px; 
        }
        
        .charges-table th, .charges-table td { 
          border: 1px solid #000; 
          padding: 5px; 
          font-size: 11px; 
        }
        .charges-table th { 
          background: #f0f0f0; 
          font-weight: bold; 
        }
        .charges-table .right { 
          text-align: right; 
        }
        .charges-table .center { 
          text-align: center; 
        }
        .charges-table .subtotal-row { 
          background: #f9f9f9; 
          font-weight: bold; 
        }
        
        /* Summary section */
        .summary-section { 
          border-top: 2px solid #000;
        }
        .summary-table td { 
          padding: 4px 8px; 
          font-size: 11px; 
        }
        .summary-table .label { 
          text-align: right; 
          padding-right: 15px; 
        }
        .summary-table .value { 
          text-align: right; 
          width: 120px; 
          font-weight: bold; 
        }
        .total-row { 
          border-top: 2px solid #000; 
          border-bottom: 2px solid #000; 
          background: #f0f0f0; 
        }
        .total-row td { 
          padding: 8px; 
          font-size: 13px; 
          font-weight: bold; 
        }
        
        /* Footer elements */
        .amount-words { 
          border: 1px solid #000; 
          padding: 8px; 
          margin: 10px; 
          font-size: 11px;
        }
        .amount-words span { 
          font-weight: bold; 
        }
        
        .terms-section { 
          padding: 10px; 
          font-size: 10px; 
          border-top: 1px solid #000;
        }
        .terms-section ol { 
          margin: 5px 0 0 20px; 
          padding: 0; 
        }
        
        .invoice-footer { 
          border-top: 2px solid #000; 
          padding: 15px;
        }
        .signature-section { 
          display: flex; 
          justify-content: space-between; 
          margin-top: 40px;
        }
        .signature-box { 
          text-align: center; 
          width: 200px; 
        }
        .signature-line { 
          border-bottom: 1px solid #000; 
          margin-bottom: 5px; 
        }
        .signature-label { 
          font-size: 11px; 
        }
        .footer-note { 
          text-align: center; 
          margin-top: 20px; 
          font-size: 10px; 
          font-style: italic; 
        }
        
        /* Utility classes */
        .print-button { 
          margin-bottom: 10px; 
          padding: 8px 16px; 
          background: #333; 
          color: white; 
          border: none; 
          cursor: pointer; 
          font-size: 12px;
          margin-right: 8px;
        }
        
        .print-button:hover {
          background: #555;
        }
        
        /* Spacer for single page layout */
        .invoice-spacer { 
          flex: 1 1 auto; 
        }
        
        /* Keep footer section together */
        .invoice-footer-section {
          margin-top: auto;
        }

        /* Header action area */
        .header-actions {
          position: absolute;
          top: 15px;
          right: 15px;
        }

        /* Print adjustments */
        @media print {
          .header-actions,
          .print-button,
          .screen-toolbar { 
            display: none !important; 
          }
          .invoice-page { 
            min-height: auto; 
            border: 1px solid #000;
          }
          .section-title { 
            -webkit-print-color-adjust: exact; 
            print-color-adjust: exact; 
          }
        }
      `}</style>

      

      {/* HTML Preview - Keep for screen display */}
      <div className="invoice-page" id="print-root">
        <div className="invoice-header-main">
          <div className="hotel-name">{company.name.toUpperCase()}</div>
          <div className="hotel-address">{company.address}</div>
          <div className="hotel-contact">Phone: {company.phone} | Email: {company.email}</div>
          {company.pan && <div className="hotel-contact">PAN: {company.pan}</div>}
          <div className="invoice-title">TAX INVOICE</div>
        </div>

        <div className="invoice-content">
          <div className="invoice-main">
            {/* Invoice Info */}
            <table className="invoice-info-table">
              <tbody>
                <tr>
                  <td className="label">Invoice No.</td>
                  <td>{invoiceNumber}</td>
                  <td className="label">Date</td>
                  <td>{nowIST()}</td>
                </tr>
                <tr>
                  <td className="label">Guest Name</td>
                  <td>{booking.guestName}</td>
                  <td className="label">Room No.</td>
                  <td>{booking.roomNo}</td>
                </tr>
                {(booking.contactEmail || booking.contactPhone) && (
                  <tr>
                    <td className="label">Contact No.</td>
                    <td>{booking.contactPhone || '-'}</td>
                    <td className="label">Email</td>
                    <td>{booking.contactEmail || '-'}</td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Stay Details */}
            <div className="section-title">STAY DETAILS</div>
            <table className="details-table">
              <thead>
                <tr>
                  <th>Check-In Date</th>
                  <th>Check-In Time</th>
                  <th>Check-Out Date</th>
                  <th>Check-Out Time</th>
                  <th>No. of Days</th>
                  <th>No. of Rooms</th>
                  <th>No. of Guests</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>{fmtDate(booking.checkIn)}</td>
                  <td>{fmtTime(booking.checkIn)}</td>
                  <td>{fmtDate(booking.checkOut)}</td>
                  <td>{fmtTime(booking.checkOut)}</td>
                  <td>{noOfDays}</td>
                  <td>{booking.numberOfRooms || 1}</td>
                  <td>{booking.noOfPax} {booking.adultChild && `(${booking.adultChild})`}</td>
                </tr>
              </tbody>
            </table>

            {/* Particulars (Charges) */}
            <div className="section-title">PARTICULARS</div>
            <table className="charges-table">
              <thead>
                <tr>
                  <th style={{ width: '12%' }}>Date</th>
                  <th style={{ width: '48%' }}>Description</th>
                  <th style={{ width: '8%' }}>Qty</th>
                  <th style={{ width: '12%' }} className="right">Rate (₹)</th>
                  <th style={{ width: '20%' }} className="right">Amount (₹)</th>
                </tr>
              </thead>
              <tbody>
                {charges.length === 0 && payments.length === 0 && (
                  <tr>
                    <td colSpan={5} className="center" style={{ padding: '20px', color: '#666' }}>
                      No charges or payments recorded
                    </td>
                  </tr>
                )}

                {charges.map((charge, index) => {
                  const isDiscount = charge.chargeType === 'discount';
                  const amount = charge.amount ?? (charge.quantity * charge.unitAmount);
                  return (
                    <tr key={`charge-${index}`}>
                      <td>{fmtDate(charge.createdAt || booking.checkIn)}</td>
                      <td>
                        {charge.chargeType === 'room' ? 'Room Charge' :
                         charge.chargeType === 'fnb' ? (charge.description || 'Food & Beverage') :
                         charge.chargeType === 'misc' ? (charge.description || 'Miscellaneous') :
                         charge.chargeType === 'tax' ? (charge.description || 'Tax') :
                         charge.chargeType === 'service_fee' ? (charge.description || 'Service Fee') :
                         charge.chargeType === 'discount' ? (charge.description || 'Discount') :
                         (charge.description || charge.chargeType || 'Charge')}
                      </td>
                      <td className="center">{charge.quantity || '-'}</td>
                      <td className="right">{charge.unitAmount ? inr(charge.unitAmount) : '-'}</td>
                      <td className="right">{isDiscount ? `-${inr(Math.abs(amount))}` : inr(amount)}</td>
                    </tr>
                  );
                })}

                {/* Sub Total */}
                {financials && charges.length > 0 && (
                  <tr className="subtotal-row">
                    <td colSpan={4} className="right">Sub Total:</td>
                    <td className="right">{inr(financials.grossTotal)}</td>
                  </tr>
                )}

                {/* Payments header */}
                {payments.length > 0 && (
                  <tr>
                    <td colSpan={5} className="payment-header" style={{ background: '#f9f9f9', fontWeight: 'bold' }}>
                      PAYMENTS RECEIVED
                    </td>
                  </tr>
                )}

                {/* Payments */}
                {payments.map((payment, index) => (
                  <tr key={`payment-${index}`}>
                    <td>{fmtDate(payment.createdAt || booking.checkOut)}</td>
                    <td>
                      {payment.paymentType === 'refund' ? 'Refund' : 'Payment'} - {payment.method || 'Cash'}
                      {payment.referenceNo && ` (Ref: ${payment.referenceNo})`}
                    </td>
                    <td className="center">-</td>
                    <td className="right">-</td>
                    <td className="right">
                      {payment.paymentType === 'refund' ? inr(payment.amount) : `-${inr(payment.amount)}`}
                    </td>
                  </tr>
                ))}

                {/* Total Payments */}
                {financials && payments.length > 0 && (
                  <tr className="subtotal-row">
                    <td colSpan={4} className="right">Total Payments:</td>
                    <td className="right">-{inr(financials.paymentsTotal)}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Spacer for single page layout */}
          <div className="invoice-spacer"></div>

          {/* Footer section - kept together */}
          <div className="invoice-footer-section">
            {financials && (
              <div className="summary-section">
                <table className="summary-table">
                  <tbody>
                    <tr>
                      <td className="label">Total Charges:</td>
                      <td className="value">₹ {inr(financials.grossTotal)}</td>
                    </tr>
                    <tr>
                      <td className="label">Total Payments:</td>
                      <td className="value">₹ {inr(financials.paymentsTotal)}</td>
                    </tr>
                    <tr className="total-row">
                      <td className="label">BALANCE DUE:</td>
                      <td className="value">₹ {inr(financials.balanceDue)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {financials && (
              <div className="amount-words">
                <span>Amount in Words (Balance Due):</span> {amountInWords(financials.balanceDue)}
              </div>
            )}

            <div className="terms-section">
              <strong>Terms & Conditions:</strong>
              <ol>
                <li>Check-in time is 2:00 PM and check-out time is 12:00 PM</li>
                <li>Valid ID proof is mandatory at the time of check-in</li>
                <li>All disputes are subject to Manali jurisdiction</li>
              </ol>
            </div>

            <div className="invoice-footer">
              <div className="signature-section">
                <div className="signature-box">
                  <div className="signature-line"></div>
                  <div className="signature-label">Guest Signature</div>
                </div>
                <div className="signature-box">
                  <div className="signature-line"></div>
                  <div className="signature-label">For {company.name}<br />(Authorized Signatory)</div>
                </div>
              </div>
              <div className="footer-note">
                Thank you for staying with us. We look forward to welcoming you again.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
