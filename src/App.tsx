import React, { useState, useEffect } from 'react';
import { InvoiceForm } from './components/InvoiceForm';
import { InvoicePreview } from './components/InvoicePreview';
import { CancellationInvoiceForm } from './components/CancellationInvoiceForm';
import { CancellationInvoicePreview } from './components/CancellationInvoicePreview';
import { InvoiceData, CancellationInvoiceData } from './types/invoice';
import { Printer, Edit3, Eye, FileText, XCircle } from 'lucide-react';
import { invoiceCounterService } from './lib/supabase';

function App() {
  const [invoiceType, setInvoiceType] = useState<'regular' | 'cancellation'>('regular');
  const [activeTab, setActiveTab] = useState<'form' | 'preview'>('form');
  
  // Initialize invoice counter from Supabase
  const [invoiceCounter, setInvoiceCounter] = useState(391);
  const [isCounterLoaded, setIsCounterLoaded] = useState(false);

  // Load counter from Supabase on app start
  useEffect(() => {
    const loadCounter = async () => {
      try {
        const counter = await invoiceCounterService.getCounter();
        setInvoiceCounter(counter);
        setIsCounterLoaded(true);
      } catch (error) {
        console.error('Failed to load counter:', error);
        // Fallback to localStorage if Supabase fails
        const savedCounter = localStorage.getItem('invoiceCounter');
        setInvoiceCounter(savedCounter ? parseInt(savedCounter, 10) : 391);
        setIsCounterLoaded(true);
      }
    };

    loadCounter();
  }, []);

  // Update invoice numbers when counter changes
  useEffect(() => {
    if (!isCounterLoaded) return;

    // Update regular invoice number
    setInvoiceData(prev => ({
      ...prev,
      invoiceNumber: `520/${invoiceCounter}`
    }));

    // Update cancellation invoice number
    setCancellationData(prev => ({
      ...prev,
      invoiceNumber: `520/${invoiceCounter}`
    }));
  }, [invoiceCounter, isCounterLoaded]);

  // Set up real-time subscription to counter changes
  useEffect(() => {
    if (!isCounterLoaded) return;

    const subscription = invoiceCounterService.subscribeToCounter((newValue) => {
      setInvoiceCounter(newValue);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [isCounterLoaded]);
  
  // Function to get current IST date and time formatted as dd/mm/yyyy hh:mm:ss AM/PM
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

  const [invoiceData, setInvoiceData] = useState<InvoiceData>({
    companyName: 'Voyageur Nest',
    companyAddress: 'Old Manali, Manali, Himachal Pradesh, 175131, India',
    companyPhone: '+919876161215',
    companyEmail: 'voyageur.nest@gmail.com',
    invoiceNumber: `520/${invoiceCounter}`,
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
    dateOfArrival: '',
    dateOfDeparture: '',
    timeOfArrival: '',
    timeOfDeparture: '',
    noOfDays: 0,
    grandTotal: 0,
    paymentAmount: 0,
    paymentMethod: 'UPI'
  });

  const [cancellationData, setCancellationData] = useState<CancellationInvoiceData>({
    companyName: 'Voyageur Nest',
    companyAddress: 'Manali, Himachal Pradesh, 175131, India',
    companyPhone: '+919876161215',
    companyEmail: 'voyageur.nest@gmail.com',
    invoiceNumber: `520/${invoiceCounter}`,
    guestName: '',
    billTo: '',
    address: '',
    companyNameBillTo: '',
    billToRegNo: '',
    date: getCurrentISTTime(),
    noOfPax: 1,
    adultChild: '1/0',
    grCardNo: '',
    roomNo: '',
    dateOfArrival: '',
    dateOfDeparture: '',
    timeOfArrival: '12:00',
    timeOfDeparture: '11:00',
    noOfDays: 1,
    originalBookingAmount: 0,
    totalPaid: 0,
    cancellationCharges: 0,
    paymentMethod: 'Cash',
    cancellationDate: getCurrentISTTime(),
    cancellationReason: 'Customer Request'
  });

  const handleNewInvoice = async () => {
    const newCounter = invoiceCounter + 1;
    
    try {
      // Update counter in Supabase
      const success = await invoiceCounterService.updateCounter(newCounter);
      
      if (success) {
        setInvoiceCounter(newCounter);
      } else {
        // Fallback to localStorage if Supabase fails
        localStorage.setItem('invoiceCounter', newCounter.toString());
        setInvoiceCounter(newCounter);
      }
    } catch (error) {
      console.error('Failed to update counter:', error);
      // Fallback to localStorage
      localStorage.setItem('invoiceCounter', newCounter.toString());
      setInvoiceCounter(newCounter);
    }
    
    if (invoiceType === 'regular') {
      setInvoiceData({
        ...invoiceData,
        invoiceNumber: `520/${newCounter}`,
        date: getCurrentISTTime(),
        guestName: '',
        billTo: '',
        address: '',
        companyNameBillTo: '',
        billToRegNo: '',
        grCardNo: '',
        roomNo: '',
        dateOfArrival: '',
        dateOfDeparture: '',
        timeOfArrival: '',
        timeOfDeparture: '',
        noOfDays: 0,
        noOfPax: 0,
        adultChild: '',
        grandTotal: 0,
        paymentAmount: 0
      });
    } else {
      setCancellationData({
        companyName: 'Voyageur Nest',
        companyAddress: 'Old Manali, Manali, Himachal Pradesh, 175131, India',
        companyPhone: '+919876161215',
        companyEmail: 'voyageur.nest@gmail.com',
        invoiceNumber: `520/${newCounter}`,
        date: getCurrentISTTime(),
        cancellationDate: getCurrentISTTime(),
        guestName: '',
        billTo: '',
        address: '',
        companyNameBillTo: '',
        billToRegNo: '',
        noOfPax: 1,
        adultChild: '1/0',
        grCardNo: '',
        roomNo: '',
        dateOfArrival: '',
        dateOfDeparture: '',
        timeOfArrival: '12:00',
        timeOfDeparture: '11:00',
        noOfDays: 1,
        originalBookingAmount: 0,
        totalPaid: 0,
        cancellationCharges: 0,
        paymentMethod: 'Cash',
        cancellationReason: 'Customer Request'
      });
    }
    setActiveTab('form'); // Switch to form tab for new invoice
  };

  const handlePrint = () => {
    // Get all the stylesheets from the current page
    const styles = Array.from(document.styleSheets)
      .map(styleSheet => {
        try {
          return Array.from(styleSheet.cssRules)
            .map(rule => rule.cssText)
            .join('\n');
        } catch (e) {
          // Handle cross-origin stylesheets
          return '';
        }
      })
      .join('\n');

    const printContentId = invoiceType === 'regular' ? 'invoice-preview' : 'cancellation-invoice-preview';
    const printContent = document.getElementById(printContentId);
    const currentData = invoiceType === 'regular' ? invoiceData : cancellationData;
    
    if (printContent) {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>${invoiceType === 'regular' ? 'Invoice' : 'Cancellation Invoice'} - ${currentData.invoiceNumber}</title>
              <style>
                ${styles}
                @media print {
                  body { 
                    margin: 0 !important; 
                    padding: 0 !important; 
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                  }
                  .invoice-preview { 
                    box-shadow: none !important; 
                    max-width: none !important;
                    margin: 0 !important;
                  }
                  @page { 
                    margin: 0.5in !important; 
                    size: A4 !important;
                  }
                  * {
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                  }
                }
              </style>
            </head>
            <body>
              ${printContent.outerHTML}
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.print();
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col space-y-4 py-4 md:flex-row md:justify-between md:items-center md:space-y-0">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Hotel Invoice Generator</h1>
            
            {/* Mobile: Stacked layout, Desktop: Horizontal layout */}
            <div className="flex flex-col space-y-3 sm:flex-row sm:space-y-0 sm:space-x-2 lg:space-x-4">
              {/* Invoice Type Toggle */}
              <div className="flex bg-gray-200 rounded-md p-1 w-full sm:w-auto">
                <button
                  onClick={() => setInvoiceType('regular')}
                  className={`flex items-center justify-center px-3 py-2 rounded transition-colors flex-1 sm:flex-none ${
                    invoiceType === 'regular'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  <FileText className="w-4 h-4 mr-1" />
                  <span className="text-sm sm:text-base">Regular</span>
                </button>
                <button
                  onClick={() => setInvoiceType('cancellation')}
                  className={`flex items-center justify-center px-3 py-2 rounded transition-colors flex-1 sm:flex-none ${
                    invoiceType === 'cancellation'
                      ? 'bg-white text-red-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  <XCircle className="w-4 h-4 mr-1" />
                  <span className="text-sm sm:text-base">Cancellation</span>
                </button>
              </div>
              
              {/* Action Buttons */}
              <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2">
                <button
                  onClick={handleNewInvoice}
                  className={`flex items-center justify-center px-4 py-2 text-white rounded-md transition-colors text-sm sm:text-base ${
                    invoiceType === 'regular' 
                      ? 'bg-purple-500 hover:bg-purple-600' 
                      : 'bg-red-500 hover:bg-red-600'
                  }`}
                >
                  {invoiceType === 'regular' ? <FileText className="w-4 h-4 mr-2" /> : <XCircle className="w-4 h-4 mr-2" />}
                  <span>New {invoiceType === 'regular' ? 'Invoice' : 'Cancellation'}</span>
                </button>
                
                <div className="flex space-x-2">
                  <button
                    onClick={() => setActiveTab('form')}
                    className={`flex items-center justify-center px-4 py-2 rounded-md transition-colors flex-1 sm:flex-none text-sm sm:text-base ${
                      activeTab === 'form'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    <Edit3 className="w-4 h-4 mr-2" />
                    <span>Edit Form</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('preview')}
                    className={`flex items-center justify-center px-4 py-2 rounded-md transition-colors flex-1 sm:flex-none text-sm sm:text-base ${
                      activeTab === 'preview'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    <span>Preview</span>
                  </button>
                </div>
                
                {activeTab === 'preview' && (
                  <button
                    onClick={handlePrint}
                    className="flex items-center justify-center px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors text-sm sm:text-base"
                  >
                    <Printer className="w-4 h-4 mr-2" />
                    <span>Print {invoiceType === 'regular' ? 'Invoice' : 'Cancellation'}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'form' ? (
          invoiceType === 'regular' ? (
            <InvoiceForm data={invoiceData} onChange={setInvoiceData} />
          ) : (
            <CancellationInvoiceForm data={cancellationData} onDataChange={setCancellationData} folioNumber={`520/${invoiceCounter}`} />
          )
        ) : (
          invoiceType === 'regular' ? (
            <InvoicePreview data={invoiceData} />
          ) : (
            <CancellationInvoicePreview data={cancellationData} />
          )
        )}
      </div>
    </div>
  );
}

export default App;