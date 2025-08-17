import React, { useRef, useState } from 'react';
import { Card, CardContent, CardHeader } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Upload, Eye, Download, Sparkles, FileText, Image, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import LoadingSpinner from '../LoadingSpinner';
import ReceiptAIExtractionService from '../../services/receiptAIExtractionService';
import { supabase } from '../../lib/supabase';
import type { Expense } from '../../types/expenses';
import type { ExpenseFormData } from './UnifiedExpenseModal';
import { useBreakpoint } from '../../hooks/useWindowSize';
import ReceiptUploadSheet from './ReceiptUploadSheet';

interface ExpenseReceiptTabProps {
  formData: ExpenseFormData;
  onFormDataChange: (updates: Partial<ExpenseFormData>) => void;
  mode: 'create' | 'edit' | 'view';
  loading: boolean;
  expense?: Expense | null;
}

interface AIExtractionResult {
  confidence: number;
  reasoning?: string | null;
  category_hint?: string | null;
  extracted_data?: {
    expense_date?: string;
    amount?: number;
    currency?: string;
    vendor?: string;
  };
}

const ExpenseReceiptTab: React.FC<ExpenseReceiptTabProps> = ({
  formData,
  onFormDataChange,
  mode,
  loading,
  expense
}) => {
  const isReadOnly = mode === 'view';
  const hasExistingReceipt = expense?.receiptPath;
  const hasNewReceipt = formData.receiptFile;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const { isMobile } = useBreakpoint();
  const [uploadSheetOpen, setUploadSheetOpen] = useState(false);
  
  // Advanced state management
  const [previewMode, setPreviewMode] = useState<'none' | 'modal' | 'inline'>('none');
  const [extracting, setExtracting] = useState(false);
  const [extractionResult, setExtractionResult] = useState<AIExtractionResult | null>(null);
  const [downloadingReceipt, setDownloadingReceipt] = useState(false);
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);

  const validateAndProcessFile = (file: File) => {
    // Check file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB in bytes
    if (file.size > maxSize) {
      toast.error('File size must be less than 10MB');
      return false;
    }

    // Check file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      toast.error('Please upload an image (JPG, PNG, GIF) or PDF file');
      return false;
    }

    onFormDataChange({ receiptFile: file });
    toast.success(`Receipt uploaded: ${file.name}`);
    return true;
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const ok = validateAndProcessFile(file);
      if (ok) setUploadSheetOpen(false);
    }
    // Reset to allow selecting the same file again
    event.target.value = '';
  };

  const handleRemoveFile = () => {
    onFormDataChange({ receiptFile: null });
    // Reset the file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  const handleSelectSource = (type: 'camera' | 'gallery' | 'pdf') => {
    switch (type) {
      case 'camera':
        cameraInputRef.current?.click();
        break;
      case 'gallery':
        galleryInputRef.current?.click();
        break;
      case 'pdf':
        pdfInputRef.current?.click();
        break;
    }
  };

  // Drag and drop handlers
  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleDragEnter = (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleDragLeave = (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    
    const files = event.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      validateAndProcessFile(file);
    }
  };

  // Advanced AI extraction with progress feedback
  const handleAIExtraction = async () => {
    if (!hasNewReceipt) {
      toast.error('Please upload a receipt first');
      return;
    }

    setExtracting(true);
    setExtractionResult(null);
    
    try {
      const result = await ReceiptAIExtractionService.extractFromReceipt(
        hasNewReceipt,
        {
          locale: 'en-IN',
          currency: 'INR',
          categories: [] // Will be passed from parent if needed
        }
      );

      const extractionData: AIExtractionResult = {
        confidence: result.confidence,
        reasoning: result.reasoning,
        category_hint: result.category_hint,
        extracted_data: {
          expense_date: result.expense_date || undefined,
          amount: result.amount || undefined,
          currency: result.currency || undefined,
          vendor: result.vendor || undefined
        }
      };

      setExtractionResult(extractionData);
      
      // Notify parent component about extracted data
      const updates: Partial<ExpenseFormData> = {};
      if (result.expense_date) updates.expenseDate = result.expense_date;
      if (result.amount) updates.amount = result.amount;
      if (result.currency) updates.currency = result.currency;
      if (result.vendor) updates.vendor = result.vendor;
      
      if (Object.keys(updates).length > 0) {
        onFormDataChange(updates);
      }

      toast.success(`Data extracted with ${(result.confidence * 100).toFixed(0)}% confidence`);
    } catch (error) {
      console.error('AI extraction failed:', error);
      toast.error('Failed to extract data from receipt');
    } finally {
      setExtracting(false);
    }
  };

  // Receipt preview functionality
  const handlePreviewFile = (file: File) => {
    const url = URL.createObjectURL(file);
    setReceiptUrl(url);
    setPreviewMode('modal');
  };

  const handlePreviewExisting = async () => {
    if (!hasExistingReceipt) return;
    
    try {
      const { data } = await supabase.storage
        .from('receipts')
        .createSignedUrl(hasExistingReceipt, 3600); // 1 hour expiry
      
      if (data?.signedUrl) {
        setReceiptUrl(data.signedUrl);
        setPreviewMode('modal');
      }
    } catch (error) {
      console.error('Failed to get receipt URL:', error);
      toast.error('Failed to preview receipt');
    }
  };

  // Download existing receipt
  const handleDownloadReceipt = async () => {
    if (!hasExistingReceipt) return;
    
    setDownloadingReceipt(true);
    try {
      const { data } = await supabase.storage
        .from('receipts')
        .download(hasExistingReceipt);
      
      if (data) {
        const url = URL.createObjectURL(data);
        const a = document.createElement('a');
        a.href = url;
        a.download = hasExistingReceipt.split('/').pop() || 'receipt';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success('Receipt downloaded successfully');
      }
    } catch (error) {
      console.error('Failed to download receipt:', error);
      toast.error('Failed to download receipt');
    } finally {
      setDownloadingReceipt(false);
    }
  };

  // Close preview modal
  const closePreview = () => {
    if (receiptUrl) {
      URL.revokeObjectURL(receiptUrl);
      setReceiptUrl(null);
    }
    setPreviewMode('none');
  };

  // Get file icon based on type
  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) {
      return <Image className="h-6 w-6 text-amber-600" />;
    }
    return <FileText className="h-6 w-6 text-red-600" />;
  };

  return (
    <div className="p-6 space-y-6">
      {/* AI Extraction Results */}
      {extractionResult && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">AI Extraction Results</h3>
              <Badge variant={extractionResult.confidence > 0.8 ? 'default' : 'secondary'}>
                {(extractionResult.confidence * 100).toFixed(0)}% confidence
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {extractionResult.reasoning && (
              <p className="text-sm text-gray-600 mb-3">{extractionResult.reasoning}</p>
            )}
            {extractionResult.category_hint && (
              <p className="text-sm text-amber-600 mb-3">
                Suggested category: <span className="font-medium">{extractionResult.category_hint}</span>
              </p>
            )}
            {extractionResult.extracted_data && (
              <div className="grid grid-cols-2 gap-4 text-sm">
                {extractionResult.extracted_data.expense_date && (
                  <div>
                    <span className="font-medium">Date:</span> {extractionResult.extracted_data.expense_date}
                  </div>
                )}
                {extractionResult.extracted_data.amount && (
                  <div>
                    <span className="font-medium">Amount:</span> ₹{extractionResult.extracted_data.amount}
                  </div>
                )}
                {extractionResult.extracted_data.vendor && (
                  <div>
                    <span className="font-medium">Vendor:</span> {extractionResult.extracted_data.vendor}
                  </div>
                )}
                {extractionResult.extracted_data.currency && (
                  <div>
                    <span className="font-medium">Currency:</span> {extractionResult.extracted_data.currency}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Upload Section */
      }
      {!isReadOnly && (
        <Card>
          <CardHeader>
            <h3 className="text-lg font-medium text-gray-900">Upload Receipt</h3>
          </CardHeader>
          <CardContent>
            {!hasNewReceipt ? (
              isMobile ? (
                <div>
                  <div className="text-gray-600 mb-4">
                    <p className="text-sm">Add a receipt from your camera or photos (10MB max).</p>
                  </div>
                  <Button 
                    className="w-full"
                    variant="outline"
                    disabled={loading}
                    onClick={() => setUploadSheetOpen(true)}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Add receipt
                  </Button>
                  {/* Bottom sheet with icon grid options */}
                  <ReceiptUploadSheet 
                    open={uploadSheetOpen}
                    onOpenChange={setUploadSheetOpen}
                    onSelect={handleSelectSource}
                    allowPdf={!isMobile}
                  />
                  {/* Hidden inputs for sources */}
                  <input
                    ref={cameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleFileUpload}
                    className="hidden"
                    disabled={loading}
                  />
                  <input
                    ref={galleryInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                    disabled={loading}
                  />
                  <input
                    ref={pdfInputRef}
                    type="file"
                    accept=".pdf,application/pdf"
                    onChange={handleFileUpload}
                    className="hidden"
                    disabled={loading}
                  />
                </div>
              ) : (
                <div 
                  className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors cursor-pointer"
                  onClick={triggerFileUpload}
                  onDragOver={handleDragOver}
                  onDragEnter={handleDragEnter}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <div className="text-gray-600 mb-4">
                    <p className="text-lg">Drop receipt here or click to upload</p>
                    <p className="text-sm">Supports JPG, PNG, PDF files up to 10MB</p>
                  </div>
                  <Button 
                    variant="outline" 
                    disabled={loading} 
                    onClick={(e) => {
                      e.stopPropagation();
                      triggerFileUpload();
                    }}
                  >
                    Choose File
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,.pdf"
                    onChange={handleFileUpload}
                    className="hidden"
                    disabled={loading}
                  />
                </div>
              )
            ) : (
              <div className="border border-gray-300 rounded-lg p-4">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
                      {getFileIcon(hasNewReceipt)}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 truncate max-w-[220px] md:max-w-none">{hasNewReceipt.name}</p>
                      <p className="text-sm text-gray-500">
                        {(hasNewReceipt.size / 1024 / 1024).toFixed(2)} MB • {hasNewReceipt.type}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-wrap w-full md:w-auto">
                    <Button className="w-full md:w-auto" size="sm" variant="outline" onClick={() => handlePreviewFile(hasNewReceipt)}>
                      <Eye className="h-4 w-4 mr-1" />
                      Preview
                    </Button>
                    <Button 
                      className="w-full md:w-auto"
                      size="sm" 
                      variant="outline" 
                      onClick={handleAIExtraction}
                      disabled={extracting}
                    >
                      {extracting ? (
                        <LoadingSpinner size={14} className="mr-1" />
                      ) : (
                        <Sparkles className="h-4 w-4 mr-1" />
                      )}
                      Extract
                    </Button>
                    <Button className="w-full md:w-auto" size="sm" variant="outline" onClick={handleRemoveFile}>
                      Remove
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Existing Receipt Section */}
      {hasExistingReceipt && (
        <Card>
          <CardHeader>
            <h3 className="text-lg font-medium text-gray-900">Current Receipt</h3>
          </CardHeader>
          <CardContent>
            <div className="border border-gray-300 rounded-lg p-4">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <FileText className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900">Receipt File</p>
                    <p className="text-sm text-gray-500">Stored receipt</p>
                  </div>
                </div>
                <div className="flex gap-2 flex-wrap w-full md:w-auto">
                  <Button className="w-full md:w-auto" size="sm" variant="outline" onClick={handlePreviewExisting}>
                    <Eye className="h-4 w-4 mr-1" />
                    View
                  </Button>
                  <Button 
                    className="w-full md:w-auto"
                    size="sm" 
                    variant="outline" 
                    onClick={handleDownloadReceipt}
                    disabled={downloadingReceipt}
                  >
                    {downloadingReceipt ? (
                      <LoadingSpinner size={14} className="mr-1" />
                    ) : (
                      <Download className="h-4 w-4 mr-1" />
                    )}
                    Download
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Preview Modal */}
      {previewMode === 'modal' && receiptUrl && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-4xl max-h-[90vh] w-full overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">Receipt Preview</h3>
              <Button size="sm" variant="ghost" onClick={closePreview}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-4 overflow-auto max-h-[calc(90vh-80px)]">
              <img 
                src={receiptUrl} 
                alt="Receipt preview" 
                className="max-w-full max-h-full object-contain mx-auto"
                onError={() => {
                  toast.error('Failed to load receipt preview');
                  closePreview();
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpenseReceiptTab;
