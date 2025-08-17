import React, { useState, useRef } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/Select';
import { Card, CardContent, CardHeader } from '../ui/Card';
import { Badge } from '../ui/Badge';
import LoadingSpinner from '../LoadingSpinner';
import { useProperty } from '../../contexts/PropertyContext';
import ExpenseService from '../../services/expenseService';
import ReceiptAIExtractionService, { ReceiptExtractionLineItem } from '../../services/receiptAIExtractionService';
import { toast } from 'react-hot-toast';
import { Trash2, Plus, Sparkles, Upload, Eye, X, FileText, Image } from 'lucide-react';
import type { Expense, ExpenseCategory } from '../../types/expenses';
import type { ExpenseFormData } from './UnifiedExpenseModal';
// Removed unused ValidationIndicator imports
import type { ValidationResult } from '../../utils/expenseValidation';
// Removed unused supabase import

interface ExpenseDetailsTabProps {
  formData: ExpenseFormData;
  onFormDataChange: (updates: Partial<ExpenseFormData>) => void;
  categories: ExpenseCategory[];
  mode: 'create' | 'edit' | 'view';
  loading: boolean;
  expense?: Expense | null;
  onClose: () => void;
  onForceClose: () => void;
  onExpenseChange?: () => void;
  hideActionButtons?: boolean; // New prop to hide save/cancel buttons
  lineItems: Array<{
    description: string;
    quantity?: number;
    unit_amount?: number;
    tax_amount?: number;
    line_total?: number;
  }>;
  setLineItems: React.Dispatch<React.SetStateAction<Array<{
    description: string;
    quantity?: number;
    unit_amount?: number;
    tax_amount?: number;
    line_total?: number;
  }>>>;
  extraction: {
    confidence: number;
    reasoning?: string | null;
    category_hint?: string | null;
    extracted_data?: {
      expense_date?: string;
      amount?: number;
      currency?: string;
      vendor?: string;
    };
  } | null;
  setExtraction: React.Dispatch<React.SetStateAction<{
    confidence: number;
    reasoning?: string | null;
    category_hint?: string | null;
    extracted_data?: {
      expense_date?: string;
      amount?: number;
      currency?: string;
      vendor?: string;
    };
  } | null>>;
  validation?: ValidationResult;
  lineItemsValidation?: ValidationResult;
}

// Removed unused AIExtraction interface

const ExpenseDetailsTab: React.FC<ExpenseDetailsTabProps> = ({
  formData,
  onFormDataChange,
  categories,
  mode,
  loading,
  expense,
  onClose,
  onForceClose,
  onExpenseChange,
  hideActionButtons = false,
  lineItems,
  setLineItems,
  extraction,
  setExtraction,
  // Removed unused local variables: validation, lineItemsValidation
}) => {
  const { currentProperty } = useProperty();
  const isReadOnly = mode === 'view';
  
  // Local state (not lifted)
  const [extractingAI, setExtractingAI] = useState(false);
  const [savingExpense, setSavingExpense] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Receipt upload functionality
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [receiptPreviewUrl, setReceiptPreviewUrl] = useState<string | null>(null);
  const [showReceiptPreview, setShowReceiptPreview] = useState(false);

  // Line items are now managed by parent component

  // Compute line items total
  const computeItemsSum = (items: Array<{
    description: string;
    quantity?: number;
    unit_amount?: number;
    tax_amount?: number;
    line_total?: number;
  }>) => {
    return items.reduce((sum, item) => sum + (typeof item.line_total === 'number' ? item.line_total : 0), 0);
  };

  // Validation
  const validateForm = () => {
    const errors: Record<string, string> = {};
    
    if (!formData.expenseDate) {
      errors.expenseDate = 'Expense date is required';
    }
    
    if (!formData.amount || formData.amount <= 0) {
      errors.amount = 'Amount must be greater than 0';
    }

    // Line items reconciliation check
    if (lineItems.length > 0) {
      const itemsTotal = computeItemsSum(lineItems);
      if (Math.abs(itemsTotal - formData.amount) > 0.01) {
        errors.lineItems = `Line items total (₹${itemsTotal.toFixed(2)}) must equal amount (₹${formData.amount.toFixed(2)})`;
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle AI extraction from receipt
  const handleAIExtraction = async () => {
    if (!formData.receiptFile) {
      toast.error('Please upload a receipt first');
      return;
    }

    setExtractingAI(true);
    try {
      const result = await ReceiptAIExtractionService.extractFromReceipt(
        formData.receiptFile,
        {
          locale: 'en-IN',
          currency: 'INR',
          categories: categories.map(c => c.name)
        }
      );

      // Apply extracted data to form
      const updates: Partial<ExpenseFormData> = {};
      if (result.expense_date) updates.expenseDate = result.expense_date;
      if (result.amount) updates.amount = result.amount;
      if (result.currency) updates.currency = result.currency;
      if (result.vendor) updates.vendor = result.vendor;
      
      // Find matching category
      if (result.category_hint) {
        const matchingCategory = categories.find(c => 
          c.name.toLowerCase().includes(result.category_hint!.toLowerCase()) ||
          result.category_hint!.toLowerCase().includes(c.name.toLowerCase())
        );
        if (matchingCategory) {
          updates.categoryId = matchingCategory.id;
        }
      }

      onFormDataChange(updates);
      setLineItems(result.line_items);
      setExtraction({
        confidence: result.confidence,
        reasoning: result.reasoning,
        category_hint: result.category_hint
      });

      toast.success(`Data extracted with ${(result.confidence * 100).toFixed(0)}% confidence`);
    } catch (error) {
      console.error('AI extraction failed:', error);
      toast.error('Failed to extract data from receipt');
    } finally {
      setExtractingAI(false);
    }
  };

  // Add new line item
  const addLineItem = () => {
    setLineItems([...lineItems, {
      description: '',
      quantity: 1,
      unit_amount: 0,
      line_total: 0
    }]);
  };

  // Update line item
  const updateLineItem = (index: number, updates: Partial<ReceiptExtractionLineItem>) => {
    const newItems = [...lineItems];
    newItems[index] = { ...newItems[index], ...updates };
    
    // Auto-calculate line_total if quantity and unit_amount are provided
    if (updates.quantity !== undefined || updates.unit_amount !== undefined) {
      const item = newItems[index];
      if (item.quantity && item.unit_amount) {
        newItems[index].line_total = item.quantity * item.unit_amount;
      }
    }
    
    setLineItems(newItems);
  };

  // Remove line item
  const removeLineItem = (index: number) => {
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  // Add new category
  const addCategory = async () => {
    if (!currentProperty?.id || !newCategoryName.trim()) return;
    
    try {
      const newCategory = await ExpenseService.createPropertyCategory(
        currentProperty.id,
        newCategoryName.trim(),
        `Custom category: ${newCategoryName.trim()}`
      );
      
      onFormDataChange({ categoryId: newCategory.id });
      setNewCategoryName('');
      toast.success('Category created successfully');
    } catch (error) {
      console.error('Failed to create category:', error);
      toast.error('Failed to create category');
    }
  };

  // Upload receipt helper
  const uploadReceiptIfAny = async (propertyId: string, file?: File | null): Promise<string | null> => {
    if (!file) return null;
    
    try {
      const fileName = `receipt_${Date.now()}_${Math.random().toString(36).substring(7)}.${file.name.split('.').pop()}`;
      const { supabase } = await import('../../lib/supabase');
      const { data, error } = await supabase
        .storage
        .from('receipts')
        .upload(`${propertyId}/${fileName}`, file);
      
      if (error) throw error;
      return data.path.replace('receipts/', '');
    } catch (error) {
      console.error('Receipt upload failed:', error);
      return null;
    }
  };

  // Receipt upload functions
  const validateAndProcessFile = (file: File) => {
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      toast.error('File size must be less than 10MB');
      return false;
    }
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      toast.error('Please upload an image (JPG, PNG, GIF, WEBP) or PDF file');
      return false;
    }
    onFormDataChange({ receiptFile: file });
    toast.success(`Receipt uploaded: ${file.name}`);
    return true;
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      validateAndProcessFile(file);
    }
  };

  const handleRemoveFile = () => {
    onFormDataChange({ receiptFile: null });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

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
      validateAndProcessFile(files[0]);
    }
  };

  const handlePreviewFile = (file: File) => {
    const url = URL.createObjectURL(file);
    setReceiptPreviewUrl(url);
    setShowReceiptPreview(true);
  };

  const closeReceiptPreview = () => {
    if (receiptPreviewUrl) {
      URL.revokeObjectURL(receiptPreviewUrl);
      setReceiptPreviewUrl(null);
    }
    setShowReceiptPreview(false);
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) {
      return <Image className="h-6 w-6 text-blue-600" />;
    }
    return <FileText className="h-6 w-6 text-red-600" />;
  };

  // Submit expense
  const handleSubmit = async () => {
    if (!validateForm() || !currentProperty?.id) return;

    setSavingExpense(true);
    try {
      const receiptPath = await uploadReceiptIfAny(currentProperty.id, formData.receiptFile);
      
      let savedExpense;
      if (mode === 'edit' && expense) {
        // Update existing expense
        savedExpense = await ExpenseService.updateExpense(expense.id, {
          categoryId: formData.categoryId,
          expenseDate: formData.expenseDate,
          amount: formData.amount,
          currency: formData.currency,
          paymentMethod: formData.paymentMethod,
          vendor: formData.vendor,
          notes: formData.notes,
          receiptPath: receiptPath || undefined,
        });
      } else {
        // Create new expense
        savedExpense = await ExpenseService.createExpense({
          propertyId: currentProperty.id,
          categoryId: formData.categoryId,
          expenseDate: formData.expenseDate,
          amount: formData.amount,
          currency: formData.currency,
          paymentMethod: formData.paymentMethod,
          vendor: formData.vendor,
          notes: formData.notes,
          receiptPath: receiptPath || undefined,
          approvalStatus: 'pending'
        });
      }

      // Save line items (this will delete existing ones and insert new ones, or just delete if empty)
      await ExpenseService.saveLineItems(savedExpense.id, lineItems);

      toast.success(mode === 'edit' ? 'Expense updated successfully' : 'Expense created successfully');
      onExpenseChange?.();
      onForceClose(); // Use force close to bypass unsaved changes warning
    } catch (error) {
      console.error('Failed to save expense:', error);
      toast.error('Failed to save expense');
    } finally {
      setSavingExpense(false);
    }
  };

  const lineItemsTotal = computeItemsSum(lineItems);
  const hasReconciliationError = lineItems.length > 0 && Math.abs(lineItemsTotal - formData.amount) > 0.01;

  // Debug log for line items state
  console.log('[ExpenseDetailsTab] Current line items state:', lineItems, 'Total:', lineItemsTotal, 'Form amount:', formData.amount);

  return (
    <div className="p-6 space-y-6">
      {/* AI Extraction Results */}
      {extraction && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">AI Extraction Results</h3>
              <Badge variant={extraction.confidence > 0.8 ? 'default' : 'secondary'}>
                {(extraction.confidence * 100).toFixed(0)}% confidence
              </Badge>
            </div>
            {extraction.reasoning && (
              <p className="text-sm text-gray-600 mb-3">{extraction.reasoning}</p>
            )}
            {extraction.category_hint && (
              <p className="text-sm text-blue-600">
                Suggested category: <span className="font-medium">{extraction.category_hint}</span>
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Basic Expense Form */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">Expense Details</h3>
            {formData.receiptFile && !isReadOnly && (
              <div className="flex flex-wrap gap-2 w-full sm:w-auto justify-end">
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={handleAIExtraction}
                  disabled={extractingAI}
                >
                  {extractingAI ? (
                    <LoadingSpinner size={14} className="mr-2" />
                  ) : (
                    <Sparkles className="h-4 w-4 mr-2" />
                  )}
                  Extract Data
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Expense Date *
                </label>
                <Input
                  type="date"
                  value={formData.expenseDate}
                  onChange={(e) => onFormDataChange({ expenseDate: e.target.value })}
                  disabled={isReadOnly || loading}
                  className={validationErrors.expenseDate ? 'border-red-500' : ''}
                />
                {validationErrors.expenseDate && (
                  <p className="text-sm text-red-600 mt-1">{validationErrors.expenseDate}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount *
                </label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => onFormDataChange({ amount: parseFloat(e.target.value) || 0 })}
                    disabled={isReadOnly || loading}
                    className={`flex-1 ${validationErrors.amount ? 'border-red-500' : ''}`}
                  />
                  <Input
                    value={formData.currency}
                    onChange={(e) => onFormDataChange({ currency: e.target.value })}
                    disabled={isReadOnly || loading}
                    className="w-20"
                  />
                </div>
                {validationErrors.amount && (
                  <p className="text-sm text-red-600 mt-1">{validationErrors.amount}</p>
                )}
                {hasReconciliationError && (
                  <p className="text-sm text-orange-600 mt-1">
                    ⚠️ Amount doesn't match line items total (₹{lineItemsTotal.toFixed(2)})
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <div className="space-y-2">
                  <Select
                    value={formData.categoryId || "none"}
                    onValueChange={(value) => onFormDataChange({ categoryId: value === "none" ? undefined : value })}
                    disabled={isReadOnly || loading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Category</SelectItem>
                      {categories.map(category => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  {!isReadOnly && (
                    <div className="flex gap-2">
                      <Input
                        placeholder="New category name"
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        className="flex-1"
                      />
                      <Button size="sm" onClick={addCategory} disabled={!newCategoryName.trim()}>
                        Add
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Vendor
                </label>
                <Input
                  value={formData.vendor}
                  onChange={(e) => onFormDataChange({ vendor: e.target.value })}
                  disabled={isReadOnly || loading}
                  placeholder="Enter vendor name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Method
                </label>
                <Input
                  value={formData.paymentMethod}
                  onChange={(e) => onFormDataChange({ paymentMethod: e.target.value })}
                  disabled={isReadOnly || loading}
                  placeholder="Cash, Card, UPI, etc."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => onFormDataChange({ notes: e.target.value })}
                  disabled={isReadOnly || loading}
                  placeholder="Additional notes..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  rows={3}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Receipt Upload */}
      {!isReadOnly && (
        <Card>
          <CardHeader>
            <h3 className="text-lg font-medium text-gray-900">Receipt Upload & AI Extraction</h3>
          </CardHeader>
          <CardContent>
            {!formData.receiptFile ? (
              <div 
                className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors cursor-pointer"
                onClick={triggerFileUpload}
                onDragOver={handleDragOver}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <Upload className="mx-auto h-8 w-8 text-gray-400 mb-3" />
                <div className="text-gray-600 mb-3">
                  <p className="font-medium">Drop receipt here or click to upload</p>
                  <p className="text-sm">Supports JPG, PNG, PDF files up to 10MB</p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
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
            ) : (
              <div className="border border-gray-300 rounded-lg p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      {getFileIcon(formData.receiptFile)}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{formData.receiptFile.name}</p>
                      <p className="text-sm text-gray-500">
                        {(formData.receiptFile.size / 1024 / 1024).toFixed(2)} MB • {formData.receiptFile.type}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 w-full sm:w-auto justify-end">
                    <Button size="sm" variant="outline" onClick={() => handlePreviewFile(formData.receiptFile!)}>
                      <Eye className="h-4 w-4 mr-1" />
                      Preview
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={handleAIExtraction}
                      disabled={extractingAI}
                    >
                      {extractingAI ? (
                        <LoadingSpinner size={14} className="mr-1" />
                      ) : (
                        <Sparkles className="h-4 w-4 mr-1" />
                      )}
                      Extract
                    </Button>
                    <Button size="sm" variant="outline" onClick={handleRemoveFile}>
                      <X className="h-4 w-4 mr-1" />
                      Remove
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Item Breakdown */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">
              Item Breakdown
              {lineItems.length > 0 && (
                <span className="ml-2 text-sm text-gray-500">
                  (Total: ₹{lineItemsTotal.toFixed(2)})
                </span>
              )}
            </h3>
            {!isReadOnly && (
              <Button size="sm" variant="outline" onClick={addLineItem}>
                <Plus className="h-4 w-4 mr-1" />
                Add Item
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {validationErrors.lineItems && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-700">{validationErrors.lineItems}</p>
            </div>
          )}
          
          {lineItems.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No items added. Click "Add Item" to break down this expense into individual costs.
            </div>
          ) : (
            <div className="space-y-3">
              {/* Column Headers */}
              <div className="hidden md:grid grid-cols-12 gap-2 px-3 py-2 bg-gray-50 rounded-md text-sm font-medium text-gray-700 border-b">
                <div className="col-span-4">Item Description</div>
                <div className="col-span-2">Quantity</div>
                <div className="col-span-2">Unit Price</div>
                <div className="col-span-2">Total Cost</div>
                <div className="col-span-2 text-center">Action</div>
              </div>
              
              {lineItems.map((item, index) => (
                <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start p-3 border rounded-lg">
                  <div className="md:col-span-4">
                    <label className="text-xs text-gray-500 md:hidden mb-1 block">Item Description</label>
                    <Input
                      placeholder="e.g. Office supplies, Taxi fare"
                      value={item.description}
                      onChange={(e) => updateLineItem(index, { description: e.target.value })}
                      disabled={isReadOnly}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-xs text-gray-500 md:hidden mb-1 block">Quantity</label>
                    <Input
                      type="number"
                      placeholder="1"
                      value={item.quantity || ''}
                      onChange={(e) => updateLineItem(index, { quantity: parseFloat(e.target.value) || 1 })}
                      disabled={isReadOnly}
                      min="0"
                      step="1"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-xs text-gray-500 md:hidden mb-1 block">Unit Price</label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="₹0.00"
                      value={item.unit_amount || ''}
                      onChange={(e) => updateLineItem(index, { unit_amount: parseFloat(e.target.value) || 0 })}
                      disabled={isReadOnly}
                      min="0"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-xs text-gray-500 md:hidden mb-1 block">Total Cost</label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="₹0.00"
                      value={item.line_total || ''}
                      onChange={(e) => updateLineItem(index, { line_total: parseFloat(e.target.value) || 0 })}
                      disabled={isReadOnly}
                      min="0"
                    />
                  </div>
                  <div className="md:col-span-2">
                    {!isReadOnly && (
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => removeLineItem(index)}
                        className="w-full"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action Buttons */}
      {mode !== 'view' && !hideActionButtons && (
        <div className="flex flex-col sm:flex-row sm:justify-end gap-3 pt-6 border-t">
          <Button className="w-full sm:w-auto" variant="outline" onClick={onClose} disabled={savingExpense}>
            Cancel
          </Button>
          <Button 
            className="w-full sm:w-auto"
            onClick={handleSubmit} 
            disabled={savingExpense || hasReconciliationError}
          >
            {savingExpense && <LoadingSpinner size={16} className="mr-2" />}
            {mode === 'create' ? 'Create Expense' : 'Update Expense'}
          </Button>
        </div>
      )}

      {/* Receipt Preview Modal */}
      {showReceiptPreview && receiptPreviewUrl && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-4xl max-h-[90vh] w-full overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">Receipt Preview</h3>
              <Button size="sm" variant="ghost" onClick={closeReceiptPreview}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-4 overflow-auto max-h-[calc(90vh-80px)]">
              <img 
                src={receiptPreviewUrl} 
                alt="Receipt preview" 
                className="max-w-full max-h-full object-contain mx-auto"
                onError={() => {
                  toast.error('Failed to load receipt preview');
                  closeReceiptPreview();
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpenseDetailsTab;
