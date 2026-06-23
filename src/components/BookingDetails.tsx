import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { X, Edit, Save, XCircle, FileText, Receipt, Plus, Minus, QrCode, User, Phone, MapPin, CreditCard, Users, Calendar, Clock, Trash2, Download, LogIn, LogOut } from 'lucide-react';
import { Booking } from '../types/booking';
import { CheckInData, CheckInFormData } from '../types/checkin';
import CheckInDetailsEditor from './CheckInDetailsEditor';
import { InvoiceData, CancellationInvoiceData } from '../types/invoice';
import { updateBookingWithValidation, invoiceCounterService, checkInService, bookingService } from '../lib/supabase';
import { StorageService } from '../lib/storage';
import { InvoicePreview } from './InvoicePreview';
import { InvoicePerLine } from './InvoicePerLine';
import { CancellationInvoicePreview } from './CancellationInvoicePreview';
import { QRCodeGenerator } from './QRCodeGenerator';
import { useNotification } from './NotificationContainer';
import { InvoicePDFExport } from './InvoicePDF';
// Removed exportInvoiceById usage in favor of consolidated high-quality export within InvoicePerLine
import { bookingChargesService, type BookingCharge } from '../services/bookingChargesService';
import { bookingPaymentsService, type BookingPayment } from '../services/bookingPaymentsService';
import { computeFinancials, type BookingFinancials } from '../services/bookingFinancialsService';
import { useBookingLedger, ledgerQueryKey, type BookingLedger } from '../hooks/useBookingLedger';
import { useCurrentPropertyId, useProperty } from '../contexts/PropertyContext';
import { getInvoiceCompany } from '../utils/invoiceCompany';
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription } from './ui/Dialog';
import { menuService } from '../services/menuService';
import { useTranslation } from '../hooks/useTranslation';
import type { MenuItem } from '../types/fnb';

interface BookingDetailsProps {
  booking: Booking | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (booking: Booking) => void;
  onCancel: (bookingId: string) => void;
  onDelete: (bookingId: string) => void;
}

export const BookingDetails: React.FC<BookingDetailsProps> = ({
  booking,
  isOpen,
  onClose,
  onUpdate,
  onCancel,
  onDelete,
}) => {
  const { showSuccess, showError, showWarning } = useNotification();
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [showInvoice, setShowInvoice] = useState(false);
  const [downloadingInvoice, setDownloadingInvoice] = useState(false);
  const [showPerLineInvoice, setShowPerLineInvoice] = useState(false);
  const [showCancellationInvoice, setShowCancellationInvoice] = useState(false);
  const [showQRCode, setShowQRCode] = useState(false);
  const [invoiceNumber, setInvoiceNumber] = useState(391);
  const [cancellationInvoiceData, setCancellationInvoiceData] = useState<CancellationInvoiceData | null>(null);
  const [editData, setEditData] = useState<Partial<Booking>>({});
  const [checkInData, setCheckInData] = useState<CheckInData | null>(null);
  const [loadingCheckIn, setLoadingCheckIn] = useState(false);
  const [isEditingCheckIn, setIsEditingCheckIn] = useState(false);
  const [isSavingCheckIn, setIsSavingCheckIn] = useState(false);
  // Which invoice the combined invoice control prints. Default to the per-line full invoice.
  const [invoiceType, setInvoiceType] = useState<'standard' | 'perline'>('perline');
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false);
  const [confirmCheckInOpen, setConfirmCheckInOpen] = useState(false);
  // Prevent duplicate auto-finalize submissions per booking
  const autoFinalizeAttemptedFor = useRef<string | null>(null);

  // Charges / Payments / Financials state
  const propertyId = useCurrentPropertyId();
  const { currentProperty, properties } = useProperty();
  // Invoice header (and check-in/out times) are driven by the booking's own
  // property, not a hardcoded value.
  const invoiceProperty = properties.find(p => p.id === booking?.propertyId) || currentProperty;
  const invoiceCompany = getInvoiceCompany(invoiceProperty);

  // Download the on-screen (GST) invoice as a single-page A4 PDF via html2pdf —
  // a real file download, no browser print dialog.
  const handleDownloadInvoicePdf = async () => {
    if (!booking || downloadingInvoice) return; // guard against double-fire (corrupts the spacer)
    try {
      setDownloadingInvoice(true);
      const { exportInvoiceById } = await import('../lib/pdf/exportInvoice');
      const num = String(booking.folioNumber || `520/${invoiceNumber}`).replace(/[\\/:*?"<>|]/g, '-');
      await exportInvoiceById('invoice-preview', `Invoice_${num}.pdf`, { scale: 2 });
    } catch (e) {
      const detail = e instanceof Error ? e.message : String(e);
      showError('Download failed', `Could not download the invoice: ${detail}`);
    } finally {
      setDownloadingInvoice(false);
    }
  };

  // Switch which invoice the preview modal shows, swapping the two modals in place.
  const switchInvoiceType = (type: 'standard' | 'perline') => {
    setInvoiceType(type);
    if (type === 'perline') {
      setShowInvoice(false);
      setShowPerLineInvoice(true);
    } else {
      setShowPerLineInvoice(false);
      setShowInvoice(true);
    }
  };

  // Full | Standard segmented toggle shown at the top of the invoice preview modal.
  const renderInvoiceToggle = () => (
    <div className="flex text-xs font-medium rounded-md overflow-hidden border border-gray-300">
      <button
        type="button"
        onClick={() => switchInvoiceType('perline')}
        className={`px-3 py-1.5 transition-colors ${invoiceType === 'perline' ? 'bg-gray-900 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
      >
        Full
      </button>
      <button
        type="button"
        onClick={() => switchInvoiceType('standard')}
        className={`px-3 py-1.5 transition-colors ${invoiceType === 'standard' ? 'bg-gray-900 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
      >
        Standard
      </button>
    </div>
  );
  // Charges + payments are cached via React Query (instant on re-open). setCharges/
  // setPayments keep the useState-setter signature, so the mutation handlers below
  // work unchanged — they now write to the query cache. Totals are derived locally.
  const queryClient = useQueryClient();
  const ledgerQuery = useBookingLedger(propertyId, booking?.id);
  const charges = ledgerQuery.data?.charges ?? [];
  const payments = ledgerQuery.data?.payments ?? [];
  const loadingFinance = ledgerQuery.isLoading;
  const financeError = ledgerQuery.error ? ((ledgerQuery.error as Error).message || 'Failed to load charges/payments') : null;
  const setCharges = (updater: BookingCharge[] | ((prev: BookingCharge[]) => BookingCharge[])) => {
    queryClient.setQueryData<BookingLedger>(ledgerQueryKey(propertyId, booking?.id), (old) => ({
      charges: typeof updater === 'function' ? (updater as (p: BookingCharge[]) => BookingCharge[])(old?.charges ?? []) : updater,
      payments: old?.payments ?? [],
    }));
  };
  const setPayments = (updater: BookingPayment[] | ((prev: BookingPayment[]) => BookingPayment[])) => {
    queryClient.setQueryData<BookingLedger>(ledgerQueryKey(propertyId, booking?.id), (old) => ({
      charges: old?.charges ?? [],
      payments: typeof updater === 'function' ? (updater as (p: BookingPayment[]) => BookingPayment[])(old?.payments ?? []) : updater,
    }));
  };
  const financials = useMemo<BookingFinancials | null>(
    () => (booking && propertyId ? computeFinancials(charges, payments, propertyId, booking.id) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ledgerQuery.data, propertyId, booking?.id]
  );

  // Translation (for localized Food items)
  const { currentLanguage } = useTranslation();

  // Modals and forms state for Charges & Payments
  const [addFoodOpen, setAddFoodOpen] = useState(false);
  const [addMiscOpen, setAddMiscOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState<null | 'payment' | 'refund'>(null);
  const [editCharge, setEditCharge] = useState<BookingCharge | null>(null);
  const [voidChargeId, setVoidChargeId] = useState<string | null>(null);
  const [voidPaymentId, setVoidPaymentId] = useState<string | null>(null);

  // Food typeahead & form
  const [foodSearch, setFoodSearch] = useState('');
  const [foodResults, setFoodResults] = useState<MenuItem[]>([]);
  const [foodLoading, setFoodLoading] = useState(false);
  const [foodForm, setFoodForm] = useState<{ description: string; quantity: number; unitAmount: number; createdAt?: string }>({
    description: '',
    quantity: 1,
    unitAmount: 0,
    createdAt: undefined,
  });

  // Misc charge form
  const [miscForm, setMiscForm] = useState<{ description: string; quantity: number; unitAmount: number; createdAt?: string }>({
    description: '',
    quantity: 1,
    unitAmount: 0,
    createdAt: undefined,
  });

  // Edit charge form
  const [editForm, setEditForm] = useState<{ description?: string; quantity?: number; unitAmount?: number }>({});

  // Payment / Refund form
  const [paymentForm, setPaymentForm] = useState<{ method?: string; referenceNo?: string; amount: number; createdAt?: string }>({
    method: undefined,
    referenceNo: undefined,
    amount: 0,
    createdAt: undefined,
  });

  
  // Photo upload state
  const [isUploadingPhotos, setIsUploadingPhotos] = useState(false);

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

      // Auto-open QR if requested by previous action
      try {
        const targetId = sessionStorage.getItem('open_qr_for_booking_id');
        if (targetId && targetId === booking.id) {
          setShowQRCode(true);
          sessionStorage.removeItem('open_qr_for_booking_id');
        }
      } catch {}
    }
  }, [booking]);



  // NOTE: we intentionally do NOT auto-close the QR just because the booking is
  // already checked-in / the form is already complete — staff may reopen the QR
  // on a checked-in booking to recover from an accidental check-in. The normal
  // "close after the guest finishes" path is handled by the auto-finalize effect
  // below (it closes the QR once it flips the status to checked-in).

  // While QR is open, poll for check-in form completion so we can auto-finalize
  useEffect(() => {
    if (!showQRCode || !booking) return;
    let active = true;
    const POLL_MS = 5000;
    const MAX_MS = 10 * 60 * 1000;
    const start = Date.now();

    const interval = setInterval(async () => {
      if (!active) return;
      // Stop polling after timeout
      if (Date.now() - start > MAX_MS) {
        clearInterval(interval);
        return;
      }
      try {
        const data = await checkInService.getCheckInDataByBookingId(booking.id);
        setCheckInData(data);
        if (data?.form_completed_at) {
          clearInterval(interval);
        }
      } catch (e) {
        // non-blocking
      }
    }, POLL_MS);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [showQRCode, booking?.id]);

  // When status flips to checked-in, refetch check-in data to update the details panel
  useEffect(() => {
    const refreshOnCheckedIn = async () => {
      if (!booking || booking.status !== 'checked-in') return;
      try {
        const data = await checkInService.getCheckInDataByBookingId(booking.id);
        setCheckInData(data);
      } catch (e) {
        // non-blocking
      }
    };
    refreshOnCheckedIn();
  }, [booking?.status]);

  // Reset auto-finalize guard when booking changes
  useEffect(() => {
    if (booking?.id && autoFinalizeAttemptedFor.current !== booking.id) {
      autoFinalizeAttemptedFor.current = null;
    }
  }, [booking?.id]);

  // Auto-finalize check-in when form completion is detected but status isn't updated yet
  useEffect(() => {
    const maybeFinalize = async () => {
      if (!booking) return;
      if (!checkInData?.form_completed_at) return;
      // Only auto-finalize from a pre-arrival state. Without this, checking a
      // guest OUT (status 'checked-out') would re-trigger this and flip them
      // back to 'checked-in'.
      if (booking.status !== 'confirmed' && booking.status !== 'pending') return;
      // Guard to avoid repeated submissions for the same booking
      if (autoFinalizeAttemptedFor.current === booking.id) return;

      autoFinalizeAttemptedFor.current = booking.id;
      try {
        const res = await updateBookingWithValidation(booking.id, { status: 'checked-in' as Booking['status'] });
        if (res.success && res.booking) {
          onUpdate(res.booking);
          showSuccess('Checked in', 'Form completed. Guest has been checked in.');
          // Close QR if still open
          setShowQRCode(false);
        } else if (res.errors && res.errors.length) {
          // If backend still blocks, surface the message and allow manual action
          showError('Check-in update failed', res.errors.join(', '));
        }
      } catch (e: any) {
        showError('Check-in update failed', e?.message || 'Unexpected error while finalizing check-in');
      }
    };
    maybeFinalize();
  }, [checkInData?.form_completed_at, booking?.id, booking?.status]);

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


  // (Charges/payments loading is handled by useBookingLedger above.)

  // Food typeahead search (debounced)
  useEffect(() => {
    if (!addFoodOpen || !propertyId) return;
    if (!foodSearch || foodSearch.trim().length < 2) {
      setFoodResults([]);
      return;
    }
    let cancelled = false;
    setFoodLoading(true);
    const timer = setTimeout(async () => {
      try {
        const items = await menuService.listItems({
          propertyId,
          search: foodSearch.trim(),
          availableOnly: true,
          locale: currentLanguage,
        });
        if (!cancelled) setFoodResults(items);
      } catch (err) {
        if (!cancelled) console.error('Food search failed', err);
      } finally {
        if (!cancelled) setFoodLoading(false);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [addFoodOpen, foodSearch, propertyId, currentLanguage]);

  // Helpers — revalidate the cached ledger from the server (totals recompute via the
  // useMemo above; the legacy-column sync runs from the effect below).
  const reloadFinancials = async () => {
    if (!propertyId || !booking) return;
    await queryClient.invalidateQueries({ queryKey: ledgerQueryKey(propertyId, booking.id) });
  };

  // The booking list, KPI cards and grid read the legacy bookings.payment_status /
  // payment_amount columns, but charges/payments live in their own tables. Keep the
  // legacy columns in sync with the canonical booking_financials view so a partial
  // payment shows as "Partial" everywhere — not just in this modal's summary.
  const syncLegacyPaymentStatus = async (fin: BookingFinancials | null) => {
    if (!fin || !booking) return;
    // Never derive (and overwrite) a legacy status from "no-charges": that state
    // also occurs when a booking's room charge failed to create, so writing
    // unpaid/0 here would clobber a booking that was actually paid.
    if (fin.statusDerived === 'no-charges') return;
    const netPaid = Math.max(0, (fin.paymentsTotal || 0) - (fin.refundsTotal || 0));
    const derived: 'paid' | 'partial' | 'unpaid' =
      fin.statusDerived === 'paid'
        ? 'paid'
        : (fin.statusDerived === 'partial' || netPaid > 0)
        ? 'partial'
        : 'unpaid';
    const currentStatus = (booking.paymentStatus as string) || 'unpaid';
    const currentAmount = Number(booking.paymentAmount || 0);
    if (currentStatus === derived && Math.abs(currentAmount - netPaid) < 0.01) return; // already in sync
    try {
      const updated = await bookingService.updateBooking(booking.id, {
        paymentStatus: derived,
        paymentAmount: netPaid,
      } as Partial<Booking>);
      if (updated) onUpdate(updated);
    } catch (e) {
      console.warn('Failed to sync legacy payment status from financials', e);
    }
  };

  // Reconcile the legacy payment columns whenever the computed status/balance
  // changes (opening a booking, or after adding a charge/payment). CRITICAL: only
  // run once the ledger has actually loaded — otherwise charges/payments are still
  // the empty default, financials reads "no-charges", and we'd wrongly overwrite a
  // paid booking's legacy columns to unpaid/0 during the loading window.
  useEffect(() => {
    if (!ledgerQuery.data || ledgerQuery.isLoading || ledgerQuery.isError) return;
    if (financials) void syncLegacyPaymentStatus(financials);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [financials?.statusDerived, financials?.balanceDue, booking?.id, ledgerQuery.data, ledgerQuery.isLoading, ledgerQuery.isError]);

  // Submit handlers
  const submitFoodCharge = async () => {
    if (!propertyId || !booking) return;
    try {
      if (!(foodForm.quantity > 0)) throw new Error('Quantity must be > 0');
      if (!(foodForm.unitAmount > 0)) throw new Error('Unit amount must be greater than 0');
      setIsLoading(true);
      const created = await bookingChargesService.createFoodCharge(propertyId, booking.id, {
        description: foodForm.description || undefined,
        quantity: foodForm.quantity,
        unitAmount: foodForm.unitAmount,
        createdAt: foodForm.createdAt,
      });
      setCharges(prev => [...prev, created]);
      showSuccess('Food charge added', 'The charge was saved.');
      setAddFoodOpen(false);
      setFoodSearch('');
      setFoodResults([]);
      setFoodForm({ description: '', quantity: 1, unitAmount: 0, createdAt: undefined });
      await reloadFinancials();
    } catch (e: any) {
      console.error(e);
      showError('Add failed', e?.message || 'Could not add food charge');
    } finally {
      setIsLoading(false);
    }
  };

  const submitMiscCharge = async () => {
    if (!propertyId || !booking) return;
    try {
      if (!(miscForm.quantity > 0)) throw new Error('Quantity must be > 0');
      if (!(miscForm.unitAmount > 0)) throw new Error('Unit amount must be greater than 0');
      setIsLoading(true);
      const created = await bookingChargesService.createMiscCharge(propertyId, booking.id, {
        description: miscForm.description || undefined,
        quantity: miscForm.quantity,
        unitAmount: miscForm.unitAmount,
        createdAt: miscForm.createdAt,
      });
      setCharges(prev => [...prev, created]);
      showSuccess('Misc charge added', 'The charge was saved.');
      setAddMiscOpen(false);
      setMiscForm({ description: '', quantity: 1, unitAmount: 0, createdAt: undefined });
      await reloadFinancials();
    } catch (e: any) {
      console.error(e);
      showError('Add failed', e?.message || 'Could not add misc charge');
    } finally {
      setIsLoading(false);
    }
  };

  const submitEditCharge = async () => {
    if (!editCharge || !propertyId || !booking) return;
    try {
      setIsLoading(true);
      const updated = await bookingChargesService.update(propertyId, booking.id, editCharge.id, {
        description: editForm.description,
        quantity: editForm.quantity,
        unitAmount: editForm.unitAmount,
      });
      setCharges(prev => prev.map(c => (c.id === updated.id ? updated : c)));
      showSuccess('Charge updated', 'The charge was updated.');
      setEditCharge(null);
      setEditForm({});
      await reloadFinancials();
    } catch (e: any) {
      console.error(e);
      showError('Update failed', e?.message || 'Could not update charge');
    } finally {
      setIsLoading(false);
    }
  };

  const confirmVoidCharge = async () => {
    if (!voidChargeId || !propertyId || !booking) return;
    try {
      setIsLoading(true);
      await bookingChargesService.void(propertyId, booking.id, voidChargeId);
      setCharges(prev => prev.filter(c => c.id !== voidChargeId));
      showSuccess('Charge voided', 'The charge was voided.');
      setVoidChargeId(null);
      await reloadFinancials();
    } catch (e: any) {
      console.error(e);
      showError('Void failed', e?.message || 'Could not void charge');
    } finally {
      setIsLoading(false);
    }
  };

  const submitPayment = async () => {
    if (!paymentOpen || !propertyId || !booking) return;
    try {
      if (!(paymentForm.amount > 0)) throw new Error('Amount must be > 0');
      // A refund can't exceed what has actually been collected so far.
      if (paymentOpen === 'refund') {
        const netPaid = (financials?.paymentsTotal || 0) - (financials?.refundsTotal || 0);
        if (paymentForm.amount > netPaid) {
          throw new Error(`Refund cannot exceed payments received (₹${netPaid.toFixed(2)})`);
        }
      }
      setIsLoading(true);
      const created =
        paymentOpen === 'payment'
          ? await bookingPaymentsService.addPayment(propertyId, booking.id, {
              method: paymentForm.method,
              referenceNo: paymentForm.referenceNo,
              amount: paymentForm.amount,
              createdAt: paymentForm.createdAt,
            })
          : await bookingPaymentsService.addRefund(propertyId, booking.id, {
              method: paymentForm.method,
              referenceNo: paymentForm.referenceNo,
              amount: paymentForm.amount,
              createdAt: paymentForm.createdAt,
            });
      setPayments(prev => [...prev, created]);
      showSuccess(paymentOpen === 'payment' ? 'Payment added' : 'Refund added', 'Saved successfully.');
      setPaymentOpen(null);
      setPaymentForm({ method: undefined, referenceNo: undefined, amount: 0, createdAt: undefined });
      await reloadFinancials();
    } catch (e: any) {
      console.error(e);
      showError('Save failed', e?.message || 'Could not save');
    } finally {
      setIsLoading(false);
    }
  };

  const confirmVoidPayment = async () => {
    if (!voidPaymentId || !propertyId || !booking) return;
    try {
      setIsLoading(true);
      await bookingPaymentsService.void(propertyId, booking.id, voidPaymentId);
      setPayments(prev => prev.filter(p => p.id !== voidPaymentId));
      showSuccess('Voided', 'The record was voided.');
      setVoidPaymentId(null);
      await reloadFinancials();
    } catch (e: any) {
      console.error(e);
      showError('Void failed', e?.message || 'Could not void');
    } finally {
      setIsLoading(false);
    }
  };


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

  const handleCheckInAction = async () => {
    if (!booking) return;
    // Warn (and allow override) when the guest hasn't completed the check-in form.
    if (!checkInData?.form_completed_at) {
      setConfirmCheckInOpen(true);
      return;
    }
    await performCheckIn();
  };

  // Normal check-in (form is complete) — goes through the validated path.
  const performCheckIn = async () => {
    if (!booking) return;
    setIsLoading(true);
    setValidationErrors([]);
    try {
      const result = await updateBookingWithValidation(booking.id, { status: 'checked-in' as Booking['status'] });
      if (result.success && result.booking) {
        onUpdate(result.booking);
        showSuccess('Checked in', 'Guest has been checked in.');
      } else if (result.errors) {
        setValidationErrors(result.errors);
        if (result.errors.some(e => e.toLowerCase().includes('check-in form must be completed'))) {
          // Form state changed under us — fall back to the confirmation modal.
          setConfirmCheckInOpen(true);
        } else {
          showError('Check-in failed', result.errors.join(', '));
        }
      }
    } catch (e: any) {
      showError('Check-in failed', e?.message || 'Unexpected error while checking in');
    } finally {
      setIsLoading(false);
    }
  };

  // Override: check in without a completed form (bypasses the form requirement).
  const confirmCheckInWithoutForm = async () => {
    if (!booking) return;
    setConfirmCheckInOpen(false);
    setIsLoading(true);
    setValidationErrors([]);
    try {
      const updated = await bookingService.updateBooking(booking.id, { status: 'checked-in' as Booking['status'] });
      if (updated) {
        onUpdate(updated);
        showSuccess('Checked in', 'Guest checked in without a completed check-in form.');
      } else {
        showError('Check-in failed', 'Could not update the booking status.');
      }
    } catch (e: any) {
      showError('Check-in failed', e?.message || 'Unexpected error while checking in');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckOutAction = async () => {
    if (!booking) return;
    setIsLoading(true);
    setValidationErrors([]);
    try {
      const result = await updateBookingWithValidation(booking.id, { status: 'checked-out' as Booking['status'] });
      if (result.success && result.booking) {
        onUpdate(result.booking);
        showSuccess('Checked out', 'Guest has been checked out.');
      } else if (result.errors) {
        setValidationErrors(result.errors);
        showError('Check-out failed', result.errors.join(', '));
      }
    } catch (e: any) {
      showError('Check-out failed', e?.message || 'Unexpected error while checking out');
    } finally {
      setIsLoading(false);
    }
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
        // If backend indicates check-in form is incomplete, auto-open QR modal
        if (result.errors.some(e => e.toLowerCase().includes('check-in form must be completed'))) {
          setShowQRCode(true);
        }
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
        [name]: name === 'noOfPax' || name === 'totalAmount' || name === 'numberOfRooms'
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
        const newAdults = Math.min(currentAdults, newCount);
        const newChildren = Math.max(0, newCount - newAdults);
        newData.adultChild = `${newAdults}/${newChildren}`;
      }
      if (name === 'numberOfRooms') {
        const roomCount = parseFloat(value) || 1;
        newData.numberOfRooms = Math.max(1, roomCount);
        newData.noOfPax = Math.max(roomCount, prev.noOfPax || 1);
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

  const handleSaveCheckInDetails = async (updates: Partial<CheckInFormData>) => {
    if (!checkInData) return;
    setIsSavingCheckIn(true);
    try {
      const updated = await checkInService.updateCheckInData(checkInData.id, updates);
      if (updated) {
        setCheckInData(updated);
        setIsEditingCheckIn(false);
        showSuccess('Check-in details updated', 'The guest check-in information has been saved.');
      } else {
        showError('Update failed', 'Could not save check-in details. Please try again.');
      }
    } catch (e: any) {
      console.error('Failed to save check-in details', e);
      showError('Update failed', e?.message || 'Could not save check-in details.');
    } finally {
      setIsSavingCheckIn(false);
    }
  };

  // Additional photos upload handler
  const handleAdditionalPhotosUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0 || !checkInData) return;

    setIsUploadingPhotos(true);
    try {
      const uploadResults = await StorageService.uploadFiles(Array.from(files), checkInData.id);
      
      if (uploadResults.length > 0) {
        const successfulUploads = uploadResults.filter(result => result.success);
        const newPhotoUrls = successfulUploads.map(result => result.url).filter(url => url);
        
        if (newPhotoUrls.length > 0) {
          const existingUrls = checkInData.id_photo_urls || [];
          const updatedUrls = [...existingUrls, ...newPhotoUrls].filter((url): url is string => url !== undefined);

          const updates = {
            id_photo_urls: updatedUrls
          };

          const updatedData = await checkInService.updateCheckInData(checkInData.id, updates);
          if (updatedData) {
            setCheckInData(updatedData);
            showSuccess('Photos uploaded successfully!', `${newPhotoUrls.length} photo(s) added to ID verification documents.`);
          }
        } else {
          showWarning('Upload incomplete', 'No photos were uploaded successfully. Please try again.');
        }
      } else {
        showError('Upload failed', 'Failed to upload photos. Please check your files and try again.');
      }
    } catch (error) {
      console.error('Error uploading additional photos:', error);
      showError('Upload error', 'Failed to upload photos. Please try again.');
    } finally {
      setIsUploadingPhotos(false);
      // Reset the file input
      event.target.value = '';
    }
  };

  const handleCancelBooking = () => {
    if (booking) {
      setConfirmCancelOpen(true);
    }
  };

  const handleShowCancellationInvoice = async () => {
    if (!booking) return;

    try {
      const noOfDays = Math.ceil(
        (new Date(booking.checkOut).getTime() - new Date(booking.checkIn).getTime()) / (1000 * 60 * 60 * 24)
      );

      // Create cancellation invoice data
      const totalPaidCalculated = financials
        ? Math.max(0, (financials.paymentsTotal || 0) - (financials.refundsTotal || 0))
        : 0;
      const cancellationData: CancellationInvoiceData = {
        companyName: invoiceCompany.name,
        companyAddress: invoiceCompany.address,
        companyPhone: invoiceCompany.phone,
        companyEmail: invoiceCompany.email,
        invoiceNumber: booking.folioNumber || `520/${invoiceNumber}`,
        guestName: booking.guestName,
        billTo: booking.guestName,
        address: '',
        companyNameBillTo: '',
        billToRegNo: '',
        date: getCurrentISTTime(),
        noOfPax: booking.noOfPax ?? 1,
        adultChild: booking.adultChild ?? '',
        grCardNo: '',
        roomNo: booking.roomNo,
        numberOfRooms: booking.numberOfRooms ?? 1,
        dateOfArrival: booking.checkIn,
        dateOfDeparture: booking.checkOut,
        timeOfArrival: '12:00',
        timeOfDeparture: '11:00',
        noOfDays: noOfDays,
        originalBookingAmount: booking.totalAmount,
        totalPaid: totalPaidCalculated,
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
      companyName: invoiceCompany.name,
      companyAddress: invoiceCompany.address,
      companyPhone: invoiceCompany.phone,
      companyEmail: invoiceCompany.email,
      invoiceNumber: booking.folioNumber || `520/${invoiceNumber}`,
      guestName: booking.guestName,
      billTo: booking.guestName,
      address: '',
      companyNameBillTo: '',
      billToRegNo: '',
      date: getCurrentISTTime(),
              noOfPax: booking.noOfPax ?? 1,
        adultChild: booking.adultChild ?? '',
      grCardNo: '',
      roomNo: booking.roomNo,
      numberOfRooms: booking.numberOfRooms ?? 1,
      dateOfArrival: booking.checkIn,
      dateOfDeparture: booking.checkOut,
      timeOfArrival: '14:00',
      timeOfDeparture: '11:00',
      noOfDays: noOfDays,
      // Use the aggregated gross total (room + F&B + misc) so the invoice matches
      // the folio; fall back to the legacy column only if financials haven't loaded.
      grandTotal: financials?.grossTotal ?? booking.totalAmount,
      paymentAmount: Math.max(0, (financials?.paymentsTotal || 0) - (financials?.refundsTotal || 0)),
      paymentMethod: (payments && payments.length > 0 && payments[payments.length - 1]?.method) ? (payments[payments.length - 1].method as string) : 'Cash',
    };
  };

  

  if (!isOpen || !booking) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
        <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between p-6 border-b">
            <h2 className="text-xl font-semibold">
              {booking.cancelled ? 'Cancelled Booking Details' : 'Booking Details'}
            </h2>
            <button
              onClick={onClose}
              aria-label="Close"
              className="p-2 -mr-2 text-gray-400 hover:text-gray-600 active:text-gray-700"
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

            {/* Financial Summary Panel */}
            <div className="mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
              <h3 className="text-sm font-medium text-gray-900 mb-3">Financial Summary</h3>
              {loadingFinance && (
                <p className="text-sm text-gray-500">Loading charges and payments…</p>
              )}
              {!loadingFinance && financeError && (
                <p className="text-sm text-red-600">{financeError}</p>
              )}
              {!loadingFinance && !financeError && financials && (
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center justify-between"><span className="text-gray-600">Charges</span><span className="font-medium">₹{financials.chargesTotal.toFixed(2)}</span></div>
                  <div className="flex items-center justify-between"><span className="text-gray-600">Room Charges</span><span className="font-medium">₹{(
                    charges.some(c => c.chargeType === 'room')
                      ? charges.filter(c => c.chargeType === 'room').reduce((s, c) => s + c.amount, 0)
                      : (booking?.totalAmount || 0)
                  ).toFixed(2)}</span></div>
                  <div className="flex items-center justify-between"><span className="text-gray-600">Gross</span><span className="font-medium">₹{financials.grossTotal.toFixed(2)}</span></div>
                  <div className="flex items-center justify-between"><span className="text-gray-600">Payments</span><span className="font-medium">₹{financials.paymentsTotal.toFixed(2)}</span></div>
                  <div className="flex items-center justify-between"><span className="text-gray-600">Refunds</span><span className="font-medium">₹{financials.refundsTotal.toFixed(2)}</span></div>
                  <div className="flex items-center justify-between"><span className="text-gray-600">Balance Due</span><span className="font-semibold">₹{financials.balanceDue.toFixed(2)}</span></div>
                </div>
              )}
              {!loadingFinance && !financeError && financials && (
                <div className="mt-2 text-xs text-gray-600">Status: <span className="uppercase">{financials.statusDerived}</span></div>
              )}
            </div>

            {/* Charges & Payments Sections */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
              {/* Charges Section */}
              <div className="border border-gray-200 rounded-lg">
                <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 bg-white rounded-t-lg">
                  <h3 className="text-sm font-medium text-gray-900">Charges</h3>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setAddFoodOpen(true)}
                      disabled={isLoading}
                      className="inline-flex items-center gap-1 px-3 py-2 min-h-[36px] text-xs border rounded hover:bg-gray-50 disabled:opacity-50"
                    >
                      <Plus className="w-3 h-3" /> Food
                    </button>
                    <button
                      type="button"
                      onClick={() => setAddMiscOpen(true)}
                      disabled={isLoading}
                      className="inline-flex items-center gap-1 px-3 py-2 min-h-[36px] text-xs border rounded hover:bg-gray-50 disabled:opacity-50"
                    >
                      <Plus className="w-3 h-3" /> Misc
                    </button>
                  </div>
                </div>
                <div className="divide-y">
                  {charges.length === 0 && (
                    <div className="p-4 text-sm text-gray-500">No charges yet.</div>
                  )}
                  {charges.map((c) => (
                    <div key={c.id} className="p-3 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">
                          {c.chargeType.toUpperCase()} {c.description ? `• ${c.description}` : ''}
                        </div>
                        <div className="text-xs text-gray-500">
                          Qty {c.quantity} × ₹{c.unitAmount.toFixed(2)} = ₹{c.amount.toFixed(2)}
                        </div>
                        <div className="text-[11px] text-gray-400">{new Date(c.createdAt).toLocaleString()}</div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setEditCharge(c);
                            setEditForm({ description: c.description, quantity: c.quantity, unitAmount: c.unitAmount });
                          }}
                          className="inline-flex items-center gap-1 px-3 py-2 min-h-[36px] text-xs border rounded hover:bg-gray-50"
                        >
                          <Edit className="w-3 h-3" /> Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => setVoidChargeId(c.id)}
                          className="inline-flex items-center gap-1 px-3 py-2 min-h-[36px] text-xs border rounded text-red-600 border-red-200 hover:bg-red-50"
                        >
                          <Trash2 className="w-3 h-3" /> Void
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Payments Section */}
              <div className="border border-gray-200 rounded-lg">
                <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 bg-white rounded-t-lg">
                  <h3 className="text-sm font-medium text-gray-900">Payments</h3>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setPaymentOpen('payment')}
                      className="inline-flex items-center gap-1 px-3 py-2 min-h-[36px] text-xs border rounded hover:bg-gray-50"
                    >
                      <Plus className="w-3 h-3" /> Payment
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentOpen('refund')}
                      className="inline-flex items-center gap-1 px-3 py-2 min-h-[36px] text-xs border rounded hover:bg-gray-50"
                    >
                      <Minus className="w-3 h-3" /> Refund
                    </button>
                  </div>
                </div>
                <div className="divide-y">
                  {payments.length === 0 && (
                    <div className="p-4 text-sm text-gray-500">No payments yet.</div>
                  )}
                  {payments.map((p) => (
                    <div key={p.id} className="p-3 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">
                          {p.paymentType.toUpperCase()} {p.method ? `• ${p.method}` : ''} {p.referenceNo ? `• Ref ${p.referenceNo}` : ''}
                        </div>
                        <div className="text-xs text-gray-500">Amount ₹{p.amount.toFixed(2)}</div>
                        <div className="text-[11px] text-gray-400">{new Date(p.createdAt).toLocaleString()}</div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => setVoidPaymentId(p.id)}
                          className="inline-flex items-center gap-1 px-3 py-2 min-h-[36px] text-xs border rounded text-red-600 border-red-200 hover:bg-red-50"
                        >
                          <Trash2 className="w-3 h-3" /> Void
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Modals */}
            {/* Modals: Add Food Charge */}
            <Dialog open={addFoodOpen} onOpenChange={(open) => { if (!open) { setAddFoodOpen(false); setFoodSearch(''); setFoodResults([]); setFoodForm({ description: '', quantity: 1, unitAmount: 0, createdAt: undefined }); } else { setFoodForm(prev => ({ ...prev, createdAt: prev.createdAt ?? new Date().toISOString() })); } }}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Food Charge</DialogTitle>
                  <DialogDescription>Select an item or enter manual details.</DialogDescription>
                </DialogHeader>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Search menu item</label>
                    <input
                      type="text"
                      value={foodSearch}
                      onChange={(e) => setFoodSearch(e.target.value)}
                      className="w-full px-3 py-2 border rounded"
                      placeholder="Type at least 2 characters"
                      disabled={isLoading}
                    />
                    {foodLoading && <div className="text-xs text-gray-500 mt-1">Searching…</div>}
                    {foodResults.length > 0 && (
                      <div className="mt-1 max-h-40 overflow-auto border rounded">
                        {foodResults.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                            onClick={() => {
                              setFoodForm({ description: item.name, quantity: 1, unitAmount: item.price, createdAt: foodForm.createdAt });
                              setFoodResults([]);
                              setFoodSearch(item.name);
                            }}
                          >
                            <div className="font-medium">{item.name}</div>
                            <div className="text-xs text-gray-500">₹{item.price.toFixed(2)} {item.description ? `• ${item.description}` : ''}</div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Description</label>
                    <input
                      type="text"
                      value={foodForm.description}
                      onChange={(e) => setFoodForm({ ...foodForm, description: e.target.value })}
                      className="w-full px-3 py-2 border rounded"
                      placeholder="e.g., Paneer Tikka"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Date</label>
                    <input
                      type="datetime-local"
                      value={foodForm.createdAt ? foodForm.createdAt.slice(0,16) : ''}
                      onChange={(e) => setFoodForm({ ...foodForm, createdAt: e.target.value ? new Date(e.target.value).toISOString() : undefined })}
                      className="w-full px-3 py-2 border rounded"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Qty</label>
                      <input
                        type="number"
                        min={1}
                        value={foodForm.quantity}
                        onChange={(e) => setFoodForm({ ...foodForm, quantity: Math.max(1, Number(e.target.value) || 1) })}
                        className="w-full px-3 py-2 border rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Unit ₹</label>
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        inputMode="decimal"
                        value={foodForm.unitAmount === 0 ? '' : foodForm.unitAmount}
                        onChange={(e) => setFoodForm({ ...foodForm, unitAmount: Math.max(0, Number(e.target.value) || 0) })}
                        placeholder="0.00"
                        className="w-full px-3 py-2 border rounded"
                      />
                    </div>
                    <div className="flex items-end">
                      <div className="w-full text-sm">Line: ₹{(foodForm.quantity * foodForm.unitAmount).toFixed(2)}</div>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <button
                    type="button"
                    className="px-4 py-2 border rounded"
                    onClick={() => setAddFoodOpen(false)}
                    disabled={isLoading}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="px-4 py-2 bg-gray-900 text-white rounded"
                    onClick={submitFoodCharge}
                    disabled={isLoading}
                  >
                    Add
                  </button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Modals: Add Misc Charge */}
            <Dialog open={addMiscOpen} onOpenChange={(open) => { if (!open) { setAddMiscOpen(false); setMiscForm({ description: '', quantity: 1, unitAmount: 0, createdAt: undefined }); } else { setMiscForm(prev => ({ ...prev, createdAt: prev.createdAt ?? new Date().toISOString() })); } }}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Misc Charge</DialogTitle>
                  <DialogDescription>Enter description, quantity and unit amount.</DialogDescription>
                </DialogHeader>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Description</label>
                    <input
                      type="text"
                      value={miscForm.description}
                      onChange={(e) => setMiscForm({ ...miscForm, description: e.target.value })}
                      className="w-full px-3 py-2 border rounded"
                      placeholder="e.g., Laundry"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Date</label>
                    <input
                      type="datetime-local"
                      value={miscForm.createdAt ? miscForm.createdAt.slice(0,16) : ''}
                      onChange={(e) => setMiscForm({ ...miscForm, createdAt: e.target.value ? new Date(e.target.value).toISOString() : undefined })}
                      className="w-full px-3 py-2 border rounded"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Qty</label>
                      <input
                        type="number"
                        min={1}
                        value={miscForm.quantity}
                        onChange={(e) => setMiscForm({ ...miscForm, quantity: Math.max(1, Number(e.target.value) || 1) })}
                        className="w-full px-3 py-2 border rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Unit ₹</label>
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        inputMode="decimal"
                        value={miscForm.unitAmount === 0 ? '' : miscForm.unitAmount}
                        onChange={(e) => setMiscForm({ ...miscForm, unitAmount: Math.max(0, Number(e.target.value) || 0) })}
                        placeholder="0.00"
                        className="w-full px-3 py-2 border rounded"
                      />
                    </div>
                    <div className="flex items-end">
                      <div className="w-full text-sm">Line: ₹{(miscForm.quantity * miscForm.unitAmount).toFixed(2)}</div>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <button type="button" className="px-4 py-2 border rounded" onClick={() => setAddMiscOpen(false)} disabled={isLoading}>Cancel</button>
                  <button type="button" className="px-4 py-2 bg-gray-900 text-white rounded" onClick={submitMiscCharge} disabled={isLoading}>Add</button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Modals: Edit Charge */}
            <Dialog open={!!editCharge} onOpenChange={(open) => { if (!open) { setEditCharge(null); setEditForm({}); } }}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Edit Charge</DialogTitle>
                  <DialogDescription>Update the line details and save.</DialogDescription>
                </DialogHeader>
                {editCharge && (
                  <div className="space-y-3">
                    <div className="text-xs text-gray-500">Type: {editCharge.chargeType.toUpperCase()}</div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Description</label>
                      <input
                        type="text"
                        value={editForm.description ?? ''}
                        onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                        className="w-full px-3 py-2 border rounded"
                      />
                    </div>
                    
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Qty</label>
                        <input
                          type="number"
                          min={1}
                          value={editForm.quantity ?? editCharge.quantity}
                          onChange={(e) => setEditForm({ ...editForm, quantity: Math.max(1, Number(e.target.value) || 1) })}
                          className="w-full px-3 py-2 border rounded"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Unit ₹</label>
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          inputMode="decimal"
                          value={(editForm.unitAmount ?? editCharge.unitAmount) === 0 ? '' : (editForm.unitAmount ?? editCharge.unitAmount)}
                          onChange={(e) => setEditForm({ ...editForm, unitAmount: Math.max(0, Number(e.target.value) || 0) })}
                          placeholder="0.00"
                          className="w-full px-3 py-2 border rounded"
                        />
                      </div>
                      <div className="flex items-end">
                        <div className="w-full text-sm">Line: ₹{((editForm.quantity ?? editCharge.quantity) * (editForm.unitAmount ?? editCharge.unitAmount)).toFixed(2)}</div>
                      </div>
                    </div>
                  </div>
                )}
                <DialogFooter>
                  <button type="button" className="px-4 py-2 border rounded" onClick={() => setEditCharge(null)} disabled={isLoading}>Cancel</button>
                  <button type="button" className="px-4 py-2 bg-gray-900 text-white rounded" onClick={submitEditCharge} disabled={isLoading}>Save</button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Confirm Void Charge */}
            <Dialog open={!!voidChargeId} onOpenChange={(open) => { if (!open) setVoidChargeId(null); }}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Void Charge</DialogTitle>
                  <DialogDescription>This will mark the charge as void. Continue?</DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <button type="button" className="px-4 py-2 border rounded" onClick={() => setVoidChargeId(null)} disabled={isLoading}>Cancel</button>
                  <button type="button" className="px-4 py-2 bg-red-600 text-white rounded" onClick={confirmVoidCharge} disabled={isLoading}>Void</button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Payment / Refund Modal */}
            <Dialog open={!!paymentOpen} onOpenChange={(open) => { if (!open) { setPaymentOpen(null); setPaymentForm({ method: undefined, referenceNo: undefined, amount: 0, createdAt: undefined }); } else { setPaymentForm(prev => ({ ...prev, createdAt: prev.createdAt ?? new Date().toISOString() })); } }}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{paymentOpen === 'refund' ? 'Add Refund' : 'Add Payment'}</DialogTitle>
                  <DialogDescription>Specify method, reference and amount.</DialogDescription>
                </DialogHeader>
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-2">
                      <label className="block text-xs text-gray-600 mb-1">Method</label>
                      <select
                        value={paymentForm.method || ''}
                        onChange={(e) => setPaymentForm({ ...paymentForm, method: e.target.value || undefined })}
                        className="w-full px-3 py-2 border rounded"
                      >
                        <option value="">Select</option>
                        <option value="cash">Cash</option>
                        <option value="card">Card</option>
                        <option value="upi">UPI</option>
                        <option value="bank_transfer">Bank Transfer</option>
                        <option value="cheque">Cheque</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Amount ₹</label>
                      <input
                        type="number"
                        min={0.01}
                        step="0.01"
                        inputMode="decimal"
                        value={paymentForm.amount === 0 ? '' : paymentForm.amount}
                        onChange={(e) => setPaymentForm({ ...paymentForm, amount: Math.max(0, Number(e.target.value) || 0) })}
                        placeholder="0.00"
                        className="w-full px-3 py-2 border rounded"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Date</label>
                    <input
                      type="datetime-local"
                      value={paymentForm.createdAt ? paymentForm.createdAt.slice(0,16) : ''}
                      onChange={(e) => setPaymentForm({ ...paymentForm, createdAt: e.target.value ? new Date(e.target.value).toISOString() : undefined })}
                      className="w-full px-3 py-2 border rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Reference No.</label>
                    <input
                      type="text"
                      value={paymentForm.referenceNo || ''}
                      onChange={(e) => setPaymentForm({ ...paymentForm, referenceNo: e.target.value || undefined })}
                      className="w-full px-3 py-2 border rounded"
                      placeholder="Optional"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <button type="button" className="px-4 py-2 border rounded" onClick={() => setPaymentOpen(null)} disabled={isLoading}>Cancel</button>
                  <button type="button" className="px-4 py-2 bg-gray-900 text-white rounded" onClick={submitPayment} disabled={isLoading}>{paymentOpen === 'refund' ? 'Add Refund' : 'Add Payment'}</button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Confirm Void Payment */}
            <Dialog open={!!voidPaymentId} onOpenChange={(open) => { if (!open) setVoidPaymentId(null); }}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Void Record</DialogTitle>
                  <DialogDescription>This will mark the payment/refund as void. Continue?</DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <button type="button" className="px-4 py-2 border rounded" onClick={() => setVoidPaymentId(null)} disabled={isLoading}>Cancel</button>
                  <button type="button" className="px-4 py-2 bg-red-600 text-white rounded" onClick={confirmVoidPayment} disabled={isLoading}>Void</button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

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
              
              {/* Removed Last Payment Method (duplicate of Financial Summary) */}

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
                <div className="flex items-center gap-3">
                  {loadingCheckIn && (
                    <div className="flex items-center text-sm text-gray-500">
                      <Clock className="w-4 h-4 mr-1 animate-spin" />
                      Loading...
                    </div>
                  )}
                  {!loadingCheckIn && checkInData && !isEditingCheckIn && (
                    <button
                      onClick={() => setIsEditingCheckIn(true)}
                      className="flex items-center px-3 py-1.5 text-sm border border-blue-300 text-blue-700 rounded-md hover:bg-blue-50 transition-colors"
                    >
                      <Edit className="w-4 h-4 mr-1.5" />
                      Edit details
                    </button>
                  )}
                </div>
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
                    // Separate the primary guest's ID photos from per-guest ones so
                    // they aren't shown twice (guest photos render under each guest).
                    const allIdPhotos = checkInData.id_photo_urls || [];
                    const guestPhotoSet = new Set((checkInData.additionalGuests || []).flatMap(g => g.idPhotoUrls || []));
                    const primaryIdPhotos = allIdPhotos.filter(u => !guestPhotoSet.has(u));
                    return (
                      <>
                        {isEditingCheckIn ? (
                          <CheckInDetailsEditor
                            data={checkInData}
                            saving={isSavingCheckIn}
                            onCancel={() => setIsEditingCheckIn(false)}
                            onSave={handleSaveCheckInDetails}
                          />
                        ) : (
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
                        {checkInData.additionalGuests && checkInData.additionalGuests.length > 0 && (
                          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                            <h4 className="font-medium text-indigo-900 mb-3 flex items-center">
                              <Users className="w-4 h-4 mr-2" />
                              Additional Guests
                            </h4>
                            <div className="space-y-2">
                              {checkInData.additionalGuests.map((guest, index) => (
                                <div key={index} className="bg-white p-2.5 rounded border">
                                  <div className="flex items-center justify-between">
                                    <span className="text-sm text-gray-900">{guest.name || `Guest ${index + 1}`}</span>
                                    <div className="flex items-center gap-2 text-xs text-gray-600">
                                      {guest.age != null && <span>Age: {guest.age}</span>}
                                      {guest.isAdult && (
                                        <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-medium">Adult</span>
                                      )}
                                    </div>
                                  </div>
                                  {guest.idPhotoUrls && guest.idPhotoUrls.length > 0 && (
                                    <div className="mt-2 flex flex-wrap gap-2">
                                      {guest.idPhotoUrls.map((url, pi) => (
                                        <img
                                          key={pi}
                                          src={url}
                                          alt={`${guest.name || 'Guest'} ID ${pi + 1}`}
                                          className="w-14 h-14 object-cover rounded border cursor-pointer hover:opacity-80 transition-opacity"
                                          onClick={() => {
                                            const idx = allIdPhotos.indexOf(url);
                                            if (idx >= 0) { setSelectedImageIndex(idx); setShowImageModal(true); }
                                            else { window.open(url, '_blank'); }
                                          }}
                                        />
                                      ))}
                                    </div>
                                  )}
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
                        )}

                        {/* ID Verification Images */}
                        {checkInData.id_photo_urls && checkInData.id_photo_urls.length > 0 && (
                          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                            <h4 className="font-medium text-orange-900 mb-3 flex items-center">
                              <CreditCard className="w-4 h-4 mr-2" />
                              Primary Guest ID
                            </h4>
                            {primaryIdPhotos.length > 0 && (
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                              {primaryIdPhotos.map((url, index) => (
                                <div key={index} className="relative group">
                                  <img
                                    src={url}
                                    alt={`ID Document ${index + 1}`}
                                    className="w-full h-24 object-cover rounded-lg border cursor-pointer hover:opacity-80 transition-all duration-200 shadow-sm hover:shadow-md"
                                    onClick={() => {
                                      setSelectedImageIndex(allIdPhotos.indexOf(url));
                                      setShowImageModal(true);
                                    }}
                                    onError={(e) => {
                                      console.error('Error loading ID image thumbnail:', url);
                                      e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2Y3ZjdmNyIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5OTk5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5JbWFnZSBub3QgZm91bmQ8L3RleHQ+PC9zdmc+';
                                    }}
                                  />
                                  <div className="absolute bottom-1 left-1 bg-black bg-opacity-60 text-white px-2 py-1 rounded text-xs">
                                    Photo {index + 1}
                                  </div>
                                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 rounded-lg flex items-center justify-center pointer-events-none">
                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-white bg-opacity-90 rounded-full p-2">
                                      <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                                      </svg>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                            )}
                            <div className="mt-3 pt-3 border-t border-orange-200">
                              <div className="space-y-3">
                                <div className="space-y-4">
                                  {/* Add More ID Photos Section */}
                                  <div className="border-t pt-4">
                                    <h4 className="text-sm font-medium text-gray-700 mb-3">Add Additional ID Photos</h4>
                                    <div className="space-y-3">
                                      <input
                                        type="file"
                                        multiple
                                        accept="image/*,application/pdf"
                                        onChange={handleAdditionalPhotosUpload}
                                        className="block w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                        disabled={isUploadingPhotos}
                                      />
                                      {isUploadingPhotos && (
                                        <div className="flex items-center space-x-2 text-xs text-blue-600">
                                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                                          <span>Uploading photos...</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mt-6">
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
                  {/* Footer shows exactly 4 actions per state.
                      pre-arrival: QR · Check In · Edit · Cancel
                      checked-in:  Invoice · QR · Check Out · Edit  (no Cancel)
                      checked-out: Invoice · QR · Edit · Delete
                      cancelled:   Cancellation Invoice · Edit · Delete */}
                  {!booking.cancelled && (booking.status === 'checked-in' || booking.status === 'checked-out') && (
                    <button
                      onClick={() => (invoiceType === 'perline' ? setShowPerLineInvoice(true) : setShowInvoice(true))}
                      className="flex-1 flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      Print Invoice
                    </button>
                  )}
                  {booking.cancelled && (
                    <button
                      onClick={handleShowCancellationInvoice}
                      className="flex-1 flex items-center justify-center px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors"
                    >
                      <Receipt className="w-4 h-4 mr-2" />
                      Cancellation Invoice
                    </button>
                  )}
                  {!booking.cancelled && (
                    <button
                      onClick={() => setShowQRCode(true)}
                      className="flex-1 flex items-center justify-center px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
                    >
                      <QrCode className="w-4 h-4 mr-2" />
                      Check-in QR
                    </button>
                  )}
                  {!booking.cancelled && booking.status !== 'checked-in' && booking.status !== 'checked-out' && (
                    <button
                      onClick={handleCheckInAction}
                      disabled={isLoading}
                      className="flex-1 flex items-center justify-center px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <LogIn className="w-4 h-4 mr-2" />
                      Check In
                    </button>
                  )}
                  {!booking.cancelled && booking.status === 'checked-in' && (
                    <button
                      onClick={handleCheckOutAction}
                      disabled={isLoading}
                      className="flex-1 flex items-center justify-center px-4 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      Check Out
                    </button>
                  )}
                  <button
                    onClick={handleEdit}
                    className="flex-1 flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </button>
                  {!booking.cancelled && booking.status !== 'checked-in' && booking.status !== 'checked-out' && (
                    <button
                      onClick={handleCancelBooking}
                      className="flex-1 flex items-center justify-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Cancel Booking
                    </button>
                  )}
                  {(booking.cancelled || booking.status === 'checked-out') && (
                    <button
                      onClick={() => setConfirmDeleteOpen(true)}
                      className="flex-1 flex items-center justify-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Booking
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={(e) => { if (e.target === e.currentTarget) setShowInvoice(false); }}>
          <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 z-10 bg-white flex items-center justify-between p-4 border-b print:hidden">
              {renderInvoiceToggle()}
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleDownloadInvoicePdf}
                  disabled={downloadingInvoice}
                  className="flex items-center px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <Download className="w-4 h-4 mr-2" />
                  {downloadingInvoice ? 'Generating PDF...' : 'Download PDF'}
                </button>
                <button
                  onClick={() => setShowInvoice(false)}
                  aria-label="Close"
                  className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            <div className="printable-invoice">
              <InvoicePreview
                data={createInvoiceData(booking)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Per-line Invoice Modal */}
      {showPerLineInvoice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={(e) => { if (e.target === e.currentTarget) setShowPerLineInvoice(false); }}>
          <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 z-10 flex items-center justify-between p-4 border-b bg-white print:hidden">
              {renderInvoiceToggle()}
              <div className="flex items-center space-x-2">
                <InvoicePDFExport
                  booking={booking}
                  invoiceNumber={booking.folioNumber || `520/${invoiceNumber}`}
                  charges={charges}
                  payments={payments}
                  financials={financials}
                  company={invoiceCompany}
                  checkInTime={invoiceProperty?.checkInTime}
                  checkOutTime={invoiceProperty?.checkOutTime}
                  className="flex items-center px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download PDF
                </InvoicePDFExport>
                <button
                  onClick={() => setShowPerLineInvoice(false)}
                  aria-label="Close"
                  className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            <InvoicePerLine
              booking={booking}
              invoiceNumber={booking.folioNumber || `520/${invoiceNumber}`}
              charges={charges}
              payments={payments}
              financials={financials}
              company={invoiceCompany}
              checkInTime={invoiceProperty?.checkInTime}
              checkOutTime={invoiceProperty?.checkOutTime}
            />
          </div>
        </div>
      )}

      {/* Cancellation Invoice Modal */}
      {showCancellationInvoice && cancellationInvoiceData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={(e) => { if (e.target === e.currentTarget) { setShowCancellationInvoice(false); setCancellationInvoiceData(null); } }}>
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
            <div className="printable-invoice">
              <CancellationInvoicePreview data={cancellationInvoiceData} />
            </div>
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      {showQRCode && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={(e) => { if (e.target === e.currentTarget) setShowQRCode(false); }}>
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

      {/* ID Verification Image Modal */}
      {showImageModal && checkInData?.id_photo_urls && checkInData.id_photo_urls.length > 0 && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-[9999] p-4"
          onClick={() => setShowImageModal(false)}
        >
          <div 
            className="relative max-w-5xl max-h-[90vh] w-full h-full flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={checkInData.id_photo_urls?.[selectedImageIndex] || ''}
              alt={`ID Document ${selectedImageIndex + 1}`}
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
              onError={(e) => {
                console.error('Error loading image:', checkInData.id_photo_urls?.[selectedImageIndex]);
                e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2Y3ZjdmNyIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5OTk5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5JbWFnZSBub3QgZm91bmQ8L3RleHQ+PC9zdmc+';
              }}
            />
            
            {/* Close button */}
            <button
              onClick={() => setShowImageModal(false)}
              className="absolute top-4 right-4 bg-white bg-opacity-90 text-black rounded-full w-10 h-10 flex items-center justify-center hover:bg-opacity-100 transition-all duration-200 shadow-lg"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
            
            {/* Navigation arrows for multiple images */}
            {(checkInData.id_photo_urls?.length || 0) > 1 && (
              <>
                <button
                  onClick={() => setSelectedImageIndex(prev => prev > 0 ? prev - 1 : (checkInData.id_photo_urls?.length || 1) - 1)}
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white bg-opacity-90 text-black rounded-full w-10 h-10 flex items-center justify-center hover:bg-opacity-100 transition-all duration-200 shadow-lg"
                  title="Previous image"
                >
                  ←
                </button>
                <button
                  onClick={() => setSelectedImageIndex(prev => prev < (checkInData.id_photo_urls?.length || 1) - 1 ? prev + 1 : 0)}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white bg-opacity-90 text-black rounded-full w-10 h-10 flex items-center justify-center hover:bg-opacity-100 transition-all duration-200 shadow-lg"
                  title="Next image"
                >
                  →
                </button>
              </>
            )}
            
            {/* Image counter and dots */}
            {(checkInData.id_photo_urls?.length || 0) > 1 && (
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-50 rounded-full px-4 py-2">
                <div className="flex items-center space-x-3">
                  <span className="text-white text-sm font-medium">
                    {selectedImageIndex + 1} of {checkInData.id_photo_urls?.length || 0}
                  </span>
                  <div className="flex space-x-2">
                    {checkInData.id_photo_urls?.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => setSelectedImageIndex(index)}
                        className={`w-2 h-2 rounded-full transition-all duration-200 ${
                          index === selectedImageIndex ? 'bg-white' : 'bg-gray-400 hover:bg-gray-300'
                        }`}
                        title={`View image ${index + 1}`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Confirm Cancel Modal */}
      {confirmCancelOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white shadow-xl">
            <div className="border-b px-5 py-4">
              <h3 className="text-lg font-semibold text-gray-900">Cancel Booking</h3>
            </div>
            <div className="px-5 py-4 text-sm text-gray-700">
              Are you sure you want to cancel this booking?
            </div>
            <div className="flex items-center justify-end gap-2 border-t px-5 py-3">
              <button onClick={() => setConfirmCancelOpen(false)} className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors">Close</button>
              <button onClick={() => { onCancel(booking.id); setConfirmCancelOpen(false); }} className="px-4 py-2 text-sm text-white bg-orange-600 rounded-md hover:bg-orange-700 transition-colors">Confirm Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete Modal */}
      {confirmDeleteOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white shadow-xl">
            <div className="border-b px-5 py-4">
              <h3 className="text-lg font-semibold text-gray-900">Delete Booking</h3>
            </div>
            <div className="px-5 py-4 text-sm text-gray-700">
              Permanently delete this cancelled booking? This cannot be undone.
            </div>
            <div className="flex items-center justify-end gap-2 border-t px-5 py-3">
              <button onClick={() => setConfirmDeleteOpen(false)} className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors">Close</button>
              <button onClick={() => { onDelete(booking.id); setConfirmDeleteOpen(false); }} className="px-4 py-2 text-sm text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Check-in (form not filled) Modal */}
      {confirmCheckInOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white shadow-xl">
            <div className="border-b px-5 py-4">
              <h3 className="text-lg font-semibold text-gray-900">Check-in form not filled</h3>
            </div>
            <div className="px-5 py-4 text-sm text-gray-700">
              The guest hasn't completed the digital check-in form yet. Are you sure you want to check them in anyway?
            </div>
            <div className="flex items-center justify-end gap-2 border-t px-5 py-3">
              <button onClick={() => setConfirmCheckInOpen(false)} className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors">Cancel</button>
              <button onClick={() => { setConfirmCheckInOpen(false); setShowQRCode(true); }} className="px-4 py-2 text-sm text-purple-700 bg-purple-50 border border-purple-200 rounded-md hover:bg-purple-100 transition-colors">Show QR</button>
              <button onClick={confirmCheckInWithoutForm} disabled={isLoading} className="px-4 py-2 text-sm text-white bg-emerald-600 rounded-md hover:bg-emerald-700 transition-colors disabled:opacity-60">Check in anyway</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};