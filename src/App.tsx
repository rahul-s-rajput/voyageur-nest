import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { HomePage } from './components/HomePage';
import { InvoiceForm } from './components/InvoiceForm';
import { InvoicePreview } from './components/InvoicePreview';
import { CancellationInvoicePreview } from './components/CancellationInvoicePreview';
import { BookingDetails } from './components/BookingDetails';
import { CheckInPage } from './pages/CheckInPage';
import AdminPage from './pages/AdminPage';
import ProtectedRoute from './components/ProtectedRoute';
import AdminAuth from './components/AdminAuth';
import { Booking, ViewMode } from './types/booking';
import { InvoiceData, CancellationInvoiceData } from './types/invoice';
import { invoiceCounterService, bookingService } from './lib/supabase';
import { StorageService } from './lib/storage';
import { NewBookingModal } from './components/NewBookingModal';
import { InvoiceTemplate } from './components/InvoiceTemplate';
import { NotificationProvider } from './components/NotificationContainer';
import { PropertyProvider } from './contexts/PropertyContext';
import { AuthProvider } from './contexts/AuthContext';
import { AuthErrorBoundary } from './components/AuthErrorBoundary';
import MenuLoading from './components/FnB/MenuLoading';
const LazyMenuPage = React.lazy(() => import('./components/FnB/MenuPage'));

function MainApp() {
  const [currentView, setCurrentView] = useState<'home' | 'invoice-form' | 'invoice-preview'>('home');
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

  // Initialize storage bucket on app startup
  useEffect(() => {
    const initializeStorage = async () => {
      try {
        console.log('🚀 Initializing storage bucket...');
        const bucketInitialized = await StorageService.initializeBucket();
        if (bucketInitialized) {
          console.log('✅ Storage bucket initialized successfully');
        } else {
          console.warn('⚠️ Storage bucket initialization failed - this may cause issues with ID photo uploads');
        }
      } catch (error) {
        console.error('❌ Error initializing storage bucket:', error);
      }
    };

    initializeStorage();
  }, []);

  // Load bookings and invoice counter
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        // Load bookings
        const bookingsData = await bookingService.getBookings();
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
  }, []);

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
    if (window.confirm('Are you sure you want to delete this booking?')) {
      try {
        const success = await bookingService.deleteBooking(bookingId);
        if (success) {
          setBookings(prev => prev.filter(b => b.id !== bookingId));
          setShowBookingDetails(false);
          setSelectedBooking(null);
        }
      } catch (error) {
        console.error('Error deleting booking:', error);
      }
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
      }
    } catch (error) {
      console.error('Error cancelling booking:', error);
    }
  };

  const handleBackToHome = () => {
    setCurrentView('home');
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <h1 className="text-2xl font-bold text-gray-900">Booking Management System</h1>
            </div>
          </div>
        </div>

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
          />
              </div>
              
        {/* Modals */}
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
          onDelete={handleDeleteBooking}
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-bold text-gray-900">Booking Management System</h1>
          </div>
        </div>
      </div>

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
        />
      </div>

      {/* Modals */}
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
        onDelete={handleDeleteBooking}
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
  );
}

function App() {
  return (
    <AuthErrorBoundary>
      <AuthProvider>
        <PropertyProvider>
          <NotificationProvider>
            <Router>
              <Routes>
                {/* Guest routes - Check-in only */}
                <Route path="/checkin/:bookingId" element={<CheckInPage language="en" />} />
                <Route path="/checkin/:bookingId/hi" element={<CheckInPage language="hi" />} />
                
                {/* Public menu view */}
                <Route path="/menu" element={<React.Suspense fallback={<MenuLoading />}><LazyMenuPage /></React.Suspense>} />

                {/* Authentication route */}
                <Route path="/admin/auth" element={<AdminAuth />} />

                {/* Protected admin routes */}
                <Route path="/admin" element={
                  <ProtectedRoute requireAdmin={true}>
                    <AdminPage />
                  </ProtectedRoute>
                } />
                <Route path="/admin/*" element={
                  <ProtectedRoute requireAdmin={true}>
                    <AdminPage />
                  </ProtectedRoute>
                } />
                
                {/* Unauthorized page */}
                <Route path="/unauthorized" element={
                  <div className="min-h-screen flex items-center justify-center bg-gray-50">
                    <div className="text-center">
                      <h1 className="text-4xl font-bold text-gray-900 mb-4">403</h1>
                      <h2 className="text-2xl font-bold text-gray-700 mb-4">Access Denied</h2>
                      <p className="text-gray-600 mb-6">You don't have permission to access this resource.</p>
                      <a href="/admin/auth" className="text-blue-600 hover:text-blue-800 underline">
                        Sign in with admin credentials
                      </a>
                    </div>
                  </div>
                } />
                
                {/* Legacy routes - redirect to admin */}
                <Route path="/" element={<Navigate to="/admin" replace />} />
                <Route path="/dashboard" element={<Navigate to="/admin" replace />} />
                
                {/* Redirect any unknown routes to admin */}
                <Route path="*" element={<Navigate to="/admin" replace />} />
              </Routes>
            </Router>
          </NotificationProvider>
        </PropertyProvider>
      </AuthProvider>
    </AuthErrorBoundary>
  );
}

export default App;