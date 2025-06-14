import React, { useState } from 'react';
import { CancellationInvoiceData } from '../types/invoice';

interface CancellationInvoiceFormProps {
  data: CancellationInvoiceData;
  onDataChange: (data: CancellationInvoiceData) => void;
  folioNumber: string;
}

export const CancellationInvoiceForm: React.FC<CancellationInvoiceFormProps> = ({ data: initialData, onDataChange, folioNumber }) => {
  const getCurrentISTTime = () => {
    const now = new Date();
    const istTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Kolkata"}));
    
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

  const [data, setData] = useState<CancellationInvoiceData>(initialData);

  const calculateDays = (arrival: string, departure: string): number => {
    if (!arrival || !departure) return 0;
    
    const arrivalDate = new Date(arrival);
    const departureDate = new Date(departure);
    
    if (departureDate <= arrivalDate) return 0;
    
    const timeDifference = departureDate.getTime() - arrivalDate.getTime();
    const dayDifference = Math.ceil(timeDifference / (1000 * 3600 * 24));
    
    return dayDifference;
  };

  const handleInputChange = (field: keyof CancellationInvoiceData, value: string | number) => {
    const updatedData = { ...data, [field]: value };
    
    // Calculate number of days when dates change
    if (field === 'dateOfArrival' || field === 'dateOfDeparture') {
      updatedData.noOfDays = calculateDays(
        field === 'dateOfArrival' ? value as string : updatedData.dateOfArrival,
        field === 'dateOfDeparture' ? value as string : updatedData.dateOfDeparture
      );
    }
    
    setData(updatedData);
    onDataChange(updatedData);
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg">
      <h2 className="text-xl font-bold mb-4">Cancellation Invoice Details</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Company Details */}
        <div>
          <label className="block text-sm font-medium mb-1">Company Name:</label>
          <input
            type="text"
            value={data.companyName}
            onChange={(e) => handleInputChange('companyName', e.target.value)}
            className="w-full p-2 border rounded"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Folio No/Res. No:</label>
          <input
            type="text"
            value={data.invoiceNumber}
            onChange={(e) => handleInputChange('invoiceNumber', e.target.value)}
            className="w-full p-2 border rounded"
          />
        </div>

        {/* Guest Details */}
        <div>
          <label className="block text-sm font-medium mb-1">Guest Name:</label>
          <input
            type="text"
            value={data.guestName}
            onChange={(e) => handleInputChange('guestName', e.target.value)}
            className="w-full p-2 border rounded"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Bill To:</label>
          <input
            type="text"
            value={data.billTo}
            onChange={(e) => handleInputChange('billTo', e.target.value)}
            className="w-full p-2 border rounded"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Address:</label>
          <input
            type="text"
            value={data.address}
            onChange={(e) => handleInputChange('address', e.target.value)}
            className="w-full p-2 border rounded"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Company Name (Bill To):</label>
          <input
            type="text"
            value={data.companyNameBillTo}
            onChange={(e) => handleInputChange('companyNameBillTo', e.target.value)}
            className="w-full p-2 border rounded"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Bill To Reg No:</label>
          <input
            type="text"
            value={data.billToRegNo}
            onChange={(e) => handleInputChange('billToRegNo', e.target.value)}
            className="w-full p-2 border rounded"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Room No:</label>
          <input
            type="text"
            value={data.roomNo}
            onChange={(e) => handleInputChange('roomNo', e.target.value)}
            className="w-full p-2 border rounded"
          />
        </div>

        {/* Date Fields */}
        <div>
          <label className="block text-sm font-medium mb-1">Invoice Date:</label>
          <input
            type="datetime-local"
            value={data.date.includes('/') ? '' : data.date}
            onChange={(e) => handleInputChange('date', e.target.value)}
            className="w-full p-2 border rounded"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Booking Date:</label>
          <input
            type="datetime-local"
            value={data.cancellationDate.includes('/') ? '' : data.cancellationDate}
            onChange={(e) => handleInputChange('cancellationDate', e.target.value)}
            className="w-full p-2 border rounded"
          />
        </div>

        {/* Guest Details */}
        <div>
          <label className="block text-sm font-medium mb-1">No of Pax:</label>
          <input
            type="number"
            value={data.noOfPax === 0 ? '' : data.noOfPax}
            onChange={(e) => handleInputChange('noOfPax', parseInt(e.target.value) || 0)}
            placeholder="Enter number of guests"
            className="w-full p-2 border rounded"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Adult/Child:</label>
          <input
            type="text"
            value={data.adultChild}
            onChange={(e) => handleInputChange('adultChild', e.target.value)}
            className="w-full p-2 border rounded"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">No of Rooms:</label>
          <input
            type="number"
            value={data.grCardNo === '' ? '' : data.grCardNo}
            onChange={(e) => handleInputChange('grCardNo', e.target.value)}
            placeholder="Enter number of rooms"
            className="w-full p-2 border rounded"
          />
        </div>

        {/* Dates and Times */}
        <div>
          <label className="block text-sm font-medium mb-1">Date of Arrival:</label>
          <input
            type="date"
            value={data.dateOfArrival}
            onChange={(e) => handleInputChange('dateOfArrival', e.target.value)}
            className="w-full p-2 border rounded"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Date of Departure:</label>
          <input
            type="date"
            value={data.dateOfDeparture}
            onChange={(e) => handleInputChange('dateOfDeparture', e.target.value)}
            className="w-full p-2 border rounded"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Time of Arrival:</label>
          <input
            type="time"
            value={data.timeOfArrival}
            onChange={(e) => handleInputChange('timeOfArrival', e.target.value)}
            className="w-full p-2 border rounded"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Time of Departure:</label>
          <input
            type="time"
            value={data.timeOfDeparture}
            onChange={(e) => handleInputChange('timeOfDeparture', e.target.value)}
            className="w-full p-2 border rounded"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">No of Days:</label>
          <input
            type="number"
            value={data.noOfDays === 0 ? '' : data.noOfDays}
            readOnly
            placeholder="Auto-calculated from dates"
            className="w-full p-2 border rounded bg-gray-100"
          />
        </div>

        {/* Financial Details */}
        <div>
          <label className="block text-sm font-medium mb-1">Original Booking Amount:</label>
          <input
            type="number"
            step="0.01"
            value={data.originalBookingAmount === 0 ? '' : data.originalBookingAmount}
            onChange={(e) => handleInputChange('originalBookingAmount', parseFloat(e.target.value) || 0)}
            placeholder="Enter original booking amount"
            className="w-full p-2 border rounded"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Total Paid:</label>
          <input
            type="number"
            step="0.01"
            value={data.totalPaid === 0 ? '' : data.totalPaid}
            onChange={(e) => handleInputChange('totalPaid', parseFloat(e.target.value) || 0)}
            placeholder="Enter amount paid by guest"
            className="w-full p-2 border rounded"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Cancellation Charges:</label>
          <input
            type="number"
            step="0.01"
            value={data.cancellationCharges === 0 ? '' : data.cancellationCharges}
            onChange={(e) => handleInputChange('cancellationCharges', parseFloat(e.target.value) || 0)}
            placeholder="Enter cancellation charges"
            className="w-full p-2 border rounded"
          />
        </div>



        <div>
          <label className="block text-sm font-medium mb-1">Payment Method:</label>
          <select
            value={data.paymentMethod}
            onChange={(e) => handleInputChange('paymentMethod', e.target.value)}
            className="w-full p-2 border rounded"
          >
            <option value="Cash">Cash</option>
            <option value="Card">Card</option>
            <option value="UPI">UPI</option>
            <option value="Bank Transfer">Bank Transfer</option>
            <option value="Cheque">Cheque</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Cancellation Reason:</label>
          <select
            value={data.cancellationReason}
            onChange={(e) => handleInputChange('cancellationReason', e.target.value)}
            className="w-full p-2 border rounded"
          >
            <option value="Customer Request">Customer Request</option>
            <option value="Emergency">Emergency</option>
            <option value="Change of Plans">Change of Plans</option>
            <option value="Health Issues">Health Issues</option>
            <option value="Weather Conditions">Weather Conditions</option>
            <option value="Other">Other</option>
          </select>
        </div>
      </div>
    </div>
  );
}; 