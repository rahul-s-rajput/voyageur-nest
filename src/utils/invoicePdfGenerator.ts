import jsPDF from 'jspdf';
import 'jspdf-autotable';
import type { Booking } from '../types/booking';
import type { BookingCharge } from '../services/bookingChargesService';
import type { BookingPayment } from '../services/bookingPaymentsService';
import type { BookingFinancials } from '../services/bookingFinancialsService';

// Declare module for jsPDF autotable plugin
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
    lastAutoTable: {
      finalY: number;
    };
  }
}

interface CompanyInfo {
  name: string;
  address: string;
  phone: string;
  email: string;
  gstin?: string;
  pan?: string;
}

interface InvoicePDFData {
  booking: Booking;
  invoiceNumber: string | number;
  charges: BookingCharge[];
  payments: BookingPayment[];
  financials: BookingFinancials | null;
  company: CompanyInfo;
}

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

export const generateInvoicePDF = (data: InvoicePDFData): jsPDF => {
  const { booking, invoiceNumber, charges, payments, financials, company } = data;
  
  // Initialize PDF
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  // Page dimensions
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - (margin * 2);
  
  // Track current Y position
  let currentY = margin;
  
  // Colors
  const primaryColor = '#000000';
  const lightGray = '#f5f5f5';
  const darkGray = '#333333';
  
  // Add page numbers
  const addPageNumber = () => {
    const pageCount = pdf.getNumberOfPages();
    pdf.setFontSize(9);
    pdf.setTextColor(100);
    pdf.text(
      `Page ${pdf.getCurrentPageNumber()} of ${pageCount}`,
      pageWidth - margin,
      pageHeight - 10,
      { align: 'right' }
    );
  };
  
  // Add main header (first page only)
  const addMainHeader = () => {
    // Border around header
    pdf.setDrawColor(0);
    pdf.setLineWidth(0.5);
    pdf.rect(margin, currentY, contentWidth, 35);
    
    // Company Name
    pdf.setFontSize(18);
    pdf.setFont('helvetica', 'bold');
    pdf.text(company.name.toUpperCase(), pageWidth / 2, currentY + 8, { align: 'center' });
    
    // Address
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text(company.address, pageWidth / 2, currentY + 14, { align: 'center' });
    
    // Contact
    pdf.text(`Phone: ${company.phone} | Email: ${company.email}`, pageWidth / 2, currentY + 19, { align: 'center' });
    
    // PAN if available
    if (company.pan) {
      pdf.text(`PAN: ${company.pan}`, pageWidth / 2, currentY + 24, { align: 'center' });
    }
    
    // Invoice Title
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text('TAX INVOICE', pageWidth / 2, currentY + 31, { align: 'center' });
    
    currentY += 37;
  };
  
  // Add continuation header (for page 2+)
  const addContinuationHeader = () => {
    pdf.setDrawColor(0);
    pdf.setLineWidth(0.3);
    pdf.line(margin, currentY, pageWidth - margin, currentY);
    
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    
    // Left: Company name
    pdf.setFont('helvetica', 'bold');
    pdf.text(company.name, margin, currentY + 5);
    
    // Center: Invoice and Guest info
    pdf.setFont('helvetica', 'normal');
    const centerText = `Invoice No: ${invoiceNumber} | Guest: ${booking.guestName}`;
    pdf.text(centerText, pageWidth / 2, currentY + 5, { align: 'center' });
    
    // Right: Continued text
    pdf.setFont('helvetica', 'italic');
    pdf.text('...continued', pageWidth - margin, currentY + 5, { align: 'right' });
    
    pdf.line(margin, currentY + 8, pageWidth - margin, currentY + 8);
    currentY += 10;
  };
  
  // Add invoice info section
  const addInvoiceInfo = () => {
    const infoData = [
      ['Invoice No.', invoiceNumber.toString(), 'Date', nowIST()],
      ['Guest Name', booking.guestName, 'Room No.', booking.roomNo],
    ];
    
    if (booking.contactEmail || booking.contactPhone) {
      infoData.push([
        'Contact No.', booking.contactPhone || '-',
        'Email', booking.contactEmail || '-'
      ]);
    }
    
    pdf.autoTable({
      startY: currentY,
      head: [],
      body: infoData,
      theme: 'grid',
      styles: {
        fontSize: 10,
        cellPadding: 3,
      },
      columnStyles: {
        0: { fontStyle: 'bold', fillColor: [245, 245, 245], cellWidth: 30 },
        1: { cellWidth: 50 },
        2: { fontStyle: 'bold', fillColor: [245, 245, 245], cellWidth: 30 },
        3: { cellWidth: 'auto' },
      },
      margin: { left: margin, right: margin },
    });
    
    currentY = pdf.lastAutoTable.finalY + 2;
  };
  
  // Add stay details
  const addStayDetails = () => {
    // Section title
    pdf.setFillColor(51, 51, 51);
    pdf.rect(margin, currentY, contentWidth, 7, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.text('STAY DETAILS', margin + 2, currentY + 5);
    pdf.setTextColor(0);
    
    currentY += 7;
    
    // Calculate number of days
    const noOfDays = booking.checkIn && booking.checkOut
      ? Math.ceil((new Date(booking.checkOut).getTime() - new Date(booking.checkIn).getTime()) / (1000 * 60 * 60 * 24))
      : 1;
    
    // Stay details table
    pdf.autoTable({
      startY: currentY,
      head: [[
        'Check-In Date', 'Check-In Time', 'Check-Out Date', 'Check-Out Time',
        'No. of Days', 'No. of Rooms', 'No. of Guests'
      ]],
      body: [[
        fmtDate(booking.checkIn),
        fmtTime(booking.checkIn),
        fmtDate(booking.checkOut),
        fmtTime(booking.checkOut),
        noOfDays.toString(),
        (booking.numberOfRooms || 1).toString(),
        `${booking.noOfPax}${booking.adultChild ? ` (${booking.adultChild})` : ''}`
      ]],
      theme: 'grid',
      styles: {
        fontSize: 9,
        cellPadding: 3,
        halign: 'center',
      },
      headStyles: {
        fillColor: [240, 240, 240],
        textColor: [0, 0, 0],
        fontStyle: 'bold',
      },
      margin: { left: margin, right: margin },
    });
    
    currentY = pdf.lastAutoTable.finalY + 2;
  };
  
  // Add charges and payments
  const addChargesAndPayments = () => {
    // Section title
    pdf.setFillColor(51, 51, 51);
    pdf.rect(margin, currentY, contentWidth, 7, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.text('PARTICULARS', margin + 2, currentY + 5);
    pdf.setTextColor(0);
    
    currentY += 7;
    
    // Prepare table data
    const tableData: any[] = [];
    
    // Add charges
    charges.forEach(charge => {
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
      
      tableData.push([
        fmtDate(charge.createdAt || booking.checkIn),
        description,
        charge.quantity || '-',
        charge.unitAmount ? `₹${inr(charge.unitAmount)}` : '-',
        isDiscount ? `-₹${inr(Math.abs(amount))}` : `₹${inr(amount)}`
      ]);
    });
    
    // Add subtotal if there are charges
    if (financials && charges.length > 0) {
      tableData.push([
        { content: 'Sub Total:', colSpan: 4, styles: { halign: 'right', fontStyle: 'bold', fillColor: [249, 249, 249] } },
        { content: `₹${inr(financials.grossTotal)}`, styles: { fontStyle: 'bold', fillColor: [249, 249, 249] } }
      ]);
    }
    
    // Add payments header if there are payments
    if (payments.length > 0) {
      tableData.push([
        { content: 'PAYMENTS RECEIVED', colSpan: 5, styles: { fontStyle: 'bold', fillColor: [249, 249, 249] } }
      ]);
      
      // Add payments
      payments.forEach(payment => {
        const paymentDesc = `${payment.paymentType === 'refund' ? 'Refund' : 'Payment'} - ${payment.method || 'Cash'}${payment.referenceNo ? ` (Ref: ${payment.referenceNo})` : ''}`;
        
        tableData.push([
          fmtDate(payment.createdAt || booking.checkOut),
          paymentDesc,
          '-',
          '-',
          payment.paymentType === 'refund' ? `₹${inr(payment.amount)}` : `-₹${inr(payment.amount)}`
        ]);
      });
      
      // Add total payments
      if (financials) {
        tableData.push([
          { content: 'Total Payments:', colSpan: 4, styles: { halign: 'right', fontStyle: 'bold', fillColor: [249, 249, 249] } },
          { content: `-₹${inr(financials.paymentsTotal)}`, styles: { fontStyle: 'bold', fillColor: [249, 249, 249] } }
        ]);
      }
    }
    
    // Add empty row if no data
    if (tableData.length === 0) {
      tableData.push([
        { content: 'No charges or payments recorded', colSpan: 5, styles: { halign: 'center', textColor: [150, 150, 150] } }
      ]);
    }
    
    // Create the charges table
    pdf.autoTable({
      startY: currentY,
      head: [['Date', 'Description', 'Qty', 'Rate (₹)', 'Amount (₹)']],
      body: tableData,
      theme: 'grid',
      styles: {
        fontSize: 9,
        cellPadding: 3,
      },
      headStyles: {
        fillColor: [240, 240, 240],
        textColor: [0, 0, 0],
        fontStyle: 'bold',
      },
      columnStyles: {
        0: { cellWidth: 25 },
        1: { cellWidth: 'auto' },
        2: { cellWidth: 15, halign: 'center' },
        3: { cellWidth: 25, halign: 'right' },
        4: { cellWidth: 30, halign: 'right' },
      },
      margin: { left: margin, right: margin },
      didDrawPage: (data: any) => {
        // Add continuation header on new pages
        if (data.pageNumber > 1) {
          currentY = margin;
          addContinuationHeader();
        }
      },
    });
    
    currentY = pdf.lastAutoTable.finalY + 5;
  };
  
  // Add summary section
  const addSummary = () => {
    if (!financials) return;
    
    // Check if we need a new page for the summary
    if (currentY > pageHeight - 80) {
      pdf.addPage();
      currentY = margin;
      addContinuationHeader();
    }
    
    // Summary box
    pdf.setDrawColor(0);
    pdf.setLineWidth(0.5);
    pdf.rect(pageWidth - margin - 60, currentY, 60, 30);
    
    pdf.setFontSize(9);
    let summaryY = currentY + 5;
    
    // Total Charges
    pdf.text('Total Charges:', pageWidth - margin - 58, summaryY);
    pdf.text(`₹ ${inr(financials.grossTotal)}`, pageWidth - margin - 2, summaryY, { align: 'right' });
    
    // Total Payments
    summaryY += 7;
    pdf.text('Total Payments:', pageWidth - margin - 58, summaryY);
    pdf.text(`₹ ${inr(financials.paymentsTotal)}`, pageWidth - margin - 2, summaryY, { align: 'right' });
    
    // Balance Due (highlighted)
    summaryY += 7;
    pdf.setFillColor(240, 240, 240);
    pdf.rect(pageWidth - margin - 60, summaryY - 4, 60, 10, 'F');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10);
    pdf.text('BALANCE DUE:', pageWidth - margin - 58, summaryY + 2);
    pdf.text(`₹ ${inr(financials.balanceDue)}`, pageWidth - margin - 2, summaryY + 2, { align: 'right' });
    pdf.setFont('helvetica', 'normal');
    
    currentY += 35;
    
    // Amount in words
    pdf.setDrawColor(0);
    pdf.setLineWidth(0.3);
    pdf.rect(margin, currentY, contentWidth, 10);
    pdf.setFontSize(9);
    pdf.text(`Amount in Words (Balance Due): ${amountInWords(financials.balanceDue)}`, margin + 2, currentY + 6);
    
    currentY += 12;
  };
  
  // Add terms and conditions
  const addTermsAndConditions = () => {
    // Check if we need a new page
    if (currentY > pageHeight - 60) {
      pdf.addPage();
      currentY = margin;
      addContinuationHeader();
    }
    
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Terms & Conditions:', margin, currentY);
    pdf.setFont('helvetica', 'normal');
    
    currentY += 4;
    const terms = [
      '1. Check-in time is 2:00 PM and check-out time is 12:00 PM',
      '2. Valid ID proof is mandatory at the time of check-in',
      '3. All disputes are subject to Manali jurisdiction'
    ];
    
    terms.forEach((term, index) => {
      pdf.text(term, margin + 2, currentY + (index * 4));
    });
    
    currentY += terms.length * 4 + 5;
  };
  
  // Add signatures
  const addSignatures = () => {
    // Check if we need a new page
    if (currentY > pageHeight - 40) {
      pdf.addPage();
      currentY = margin;
      addContinuationHeader();
    }
    
    // Signature lines
    const signatureY = currentY + 20;
    
    // Guest signature
    pdf.line(margin, signatureY, margin + 50, signatureY);
    pdf.setFontSize(9);
    pdf.text('Guest Signature', margin + 25, signatureY + 4, { align: 'center' });
    
    // Company signature
    pdf.line(pageWidth - margin - 50, signatureY, pageWidth - margin, signatureY);
    pdf.text(`For ${company.name}`, pageWidth - margin - 25, signatureY + 4, { align: 'center' });
    pdf.text('(Authorized Signatory)', pageWidth - margin - 25, signatureY + 8, { align: 'center' });
    
    currentY = signatureY + 15;
    
    // Footer note
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'italic');
    pdf.text('Thank you for staying with us. We look forward to welcoming you again.', 
      pageWidth / 2, currentY, { align: 'center' });
  };
  
  // Build the PDF
  addMainHeader();
  addInvoiceInfo();
  addStayDetails();
  addChargesAndPayments();
  addSummary();
  addTermsAndConditions();
  addSignatures();
  
  // Add page numbers to all pages
  const totalPages = pdf.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    pdf.setFontSize(9);
    pdf.setTextColor(100);
    pdf.text(
      `Page ${i} of ${totalPages}`,
      pageWidth - margin,
      pageHeight - 10,
      { align: 'right' }
    );
  }
  
  return pdf;
};

// Export function to save the PDF
export const saveInvoicePDF = (data: InvoicePDFData, filename?: string) => {
  const pdf = generateInvoicePDF(data);
  const defaultFilename = `invoice-${data.invoiceNumber}-${data.booking.guestName.replace(/\s+/g, '-')}.pdf`;
  pdf.save(filename || defaultFilename);
};

// Export function to get PDF as blob (for preview or email)
export const getInvoicePDFBlob = async (data: InvoicePDFData): Promise<Blob> => {
  const pdf = generateInvoicePDF(data);
  return pdf.output('blob');
};

// Export function to open PDF in new tab
export const openInvoicePDFInNewTab = (data: InvoicePDFData) => {
  const pdf = generateInvoicePDF(data);
  const pdfDataUri = pdf.output('datauristring');
  const newWindow = window.open();
  if (newWindow) {
    newWindow.document.write(`<iframe width='100%' height='100%' src='${pdfDataUri}'></iframe>`);
  }
};