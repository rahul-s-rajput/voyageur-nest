import React, { useState, useEffect } from 'react';
import { AlertCircle, Clock, CheckCircle, RefreshCw } from 'lucide-react';
import { HomePage } from '../components/HomePage';
import { InvoiceForm } from '../components/InvoiceForm';
import { InvoicePreview } from '../components/InvoicePreview';
import { CancellationInvoicePreview } from '../components/CancellationInvoicePreview';
import { BookingDetails } from '../components/BookingDetails';
import { Booking, ViewMode } from '../types/booking';
import { InvoiceData, CancellationInvoiceData } from '../types/invoice';
import { invoiceCounterService, bookingService, emailMessageService, updateBookingWithValidation, checkInService } from '../lib/supabase';
import { NewBookingModal } from '../components/NewBookingModal';
import { InvoiceTemplate } from '../components/InvoiceTemplate';
import { useProperty } from '../contexts/PropertyContext';
import EmailImportsPanel, { EmailImportItem } from './EmailImportsPanel';
import AIEmailParserService from '../services/aiEmailParserService';
import EmailBookingImportService from '../services/emailBookingImportService';
import AvailabilityService from '../services/availabilityService';
import Notification from './Notification';
import { propertyService } from '../services/propertyService';
import EmailAIExtractionService from '../services/emailAIExtractionService';
import { bookingComplianceService, type BookingEnforcementViolation } from '../services/bookingComplianceService';

const BookingManagement: React.FC = () => {
  const { currentProperty } = useProperty();
  const [currentView, setCurrentView] = useState<'home' | 'invoice-form' | 'invoice-preview' | 'actions'>('home');
  const [bookings, setBookings] = useState<Booking[]>([]);
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

  const [emailItems, setEmailItems] = useState<EmailImportItem[]>([]);
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignEmailId, setAssignEmailId] = useState<string | null>(null);
  const [assignRoomNo, setAssignRoomNo] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewContent, setPreviewContent] = useState<{
    action: 'create' | 'update' | 'cancel' | 'ignore';
    candidate?: any;
    proposed?: any;
    changes?: Array<{ field: string; from?: any; to?: any }>;
    missing?: string[];
    reason?: string;
    ota_platform?: string;
    room_type?: string;
    property_hint?: string;
    guest_name?: string;
    resolved_property_id?: string;
  } | null>(null);
  const [previewEmailId, setPreviewEmailId] = useState<string | null>(null);
  const [askRoomOnApprove, setAskRoomOnApprove] = useState(false);
  const [approveRoomNo, setApproveRoomNo] = useState('');
  const [availableRooms, setAvailableRooms] = useState<string[]>([]);
  const [properties, setProperties] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedPropertyIdForImport, setSelectedPropertyIdForImport] = useState<string | undefined>(undefined);
  const [lastParsed, setLastParsed] = useState<any | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
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

  // Load bookings and invoice counter
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        // Load bookings filtered by current property
        const bookingsData = await bookingService.getBookings({
          propertyId: currentProperty?.id
        });
        setBookings(bookingsData);

        // Load counter
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

  // Load properties for property override in preview
  useEffect(() => {
    (async () => {
      try {
        const list = await propertyService.getAllProperties();
        const minimal = list.map((p: any) => ({ id: p.id, name: p.name || 'Property' }));
        setProperties(minimal);
      } catch (e) {
        console.warn('Failed to load properties:', e);
      }
    })();
  }, []);

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

  // TODO: Implement real-time subscriptions in future story
  // Real-time subscriptions will be added when the services support them

  useEffect(() => {
    // Load all unprocessed email messages
    (async () => {
      const all = await emailMessageService.getUnprocessedAll();
      setEmailItems(all.map(r => ({ id: r.id, subject: r.subject })));
    })();
  }, []);

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
      }
    } catch (error) {
      console.error('Error cancelling booking:', error);
    }
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
      const updated = await bookingService.updateBooking(extendBookingId, { checkOut: extendDate });
      if (updated) {
        setBookings(prev => prev.map(b => b.id === extendBookingId ? { ...b, checkOut: extendDate } : b));
        pushToast('success', 'Extended', 'Stay extended successfully');
        await loadViolations();
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
        {/* Controls for bookings remain within HomePage; Email-sourced bookings shown here */}
        {emailItems.length > 0 && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-2">
            <EmailImportsPanel
              items={emailItems}
              onPreview={async (id: string) => {
                try {
                    // const msg = await emailMessageService.getById(id);
                  // Prefer pre-parsed extraction saved by the server function
                  let parsed: any | null = null;
                  try {
                    const latest = await EmailAIExtractionService.getLatestByEmailMessageId(id);
                    const aiDebug = (import.meta as any).env?.VITE_EMAIL_AI_DEBUG?.toString().toLowerCase() === 'true';
                    if (aiDebug) {
                      console.log('[EmailImportPreview] Loaded extraction from DB', latest);
                    }
                    parsed = latest?.output_json ?? null;
                  } catch (e) {
                    // ignore and fall back to local parse
                  }
                  if (!parsed) {
                    // DB-first policy: if no extraction yet, do not call AI locally
                    setEmailItems(prev => prev);
                    setPreviewOpen(true);
                    setIsPreviewLoading(false);
                    setPreviewContent({
                      action: 'ignore',
                      reason: 'Parsing queued. Please try again in ~1 minute.',
                    } as any);
                    return;
                  } else {
                    // Normalize stored output to expected shape
                    parsed = AIEmailParserService.normalize(parsed);
                    const aiDebug = (import.meta as any).env?.VITE_EMAIL_AI_DEBUG?.toString().toLowerCase() === 'true';
                    if (aiDebug) {
                      console.log('[EmailImportPreview] Normalized extraction', parsed);
                    }
                  }
                  setLastParsed(parsed);
                  // Compute preview (open first) with loading indicator
                  setPreviewContent(null);
                  setIsPreviewLoading(true);
                  setPreviewOpen(true);
                  const preview = await EmailBookingImportService.computePreview(parsed, currentProperty?.id, id);
                  setIsPreviewLoading(false);
                  const aiDebug2 = (import.meta as any).env?.VITE_EMAIL_AI_DEBUG?.toString().toLowerCase() === 'true';
                  if (aiDebug2) {
                    console.log('[EmailImportPreview] Preview data', preview);
                  }
                  setPreviewContent({
                    action: preview.action,
                    candidate: preview.candidateBooking,
                    proposed: preview.proposed,
                    changes: preview.changes,
                    missing: preview.missingFields,
                    reason: preview.reason,
                    ota_platform: (preview as any).ota_platform,
                    room_type: (preview as any).room_type,
                    property_hint: (preview as any).property_hint,
                    guest_name: (parsed as any).guest_name || (preview.proposed as any)?.guestName || (preview.candidateBooking as any)?.guestName,
                    resolved_property_id: (preview as any).resolved_property_id
                  } as any);
                  setPreviewEmailId(id);
                  setSelectedPropertyIdForImport((preview as any).resolved_property_id || currentProperty?.id || undefined);
                  setAskRoomOnApprove(preview.action === 'create' && !preview.proposed?.roomNo);
                  setApproveRoomNo('');
                  if (preview.action === 'create' && !preview.proposed?.roomNo) {
                    const rt = (preview as any).room_type as string | undefined;
                    const ci = preview.proposed?.checkIn as string | undefined;
                    const co = preview.proposed?.checkOut as string | undefined;
                    const propId = (preview as any).resolved_property_id || currentProperty?.id;
                    if (rt && ci && co && propId) {
                      AvailabilityService.getAvailableRoomsByType(propId, rt, ci, co)
                        .then(list => setAvailableRooms(list))
                        .catch(e => { console.warn('Availability preload failed:', e); setAvailableRooms([]); });
                    } else {
                      setAvailableRooms([]);
                    }
                  } else {
                    setAvailableRooms([]);
                  }
                  setPreviewOpen(true);
                } catch (e) {
                  console.error('Failed to preview import:', e);
                  pushToast('error', 'Preview failed', 'Unable to compute email import preview.');
                }
              }}
              onReparse={async (id: string) => {
                try {
                  const ok = await (await import('../lib/supabase')).emailParseQueueService.requeue(id);
                  if (ok) {
                    pushToast('info', 'Re-parse queued', 'We will parse this email shortly.');
                  } else {
                    pushToast('error', 'Re-parse failed', 'Could not queue this email.');
                  }
                } catch (e) {
                  console.error('Re-parse queue failed:', e);
                  pushToast('error', 'Re-parse failed', 'Could not queue this email.');
                }
              }}
            />
          </div>
        )}
        
        {previewOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-lg w-full max-w-full sm:max-w-2xl max-h-[85vh] mx-4 p-4 flex flex-col">
              <div className="flex justify-between items-center mb-2 flex-shrink-0">
                <div className="text-lg font-semibold">Email Import Preview</div>
                <button className="text-gray-500" onClick={() => setPreviewOpen(false)}>×</button>
              </div>
              {isPreviewLoading && (
                <div className="flex-1 flex items-center justify-center text-gray-500">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent mr-2"></div>
                  Loading preview...
                </div>
              )}
              {previewContent && !isPreviewLoading && (
                <div className="space-y-3 flex-1 overflow-y-auto overscroll-contain pr-1">
                  <div className="text-sm">Action: <span className="font-medium capitalize">{previewContent.action}</span></div>
                  {previewContent.reason && (
                    <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">{previewContent.reason}</div>
                  )}
                  {/* Meta row */}
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs">
                    <div className="bg-gray-50 border rounded p-2">
                      <div className="text-gray-500">OTA</div>
                      <div className="font-medium capitalize">{(previewContent as any).ota_platform || '-'}</div>
                    </div>
                    <div className="bg-gray-50 border rounded p-2">
                      <div className="text-gray-500">Room Type</div>
                      <div className="font-medium">{(previewContent as any).room_type || '-'}</div>
                    </div>
                    <div className="bg-gray-50 border rounded p-2">
                      <div className="text-gray-500">Property Hint</div>
                      <div className="font-medium">{(previewContent as any).property_hint || '-'}</div>
                    </div>
                    <div className="bg-gray-50 border rounded p-2">
                      <div className="text-gray-500">Guest</div>
                      <div className="font-medium">{(previewContent as any).guest_name || '-'}</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                    <div className="bg-gray-50 border rounded p-2">
                      <div className="text-gray-500">Resolved Property</div>
                      <div className="font-medium">{properties.find(p => p.id === (previewContent as any).resolved_property_id)?.name || '-'}</div>
                    </div>
                  </div>
                  {/* Property override */}
                  <div className="text-xs bg-gray-50 border rounded p-2">
                    <div className="text-gray-600 mb-1">Import into property</div>
                    <select
                      value={selectedPropertyIdForImport || ''}
                      onChange={(e) => setSelectedPropertyIdForImport(e.target.value || undefined)}
                      className="border rounded px-2 py-1 text-sm"
                    >
                      <option value="">Auto-resolve</option>
                      {properties.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                    {askRoomOnApprove && (previewContent as any)?.room_type && (previewContent as any)?.proposed?.checkIn && (previewContent as any)?.proposed?.checkOut && (
                      <button
                        type="button"
                        className="ml-2 px-2 py-1 text-xs bg-gray-200 rounded"
                        onClick={async () => {
                          try {
                            const propId = selectedPropertyIdForImport || (previewContent as any).resolved_property_id || currentProperty?.id;
                            const rt = (previewContent as any).room_type as string;
                            const ci = (previewContent as any).proposed.checkIn as string;
                            const co = (previewContent as any).proposed.checkOut as string;
                            if (propId && rt && ci && co) {
                              const list = await AvailabilityService.getAvailableRoomsByType(propId, rt, ci, co);
                              setAvailableRooms(list);
                              pushToast('success', 'Availability refreshed', `${list.length} rooms available`);
                            }
                          } catch (e) {
                            console.warn('Availability refresh failed:', e);
                            pushToast('error', 'Availability failed', 'Could not refresh availability');
                          }
                        }}
                      >
                        Refresh availability
                      </button>
                    )}
                  </div>
                  {askRoomOnApprove && (
                    <div className="text-xs bg-blue-50 border border-blue-200 rounded p-2">
                      This booking has no room number yet. Choose an available room for the selected room type:
                      <div className="mt-2 flex gap-2 items-center">
                        <select
                          value={approveRoomNo}
                          onChange={(e) => setApproveRoomNo(e.target.value)}
                          className="border rounded px-2 py-1 text-sm"
                        >
                          <option value="">Select room</option>
                          {availableRooms.map(rn => (
                            <option key={rn} value={rn}>{rn}</option>
                          ))}
                        </select>
                        <span className="text-gray-500">(optional)</span>
                      </div>
                    </div>
                  )}
                  {previewContent.missing && previewContent.missing.length > 0 && (
                    <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded p-2">Missing: {previewContent.missing.join(', ')}</div>
                  )}
                  {previewContent.candidate && (
                    <div className="text-sm">
                      <div className="font-medium mb-1">Current Booking</div>
                      <pre className="text-xs bg-gray-50 p-2 rounded border overflow-auto">{JSON.stringify(previewContent.candidate, null, 2)}</pre>
                    </div>
                  )}
                  {previewContent.proposed && (
                    <div className="text-sm">
                      <div className="font-medium mb-1">Proposed</div>
                      <pre className="text-xs bg-gray-50 p-2 rounded border overflow-auto">{JSON.stringify(previewContent.proposed, null, 2)}</pre>
                    </div>
                  )}
                  {previewContent.changes && previewContent.changes.length > 0 && (
                    <div className="text-sm">
                      <div className="font-medium mb-1">Changes</div>
                      <ul className="text-xs bg-gray-50 p-2 rounded border space-y-1">
                        {previewContent.changes.map((c, i) => (
                          <li key={i}>
                            <span className="font-medium">{c.field}:</span> {String(c.from)} → {String(c.to)}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
              <div className="flex justify-end mt-3 gap-2 flex-shrink-0">
                <button className="px-3 py-1 text-gray-600" onClick={() => setPreviewOpen(false)}>Close</button>
                <button
                  className={`px-3 py-1 text-white rounded ${isApproving ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
                  disabled={isApproving || isPreviewLoading}
                  onClick={async () => {
                    try {
                      if (!previewEmailId) return;
                      setIsApproving(true);
                      // Reuse parsed output from preview to avoid a second AI call
                      let parsed = lastParsed ? { ...lastParsed } : null;
                      if (!parsed) {
                        const msg = await emailMessageService.getById(previewEmailId);
                        parsed = await AIEmailParserService.parse({ subject: msg?.subject, body: msg?.snippet, email_message_id: previewEmailId });
                      }
                      if (askRoomOnApprove && approveRoomNo.trim()) {
                        (parsed as any).room_no = approveRoomNo.trim();
                      }
                      const result = await EmailBookingImportService.importFromParsed(previewEmailId, parsed as any, selectedPropertyIdForImport || currentProperty?.id);
                      // Floating toast
                      pushToast('success', 'Email Import Approved', `${(parsed as any).event_type} processed${result.booking_id ? ` (Booking ${result.booking_id})` : ''}.`);
                      // Remove processed email from list
                      setEmailItems(prev => prev.filter(e => e.id !== previewEmailId));
                      setPreviewOpen(false);
                      setPreviewEmailId(null);
                      setLastParsed(null);
                    } catch (e) {
                      console.error('Failed to approve import from preview:', e);
                      pushToast('error', 'Approval failed', 'Could not complete import approval.');
                    } finally {
                      setIsApproving(false);
                    }
                  }}
                >
                  {isApproving ? (
                    <span className="inline-flex items-center">
                      <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></span>
                      Approving...
                    </span>
                  ) : 'Approve'}
                </button>
              </div>
            </div>
          </div>
        )}
        {assignOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
            <div className="bg-white rounded shadow-lg w-full max-w-sm p-4">
              <div className="text-lg font-semibold mb-2">Assign Room</div>
              <div className="text-sm text-gray-600 mb-3">Enter a room number to assign to the type-level booking derived from this email.</div>
              <input
                value={assignRoomNo}
                onChange={(e) => setAssignRoomNo(e.target.value)}
                placeholder="Room number"
                className="w-full border rounded px-3 py-2 mb-3"
              />
              <div className="flex justify-end gap-2">
                <button className="px-3 py-1 text-gray-600" onClick={() => { setAssignOpen(false); setAssignRoomNo(''); setAssignEmailId(null); }}>Cancel</button>
                <button
                  className="px-3 py-1 bg-blue-600 text-white rounded"
                  onClick={async () => {
                    try {
                      // TODO: Implement actual mapping to booking and update room_no
                      console.log('Assign room submit (placeholder):', { emailId: assignEmailId, roomNo: assignRoomNo });
                    } catch (e) {
                      console.error('Assign room failed:', e);
                    } finally {
                      setAssignOpen(false);
                      setAssignRoomNo('');
                      setAssignEmailId(null);
                    }
                  }}
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}
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
            setBookings(prev => [...prev, booking]);
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