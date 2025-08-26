import React from 'react';
import { Document, Page, Text, View, StyleSheet, pdf, Font } from '@react-pdf/renderer';
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

interface InvoicePDFProps {
  booking: Booking;
  invoiceNumber: string | number;
  charges: BookingCharge[];
  payments: BookingPayment[];
  financials: BookingFinancials | null;
  company: CompanyInfo;
}

// SOLUTION: Use a simpler approach - DON'T use custom fonts, use default fonts that support Rupee
// The issue is that @react-pdf/renderer has problems with font registration in browser environments
// Instead, we'll use Helvetica (which is built-in) and use Unicode for Rupee symbol

// Register fallback fonts that work reliably
Font.register({
  family: 'Roboto',
  src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-regular-webfont.ttf'
});

Font.register({
  family: 'Roboto-Bold', 
  src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-bold-webfont.ttf'
});

// Create styles WITHOUT custom fonts - use Helvetica which is built-in
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#ffffff',
    padding: 20,
    fontSize: 10,
    fontFamily: 'Helvetica', // Use built-in font
  },
  // Main container with border
  container: {
    border: '2pt solid #000',
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  },
  // Header styles
  header: {
    borderBottom: '2pt solid #000',
    padding: 10,
    alignItems: 'center',
  },
  companyName: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold', // Use built-in bold font
    marginBottom: 3,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  companyInfo: {
    fontSize: 9,
    marginBottom: 1,
    color: '#000',
  },
  invoiceTitle: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    marginTop: 5,
    textDecoration: 'underline',
  },
  // Content wrapper
  content: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    padding: 0,
  },
  // Invoice info table
  infoTable: {
    width: '100%',
    marginBottom: 0,
  },
  infoRow: {
    flexDirection: 'row',
    borderBottom: '1pt solid #000',
  },
  infoCell: {
    flex: 1,
    flexDirection: 'row',
    borderRight: '1pt solid #000',
  },
  infoCellLast: {
    flex: 1,
    flexDirection: 'row',
  },
  infoLabel: {
    width: 70,
    padding: 4,
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    backgroundColor: '#f5f5f5',
    borderRight: '1pt solid #000',
  },
  infoValue: {
    flex: 1,
    padding: 4,
    fontSize: 9,
  },
  // Section title
  sectionTitle: {
    backgroundColor: '#333',
    color: '#ffffff',
    padding: 3,
    paddingLeft: 6,
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
  },
  // Stay details table
  stayDetailsTable: {
    width: '100%',
    marginBottom: 0,
  },
  stayDetailsRow: {
    flexDirection: 'row',
    borderBottom: '1pt solid #000',
  },
  stayDetailsHeader: {
    flex: 1,
    padding: 4,
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'center',
    borderRight: '1pt solid #000',
    backgroundColor: '#f0f0f0',
  },
  stayDetailsHeaderLast: {
    flex: 1,
    padding: 4,
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'center',
    backgroundColor: '#f0f0f0',
  },
  stayDetailsCell: {
    flex: 1,
    padding: 4,
    fontSize: 8,
    textAlign: 'center',
    borderRight: '1pt solid #000',
  },
  stayDetailsCellLast: {
    flex: 1,
    padding: 4,
    fontSize: 8,
    textAlign: 'center',
  },
  // Charges table styles
  table: {
    width: '100%',
    marginBottom: 0,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottom: '1pt solid #000',
    minHeight: 18,
    alignItems: 'stretch',
  },
  tableHeader: {
    backgroundColor: '#f0f0f0',
  },
  tableCol: {
    padding: 3,
    fontSize: 8,
    borderRight: '1pt solid #000',
    justifyContent: 'center',
  },
  tableColLast: {
    padding: 3,
    fontSize: 8,
    justifyContent: 'center',
  },
  tableColHeader: {
    padding: 3,
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    borderRight: '1pt solid #000',
    justifyContent: 'center',
  },
  tableColHeaderLast: {
    padding: 3,
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    justifyContent: 'center',
  },
  // Column widths for charges table
  colDate: { width: '12%' },
  colDesc: { width: '48%' },
  colQty: { width: '8%', textAlign: 'center' },
  colRate: { width: '12%', textAlign: 'right' },
  colAmount: { width: '20%', textAlign: 'right' },
  // Subtotal and payment rows
  subtotalRow: {
    backgroundColor: '#f9f9f9',
  },
  subtotalLabel: {
    flex: 1,
    padding: 3,
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'right',
    paddingRight: 10,
    borderRight: '1pt solid #000',
  },
  subtotalValue: {
    width: '20%',
    padding: 3,
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'right',
  },
  paymentHeader: {
    padding: 3,
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    backgroundColor: '#f9f9f9',
  },
  // Summary section
  summarySection: {
    marginTop: 'auto',
    borderTop: '2pt solid #000',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingVertical: 2,
    paddingHorizontal: 10,
  },
  summaryLabel: {
    fontSize: 9,
    marginRight: 20,
  },
  summaryValue: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    width: 80,
    textAlign: 'right',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    borderTop: '2pt solid #000',
    borderBottom: '2pt solid #000',
    paddingVertical: 4,
    paddingHorizontal: 10,
    backgroundColor: '#f0f0f0',
  },
  totalLabel: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    marginRight: 20,
  },
  totalValue: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    width: 80,
    textAlign: 'right',
  },
  // Amount in words
  amountWords: {
    border: '1pt solid #000',
    padding: 6,
    margin: 8,
    fontSize: 8,
  },
  amountWordsText: {
    fontSize: 8,
  },
  amountWordsBold: {
    fontFamily: 'Helvetica-Bold',
  },
  // Terms section
  termsSection: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderTop: '1pt solid #000',
  },
  termsTitle: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 3,
  },
  termsList: {
    marginLeft: 12,
  },
  termsItem: {
    fontSize: 8,
    marginBottom: 1,
  },
  // Signature section
  signatureSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 30,
    paddingTop: 30,
    paddingBottom: 10,
    borderTop: '2pt solid #000',
  },
  signatureBox: {
    width: 140,
    alignItems: 'center',
  },
  signatureLine: {
    width: '100%',
    borderBottom: '1pt solid #000',
    marginBottom: 3,
    height: 30,
  },
  signatureLabel: {
    fontSize: 8,
    textAlign: 'center',
  },
  // Footer
  footerNote: {
    textAlign: 'center',
    paddingVertical: 8,
    fontSize: 8,
    fontStyle: 'italic',
    color: '#333',
  },
  // Utility
  noData: {
    textAlign: 'center',
    padding: 15,
    color: '#666',
    fontSize: 9,
  },
});

// Helper functions
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

const amountInWords = (num: number) => {
  const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

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

// PDF Document Component
const InvoicePDFDocument: React.FC<InvoicePDFProps> = ({
  booking,
  invoiceNumber,
  charges,
  payments,
  financials,
  company,
}) => {
  const noOfDays = booking.checkIn && booking.checkOut
    ? Math.ceil((new Date(booking.checkOut).getTime() - new Date(booking.checkIn).getTime()) / (1000 * 60 * 60 * 24)) || 1
    : 1;

  // Use INR as text instead of symbol for better compatibility
  const rupeeSymbol = 'INR '; // Fallback to INR text

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.companyName}>{company.name}</Text>
            <Text style={styles.companyInfo}>{company.address}</Text>
            <Text style={styles.companyInfo}>Phone: {company.phone} | Email: {company.email}</Text>
            {company.pan && <Text style={styles.companyInfo}>PAN: {company.pan}</Text>}
            <Text style={styles.invoiceTitle}>TAX INVOICE</Text>
          </View>

          {/* Content */}
          <View style={styles.content}>
            {/* Invoice Info Table */}
            <View style={styles.infoTable}>
              <View style={styles.infoRow}>
                <View style={styles.infoCell}>
                  <Text style={styles.infoLabel}>Invoice No.</Text>
                  <Text style={styles.infoValue}>{invoiceNumber}</Text>
                </View>
                <View style={styles.infoCellLast}>
                  <Text style={styles.infoLabel}>Date</Text>
                  <Text style={styles.infoValue}>{nowIST()}</Text>
                </View>
              </View>
              <View style={styles.infoRow}>
                <View style={styles.infoCell}>
                  <Text style={styles.infoLabel}>Guest Name</Text>
                  <Text style={styles.infoValue}>{booking.guestName}</Text>
                </View>
                <View style={styles.infoCellLast}>
                  <Text style={styles.infoLabel}>Room No.</Text>
                  <Text style={styles.infoValue}>{booking.roomNo}</Text>
                </View>
              </View>
              {(booking.contactEmail || booking.contactPhone) && (
                <View style={[styles.infoRow, { borderBottom: 0 }]}>
                  <View style={styles.infoCell}>
                    <Text style={styles.infoLabel}>Contact No.</Text>
                    <Text style={styles.infoValue}>{booking.contactPhone || '-'}</Text>
                  </View>
                  <View style={styles.infoCellLast}>
                    <Text style={styles.infoLabel}>Email</Text>
                    <Text style={styles.infoValue}>{booking.contactEmail || '-'}</Text>
                  </View>
                </View>
              )}
            </View>

            {/* Stay Details */}
            <Text style={styles.sectionTitle}>STAY DETAILS</Text>
            <View style={styles.stayDetailsTable}>
              <View style={styles.stayDetailsRow}>
                <Text style={styles.stayDetailsHeader}>Check-In Date</Text>
                <Text style={styles.stayDetailsHeader}>Check-In Time</Text>
                <Text style={styles.stayDetailsHeader}>Check-Out Date</Text>
                <Text style={styles.stayDetailsHeader}>Check-Out Time</Text>
                <Text style={styles.stayDetailsHeader}>No. of Days</Text>
                <Text style={styles.stayDetailsHeader}>No. of Rooms</Text>
                <Text style={styles.stayDetailsHeaderLast}>No. of Guests</Text>
              </View>
              <View style={[styles.stayDetailsRow, { borderBottom: 0 }]}>
                <Text style={styles.stayDetailsCell}>{fmtDate(booking.checkIn)}</Text>
                <Text style={styles.stayDetailsCell}>{fmtTime(booking.checkIn)}</Text>
                <Text style={styles.stayDetailsCell}>{fmtDate(booking.checkOut)}</Text>
                <Text style={styles.stayDetailsCell}>{fmtTime(booking.checkOut)}</Text>
                <Text style={styles.stayDetailsCell}>{noOfDays}</Text>
                <Text style={styles.stayDetailsCell}>{booking.numberOfRooms || 1}</Text>
                <Text style={styles.stayDetailsCellLast}>
                  {booking.noOfPax} {booking.adultChild && `(${booking.adultChild})`}
                </Text>
              </View>
            </View>

            {/* Particulars */}
            <Text style={styles.sectionTitle}>PARTICULARS</Text>
            <View style={styles.table}>
              <View style={[styles.tableRow, styles.tableHeader]}>
                <Text style={[styles.tableColHeader, styles.colDate]}>Date</Text>
                <Text style={[styles.tableColHeader, styles.colDesc]}>Description</Text>
                <Text style={[styles.tableColHeader, styles.colQty]}>Qty</Text>
                <Text style={[styles.tableColHeader, styles.colRate]}>Rate (INR)</Text>
                <Text style={[styles.tableColHeaderLast, styles.colAmount]}>Amount (INR)</Text>
              </View>

              {charges.length === 0 && payments.length === 0 ? (
                <View style={styles.tableRow}>
                  <Text style={styles.noData}>No charges or payments recorded</Text>
                </View>
              ) : (
                <>
                  {charges.map((charge, index) => {
                    const isDiscount = charge.chargeType === 'discount';
                    const amount = charge.amount ?? (charge.quantity * charge.unitAmount);
                    const description = 
                      charge.chargeType === 'room' ? 'Room Charge' :
                      charge.chargeType === 'fnb' ? (charge.description || 'Food & Beverage') :
                      charge.chargeType === 'misc' ? (charge.description || 'Miscellaneous') :
                      charge.chargeType === 'tax' ? (charge.description || 'Tax') :
                      charge.chargeType === 'service_fee' ? (charge.description || 'Service Fee') :
                      charge.chargeType === 'discount' ? (charge.description || 'Discount') :
                      (charge.description || charge.chargeType || 'Charge');

                    return (
                      <View key={`charge-${index}`} style={styles.tableRow}>
                        <Text style={[styles.tableCol, styles.colDate]}>{fmtDate(charge.createdAt || booking.checkIn)}</Text>
                        <Text style={[styles.tableCol, styles.colDesc]}>{description}</Text>
                        <Text style={[styles.tableCol, styles.colQty]}>{charge.quantity || '-'}</Text>
                        <Text style={[styles.tableCol, styles.colRate]}>{charge.unitAmount ? inr(charge.unitAmount) : '-'}</Text>
                        <Text style={[styles.tableColLast, styles.colAmount]}>
                          {isDiscount ? `-${inr(Math.abs(amount))}` : inr(amount)}
                        </Text>
                      </View>
                    );
                  })}

                  {financials && charges.length > 0 && (
                    <View style={[styles.tableRow, styles.subtotalRow]}>
                      <Text style={styles.subtotalLabel}>Sub Total:</Text>
                      <Text style={styles.subtotalValue}>{inr(financials.grossTotal)}</Text>
                    </View>
                  )}

                  {payments.length > 0 && (
                    <View style={styles.tableRow}>
                      <Text style={styles.paymentHeader}>PAYMENTS RECEIVED</Text>
                    </View>
                  )}

                  {payments.map((payment, index) => (
                    <View key={`payment-${index}`} style={styles.tableRow}>
                      <Text style={[styles.tableCol, styles.colDate]}>{fmtDate(payment.createdAt || booking.checkOut)}</Text>
                      <Text style={[styles.tableCol, styles.colDesc]}>
                        {payment.paymentType === 'refund' ? 'Refund' : 'Payment'} - {payment.method || 'Cash'}
                        {payment.referenceNo && ` (Ref: ${payment.referenceNo})`}
                      </Text>
                      <Text style={[styles.tableCol, styles.colQty]}>-</Text>
                      <Text style={[styles.tableCol, styles.colRate]}>-</Text>
                      <Text style={[styles.tableColLast, styles.colAmount]}>
                        {payment.paymentType === 'refund' ? inr(payment.amount) : `-${inr(payment.amount)}`}
                      </Text>
                    </View>
                  ))}

                  {financials && payments.length > 0 && (
                    <View style={[styles.tableRow, styles.subtotalRow, { borderBottom: 0 }]}>
                      <Text style={styles.subtotalLabel}>Total Payments:</Text>
                      <Text style={styles.subtotalValue}>-{inr(financials.paymentsTotal)}</Text>
                    </View>
                  )}
                </>
              )}
            </View>

            {/* Summary Section */}
            {financials && (
              <View style={styles.summarySection}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Total Charges:</Text>
                  <Text style={styles.summaryValue}>INR {inr(financials.grossTotal)}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Total Payments:</Text>
                  <Text style={styles.summaryValue}>INR {inr(financials.paymentsTotal)}</Text>
                </View>
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>BALANCE DUE:</Text>
                  <Text style={styles.totalValue}>INR {inr(financials.balanceDue)}</Text>
                </View>
              </View>
            )}

            {financials && (
              <View style={styles.amountWords}>
                <Text style={styles.amountWordsText}>
                  <Text style={styles.amountWordsBold}>Amount in Words (Balance Due): </Text>
                  {amountInWords(financials.balanceDue)}
                </Text>
              </View>
            )}

            {/* Terms & Conditions */}
            <View style={styles.termsSection}>
              <Text style={styles.termsTitle}>Terms & Conditions:</Text>
              <View style={styles.termsList}>
                <Text style={styles.termsItem}>1. Check-in time is 2:00 PM and check-out time is 12:00 PM</Text>
                <Text style={styles.termsItem}>2. Valid ID proof is mandatory at the time of check-in</Text>
                <Text style={styles.termsItem}>3. All disputes are subject to Manali jurisdiction</Text>
              </View>
            </View>

            {/* Signature Section */}
            <View style={styles.signatureSection}>
              <View style={styles.signatureBox}>
                <View style={styles.signatureLine} />
                <Text style={styles.signatureLabel}>Guest Signature</Text>
              </View>
              <View style={styles.signatureBox}>
                <View style={styles.signatureLine} />
                <Text style={styles.signatureLabel}>For {company.name}</Text>
                <Text style={styles.signatureLabel}>(Authorized Signatory)</Text>
              </View>
            </View>

            {/* Footer Note */}
            <View style={styles.footerNote}>
              <Text>Thank you for staying with us. We look forward to welcoming you again.</Text>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
};

// Export component that provides download link
export const InvoicePDFExport: React.FC<InvoicePDFProps & { children?: React.ReactNode; className?: string }> = (props) => {
  const { children, className, ...pdfProps } = props;
  const [loading, setLoading] = React.useState(false);

  const handleClick = async () => {
    try {
      setLoading(true);
      await downloadInvoicePDF(pdfProps as InvoicePDFProps);
    } catch (error) {
      console.error('PDF Export Error:', error);
      alert('Failed to export PDF. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className={className ?? 'px-4 py-2 text-sm text-white bg-gray-900 rounded-md hover:bg-gray-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed'}
      style={className ? undefined : { cursor: 'pointer' }}
    >
      {loading ? 'Generating PDF...' : (children ?? 'Download PDF')}
    </button>
  );
};

// Direct download function
export const downloadInvoicePDF = async (props: InvoicePDFProps) => {
  try {
    const blob = await pdf(<InvoicePDFDocument {...props} />).toBlob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Invoice_${props.invoiceNumber}.pdf`;
    link.click();
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
};

export default InvoicePDFDocument;
