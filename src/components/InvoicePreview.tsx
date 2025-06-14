import React from 'react';
import { InvoiceData } from '../types/invoice';

interface InvoicePreviewProps {
  data: InvoiceData;
}

export const InvoicePreview: React.FC<InvoicePreviewProps> = ({ data }) => {
  // Calculate tariff and GST from grand total
  // Grand Total = Room Charges + CGST + SGST
  // Grand Total = Room Charges + (Room Charges * 0.06) + (Room Charges * 0.06)
  // Grand Total = Room Charges * (1 + 0.06 + 0.06) = Room Charges * 1.12
  const roomCharges = data.grandTotal / 1.12;
  const cgstAmount = roomCharges * 0.06;
  const sgstAmount = roomCharges * 0.06;
  const tariff = roomCharges / data.noOfDays;
  const balance = data.grandTotal - data.paymentAmount;

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    // Parse the date string directly without timezone conversion
    // Assuming dateString is in YYYY-MM-DD format from date input
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
  };

  const formatDateTime = (dateTimeString: string) => {
    if (!dateTimeString) return '';
    // If it's already in the correct format (dd/mm/yyyy hh:mm:ss AM/PM), return as is
    if (dateTimeString.includes('/') && (dateTimeString.includes('AM') || dateTimeString.includes('PM'))) {
      return dateTimeString;
    }
    
    // Check if it's a datetime-local format (YYYY-MM-DDTHH:MM)
    if (dateTimeString.includes('T')) {
      const [datePart, timePart] = dateTimeString.split('T');
      const [year, month, day] = datePart.split('-');
      const [hours, minutes] = timePart.split(':');
      
      // Convert to 12-hour format
      const hour24 = parseInt(hours);
      const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
      const ampm = hour24 >= 12 ? 'PM' : 'AM';
      
      return `${day}/${month}/${year} ${hour12.toString().padStart(2, '0')}:${minutes}:00 ${ampm}`;
    }
    
    // If it's just a date (YYYY-MM-DD), format as date only
    if (dateTimeString.includes('-') && !dateTimeString.includes(':')) {
      const [year, month, day] = dateTimeString.split('-');
      return `${day}/${month}/${year}`;
    }
    
    // Fallback: parse as date and format to IST format (for legacy data)
    const date = new Date(dateTimeString);
    const istTime = new Date(date.toLocaleString("en-US", {timeZone: "Asia/Kolkata"}));
    
    const day = istTime.getDate().toString().padStart(2, '0');
    const month = (istTime.getMonth() + 1).toString().padStart(2, '0');
    const year = istTime.getFullYear();
    
    const timeString = istTime.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
    
    return `${day}/${month}/${year} ${timeString}`;
  };

  const formatTime = (timeString: string) => {
    if (!timeString) return '';
    // Parse the time string (assuming HH:MM format)
    const [hours, minutes] = timeString.split(':');
    const date = new Date();
    date.setHours(parseInt(hours), parseInt(minutes), 0);
    
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  };

  const formatAmount = (amount: number): string => {
    return amount.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  const numberToWords = (num: number): string => {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const thousands = ['', 'Thousand', 'Lakh', 'Crore'];

    if (num === 0) return 'Zero';

    let result = '';
    let thousandCounter = 0;

    while (num > 0) {
      let chunk = num % 1000;
      if (chunk !== 0) {
        let chunkStr = '';
        
        if (chunk >= 100) {
          chunkStr += ones[Math.floor(chunk / 100)] + ' Hundred ';
          chunk %= 100;
        }
        
        if (chunk >= 20) {
          chunkStr += tens[Math.floor(chunk / 10)] + ' ';
          chunk %= 10;
        } else if (chunk >= 10) {
          chunkStr += teens[chunk - 10] + ' ';
          chunk = 0;
        }
        
        if (chunk > 0) {
          chunkStr += ones[chunk] + ' ';
        }
        
        result = chunkStr + thousands[thousandCounter] + ' ' + result;
      }
      
      num = Math.floor(num / 1000);
      thousandCounter++;
    }

    return result.trim();
  };

  return (
    <div className="invoice-preview bg-white p-4 max-w-4xl mx-auto" id="invoice-preview" style={{ fontSize: '10px' }}>
      {/* Header */}
      <div className="border-2 border-black mb-0">
        <div className="text-center py-3 border-b-2 border-black">
          <h1 className="text-sm font-bold">{data.companyName}</h1>
          <p style={{ fontSize: '10px' }}>{data.companyAddress}</p>
          <p style={{ fontSize: '10px' }}>Phone: {data.companyPhone}; Email: {data.companyEmail}</p>
        </div>
        
        <div className="text-center py-2 border-b-2 border-black">
          <h2 className="font-bold" style={{ fontSize: '12px' }}>I N V O I C E</h2>
        </div>

        {/* Invoice Details */}
        <div className="p-3 border-b-2 border-black">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '2px' }}>
                <span className="font-semibold" style={{fontWeight: 'bold'}}>Folio No/Res. No.</span>
                <span>: {data.invoiceNumber}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '2px' }}>
                <span className="font-semibold" style={{fontWeight: 'bold'}}>Guest Name</span>
                <span>: {data.guestName}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '2px' }}>
                <span className="font-semibold" style={{fontWeight: 'bold'}}>Bill To</span>
                <span>: {data.billTo}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '2px' }}>
                <span className="font-semibold" style={{fontWeight: 'bold'}}>Address</span>
                <span>: {data.address}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '2px' }}>
                <span className="font-semibold" style={{fontWeight: 'bold'}}>Company Name</span>
                <span>: {data.companyNameBillTo}</span>
              </div>
            </div>
            <div className="space-y-1">
              <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: '2px' }}>
                <span className="font-semibold" style={{fontWeight: 'bold'}}>Date</span>
                <span>: {formatDateTime(data.date)}</span>
              </div>
              <div className="opacity-0">
                <span>&nbsp;</span>
              </div>
              <div className="opacity-0">
                <span>&nbsp;</span>
              </div>
              <div className="opacity-0">
                <span>&nbsp;</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: '2px' }}>
                <span className="font-semibold" style={{fontWeight: 'bold'}}>Bill To Reg No.</span>
                <span>: {data.billToRegNo || '-'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Guest Details Table */}
        <div className="border-b-2 border-black">
          <table className="w-full" style={{ tableLayout: 'fixed', fontSize: '10px' }}>
            <colgroup>
              <col style={{ width: '25%' }} />
              <col style={{ width: '15%' }} />
              <col style={{ width: '20%' }} />
              <col style={{ width: '17%' }} />
              <col style={{ width: '23%' }} />
            </colgroup>
            <thead>
              <tr className="border-b border-black">
                <th className="border-r border-black p-2 text-left">Nationality</th>
                <th className="border-r border-black p-2 text-center">No of Pax</th>
                <th className="border-r border-black p-2 text-center">Adult / Child</th>
                <th className="border-r border-black p-2 text-center">No of Rooms</th>
                <th className="p-2 text-center">Room No</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border-r border-black p-2">India</td>
                <td className="border-r border-black p-2 text-center">{data.noOfPax}</td>
                <td className="border-r border-black p-2 text-center">{data.adultChild}</td>
                <td className="border-r border-black p-2 text-center">{data.grCardNo || '-'}</td>
                <td className="p-2 text-center">{data.roomNo}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Arrival/Departure Details */}
        <div className="border-b-2 border-black">
          <table className="w-full" style={{ tableLayout: 'fixed', fontSize: '10px' }}>
            <colgroup>
              <col style={{ width: '25%' }} />
              <col style={{ width: '15%' }} />
              <col style={{ width: '20%' }} />
              <col style={{ width: '17%' }} />
              <col style={{ width: '11.5%' }} />
              <col style={{ width: '11.5%' }} />
            </colgroup>
            <tbody>
              <tr className="border-b border-black">
                <td className="border-r border-black p-1" style={{fontWeight: 'bold'}}>Date of Arrival</td>
                <td className="border-r border-black p-1 text-center">{formatDate(data.dateOfArrival)}</td>
                <td className="border-r border-black p-1" style={{fontWeight: 'bold'}}>Time of Arrival</td>
                <td className="border-r border-black p-1 text-center">{formatTime(data.timeOfArrival)}</td>
                <td className="border-r border-black p-1" style={{fontWeight: 'bold'}}>Tariff</td>
                <td className="p-1 text-center">{formatAmount(tariff)}</td>
              </tr>
              <tr>
                <td className="border-r border-black p-1" style={{fontWeight: 'bold'}}>Date of Departure</td>
                <td className="border-r border-black p-1 text-center">{formatDate(data.dateOfDeparture)}</td>
                <td className="border-r border-black p-1" style={{fontWeight: 'bold'}}>Time of Departure</td>
                <td className="border-r border-black p-1 text-center">{formatTime(data.timeOfDeparture)}</td>
                <td className="border-r border-black p-1" style={{fontWeight: 'bold'}}>No of Days</td>
                <td className="p-1 text-center">{data.noOfDays}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Charges Table */}
        <div className="border-b-2 border-black">
          <table className="w-full" style={{ fontSize: '10px' }}>
            <thead>
              <tr className="border-b border-black">
                <th className="border-r border-black p-1 text-center w-12">Sr.No.</th>
                <th className="border-r border-black p-1 text-left">Particular</th>
                <th className="p-1 text-right" style={{paddingRight: '10px'}}>Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-black">
                <td className="border-r border-black p-1 text-center">1</td>
                <td className="border-r border-black p-1">
                  <div className='font-semibold'>Room Charges</div>
                  <div className="pl-2">Room Charges</div>
                  <div className="pl-2">CGST @ slab 6.00 %</div>
                  <div className="pl-2">SGST @ slab 6.00 %</div>
                </td>
                <td className="p-1 text-right">
                  <div className="mb-2">&nbsp;</div>
                  <div style={{paddingRight: '10px'}}>{formatAmount(roomCharges)}</div>
                  <div style={{paddingRight: '10px'}}>{formatAmount(cgstAmount)}</div>
                  <div style={{paddingRight: '10px'}}>{formatAmount(sgstAmount)}</div>
                  <div className="border-t border-black pt-0.5 font-semibold" style={{paddingRight: '10px'}}>
                    Total: {formatAmount(data.grandTotal)}
                  </div>
                </td>
              </tr>
              <tr>
                <td className="border-r border-black p-1 text-center">2</td>
                <td className="border-r border-black p-1">
                  <div className='font-semibold'>Payment</div>
                  <div className="pl-2">{data.paymentMethod}</div>
                </td>
                <td className="p-1 text-right">
                  <div className="mb-2">&nbsp;</div>
                  <div style={{paddingRight: '10px'}}>-{formatAmount(data.paymentAmount)}</div>
                  <div className="border-t border-black pt-0.5 font-semibold" style={{paddingRight: '10px'}}>
                    Total: -{formatAmount(data.paymentAmount)}
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Empty space for additional items */}
        <div className="border-b-2 border-black" style={{ height: '280px' }}>
          {/* Empty space to fill letter page size */}
        </div>

        {/* Amount in Words and Totals - Single Row */}
        <div className="border-b-2 border-black">
          <table className="w-full" style={{ fontSize: '10px' }}>
            <tbody>
              <tr>
                <td className="border-r border-black" style={{ width: '50%', verticalAlign: 'top', padding: '3px 4px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', marginTop: '0px' }}>
                    <span className="font-semibold">This Invoice is in : Rs</span>
                    <span style={{ marginLeft: '4px', borderBottom: '1px solid black', flex: '1', textAlign: 'center', paddingBottom: '2px' }}>
                      {numberToWords(Math.floor(data.grandTotal))}
                    </span>
                  </div>
                </td>
                <td style={{ width: '50%', padding: '3px 4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="font-semibold">Grand Total</span>
                    <span style={{paddingRight: '10px'}}>{formatAmount(data.grandTotal)}</span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Signature Section */}
        <div className="border-b-2 border-black">
          <table className="w-full" style={{ fontSize: '10px' }}>
            <tbody>
              {/* Row 1: For M/S and Total Paid */}
              <tr>
                <td className="border-r border-black p-1" style={{ width: '50%', borderBottom: 'none' }}>
                  For M/S {data.companyName}
                </td>
                <td className="p-1" style={{  display: 'flex', justifyContent: 'space-between' }}>
                  <span className="font-semibold">Total Paid:</span>
                  <span style={{ paddingRight: '10px' }}>{formatAmount(data.paymentAmount)}</span>
                </td>
              </tr>
              
              {/* Row 2: Empty and Balance */}
              <tr>
                <td className="border-r border-black p-1" style={{ borderBottom: 'none' }}>
                  &nbsp;
                </td>
                <td className="p-1" style={{ borderTop: '2px solid black', borderBottom: '2px solid black', display: 'flex', justifyContent: 'space-between' }}>
                  <span className="font-semibold">Balance:</span>
                  <span style={{ paddingRight: '10px' }}>{formatAmount(balance)}</span>
                </td>
              </tr>
              
              {/* Row 3: Empty */}
              <tr>
                <td className="border-r border-black" style={{ borderBottom: 'none', padding: '6px 4px' }}>
                  &nbsp;
                </td>
                <td style={{ borderBottom: 'none', padding: '10px 4px' }}>
                  &nbsp;
                </td>
              </tr>
              
              {/* Row 4: Authorized Signature and Guest Signature */}
              <tr>
                <td className="border-r border-black p-1" style={{ borderBottom: 'none' }}>
                  <div className="font-semibold">Authorized Signature</div>
                </td>
                <td className="p-1 text-center" style={{ borderBottom: 'none' }}>
                  ( Guest Signature )
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="text-center p-2 border-b-2 border-black">
          <p style={{ fontSize: '10px' }}>Thank you for your stay with us. Please visit us again.</p>
        </div>

        <div className="flex justify-between p-2" style={{ fontSize: '10px' }}>
          <span>Reserved By: admin</span>
          <span style={{paddingRight: '10px'}}>Page 1 of 1</span>
        </div>
      </div>
    </div>
  );
};