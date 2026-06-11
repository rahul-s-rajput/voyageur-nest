import React, { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { AlertCircle, Clock, CheckCircle, RefreshCw } from 'lucide-react';
import { useBookings, bookingsQueryKey } from '../hooks/useBookings';
import { HomePage } from '../components/HomePage';
import { InvoiceForm } from '../components/InvoiceForm';
import { InvoicePreview } from '../components/InvoicePreview';
import { CancellationInvoicePreview } from '../components/CancellationInvoicePreview';
import { BookingDetails } from '../components/BookingDetails';
import { Booking, ViewMode } from '../types/booking';
import { InvoiceData, CancellationInvoiceData } from '../types/invoice';
import { invoiceCounterService, bookingService, updateBookingWithValidation, checkInService } from '../lib/supabase';
import { NewBookingModal } from '../components/NewBookingModal';
import { InvoiceTemplate } from '../components/InvoiceTemplate';
import { useProperty } from '../contexts/PropertyContext';
import Notification from './Notification';
import { bookingComplianceService, type BookingEnforcementViolation } from '../services/bookingComplianceService';

const BookingManagement: React.FC = () => {
  const { currentProperty } = useProperty();
  const queryClient = useQueryClient();
  const [currentView, setCurrentView] = useState<'home' | 'invoice-form' | 'invoice-preview' | 'actions'>('home');

  // Booking list is cached via React Query so re-mounts are instant. `setBookings`
  // keeps the exact useState-setter signature, so every existing optimistic update
  // below works unchanged — it now writes straight to the query cache.
  const { data: bookingsData } = useBookings(currentProperty?.id);
  const bookings = bookingsData ?? [];
  const setBookings = (updater: Booking[] | ((prev: Booking[]) => Booking[])) => {
    queryClient.setQueryData<Booking[]>(bookingsQueryKey(currentProperty?.id), (old) =>
      typeof updater === 'function' ? (updater as (p: Booking[]) => Booking[])(old ?? []) : updater
    );
  };
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showBookingDetails, setShowBookingDetails] = useState(false);
  const [showNewBookingModal, setShowNewBookingModal] = useState(false);
  const [showInvoice, setShowInvoice] = useState(false);
  const [showCancellationInvoice, setShowCancellationInvoice] = useState(false);
  const [invoiceBooking, setInvoiceBooking] = useState<Booking | null>(null);
  const [cancellationInvoiceData, setCancellationInvoiceData] = useState<CancellationInvoiceData | null>(null);
  const [invoiceNumber, setInvoiceNumber] = useState<number>(391);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('calendar');
  
  // Invoice related state
  const [isCounterLoaded, setIsCounterLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState<'form' | 'preview'>('form');
  const [invoiceData, setInvoiceData] = useState<InvoiceData>({
    companyName: 'Voyageur Nest',
    companyAddress: 'Old Manali, Manali, Himachal Pradesh, 175131, India',
    companyPhone: '+919876161215',
    companyEmail: 'voyageur.nest@gmail.com',
    invoiceNumber: `520/${391}`,
    guestName: '',
    billTo: '',
    address: '',
    companyNameBillTo: '',
    billToRegNo: '',
    date: getCurrentISTTime(),
    noOfPax: 0,
    adultChild: '',
    grCardNo: '',
    roomNo: '',
    numberOfRooms: 1,
    dateOfArrival: '',
    dateOfDeparture: '',
    timeOfArrival: '',
    timeOfDeparture: '',
    noOfDays: 0,
    grandTotal: 0,
    paymentAmount: 0,
    paymentMethod: 'UPI'
  });

  const [toasts, setToasts] = useState<Array<{ id: string; type: 'success'|'error'|'warning'|'info'; title: string; message?: string }>>([]);

  // Enforcement Actions state
  const [violationsToday, setViolationsToday] = useState<BookingEnforcementViolation[]>([]);
  const [violationsOverdue, setViolationsOverdue] = useState<BookingEnforcementViolation[]>([]);
  const [violationsLoading, setViolationsLoading] = useState<boolean>(false);
  const [extendOpen, setExtendOpen] = useState(false);
  const [extendBookingId, setExtendBookingId] = useState<string | null>(null);
  const [extendDate, setExtendDate] = useState<string>('');
 
  // (Home banner removed)

  const pushToast = (type: 'success'|'error'|'warning'|'info', title: string, message?: string) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts(prev => [...prev, { id, type, title, message }]);
  };

  const closeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Function to get current IST date and time formatted as dd/mm/yyyy hh:mm:ss AM/PM
  function getCurrentISTTime() {
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
  }

  // Load the invoice counter (the booking list itself is handled by useBookings).
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const counter = await invoiceCounterService.getCounter();
        setInvoiceNumber(counter);
        setIsCounterLoaded(true);
      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [currentProperty?.id]);

  // Load enforcement violations
  const loadViolations = async () => {
    try {
      if (!currentProperty?.id) {
        setViolationsToday([]);
        setViolationsOverdue([]);
        return;
      }
      setViolationsLoading(true);
      const [today, overdue] = await Promise.all([
        bookingComplianceService.listToday(currentProperty.id),
        bookingComplianceService.listOverdue(currentProperty.id),
      ]);
      setViolationsToday(today);
      setViolationsOverdue(overdue);
    } catch (e) {
      console.error('Failed to load enforcement violations', e);
      pushToast('error', 'Load failed', 'Could not load Today\'s Actions');
    } finally {
      setViolationsLoading(false);
    }
  };

  useEffect(() => {
    if (currentView === 'actions') {
      loadViolations();
    }
  }, [currentView, currentProperty?.id]);
 
  // (Home banner count effect removed)

  // Update invoice number when counter changes
  useEffect(() => {
    if (isCounterLoaded) {
      setInvoiceData(prev => ({
        ...prev,
        invoiceNumber: `520/${invoiceNumber}`
      }));
    }
  }, [invoiceNumber, isCounterLoaded]);

  const handleCreateInvoice = async (booking: Booking) => {
    try {
      setInvoiceBooking(booking);
      setShowInvoice(true);
    } catch (error) {
      console.error('Error creating invoice:', error);
    }
  };

  const handleCreateCancellationInvoice = async (booking: Booking) => {
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
          noOfPax: booking.noOfPax ?? 1,
          adultChild: booking.adultChild || '',
          grCardNo: '',
          roomNo: booking.roomNo || '',
          numberOfRooms: booking.numberOfRooms ?? 1,
          dateOfArrival: booking.checkIn || '',
          dateOfDeparture: booking.checkOut || '',
          timeOfArrival: '12:00',
          timeOfDeparture: '11:00',
          noOfDays: noOfDays,
          originalBookingAmount: booking.totalAmount ?? 0,
          totalPaid: booking.paymentStatus === 'paid' ? (booking.totalAmount ?? 0) : 
                     booking.paymentStatus === 'partial' ? (booking.totalAmount ?? 0) * 0.5 : 0,
          cancellationCharges: booking.totalAmount ?? 0, // Full amount as cancellation charge (no refund)
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

  const handleCloseInvoice = () => {
    setShowInvoice(false);
    setInvoiceBooking(null);
  };

  const handleCloseCancellationInvoice = () => {
    setShowCancellationInvoice(false);
    setCancellationInvoiceData(null);
  };

  const handleSelectBooking = (booking: Booking) => {
    setSelectedBooking(booking);
    setShowBookingDetails(true);
  };

  const handleEditBooking = (booking: Booking) => {
    setSelectedBooking(booking);
    setShowBookingDetails(true);
  };

  const handleDeleteBooking = async (bookingId: string) => {
    try {
      const success = await bookingService.deleteBooking(bookingId);
      if (success) {
        setBookings(prev => prev.filter(b => b.id !== bookingId));
        setShowBookingDetails(false);
        setSelectedBooking(null);
        pushToast('success', 'Booking deleted', 'The booking has been removed.');
      } else {
        pushToast('error', 'Delete failed', 'Could not delete the booking.');
      }
    } catch (error) {
      console.error('Error deleting booking:', error);
      pushToast('error', 'Delete error', 'An unexpected error occurred while deleting.');
    }
  };

  const handleCancelBooking = async (bookingId: string) => {
    try {
      const success = await bookingService.cancelBooking(bookingId);
      if (success) {
        setBookings(prev => prev.map(b =>
          b.id === bookingId ? { ...b, cancelled: true } : b
        ));
        if (selectedBooking?.id === bookingId) {
          setSelectedBooking(prev => prev ? { ...prev, cancelled: true } : null);
        }
        // Refresh violations in case we are on actions view
        if (currentView === 'actions') await loadViolations();
      } else {
        pushToast('error', 'Cancel failed', 'Could not cancel the booking. Please try again.');
      }
    } catch (error) {
      console.error('Error cancelling booking:', error);
      pushToast('error', 'Cancel failed', 'An unexpected error occurred while cancelling.');
    }
  };

  // Show a newly created booking immediately (no refresh). Dedupe by id in case a
  // realtime event or another path already added it.
  const handleBookingCreated = (booking: Booking) => {
    setBookings(prev => (prev.some(b => b.id === booking.id) ? prev : [...prev, booking]));
    // The room grid fetches independently — nudge it to refetch in case its
    // realtime subscription hasn't delivered this booking yet.
    try { window.dispatchEvent(new CustomEvent('voyageur:bookings-changed')); } catch { /* no-op */ }
  };

  

  const handleBackToHome = () => {
    setCurrentView('home');
  };

  const handleOpenActions = () => {
    setCurrentView('actions');
  };

  // Actions view helpers
  const openBookingById = async (bookingId: string) => {
    try {
      let booking = bookings.find(b => b.id === bookingId) || null;
      if (!booking) {
        booking = await bookingService.getBookingById(bookingId);
      }
      if (booking) {
        setSelectedBooking(booking);
        setShowBookingDetails(true);
      } else {
        pushToast('error', 'Not found', 'Booking could not be loaded');
      }
    } catch (e) {
      console.error('Open booking failed', e);
      pushToast('error', 'Open failed', 'Could not open booking');
    }
  };

  const handleCheckIn = async (bookingId: string) => {
    try {
      const result = await updateBookingWithValidation(bookingId, { status: 'checked-in' as Booking['status'] });
      if (result.success) {
        setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: 'checked-in' } : b));
        // Reflect status change in currently open BookingDetails (use functional updater to avoid stale closure)
        setSelectedBooking(prev => (prev && prev.id === bookingId ? { ...prev, status: 'checked-in' } : prev));
        pushToast('success', 'Checked in', 'Guest has been checked in');
        await loadViolations();
        return;
      }

      const errors = result.errors || [];
      // If check-in form is incomplete, auto-open QR and wait for completion
      if (errors.some(e => e.toLowerCase().includes('check-in form must be completed'))) {
        try { sessionStorage.setItem('open_qr_for_booking_id', bookingId); } catch {}
        await openBookingById(bookingId);
        pushToast('info', 'Check-in form required', 'QR code opened. Complete the form to continue.');

        // Poll for form completion and auto-complete check-in
        const POLL_MS = 5000;
        const MAX_MS = 600000; // 10 minutes
        let elapsed = 0;
        while (elapsed < MAX_MS) {
          await new Promise(r => setTimeout(r, POLL_MS));
          try {
            const data = await checkInService.getCheckInDataByBookingId(bookingId);
            if (data?.form_completed_at) {
              const finalize = await updateBookingWithValidation(bookingId, { status: 'checked-in' as Booking['status'] });
              if (finalize.success && finalize.booking) {
                setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: 'checked-in' } : b));
                // Update currently open booking details view as well (functional updater avoids stale capture)
                setSelectedBooking(prev => (prev && prev.id === bookingId ? { ...prev, status: 'checked-in' } : prev));
                pushToast('success', 'Checked in', 'Check-in completed after form submission.');
                await loadViolations();
              } else if (finalize.errors) {
                pushToast('error', 'Check-in failed', finalize.errors.join('; '));
              }
              return;
            }
          } catch (e) {
            // keep polling; transient errors are acceptable
          }
          elapsed += POLL_MS;
        }
        pushToast('warning', 'Waiting for check-in form', 'Timed out waiting for form completion.');
        return;
      }

      // Other validation errors
      if (errors.length > 0) {
        pushToast('error', 'Check-in failed', errors.join('; '));
      } else {
        pushToast('error', 'Check-in failed', 'Could not update booking status');
      }
    } catch (e) {
      console.error('Check-in failed', e);
      pushToast('error', 'Check-in failed', 'Could not update booking status');
    }
  };

  const handleCheckOut = async (bookingId: string) => {
    try {
      const result = await updateBookingWithValidation(bookingId, { status: 'checked-out' as Booking['status'] });
      if (result.success) {
        setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: 'checked-out' } : b));
        pushToast('success', 'Checked out', 'Guest has been checked out');
        await loadViolations();
        return;
      }
      const errors = result.errors || [];
      if (errors.length > 0) {
        pushToast('error', 'Check-out failed', errors.join('; '));
      } else {
        pushToast('error', 'Check-out failed', 'Could not update booking status');
      }
    } catch (e) {
      console.error('Check-out failed', e);
      pushToast('error', 'Check-out failed', 'Could not update booking status');
    }
  };

  const handleExtendOpen = (bookingId: string, currentDate?: string | null) => {
    setExtendBookingId(bookingId);
    // Default extend date to current check-out date if present
    setExtendDate(currentDate ? currentDate.slice(0, 10) : '');
    setExtendOpen(true);
  };

  const handleExtendSave = async () => {
    if (!extendBookingId || !extendDate) {
      pushToast('warning', 'Missing date', 'Please choose a new check-out date');
      return;
    }
    try {
      // Validate the new check-out (must stay after check-in and not overlap the
      // next booking for this room) instead of writing the date blindly.
      const result = await updateBookingWithValidation(extendBookingId, { checkOut: extendDate });
      if (result.success) {
        setBookings(prev => prev.map(b => b.id === extendBookingId ? { ...b, checkOut: extendDate } : b));
        pushToast('success', 'Extended', 'Stay extended successfully');
        await loadViolations();
      } else {
        pushToast('error', 'Extend failed', (result.errors && result.errors[0]) || 'New date conflicts with another booking');
      }
    } catch (e) {
      console.error('Extend failed', e);
      pushToast('error', 'Extend failed', 'Could not extend stay');
    } finally {
      setExtendOpen(false);
      setExtendBookingId(null);
      setExtendDate('');
    }
  };

  const handleExtendCancel = () => {
    setExtendOpen(false);
    setExtendBookingId(null);
    setExtendDate('');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading booking management system...</p>
        </div>
      </div>
    );
  }

  if (currentView === 'home') {
    return (
      <>
      <div className="bg-gray-50">
        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <HomePage
            bookings={bookings}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            onSelectBooking={handleSelectBooking}
            onEditBooking={handleEditBooking}
            onDeleteBooking={handleDeleteBooking}
            onCreateInvoice={handleCreateInvoice}
            onCancelBooking={handleCancelBooking}
            onCreateCancellationInvoice={handleCreateCancellationInvoice}
            onOpenActions={handleOpenActions}
            onBookingCreated={handleBookingCreated}
          />
        </div>

        {/* Booking Details Modal (home view) */}
        <BookingDetails
          booking={selectedBooking}
          isOpen={showBookingDetails}
          onClose={() => {
            setShowBookingDetails(false);
            setSelectedBooking(null);
          }}
          onUpdate={(updatedBooking) => {
            setBookings(prev => prev.map(b => b.id === updatedBooking.id ? updatedBooking : b));
            setSelectedBooking(updatedBooking);
          }}
          onCancel={handleCancelBooking}
          onDelete={async (bookingId) => {
            await handleDeleteBooking(bookingId);
          }}
        />

        <NewBookingModal
          isOpen={showNewBookingModal}
          onClose={() => setShowNewBookingModal(false)}
          onBookingCreated={(booking) => {
            handleBookingCreated(booking);
            setShowNewBookingModal(false);
          }}
        />

        {showInvoice && invoiceBooking && (
          <InvoiceTemplate
            booking={invoiceBooking}
            invoiceNumber={invoiceNumber}
            onClose={handleCloseInvoice}
          />
        )}

        {showCancellationInvoice && cancellationInvoiceData && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={(e) => { if (e.target === e.currentTarget) handleCloseCancellationInvoice(); }}>
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
                    onClick={handleCloseCancellationInvoice}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    ×
                  </button>
                </div>
              </div>
              <CancellationInvoicePreview data={cancellationInvoiceData} />
            </div>
          </div>
        )}
      </div>
      {/* Floating notifications */}
      <div className="fixed top-4 right-4 z-[100] space-y-2">
        {toasts.map(t => (
          <Notification key={t.id} id={t.id} type={t.type} title={t.title} message={t.message} onClose={closeToast} />
        ))}
      </div>
      </>
    );
  }

  if (currentView === 'actions') {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-amber-600" />
                <h1 className="text-2xl font-bold text-gray-900">Today&apos;s Actions</h1>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={loadViolations}
                  className="inline-flex items-center px-3 py-1.5 text-sm bg-gray-100 text-gray-800 rounded hover:bg-gray-200 border"
                >
                  <RefreshCw className="w-4 h-4 mr-1" /> Refresh
                </button>
                <button
                  onClick={handleBackToHome}
                  className="px-3 py-1.5 text-sm bg-gray-100 text-gray-800 rounded hover:bg-gray-200 border"
                >
                  Back
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto p-4 space-y-6">
          {/* Today section */}
          <div className="bg-white rounded-lg border shadow-sm">
            <div className="px-4 py-3 border-b flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              <div className="font-medium">Today</div>
              <div className="text-xs text-gray-500">{violationsToday.length} items</div>
            </div>
            <div className="p-3">
              {violationsLoading ? (
                <div className="py-8 text-center text-gray-500">Loading...</div>
              ) : violationsToday.length === 0 ? (
                <div className="py-8 text-center text-gray-500">No actions for today</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-600 border-b">
                        <th className="p-2">Guest</th>
                        <th className="p-2">Room</th>
                        <th className="p-2">Check-in</th>
                        <th className="p-2">Check-out</th>
                        <th className="p-2">Type</th>
                        <th className="p-2 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {violationsToday.map(v => (
                        <tr key={`${v.id}-${v.violationType}`} className="border-b last:border-0">
                          <td className="p-2">{v.guestName}</td>
                          <td className="p-2">{v.roomNo || '-'}</td>
                          <td className="p-2">{v.checkIn ? v.checkIn.slice(0, 10) : '-'}</td>
                          <td className="p-2">{v.checkOut ? v.checkOut.slice(0, 10) : '-'}</td>
                          <td className="p-2 capitalize">{v.violationType.replace(/-/g, ' ')}</td>
                          <td className="p-2">
                            <div className="flex justify-end gap-2">
                              <button
                                className="p-1 text-gray-400 hover:text-gray-600"
                                title="Refresh"
                                onClick={loadViolations}
                              >
                                <RefreshCw className="w-3.5 h-3.5" />
                              </button>
                              <button
                                className="px-2 py-1 text-xs bg-gray-100 rounded hover:bg-gray-200"
                                onClick={() => openBookingById(v.id)}
                              >Open</button>
                              {(v.violationType === 'check-in-today') && (
                                <button
                                  className="px-2 py-1 text-xs bg-emerald-600 text-white rounded hover:bg-emerald-700"
                                  onClick={() => handleCheckIn(v.id)}
                                  disabled={v.cancelled}
                                >Check-In</button>
                              )}
                              {(v.violationType === 'check-out-today') && (
                                <>
                                  <button
                                    className="px-2 py-1 text-xs bg-sky-600 text-white rounded hover:bg-sky-700"
                                    onClick={() => handleCheckOut(v.id)}
                                    disabled={v.cancelled}
                                  >Check-Out</button>
                                  <button
                                    className="px-2 py-1 text-xs bg-gray-100 rounded hover:bg-gray-200"
                                    onClick={() => handleExtendOpen(v.id, v.checkOut)}
                                    disabled={v.cancelled}
                                  >Extend</button>
                                </>
                              )}
                              <button
                                className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                                onClick={() => handleCancelBooking(v.id)}
                                disabled={v.cancelled}
                              >Cancel</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Overdue section */}
          <div className="bg-white rounded-lg border shadow-sm">
            <div className="px-4 py-3 border-b flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-600" />
              <div className="font-medium">Overdue</div>
              <div className="text-xs text-gray-500">{violationsOverdue.length} items</div>
            </div>
            <div className="p-3">
              {violationsLoading ? (
                <div className="py-8 text-center text-gray-500">Loading...</div>
              ) : violationsOverdue.length === 0 ? (
                <div className="py-8 text-center text-gray-500">No overdue actions</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-600 border-b">
                        <th className="p-2">Guest</th>
                        <th className="p-2">Room</th>
                        <th className="p-2">Check-in</th>
                        <th className="p-2">Check-out</th>
                        <th className="p-2">Type</th>
                        <th className="p-2 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {violationsOverdue.map(v => (
                        <tr key={`${v.id}-${v.violationType}`} className="border-b last:border-0">
                          <td className="p-2">{v.guestName}</td>
                          <td className="p-2">{v.roomNo || '-'}</td>
                          <td className="p-2">{v.checkIn ? v.checkIn.slice(0, 10) : '-'}</td>
                          <td className="p-2">{v.checkOut ? v.checkOut.slice(0, 10) : '-'}</td>
                          <td className="p-2 capitalize">{v.violationType.replace(/-/g, ' ')}</td>
                          <td className="p-2">
                            <div className="flex justify-end gap-2">
                              <button
                                className="p-1 text-gray-400 hover:text-gray-600"
                                title="Refresh"
                                onClick={loadViolations}
                              >
                                <RefreshCw className="w-3.5 h-3.5" />
                              </button>
                              <button
                                className="px-2 py-1 text-xs bg-gray-100 rounded hover:bg-gray-200"
                                onClick={() => openBookingById(v.id)}
                              >Open</button>
                              {(v.violationType === 'overdue-check-in') && (
                                <button
                                  className="px-2 py-1 text-xs bg-emerald-600 text-white rounded hover:bg-emerald-700"
                                  onClick={() => handleCheckIn(v.id)}
                                  disabled={v.cancelled}
                                >Check-In</button>
                              )}
                              {(v.violationType === 'overdue-check-out') && (
                                <>
                                  <button
                                    className="px-2 py-1 text-xs bg-sky-600 text-white rounded hover:bg-sky-700"
                                    onClick={() => handleCheckOut(v.id)}
                                    disabled={v.cancelled}
                                  >Check-Out</button>
                                  <button
                                    className="px-2 py-1 text-xs bg-gray-100 rounded hover:bg-gray-200"
                                    onClick={() => handleExtendOpen(v.id, v.checkOut)}
                                    disabled={v.cancelled}
                                  >Extend</button>
                                </>
                              )}
                              <button
                                className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                                onClick={() => handleCancelBooking(v.id)}
                                disabled={v.cancelled}
                              >Cancel</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Extend Modal */}
        {extendOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-lg w-full max-w-sm p-4">
              <div className="text-lg font-semibold mb-2">Extend Stay</div>
              <div className="text-sm text-gray-600 mb-3">Choose a new check-out date.</div>
              <input
                type="date"
                value={extendDate}
                onChange={(e) => setExtendDate(e.target.value)}
                className="w-full border rounded px-3 py-2 mb-3"
              />
              <div className="flex justify-end gap-2">
                <button className="px-3 py-1 text-gray-600" onClick={handleExtendCancel}>Cancel</button>
                <button className="px-3 py-1 bg-blue-600 text-white rounded" onClick={handleExtendSave}>Save</button>
              </div>
            </div>
          </div>
        )}

        {/* Booking Details Modal (actions view) */}
        <BookingDetails
          booking={selectedBooking}
          isOpen={showBookingDetails}
          onClose={() => {
            setShowBookingDetails(false);
            setSelectedBooking(null);
          }}
          onUpdate={(updatedBooking) => {
            setBookings(prev => prev.map(b => b.id === updatedBooking.id ? updatedBooking : b));
            setSelectedBooking(updatedBooking);
          }}
          onCancel={handleCancelBooking}
          onDelete={async (bookingId) => {
            await handleDeleteBooking(bookingId);
          }}
        />

        {/* Floating notifications */}
        <div className="fixed top-4 right-4 z-[100] space-y-2">
          {toasts.map(t => (
            <Notification key={t.id} id={t.id} type={t.type} title={t.title} message={t.message} onClose={closeToast} />
          ))}
        </div>
      </div>
    );
  }

  if (currentView === 'invoice-form') {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <h1 className="text-2xl font-bold text-gray-900">Invoice Generator</h1>
              <button
                onClick={handleBackToHome}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              >
                Back to Bookings
              </button>
            </div>
            <div className="flex space-x-1">
              <button
                onClick={() => setActiveTab('form')}
                className={`px-4 py-2 text-sm font-medium rounded-t-lg ${
                  activeTab === 'form'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Form
              </button>
              <button
                onClick={() => setActiveTab('preview')}
                className={`px-4 py-2 text-sm font-medium rounded-t-lg ${
                  activeTab === 'preview'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Preview
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto p-4">
          {activeTab === 'form' ? (
            <InvoiceForm 
              data={invoiceData}
              onChange={setInvoiceData}
            />
          ) : (
            <InvoicePreview 
              data={invoiceData}
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50">
      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <HomePage
          bookings={bookings}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          onSelectBooking={handleSelectBooking}
          onEditBooking={handleEditBooking}
          onDeleteBooking={handleDeleteBooking}
          onCreateInvoice={handleCreateInvoice}
          onCancelBooking={handleCancelBooking}
          onCreateCancellationInvoice={handleCreateCancellationInvoice}
          onOpenActions={handleOpenActions}
          onBookingCreated={handleBookingCreated}
        />
      </div>

      {/* Modals handled above in this view's return */}

      {showInvoice && invoiceBooking && (
        <InvoiceTemplate
          booking={invoiceBooking}
          invoiceNumber={invoiceNumber}
          onClose={handleCloseInvoice}
        />
      )}

      {showCancellationInvoice && cancellationInvoiceData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={(e) => { if (e.target === e.currentTarget) handleCloseCancellationInvoice(); }}>
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
                  onClick={handleCloseCancellationInvoice}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  ×
                </button>
              </div>
            </div>
            <CancellationInvoicePreview data={cancellationInvoiceData} />
          </div>
        </div>
      )}
    </div>
  );
};

export default BookingManagement;