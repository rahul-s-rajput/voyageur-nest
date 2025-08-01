import React, { useState, useEffect } from 'react';
import { X, Edit, Save, XCircle, FileText, Receipt, Plus, Minus, QrCode, User, Phone, Mail, MapPin, CreditCard, Users, Calendar, Clock } from 'lucide-react';
import { Booking } from '../types/booking';
import { CheckInData } from '../types/checkin';
import { InvoiceData, CancellationInvoiceData } from '../types/invoice';
import { updateBookingWithValidation, invoiceCounterService, checkInService } from '../lib/supabase';
import { InvoicePreview } from './InvoicePreview';
import { CancellationInvoicePreview } from './CancellationInvoicePreview';
import { QRCodeGenerator } from './QRCodeGenerator';

interface BookingDetailsProps {
  booking: Booking | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (booking: Booking) => void;
  onCancel: (bookingId: string) => void;
}

export const BookingDetails: React.FC<BookingDetailsProps> = ({
  booking,
  isOpen,
  onClose,
  onUpdate,
  onCancel,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [showInvoice, setShowInvoice] = useState(false);
  const [showCancellationInvoice, setShowCancellationInvoice] = useState(false);
  const [showQRCode, setShowQRCode] = useState(false);
  const [invoiceNumber, setInvoiceNumber] = useState(391);
  const [cancellationInvoiceData, setCancellationInvoiceData] = useState<CancellationInvoiceData | null>(null);
  const [editData, setEditData] = useState<Partial<Booking>>({});
  const [checkInData, setCheckInData] = useState<CheckInData | null>(null);
  const [loadingCheckIn, setLoadingCheckIn] = useState(false);

  useEffect(() => {
    if (booking) {
      setEditData(booking);
      setValidationErrors([]);
      
      // Fetch check-in data for this booking
      const fetchCheckInData = async () => {
        setLoadingCheckIn(true);
        try {
          const data = await checkInService.getCheckInDataByBookingId(booking.id);
          setCheckInData(data);
        } catch (error) {
          console.error('Error fetching check-in data:', error);
          setCheckInData(null);
        } finally {
          setLoadingCheckIn(false);
        }
      };
      
      fetchCheckInData();
    }
  }, [booking]);

  useEffect(() => {
    const loadInvoiceNumber = async () => {
      try {
        const counter = await invoiceCounterService.getCounter();
        setInvoiceNumber(counter);
      } catch (error) {
        console.error('Error loading invoice number:', error);
      }
    };
    loadInvoiceNumber();
  }, []);

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

  const formatDateForDisplay = (dateString: string) => {
    if (!dateString) return 'Not specified';
    
    // If the date is in YYYY-MM-DD format, format it as DD/MM/YYYY
    if (dateString.includes('-') && dateString.length === 10) {
      const [year, month, day] = dateString.split('-');
      return `${day}/${month}/${year}`;
    }
    
    // If it's already in DD/MM/YYYY format, return as is
    if (dateString.includes('/')) {
      return dateString;
    }
    
    // Fallback: try to parse and format
    try {
      const date = new Date(dateString);
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    } catch {
      return dateString; // Return original if parsing fails
    }
  };

  const formatCheckInDataForDisplay = (data: CheckInData) => {
    return {
      personalInfo: {
        name: `${data.firstName} ${data.lastName}`,
        email: data.email,
        phone: data.phone,
        dateOfBirth: data.dateOfBirth,
        nationality: data.nationality,
        idType: data.idType,
        idNumber: data.idNumber
      },
      address: {
        street: data.address,
        city: data.city,
        state: data.state,
        country: data.country,
        zipCode: data.zipCode
      },
      emergencyContact: {
        name: data.emergencyContactName,
        phone: data.emergencyContactPhone,
        relationship: data.emergencyContactRelation
      },
      visitInfo: {
        purpose: data.purposeOfVisit,
        arrivalDate: data.arrivalDate,
        departureDate: data.departureDate,
        roomNumber: data.roomNumber,
        numberOfGuests: data.numberOfGuests,
        specialRequests: data.specialRequests
      },
      preferences: {
        wakeUpCall: data.preferences.wakeUpCall,
        newspaper: data.preferences.newspaper,
        extraTowels: data.preferences.extraTowels,
        extraPillows: data.preferences.extraPillows,
        roomService: data.preferences.roomService,
        doNotDisturb: data.preferences.doNotDisturb
      },
      additionalGuests: data.additionalGuests
    };
  };

  const handleEdit = () => {
    setIsEditing(true);
    setValidationErrors([]);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setValidationErrors([]);
    if (booking) {
      setEditData(booking);
    }
  };

  const handleSave = async () => {
    if (!booking) return;

    setIsLoading(true);
    setValidationErrors([]);

    try {
      const updates = {
        guestName: editData.guestName || '',
        roomNo: editData.roomNo || '',
        numberOfRooms: editData.numberOfRooms || 1,
        checkIn: editData.checkIn || '',
        checkOut: editData.checkOut || '',
        noOfPax: editData.noOfPax || 1,
        adultChild: editData.adultChild || '',
        status: editData.status || 'confirmed',
        totalAmount: editData.totalAmount || booking.totalAmount,
        paymentStatus: editData.paymentStatus || 'unpaid',
        paymentAmount: editData.paymentAmount || 0,
        paymentMode: editData.paymentMode || '',
        contactPhone: editData.contactPhone || '',
        contactEmail: editData.contactEmail || '',
        specialRequests: editData.specialRequests || '',
        bookingDate: editData.bookingDate || '',
      };

      const result = await updateBookingWithValidation(booking.id, updates);

      if (result.success && result.booking) {
        onUpdate(result.booking);
        setIsEditing(false);
        setValidationErrors([]);
      } else if (result.errors) {
        setValidationErrors(result.errors);
      }
    } catch (error) {
      console.error('Error updating booking:', error);
      setValidationErrors(['An unexpected error occurred. Please try again.']);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    
    setEditData(prev => {
      const newData = {
        ...prev,
        [name]: name === 'noOfPax' || name === 'totalAmount' || name === 'paymentAmount' || name === 'numberOfRooms'
          ? parseFloat(value) || 0 
          : value,
      };

      // Ensure number of guests is at least equal to number of rooms
      if (name === 'noOfPax') {
        const newCount = Math.max(prev.numberOfRooms || 1, parseFloat(value) || 0);
        newData.noOfPax = newCount;
        
        // Auto-adjust adults/children to match total guests
        const adultChildParts = (prev.adultChild || '1/0').split('/');
        const currentAdults = parseInt(adultChildParts[0]) || 1;
        const currentChildren = parseInt(adultChildParts[1]) || 0;
        const newAdults = Math.min(currentAdults, newCount);
        const newChildren = Math.max(0, newCount - newAdults);
        newData.adultChild = `${newAdults}/${newChildren}`;
      }
      if (name === 'numberOfRooms') {
        const roomCount = parseFloat(value) || 1;
        newData.numberOfRooms = Math.max(1, roomCount);
        newData.noOfPax = Math.max(roomCount, prev.noOfPax || 1);
      }

      // Auto-update payment status based on payment amount
      if (name === 'paymentAmount') {
        const paymentAmount = parseFloat(value) || 0;
        const totalAmount = prev.totalAmount || 0;
        
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
        newData.paymentAmount = prev.totalAmount || 0;
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

  const handleNumberOfRoomsChange = (increment: boolean) => {
    setEditData(prev => {
      const newCount = increment ? (prev.numberOfRooms || 1) + 1 : Math.max(1, (prev.numberOfRooms || 1) - 1);
      return {
        ...prev,
        numberOfRooms: newCount,
        // Ensure number of guests is at least equal to number of rooms
        noOfPax: Math.max(newCount, prev.noOfPax || 1)
      };
    });
  };

  const handleNumberOfGuestsChange = (increment: boolean) => {
    setEditData(prev => {
      const minGuests = prev.numberOfRooms || 1;
      const newCount = increment ? (prev.noOfPax || 1) + 1 : Math.max(minGuests, (prev.noOfPax || 1) - 1);
      
      // Parse adults and children from adultChild field
      const adultChildParts = (prev.adultChild || '1/0').split('/');
      const currentAdults = parseInt(adultChildParts[0]) || 1;
      const currentChildren = parseInt(adultChildParts[1]) || 0;
      
      // Auto-adjust adults/children to match total guests
      const newAdults = Math.min(currentAdults, newCount);
      const newChildren = Math.max(0, newCount - newAdults);
      
      return {
        ...prev,
        noOfPax: newCount,
        adultChild: `${newAdults}/${newChildren}`
      };
    });
  };

  const handleAdultsChange = (increment: boolean) => {
    setEditData(prev => {
      // Parse current adults and children
      const adultChildParts = (prev.adultChild || '1/0').split('/');
      const currentAdults = parseInt(adultChildParts[0]) || 1;
      const currentChildren = parseInt(adultChildParts[1]) || 0;
      
      const newAdults = increment ? currentAdults + 1 : Math.max(1, currentAdults - 1);
      const totalGuests = newAdults + currentChildren;
      
      return {
        ...prev,
        adultChild: `${newAdults}/${currentChildren}`,
        noOfPax: Math.max(totalGuests, prev.numberOfRooms || 1)
      };
    });
  };

  const handleChildrenChange = (increment: boolean) => {
    setEditData(prev => {
      // Parse current adults and children
      const adultChildParts = (prev.adultChild || '1/0').split('/');
      const currentAdults = parseInt(adultChildParts[0]) || 1;
      const currentChildren = parseInt(adultChildParts[1]) || 0;
      
      const newChildren = increment ? currentChildren + 1 : Math.max(0, currentChildren - 1);
      const totalGuests = currentAdults + newChildren;
      
      return {
        ...prev,
        adultChild: `${currentAdults}/${newChildren}`,
        noOfPax: Math.max(totalGuests, prev.numberOfRooms || 1)
      };
    });
  };

  const handleCancelBooking = () => {
    if (booking && window.confirm('Are you sure you want to cancel this booking?')) {
      onCancel(booking.id);
    }
  };

  const handleShowCancellationInvoice = async () => {
    if (!booking) return;

    try {
      const noOfDays = Math.ceil(
        (new Date(booking.checkOut).getTime() - new Date(booking.checkIn).getTime()) / (1000 * 60 * 60 * 24)
      );

      // Create cancellation invoice data
      const cancellationData: CancellationInvoiceData = {
        companyName: 'Voyageur Nest',
        companyAddress: 'Old Manali, Manali, Himachal Pradesh, 175131, India',
        companyPhone: '+919876161215',
        companyEmail: 'voyageur.nest@gmail.com',
        invoiceNumber: booking.folioNumber || `520/${invoiceNumber}`,
        guestName: booking.guestName,
        billTo: booking.guestName,
        address: '',
        companyNameBillTo: '',
        billToRegNo: '',
        date: getCurrentISTTime(),
        noOfPax: booking.noOfPax,
        adultChild: booking.adultChild,
        grCardNo: '',
        roomNo: booking.roomNo,
        numberOfRooms: booking.numberOfRooms,
        dateOfArrival: booking.checkIn,
        dateOfDeparture: booking.checkOut,
        timeOfArrival: '12:00',
        timeOfDeparture: '11:00',
        noOfDays: noOfDays,
        originalBookingAmount: booking.totalAmount,
        totalPaid: booking.paymentStatus === 'paid' ? booking.totalAmount : 
                   booking.paymentStatus === 'partial' ? booking.totalAmount * 0.5 : 0,
        cancellationCharges: booking.totalAmount, // Full amount as cancellation charge (no refund)
        paymentMethod: 'UPI',
        bookingDate: booking.bookingDate || '',
        cancellationDate: getCurrentISTTime(),
        cancellationReason: 'Guest requested cancellation'
      };

      setCancellationInvoiceData(cancellationData);
      setShowCancellationInvoice(true);
    } catch (error) {
      console.error('Error creating cancellation invoice:', error);
    }
  };

  const createInvoiceData = (booking: Booking): InvoiceData => {
    const noOfDays = Math.ceil(
      (new Date(booking.checkOut).getTime() - new Date(booking.checkIn).getTime()) / (1000 * 60 * 60 * 24)
    );

    return {
      companyName: 'Voyageur Nest',
      companyAddress: 'Old Manali, Manali, Himachal Pradesh, 175131, India',
      companyPhone: '+919876161215',
      companyEmail: 'voyageur.nest@gmail.com',
      invoiceNumber: booking.folioNumber || `520/${invoiceNumber}`,
      guestName: booking.guestName,
      billTo: booking.guestName,
      address: '',
      companyNameBillTo: '',
      billToRegNo: '',
      date: getCurrentISTTime(),
      noOfPax: booking.noOfPax,
      adultChild: booking.adultChild,
      grCardNo: '',
      roomNo: booking.roomNo,
      numberOfRooms: booking.numberOfRooms,
      dateOfArrival: booking.checkIn,
      dateOfDeparture: booking.checkOut,
      timeOfArrival: '14:00',
      timeOfDeparture: '11:00',
      noOfDays: noOfDays,
      grandTotal: booking.totalAmount,
      paymentAmount: booking.paymentAmount || 0,
      paymentMethod: booking.paymentMode || 'Cash',
    };
  };

  const handlePrintInvoice = () => {
    window.print();
  };

  if (!isOpen || !booking) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between p-6 border-b">
            <h2 className="text-xl font-semibold">
              {booking.cancelled ? 'Cancelled Booking Details' : 'Booking Details'}
            </h2>
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

          <div className="p-6">
            {booking.cancelled && (
              <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <p className="text-sm text-orange-800">
                  <strong>Note:</strong> This booking has been cancelled. You can still edit details for invoice/record purposes.
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Guest Name
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    name="guestName"
                    value={editData.guestName || ''}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={isLoading}
                  />
                ) : (
                  <p className="text-gray-900">{booking.guestName}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Room Number
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    name="roomNo"
                    value={editData.roomNo || ''}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={isLoading}
                  />
                ) : (
                  <p className="text-gray-900">{booking.roomNo}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Number of Rooms
                </label>
                {isEditing ? (
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => handleNumberOfRoomsChange(false)}
                      disabled={(editData.numberOfRooms || 1) <= 1 || isLoading}
                      className="p-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="px-4 py-2 border border-gray-300 rounded-md bg-gray-50 min-w-[60px] text-center">
                      {editData.numberOfRooms || 1}
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
                ) : (
                  <p className="text-gray-900">{booking.numberOfRooms}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Number of Guests
                </label>
                {isEditing ? (
                  <div>
                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={() => handleNumberOfGuestsChange(false)}
                        disabled={(editData.noOfPax || 1) <= (editData.numberOfRooms || 1) || isLoading}
                        className="p-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="px-4 py-2 border border-gray-300 rounded-md bg-gray-50 min-w-[60px] text-center">
                        {editData.noOfPax || 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleNumberOfGuestsChange(true)}
                        disabled={(editData.noOfPax || 1) >= 10 || isLoading}
                        className="p-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Minimum: {editData.numberOfRooms || 1} guest{(editData.numberOfRooms || 1) > 1 ? 's' : ''} (1 per room)
                    </p>
                  </div>
                ) : (
                  <p className="text-gray-900">{booking.noOfPax}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Check-in Date
                </label>
                {isEditing ? (
                  <input
                    type="date"
                    name="checkIn"
                    value={editData.checkIn || ''}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={isLoading}
                  />
                ) : (
                  <p className="text-gray-900">{formatDateForDisplay(booking.checkIn)}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Check-out Date
                </label>
                {isEditing ? (
                  <input
                    type="date"
                    name="checkOut"
                    value={editData.checkOut || ''}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={isLoading}
                  />
                ) : (
                  <p className="text-gray-900">{formatDateForDisplay(booking.checkOut)}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Adults *
                </label>
                {isEditing ? (
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => handleAdultsChange(false)}
                      disabled={(() => {
                        const adultChildParts = (editData.adultChild || '1/0').split('/');
                        const currentAdults = parseInt(adultChildParts[0]) || 1;
                        return currentAdults <= 1 || isLoading;
                      })()}
                      className="p-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="px-4 py-2 border border-gray-300 rounded-md bg-gray-50 min-w-[60px] text-center">
                      {(() => {
                        const adultChildParts = (editData.adultChild || '1/0').split('/');
                        return parseInt(adultChildParts[0]) || 1;
                      })()}
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
                ) : (
                  <p className="text-gray-900">
                    {(() => {
                      const adultChildParts = (booking.adultChild || '1/0').split('/');
                      return parseInt(adultChildParts[0]) || 1;
                    })()}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Children
                </label>
                {isEditing ? (
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => handleChildrenChange(false)}
                      disabled={(() => {
                        const adultChildParts = (editData.adultChild || '1/0').split('/');
                        const currentChildren = parseInt(adultChildParts[1]) || 0;
                        return currentChildren <= 0 || isLoading;
                      })()}
                      className="p-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="px-4 py-2 border border-gray-300 rounded-md bg-gray-50 min-w-[60px] text-center">
                      {(() => {
                        const adultChildParts = (editData.adultChild || '1/0').split('/');
                        return parseInt(adultChildParts[1]) || 0;
                      })()}
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
                ) : (
                  <p className="text-gray-900">
                    {(() => {
                      const adultChildParts = (booking.adultChild || '1/0').split('/');
                      return parseInt(adultChildParts[1]) || 0;
                    })()}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                {isEditing ? (
                  <select
                    name="status"
                    value={editData.status || 'confirmed'}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={isLoading}
                  >
                    <option value="confirmed">Confirmed</option>
                    <option value="pending">Pending</option>
                    <option value="checked-in">Checked In</option>
                    <option value="checked-out">Checked Out</option>
                  </select>
                ) : (
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    booking.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                    booking.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    booking.status === 'checked-in' ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                  </span>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Total Amount
                </label>
                {isEditing ? (
                  <input
                    type="number"
                    name="totalAmount"
                    value={editData.totalAmount || ''}
                    onChange={handleInputChange}
                    min="0"
                    step="0.01"
                    placeholder="Enter total amount"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={isLoading}
                  />
                ) : (
                  <p className="text-gray-900">₹{booking.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Status
                </label>
                {isEditing ? (
                  <select
                    name="paymentStatus"
                    value={editData.paymentStatus || 'unpaid'}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={isLoading}
                  >
                    <option value="unpaid">Unpaid</option>
                    <option value="partial">Partial</option>
                    <option value="paid">Paid</option>
                  </select>
                ) : (
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    booking.paymentStatus === 'paid' ? 'bg-green-100 text-green-800' :
                    booking.paymentStatus === 'partial' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {booking.paymentStatus.charAt(0).toUpperCase() + booking.paymentStatus.slice(1)}
                  </span>
                )}
              </div>

              {/* Payment Amount - Show for partial payments or when paid */}
              {(isEditing && (editData.paymentStatus === 'partial' || editData.paymentStatus === 'paid')) && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Payment Amount
                  </label>
                  <input
                    type="number"
                    name="paymentAmount"
                    value={editData.paymentStatus === 'paid' ? (editData.totalAmount || 0) : (editData.paymentAmount || 0)}
                    onChange={handleInputChange}
                    min="0"
                    step="0.01"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={isLoading || editData.paymentStatus === 'paid'}
                    placeholder={editData.paymentStatus === 'paid' ? 'Full amount' : 'Enter partial amount'}
                  />
                </div>
              )}

              {/* Payment Mode - Show for partial and paid payments */}
              {(isEditing && (editData.paymentStatus === 'partial' || editData.paymentStatus === 'paid')) && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Payment Mode
                  </label>
                  <select
                    name="paymentMode"
                    value={editData.paymentMode || ''}
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

              {/* Show payment details in view mode */}
              {(!isEditing && (booking.paymentStatus === 'partial' || booking.paymentStatus === 'paid')) && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Payment Amount
                    </label>
                    <p className="text-gray-900">₹{(booking.paymentAmount || 0).toLocaleString()}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Payment Mode
                    </label>
                    <p className="text-gray-900">{booking.paymentMode || 'Not specified'}</p>
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contact Phone
                </label>
                {isEditing ? (
                  <input
                    type="tel"
                    name="contactPhone"
                    value={editData.contactPhone || ''}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={isLoading}
                  />
                ) : (
                  <p className="text-gray-900">{booking.contactPhone || 'Not provided'}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contact Email
                </label>
                {isEditing ? (
                  <input
                    type="email"
                    name="contactEmail"
                    value={editData.contactEmail || ''}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={isLoading}
                  />
                ) : (
                  <p className="text-gray-900">{booking.contactEmail || 'Not provided'}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Booking Date
                </label>
                {isEditing ? (
                  <input
                    type="date"
                    name="bookingDate"
                    value={editData.bookingDate || ''}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={isLoading}
                  />
                ) : (
                  <p className="text-gray-900">
                    {booking.bookingDate ? formatDateForDisplay(booking.bookingDate) : 'Not specified'}
                  </p>
                )}
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Special Requests
                </label>
                {isEditing ? (
                  <textarea
                    name="specialRequests"
                    value={editData.specialRequests || ''}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={isLoading}
                  />
                ) : (
                  <p className="text-gray-900">{booking.specialRequests || 'None'}</p>
                )}
              </div>
            </div>

            {/* Check-in Data Section */}
            <div className="mt-8 border-t pt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <User className="w-5 h-5 mr-2" />
                  Digital Check-in Information
                </h3>
                {loadingCheckIn && (
                  <div className="flex items-center text-sm text-gray-500">
                    <Clock className="w-4 h-4 mr-1 animate-spin" />
                    Loading...
                  </div>
                )}
              </div>

              {!loadingCheckIn && !checkInData && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm text-yellow-800">
                    <strong>Check-in form not completed yet.</strong> Guest can access the check-in form using the QR code or direct link.
                  </p>
                </div>
              )}

              {!loadingCheckIn && checkInData && (
                <div className="space-y-6">
                  {(() => {
                    const formattedData = formatCheckInDataForDisplay(checkInData);
                    return (
                      <>
                        {/* Personal Information */}
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                          <h4 className="font-medium text-blue-900 mb-3 flex items-center">
                            <User className="w-4 h-4 mr-2" />
                            Personal Information
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                            <div>
                              <span className="font-medium text-gray-700">Name:</span>
                              <span className="ml-2 text-gray-900">{formattedData.personalInfo.name}</span>
                            </div>
                            <div>
                              <span className="font-medium text-gray-700">Email:</span>
                              <span className="ml-2 text-gray-900">{formattedData.personalInfo.email}</span>
                            </div>
                            <div>
                              <span className="font-medium text-gray-700">Phone:</span>
                              <span className="ml-2 text-gray-900">{formattedData.personalInfo.phone}</span>
                            </div>
                            {formattedData.personalInfo.dateOfBirth && (
                              <div>
                                <span className="font-medium text-gray-700">Date of Birth:</span>
                                <span className="ml-2 text-gray-900">{formatDateForDisplay(formattedData.personalInfo.dateOfBirth)}</span>
                              </div>
                            )}
                            {formattedData.personalInfo.nationality && (
                              <div>
                                <span className="font-medium text-gray-700">Nationality:</span>
                                <span className="ml-2 text-gray-900">{formattedData.personalInfo.nationality}</span>
                              </div>
                            )}
                            <div>
                              <span className="font-medium text-gray-700">ID Type:</span>
                              <span className="ml-2 text-gray-900 capitalize">{formattedData.personalInfo.idType.replace('_', ' ')}</span>
                            </div>
                            <div className="sm:col-span-2">
                              <span className="font-medium text-gray-700">ID Number:</span>
                              <span className="ml-2 text-gray-900">{formattedData.personalInfo.idNumber}</span>
                            </div>
                          </div>
                        </div>

                        {/* Address Information */}
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                          <h4 className="font-medium text-green-900 mb-3 flex items-center">
                            <MapPin className="w-4 h-4 mr-2" />
                            Address Information
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                            <div className="sm:col-span-2">
                              <span className="font-medium text-gray-700">Street:</span>
                              <span className="ml-2 text-gray-900">{formattedData.address.street}</span>
                            </div>
                            {formattedData.address.city && (
                              <div>
                                <span className="font-medium text-gray-700">City:</span>
                                <span className="ml-2 text-gray-900">{formattedData.address.city}</span>
                              </div>
                            )}
                            {formattedData.address.state && (
                              <div>
                                <span className="font-medium text-gray-700">State:</span>
                                <span className="ml-2 text-gray-900">{formattedData.address.state}</span>
                              </div>
                            )}
                            {formattedData.address.country && (
                              <div>
                                <span className="font-medium text-gray-700">Country:</span>
                                <span className="ml-2 text-gray-900">{formattedData.address.country}</span>
                              </div>
                            )}
                            {formattedData.address.zipCode && (
                              <div>
                                <span className="font-medium text-gray-700">Zip Code:</span>
                                <span className="ml-2 text-gray-900">{formattedData.address.zipCode}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Emergency Contact */}
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                          <h4 className="font-medium text-red-900 mb-3 flex items-center">
                            <Phone className="w-4 h-4 mr-2" />
                            Emergency Contact
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                            <div>
                              <span className="font-medium text-gray-700">Name:</span>
                              <span className="ml-2 text-gray-900">{formattedData.emergencyContact.name}</span>
                            </div>
                            <div>
                              <span className="font-medium text-gray-700">Phone:</span>
                              <span className="ml-2 text-gray-900">{formattedData.emergencyContact.phone}</span>
                            </div>
                            <div className="sm:col-span-2">
                              <span className="font-medium text-gray-700">Relationship:</span>
                              <span className="ml-2 text-gray-900">{formattedData.emergencyContact.relationship}</span>
                            </div>
                          </div>
                        </div>

                        {/* Visit Information */}
                        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                          <h4 className="font-medium text-purple-900 mb-3 flex items-center">
                            <Calendar className="w-4 h-4 mr-2" />
                            Visit Information
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                            <div>
                              <span className="font-medium text-gray-700">Purpose:</span>
                              <span className="ml-2 text-gray-900 capitalize">{formattedData.visitInfo.purpose}</span>
                            </div>
                            <div>
                              <span className="font-medium text-gray-700">Arrival Date:</span>
                              <span className="ml-2 text-gray-900">{formatDateForDisplay(formattedData.visitInfo.arrivalDate)}</span>
                            </div>
                            <div>
                              <span className="font-medium text-gray-700">Departure Date:</span>
                              <span className="ml-2 text-gray-900">{formatDateForDisplay(formattedData.visitInfo.departureDate)}</span>
                            </div>
                            <div>
                              <span className="font-medium text-gray-700">Room Number:</span>
                              <span className="ml-2 text-gray-900">{formattedData.visitInfo.roomNumber}</span>
                            </div>
                            <div>
                              <span className="font-medium text-gray-700">Number of Guests:</span>
                              <span className="ml-2 text-gray-900">{formattedData.visitInfo.numberOfGuests}</span>
                            </div>
                            {formattedData.visitInfo.specialRequests && (
                              <div className="sm:col-span-2">
                                <span className="font-medium text-gray-700">Special Requests:</span>
                                <span className="ml-2 text-gray-900">{formattedData.visitInfo.specialRequests}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Additional Guests */}
                        {formattedData.additionalGuests && formattedData.additionalGuests.length > 0 && (
                          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                            <h4 className="font-medium text-indigo-900 mb-3 flex items-center">
                              <Users className="w-4 h-4 mr-2" />
                              Additional Guests
                            </h4>
                            <div className="space-y-2">
                              {formattedData.additionalGuests.map((guest, index) => (
                                <div key={index} className="flex items-center justify-between bg-white p-2 rounded border">
                                  <span className="text-sm text-gray-900">{guest.name}</span>
                                  <div className="text-xs text-gray-600">
                                    {guest.age && <span>Age: {guest.age}</span>}
                                    {guest.relation && <span className="ml-2">({guest.relation})</span>}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Preferences */}
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                          <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                            <CreditCard className="w-4 h-4 mr-2" />
                            Service Preferences
                          </h4>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                            <div className="flex items-center">
                              <span className="font-medium text-gray-700">Wake-up Call:</span>
                              <span className={`ml-2 px-2 py-1 rounded text-xs ${formattedData.preferences.wakeUpCall ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                {formattedData.preferences.wakeUpCall ? 'Yes' : 'No'}
                              </span>
                            </div>
                            <div className="flex items-center">
                              <span className="font-medium text-gray-700">Newspaper:</span>
                              <span className={`ml-2 px-2 py-1 rounded text-xs ${formattedData.preferences.newspaper ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                {formattedData.preferences.newspaper ? 'Yes' : 'No'}
                              </span>
                            </div>
                            <div className="flex items-center">
                              <span className="font-medium text-gray-700">Extra Towels:</span>
                              <span className={`ml-2 px-2 py-1 rounded text-xs ${formattedData.preferences.extraTowels ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                {formattedData.preferences.extraTowels ? 'Yes' : 'No'}
                              </span>
                            </div>
                            <div className="flex items-center">
                              <span className="font-medium text-gray-700">Extra Pillows:</span>
                              <span className={`ml-2 px-2 py-1 rounded text-xs ${formattedData.preferences.extraPillows ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                {formattedData.preferences.extraPillows ? 'Yes' : 'No'}
                              </span>
                            </div>
                            <div className="flex items-center">
                              <span className="font-medium text-gray-700">Room Service:</span>
                              <span className={`ml-2 px-2 py-1 rounded text-xs ${formattedData.preferences.roomService ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                {formattedData.preferences.roomService ? 'Yes' : 'No'}
                              </span>
                            </div>
                            <div className="flex items-center">
                              <span className="font-medium text-gray-700">Do Not Disturb:</span>
                              <span className={`ml-2 px-2 py-1 rounded text-xs ${formattedData.preferences.doNotDisturb ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                {formattedData.preferences.doNotDisturb ? 'Yes' : 'No'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 mt-6">
              {isEditing ? (
                <>
                  <button
                    onClick={handleCancel}
                    className="flex-1 flex items-center justify-center px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                    disabled={isLoading}
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    className="flex-1 flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={isLoading}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {isLoading ? 'Saving...' : 'Save Changes'}
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setShowInvoice(true)}
                    className="flex-1 flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Print Invoice
                  </button>
                  <button
                    onClick={() => setShowQRCode(true)}
                    className="flex-1 flex items-center justify-center px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
                  >
                    <QrCode className="w-4 h-4 mr-2" />
                    Check-in QR
                  </button>
                  {booking.cancelled && (
                    <button
                      onClick={handleShowCancellationInvoice}
                      className="flex-1 flex items-center justify-center px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors"
                    >
                      <Receipt className="w-4 h-4 mr-2" />
                      Cancellation Invoice
                    </button>
                  )}
                  <button
                    onClick={handleEdit}
                    className="flex-1 flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </button>
                  {!booking.cancelled && (
                    <button
                      onClick={handleCancelBooking}
                      className="flex-1 flex items-center justify-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Cancel Booking
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Invoice Modal */}
      {showInvoice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b print:hidden">
              <h2 className="text-xl font-semibold text-gray-900">Invoice</h2>
              <div className="flex items-center space-x-2">
                <button
                  onClick={handlePrintInvoice}
                  className="flex items-center px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
                >
                  Print
                </button>
                <button
                  onClick={() => setShowInvoice(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            <InvoicePreview
              data={createInvoiceData(booking)}
              onPrint={handlePrintInvoice}
            />
          </div>
        </div>
      )}

      {/* Cancellation Invoice Modal */}
      {showCancellationInvoice && cancellationInvoiceData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b print:hidden">
              <h2 className="text-xl font-semibold text-gray-900">Cancellation Invoice</h2>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => window.print()}
                  className="flex items-center px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
                >
                  Print
                </button>
                <button
                  onClick={() => {
                    setShowCancellationInvoice(false);
                    setCancellationInvoiceData(null);
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            <CancellationInvoicePreview data={cancellationInvoiceData} />
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      {showQRCode && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-xl font-semibold text-gray-900">Check-in QR Code</h2>
              <button
                onClick={() => setShowQRCode(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6">
              <QRCodeGenerator bookingId={booking.id} />
            </div>
          </div>
        </div>
      )}
    </>
  );
};