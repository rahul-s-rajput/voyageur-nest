import React, { useState } from 'react';
import { X, Plus, Minus } from 'lucide-react';
import { Booking } from '../types/booking';
import { createBookingWithValidation } from '../lib/supabase';

interface NewBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBookingCreated: (booking: Booking) => void;
}

export const NewBookingModal: React.FC<NewBookingModalProps> = ({
  isOpen,
  onClose,
  onBookingCreated,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [roomNumbers, setRoomNumbers] = useState<string[]>(['']);
  const [formData, setFormData] = useState({
    guestName: '',
    roomNo: '',
    numberOfRooms: 1,
    checkIn: '',
    checkOut: '',
    noOfPax: 1,
    adults: 1,
    children: 0,
    status: 'confirmed' as const,
    totalAmount: '',
    paymentStatus: 'unpaid' as 'paid' | 'partial' | 'unpaid',
    paymentAmount: 0,
    paymentMode: '',
    contactPhone: '',
    contactEmail: '',
    specialRequests: '',
    bookingDate: new Date().toISOString().split('T')[0],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setValidationErrors([]);

    // Validate that guests = adults + children
    if (formData.noOfPax !== (formData.adults + formData.children)) {
      setValidationErrors([`Number of guests (${formData.noOfPax}) must equal Adults (${formData.adults}) + Children (${formData.children}) = ${formData.adults + formData.children}`]);
      setIsLoading(false);
      return;
    }

    try {
      const bookingData = {
        ...formData,
        roomNo: formData.numberOfRooms > 1 ? roomNumbers.filter(room => room.trim()).join(', ') : formData.roomNo,
        adultChild: `${formData.adults}/${formData.children}`,
        totalAmount: parseFloat(formData.totalAmount) || 0,
        cancelled: false,
      };

      const result = await createBookingWithValidation(bookingData);

      if (result.success && result.booking) {
        onBookingCreated(result.booking);
        onClose();
        // Reset form
        setFormData({
          guestName: '',
          roomNo: '',
          numberOfRooms: 1,
          checkIn: '',
          checkOut: '',
          noOfPax: 1,
          adults: 1,
          children: 0,
          status: 'confirmed',
          totalAmount: '',
          paymentStatus: 'unpaid' as 'paid' | 'partial' | 'unpaid',
          paymentAmount: 0,
          paymentMode: '',
          contactPhone: '',
          contactEmail: '',
          specialRequests: '',
          bookingDate: new Date().toISOString().split('T')[0],
        });
        setRoomNumbers(['']);
      } else if (result.errors) {
        setValidationErrors(result.errors);
      }
    } catch (error) {
      console.error('Error creating booking:', error);
      setValidationErrors(['An unexpected error occurred. Please try again.']);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNumberOfRoomsChange = (increment: boolean) => {
    const newCount = increment ? formData.numberOfRooms + 1 : Math.max(1, formData.numberOfRooms - 1);
    setFormData(prev => ({ 
      ...prev, 
      numberOfRooms: newCount,
      // Ensure number of guests is at least equal to number of rooms
      noOfPax: Math.max(newCount, prev.noOfPax)
    }));
    
    // Update room numbers array
    if (newCount > roomNumbers.length) {
      setRoomNumbers(prev => [...prev, ...Array(newCount - prev.length).fill('')]);
    } else if (newCount < roomNumbers.length) {
      setRoomNumbers(prev => prev.slice(0, newCount));
    }
  };

  const handleNumberOfGuestsChange = (increment: boolean) => {
    const newCount = increment ? formData.noOfPax + 1 : Math.max(formData.numberOfRooms, formData.noOfPax - 1);
    setFormData(prev => {
      // Auto-adjust adults/children to match total guests
      const newAdults = Math.min(prev.adults, newCount);
      const newChildren = Math.max(0, newCount - newAdults);
      
      return { 
        ...prev, 
        noOfPax: newCount,
        adults: newAdults,
        children: newChildren
      };
    });
  };

  const handleAdultsChange = (increment: boolean) => {
    setFormData(prev => {
      const newAdults = increment ? prev.adults + 1 : Math.max(1, prev.adults - 1);
      const totalGuests = newAdults + prev.children;
      return {
        ...prev,
        adults: newAdults,
        noOfPax: Math.max(totalGuests, prev.numberOfRooms)
      };
    });
  };

  const handleChildrenChange = (increment: boolean) => {
    setFormData(prev => {
      const newChildren = increment ? prev.children + 1 : Math.max(0, prev.children - 1);
      const totalGuests = prev.adults + newChildren;
      return {
        ...prev,
        children: newChildren,
        noOfPax: Math.max(totalGuests, prev.numberOfRooms)
      };
    });
  };

  const handleRoomNumberChange = (index: number, value: string) => {
    setRoomNumbers(prev => {
      const newRoomNumbers = [...prev];
      newRoomNumbers[index] = value;
      return newRoomNumbers;
    });
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    
    setFormData(prev => {
      let newData = {
        ...prev,
        [name]: name === 'noOfPax' || name === 'totalAmount' || name === 'paymentAmount' || name === 'numberOfRooms' || name === 'adults' || name === 'children'
          ? parseFloat(value) || 0 
          : value,
      };

      // Ensure number of guests is at least equal to number of rooms
      if (name === 'noOfPax') {
        newData.noOfPax = Math.max(prev.numberOfRooms, parseFloat(value) || 0);
        // Auto-adjust adults/children to match total guests
        const totalGuests = newData.noOfPax;
        const newAdults = Math.min(prev.adults, totalGuests);
        const newChildren = Math.max(0, totalGuests - newAdults);
        newData.adults = newAdults;
        newData.children = newChildren;
      }
      if (name === 'numberOfRooms') {
        const roomCount = parseFloat(value) || 1;
        newData.numberOfRooms = Math.max(1, roomCount);
        newData.noOfPax = Math.max(roomCount, prev.noOfPax);
      }
      if (name === 'adults') {
        const adults = Math.max(1, parseFloat(value) || 1);
        newData.adults = adults;
        const totalGuests = adults + prev.children;
        newData.noOfPax = Math.max(totalGuests, prev.numberOfRooms);
      }
      if (name === 'children') {
        const children = Math.max(0, parseFloat(value) || 0);
        newData.children = children;
        const totalGuests = prev.adults + children;
        newData.noOfPax = Math.max(totalGuests, prev.numberOfRooms);
      }

      // Auto-update payment status based on payment amount
      if (name === 'paymentAmount') {
        const paymentAmount = parseFloat(value) || 0;
        const totalAmount = parseFloat(prev.totalAmount) || 0;
        
        if (paymentAmount === 0) {
          newData.paymentStatus = 'unpaid';
        } else if (paymentAmount >= totalAmount && totalAmount > 0) {
          newData.paymentStatus = 'paid';
        } else {
          newData.paymentStatus = 'partial';
        }
      }

      // If payment status is changed to 'paid', set payment amount to total amount
      if (name === 'paymentStatus' && value === 'paid') {
        newData.paymentAmount = parseFloat(prev.totalAmount) || 0;
      }

      // If payment status is changed to 'unpaid', reset payment amount
      if (name === 'paymentStatus' && value === 'unpaid') {
        newData.paymentAmount = 0;
        newData.paymentMode = '';
      }

      return newData;
    });
    
    // Clear validation errors when user starts typing
    if (validationErrors.length > 0) {
      setValidationErrors([]);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">New Booking</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            disabled={isLoading}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Validation Errors */}
        {validationErrors.length > 0 && (
          <div className="mx-6 mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <h3 className="text-sm font-medium text-red-800 mb-2">Please fix the following errors:</h3>
            <ul className="text-sm text-red-700 space-y-1">
              {validationErrors.map((error, index) => (
                <li key={index} className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>{error}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-8">
          {/* Guest Information Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
              Guest Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Guest Name *
                </label>
                <input
                  type="text"
                  name="guestName"
                  value={formData.guestName}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                  disabled={isLoading}
                  placeholder="Enter guest name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contact Phone
                </label>
                <input
                  type="tel"
                  name="contactPhone"
                  value={formData.contactPhone}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isLoading}
                  placeholder="Enter phone number"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contact Email
                </label>
                <input
                  type="email"
                  name="contactEmail"
                  value={formData.contactEmail}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isLoading}
                  placeholder="Enter email address"
                />
              </div>
            </div>
          </div>

          {/* Room & Guest Details Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
              Room & Guest Details
            </h3>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Column 1: Room Details */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Number of Rooms *
                  </label>
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => handleNumberOfRoomsChange(false)}
                      disabled={formData.numberOfRooms <= 1 || isLoading}
                      className="p-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="px-4 py-2 border border-gray-300 rounded-md bg-gray-50 min-w-[60px] text-center">
                      {formData.numberOfRooms}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleNumberOfRoomsChange(true)}
                      disabled={isLoading}
                      className="p-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Adults *
                  </label>
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => handleAdultsChange(false)}
                      disabled={formData.adults <= 1 || isLoading}
                      className="p-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="px-4 py-2 border border-gray-300 rounded-md bg-gray-50 min-w-[60px] text-center">
                      {formData.adults}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleAdultsChange(true)}
                      disabled={isLoading}
                      className="p-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Column 2: Guest Details */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Number of Guests *
                  </label>
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => handleNumberOfGuestsChange(false)}
                      disabled={formData.noOfPax <= formData.numberOfRooms || isLoading}
                      className="p-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="px-4 py-2 border border-gray-300 rounded-md bg-gray-50 min-w-[60px] text-center">
                      {formData.noOfPax}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleNumberOfGuestsChange(true)}
                      disabled={formData.noOfPax >= 10 || isLoading}
                      className="p-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  {formData.noOfPax !== (formData.adults + formData.children) && (
                    <p className="text-xs text-red-500 mt-1">
                      Guests ({formData.noOfPax}) must equal Adults ({formData.adults}) + Children ({formData.children}) = {formData.adults + formData.children}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Children
                  </label>
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => handleChildrenChange(false)}
                      disabled={formData.children <= 0 || isLoading}
                      className="p-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="px-4 py-2 border border-gray-300 rounded-md bg-gray-50 min-w-[60px] text-center">
                      {formData.children}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleChildrenChange(true)}
                      disabled={isLoading}
                      className="p-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Column 3: Room Numbers */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Room Number{formData.numberOfRooms > 1 ? 's' : ''} *
                </label>
                {formData.numberOfRooms === 1 ? (
                  <input
                    type="text"
                    name="roomNo"
                    value={formData.roomNo}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                    disabled={isLoading}
                    placeholder="Enter room number"
                  />
                ) : (
                  <div className="space-y-2">
                    {roomNumbers.map((roomNo, index) => (
                      <input
                        key={index}
                        type="text"
                        value={roomNo}
                        onChange={(e) => handleRoomNumberChange(index, e.target.value)}
                        placeholder={`Room ${index + 1}`}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                        disabled={isLoading}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Stay Details Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
              Stay Details
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Check-in Date *
                </label>
                <input
                  type="date"
                  name="checkIn"
                  value={formData.checkIn}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                  disabled={isLoading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Check-out Date *
                </label>
                <input
                  type="date"
                  name="checkOut"
                  value={formData.checkOut}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                  disabled={isLoading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Booking Date
                </label>
                <input
                  type="date"
                  name="bookingDate"
                  value={formData.bookingDate}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isLoading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isLoading}
                >
                  <option value="confirmed">Confirmed</option>
                  <option value="pending">Pending</option>
                  <option value="checked-in">Checked In</option>
                  <option value="checked-out">Checked Out</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Special Requests
                </label>
                <textarea
                  name="specialRequests"
                  value={formData.specialRequests}
                  onChange={handleInputChange}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isLoading}
                  placeholder="Any special requests or notes..."
                />
              </div>
            </div>
          </div>

          {/* Payment Information Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
              Payment Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Total Amount
                </label>
                <input
                  type="number"
                  name="totalAmount"
                  value={formData.totalAmount}
                  onChange={handleInputChange}
                  min="0"
                  step="0.01"
                  placeholder="Enter total amount"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isLoading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Status
                </label>
                <select
                  name="paymentStatus"
                  value={formData.paymentStatus}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isLoading}
                >
                  <option value="unpaid">Unpaid</option>
                  <option value="partial">Partial</option>
                  <option value="paid">Paid</option>
                </select>
              </div>

              {/* Payment Amount - Show for partial payments or when paid */}
              {(formData.paymentStatus === 'partial' || formData.paymentStatus === 'paid') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Payment Amount
                  </label>
                  <input
                    type="number"
                    name="paymentAmount"
                    value={formData.paymentStatus === 'paid' ? (parseFloat(formData.totalAmount) || 0) : formData.paymentAmount}
                    onChange={handleInputChange}
                    min="0"
                    step="0.01"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={isLoading || formData.paymentStatus === 'paid'}
                    placeholder={formData.paymentStatus === 'paid' ? 'Full amount' : 'Enter partial amount'}
                  />
                </div>
              )}

              {/* Payment Mode - Show for partial and paid payments */}
              {(formData.paymentStatus === 'partial' || formData.paymentStatus === 'paid') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Payment Mode
                  </label>
                  <select
                    name="paymentMode"
                    value={formData.paymentMode}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={isLoading}
                  >
                    <option value="">Select payment mode</option>
                    <option value="cash">Cash</option>
                    <option value="card">Card</option>
                    <option value="upi">UPI</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="cheque">Cheque</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading}
            >
              {isLoading ? 'Creating...' : 'Create Booking'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}; 