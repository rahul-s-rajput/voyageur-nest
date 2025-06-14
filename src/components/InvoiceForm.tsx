import React from 'react';
import { InvoiceData } from '../types/invoice';

interface InvoiceFormProps {
  data: InvoiceData;
  onChange: (data: InvoiceData) => void;
}

export const InvoiceForm: React.FC<InvoiceFormProps> = ({ data, onChange }) => {
  const calculateDays = (arrival: string, departure: string): number => {
    if (!arrival || !departure) return 0;
    
    const arrivalDate = new Date(arrival);
    const departureDate = new Date(departure);
    
    if (departureDate <= arrivalDate) return 0;
    
    const timeDifference = departureDate.getTime() - arrivalDate.getTime();
    const dayDifference = Math.ceil(timeDifference / (1000 * 3600 * 24));
    
    return dayDifference;
  };

  const handleChange = (field: keyof InvoiceData, value: string | number) => {
    const updatedData = { ...data, [field]: value };
    
    // Calculate number of days when dates change
    if (field === 'dateOfArrival' || field === 'dateOfDeparture') {
      updatedData.noOfDays = calculateDays(
        field === 'dateOfArrival' ? value as string : updatedData.dateOfArrival,
        field === 'dateOfDeparture' ? value as string : updatedData.dateOfDeparture
      );
    }
    
    onChange(updatedData);
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Invoice Details</h2>
      
      {/* Company Information */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-700 mb-3">Company Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            type="text"
            placeholder="Company Name"
            value={data.companyName}
            onChange={(e) => handleChange('companyName', e.target.value)}
            className="p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <input
            type="text"
            placeholder="Address"
            value={data.companyAddress}
            onChange={(e) => handleChange('companyAddress', e.target.value)}
            className="p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <input
            type="text"
            placeholder="Phone"
            value={data.companyPhone}
            onChange={(e) => handleChange('companyPhone', e.target.value)}
            className="p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <input
            type="email"
            placeholder="Email"
            value={data.companyEmail}
            onChange={(e) => handleChange('companyEmail', e.target.value)}
            className="p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Invoice Header Information */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-700 mb-3">Invoice Header</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            type="text"
            placeholder="Folio No/Res. No."
            value={data.invoiceNumber}
            onChange={(e) => handleChange('invoiceNumber', e.target.value)}
            className="p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <input
            type="datetime-local"
            placeholder="Date"
            value={data.date}
            onChange={(e) => handleChange('date', e.target.value)}
            className="p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <input
            type="text"
            placeholder="Guest Name"
            value={data.guestName}
            onChange={(e) => handleChange('guestName', e.target.value)}
            className="p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <input
            type="text"
            placeholder="Bill To Reg No."
            value={data.billToRegNo}
            onChange={(e) => handleChange('billToRegNo', e.target.value)}
            className="p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <input
            type="text"
            placeholder="Bill To"
            value={data.billTo}
            onChange={(e) => handleChange('billTo', e.target.value)}
            className="p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <input
            type="text"
            placeholder="Address"
            value={data.address}
            onChange={(e) => handleChange('address', e.target.value)}
            className="p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <input
            type="text"
            placeholder="Company Name (Bill To)"
            value={data.companyNameBillTo}
            onChange={(e) => handleChange('companyNameBillTo', e.target.value)}
            className="p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Guest Details */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-700 mb-3">Guest Details</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <input
            type="number"
            placeholder="No of Pax"
            value={data.noOfPax}
            onChange={(e) => handleChange('noOfPax', parseInt(e.target.value) || 0)}
            className="p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <input
            type="text"
            placeholder="Adult/Child"
            value={data.adultChild}
            onChange={(e) => handleChange('adultChild', e.target.value)}
            className="p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <input
            type="text"
            placeholder="G.R. Card No"
            value={data.grCardNo}
            onChange={(e) => handleChange('grCardNo', e.target.value)}
            className="p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <input
            type="text"
            placeholder="Room No"
            value={data.roomNo}
            onChange={(e) => handleChange('roomNo', e.target.value)}
            className="p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <input
            type="number"
            placeholder="Auto-calculated from dates"
            value={data.noOfDays === 0 ? '' : data.noOfDays}
            readOnly
            className="p-3 border border-gray-300 rounded-md bg-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Arrival/Departure */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-700 mb-3">Arrival & Departure</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            type="date"
            placeholder="Date of Arrival"
            value={data.dateOfArrival}
            onChange={(e) => handleChange('dateOfArrival', e.target.value)}
            className="p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <input
            type="date"
            placeholder="Date of Departure"
            value={data.dateOfDeparture}
            onChange={(e) => handleChange('dateOfDeparture', e.target.value)}
            className="p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <input
            type="time"
            placeholder="Time of Arrival"
            value={data.timeOfArrival}
            onChange={(e) => handleChange('timeOfArrival', e.target.value)}
            className="p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <input
            type="time"
            placeholder="Time of Departure"
            value={data.timeOfDeparture}
            onChange={(e) => handleChange('timeOfDeparture', e.target.value)}
            className="p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Financial Details */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-700 mb-3">Financial Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input
            type="number"
            step="0.01"
            placeholder="Grand Total (including GST)"
            value={data.grandTotal}
            onChange={(e) => handleChange('grandTotal', parseFloat(e.target.value) || 0)}
            className="p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <input
            type="number"
            step="0.01"
            placeholder="Payment Amount"
            value={data.paymentAmount}
            onChange={(e) => handleChange('paymentAmount', parseFloat(e.target.value) || 0)}
            className="p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <select
            value={data.paymentMethod}
            onChange={(e) => handleChange('paymentMethod', e.target.value)}
            className="p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="UPI">UPI</option>
            <option value="Cash">Cash</option>
            <option value="Card">Card</option>
            <option value="Bank Transfer">Bank Transfer</option>
          </select>
        </div>
      </div>
    </div>
  );
};