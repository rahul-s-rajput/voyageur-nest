import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/Dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/Tabs';
import { Button } from '../ui/Button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/DropdownMenu';
import { X, Edit, Trash2, Check, XCircle, MoreVertical, Save } from 'lucide-react';
import { useBreakpoint } from '../../hooks/useWindowSize';
import { useProperty } from '../../contexts/PropertyContext';
import toast from 'react-hot-toast';
import type { Expense, ExpenseCategory } from '../../types/expenses';
import ExpenseDetailsTab from './ExpenseDetailsTab';
import ExpenseReceiptTab from './ExpenseReceiptTab';
import ExpenseSharesTab from './ExpenseSharesTab';
import ExpenseApprovalTab from './ExpenseApprovalTab';
import ExpenseApprovalPopup from './ExpenseApprovalPopup';
import { ValidationIndicator, TabValidationIndicator } from '../ui/ValidationIndicator';
import ExpenseValidator, { ValidationResult } from '../../utils/expenseValidation';

interface UnifiedExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  expense?: Expense | null; // null for new expense, existing expense for edit/view
  mode: 'create' | 'edit' | 'view';
  initialTab?: 'details' | 'receipt' | 'shares' | 'approval';
  categories: ExpenseCategory[];
  onExpenseChange?: () => void; // Callback when expense is saved/updated
}

export interface ExpenseFormData {
  expenseDate: string;
  amount: number;
  currency: string;
  categoryId?: string;
  paymentMethod: string;
  vendor: string;
  notes: string;
  receiptFile?: File | null;
}

const UnifiedExpenseModal: React.FC<UnifiedExpenseModalProps> = ({
  isOpen,
  onClose,
  expense,
  mode,
  initialTab = 'details',
  categories,
  onExpenseChange
}) => {
  const { isMobile } = useBreakpoint();
  const { currentProperty, properties } = useProperty();
  const PERSIST_KEY = 'unified_expense_modal_persist';
  
  // Local copy of expense to reflect in-modal updates (e.g., approval status)
  const [localExpense, setLocalExpense] = useState<Expense | null>(expense || null);
  
  // Form state
  const [formData, setFormData] = useState<ExpenseFormData>({
    expenseDate: '',
    amount: 0,
    currency: 'INR',
    categoryId: undefined,
    paymentMethod: '',
    vendor: '',
    notes: '',
    receiptFile: null
  });

  const [activeTab, setActiveTab] = useState(initialTab);
  const [loading] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [currentMode, setCurrentMode] = useState(mode); // Internal mode state for switching
  const [savingAll, setSavingAll] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [initialFormData, setInitialFormData] = useState<ExpenseFormData | null>(null);
  const [initialLineItems, setInitialLineItems] = useState<Array<{
    description: string;
    quantity?: number;
    unit_amount?: number;
    tax_amount?: number;
    line_total?: number;
  }>>([]);
  const [, setInitialExtraction] = useState<typeof extraction>(null);
  
  // Line items and AI extraction state (lifted from ExpenseDetailsTab)
  const [lineItems, setLineItems] = useState<Array<{
    description: string;
    quantity?: number;
    unit_amount?: number;
    tax_amount?: number;
    line_total?: number;
  }>>([]);
  const [extraction, setExtraction] = useState<{
    confidence: number;
    reasoning?: string | null;
    category_hint?: string | null;
    extracted_data?: {
      expense_date?: string;
      amount?: number;
      currency?: string;
      vendor?: string;
    };
  } | null>(null);

  // Shares state (lifted from ExpenseSharesTab)
  const [shares, setShares] = useState<Array<{
    propertyId: string;
    propertyName: string;
    sharePercent?: number;
    shareAmount?: number;
  }>>([]);
  const [initialShares, setInitialShares] = useState<Array<{
    propertyId: string;
    propertyName: string;
    sharePercent?: number;
    shareAmount?: number;
  }>>([]);
  const [shareMode, setShareMode] = useState<'percentage' | 'amount'>('percentage');

  // Validation state
  const [validationResults, setValidationResults] = useState<{
    overall: ValidationResult;
    formData: ValidationResult;
    lineItems: ValidationResult;
    shares: ValidationResult;
    receipt: ValidationResult;
  }>({
    overall: { isValid: true, errors: [], warnings: [] },
    formData: { isValid: true, errors: [], warnings: [] },
    lineItems: { isValid: true, errors: [], warnings: [] },
    shares: { isValid: true, errors: [], warnings: [] },
    receipt: { isValid: true, errors: [], warnings: [] }
  });

  // Approval popup state
  const [approvalPopup, setApprovalPopup] = useState<{
    isOpen: boolean;
    mode: 'approve' | 'reject';
  }>({ isOpen: false, mode: 'approve' });



  // Update current mode when prop changes
  useEffect(() => {
    setCurrentMode(mode);
  }, [mode]);

  // Keep localExpense in sync with incoming prop or when modal (re)opens
  useEffect(() => {
    setLocalExpense(expense || null);
  }, [expense, isOpen]);

  // Initialize form data when expense or modal opens
  useEffect(() => {
    if (isOpen) {
      setIsInitialized(false); // Reset initialization flag when opening
      setCurrentMode(mode); // Reset mode to initial prop value
              if (expense && mode !== 'create') {
        // Populate form with existing expense data
        const initialData = {
          expenseDate: expense.expenseDate,
          amount: expense.amount,
          currency: expense.currency || 'INR',
          categoryId: expense.categoryId || undefined,
          paymentMethod: expense.paymentMethod || '',
          vendor: expense.vendor || '',
          notes: expense.notes || '',
          receiptFile: null // Receipt file will be handled separately
        };
        setFormData(initialData);
        setInitialFormData(initialData);
        
        // Load line items for existing expense
        if (expense && (mode === 'edit' || mode === 'view')) {
          import('../../services/expenseService').then(({ default: ExpenseService }) => {
            ExpenseService.getLineItems(expense.id)
              .then(items => {
                console.log('[UnifiedExpenseModal] Loaded line items:', items);
                setLineItems(items);
                setInitialLineItems(items); // Store initial state
              })
              .catch(error => {
                console.error('[UnifiedExpenseModal] Failed to load line items:', error);
                setLineItems([]);
                setInitialLineItems([]);
              });
              
            // Load existing shares
            ExpenseService.getExpenseShares(expense.id)
              .then(existingShares => {
                console.log('[UnifiedExpenseModal] Loaded existing shares from DB:', existingShares);
                if (existingShares.length > 0) {
                  // Convert to PropertyShare format
                  const propertyShares = properties.map(property => {
                    const existingShare = existingShares.find(s => s.propertyId === property.id);
                    return {
                      propertyId: property.id,
                      propertyName: property.name,
                      sharePercent: existingShare?.sharePercent ?? undefined,
                      shareAmount: existingShare?.shareAmount ?? undefined
                    };
                  });
                  
                  // Determine share mode based on existing data
                  const hasPercentages = existingShares.some(s => s.sharePercent != null);
                  const hasAmounts = existingShares.some(s => s.shareAmount != null);
                  
                  console.log('[UnifiedExpenseModal] Converted propertyShares:', propertyShares);
                  console.log('[UnifiedExpenseModal] Mode detection:', { hasPercentages, hasAmounts });
                  
                  if (hasPercentages) {
                    setShareMode('percentage');
                  } else if (hasAmounts) {
                    setShareMode('amount');
                  }
                  
                  setShares(propertyShares);
                  setInitialShares(propertyShares);
                  console.log('[UnifiedExpenseModal] Set shares state with loaded data');
                } else {
                  console.log('[UnifiedExpenseModal] No existing shares found, initializing defaults');
                  // Initialize default shares
                  initializeDefaultShares();
                }
              })
              .catch(error => {
                console.error('[UnifiedExpenseModal] Failed to load shares:', error);
                initializeDefaultShares();
              });
          });
        } else {
          setLineItems([]);
          setInitialLineItems([]);
          setExtraction(null);
          setInitialExtraction(null);
          initializeDefaultShares();
        }
      } else {
        // Reset form for new expense
        const today = new Date().toISOString().split('T')[0];
        const newFormData = {
          expenseDate: today,
          amount: 0,
          currency: 'INR',
          categoryId: undefined,
          paymentMethod: '',
          vendor: '',
          notes: '',
          receiptFile: null
        };
        setFormData(newFormData);
        setInitialFormData(newFormData);
        setLineItems([]);
        setInitialLineItems([]);
        setExtraction(null);
        setInitialExtraction(null);
        initializeDefaultShares();
      }
      setActiveTab(initialTab);
      setHasUnsavedChanges(false);
      
      // Mark as initialized after form setup (immediate for better reliability)
      setIsInitialized(true);
    }
  }, [isOpen, expense, mode, initialTab]);

  // Persist modal/tab state while open (create mode only)
  useEffect(() => {
    if (!isOpen) return;
    try {
      const payload = {
        isOpen: true,
        mode: currentMode,
        expenseId: localExpense?.id || null,
        activeTab,
        ts: Date.now(),
      };
      if (currentMode === 'create') {
        localStorage.setItem(PERSIST_KEY, JSON.stringify(payload));
      }
    } catch {}
  }, [isOpen, currentMode, activeTab, localExpense?.id]);

  // Determine which tabs to show
  const showSharesTab = properties.length > 1;
  const showApprovalTab = localExpense && mode !== 'create';
  // Receipt tab removed - functionality moved to Details tab

  // Handle modal close with unsaved changes warning
  const handleClose = useCallback(() => {
    if (hasUnsavedChanges && currentMode !== 'view') {
      if (window.confirm('You have unsaved changes. Are you sure you want to close?')) {
        setIsInitialized(false); // Reset initialization flag
        try { localStorage.removeItem(PERSIST_KEY); } catch {}
        onClose();
      }
    } else {
      setIsInitialized(false); // Reset initialization flag
      try { localStorage.removeItem(PERSIST_KEY); } catch {}
      onClose();
    }
  }, [hasUnsavedChanges, currentMode, onClose]);

  // Force close without unsaved changes warning (used after successful save)
  const handleForceClose = useCallback(() => {
    setIsInitialized(false); // Reset initialization flag
    try { localStorage.removeItem(PERSIST_KEY); } catch {}
    onClose();
  }, [onClose]);

  // Function to check if data has actually changed (only substantive changes that would affect saved expense)
  const hasDataChanges = useCallback(() => {
    if (!initialFormData) return false;
    
    // For create mode, only consider changes to the basic form fields as "unsaved changes"
    // Receipt uploads and AI extractions are considered workflow actions, not unsaved changes
    if (currentMode === 'create') {
      // Only track basic form field changes that differ from the initial empty/default state
      const basicFormChanged = (
        formData.amount !== initialFormData.amount ||
        formData.categoryId !== initialFormData.categoryId ||
        formData.paymentMethod !== initialFormData.paymentMethod ||
        formData.vendor !== initialFormData.vendor ||
        formData.notes !== initialFormData.notes
      );
      
      // Don't consider receipt uploads or line items as unsaved changes during creation
      // These are workflow artifacts, not user data that needs protection
      return basicFormChanged;
    }
    
    // For edit mode, track all meaningful changes
    const formChanged = (
      formData.expenseDate !== initialFormData.expenseDate ||
      formData.amount !== initialFormData.amount ||
      formData.currency !== initialFormData.currency ||
      formData.categoryId !== initialFormData.categoryId ||
      formData.paymentMethod !== initialFormData.paymentMethod ||
      formData.vendor !== initialFormData.vendor ||
      formData.notes !== initialFormData.notes ||
      (formData.receiptFile !== null) !== (initialFormData.receiptFile !== null)
    );

    // Check line items changes for edit mode
    const lineItemsChanged = (
      lineItems.length !== initialLineItems.length ||
      lineItems.some((item, index) => {
        const initialItem = initialLineItems[index];
        return !initialItem ||
          item.description !== initialItem.description ||
          item.quantity !== initialItem.quantity ||
          item.unit_amount !== initialItem.unit_amount ||
          item.tax_amount !== initialItem.tax_amount ||
          item.line_total !== initialItem.line_total;
      })
    );

    // Check shares changes
    const sharesChanged = (
      shares.length !== initialShares.length ||
      shares.some((share, index) => {
        const initialShare = initialShares[index];
        return !initialShare ||
          share.propertyId !== initialShare.propertyId ||
          share.sharePercent !== initialShare.sharePercent ||
          share.shareAmount !== initialShare.shareAmount;
      })
    );

    return formChanged || lineItemsChanged || sharesChanged;
  }, [formData, initialFormData, lineItems, initialLineItems, shares, initialShares, currentMode]);

  // Handle form data changes
  const handleFormDataChange = useCallback((updates: Partial<ExpenseFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  }, []);

  // Handle line items changes
  const handleLineItemsChange = useCallback((updater: React.SetStateAction<typeof lineItems>) => {
    if (typeof updater === 'function') {
      setLineItems(prev => updater(prev));
    } else {
      setLineItems(updater);
    }
  }, []);

  // Handle extraction changes
  const handleExtractionChange = useCallback((updater: React.SetStateAction<typeof extraction>) => {
    if (typeof updater === 'function') {
      setExtraction(prev => updater(prev));
    } else {
      setExtraction(updater);
    }
  }, []);

  // Handle shares changes
  const handleSharesChange = useCallback((updater: React.SetStateAction<typeof shares>) => {
    console.log('[UnifiedExpenseModal] handleSharesChange called with:', updater, typeof updater);
    if (typeof updater === 'function') {
      console.log('[UnifiedExpenseModal] Applying function updater');
      setShares(prev => {
        const updated = updater(prev);
        console.log('[UnifiedExpenseModal] Updated shares via function:', updated);
        return updated;
      });
    } else {
      console.log('[UnifiedExpenseModal] Setting shares directly:', updater);
      setShares(updater);
    }
  }, []);

  // Handle share mode changes
  const handleShareModeChange = useCallback((newMode: 'percentage' | 'amount') => {
    setShareMode(newMode);
  }, []);

  // Initialize default shares
  const initializeDefaultShares = useCallback((mode?: 'percentage' | 'amount', amount?: number) => {
    console.log('[UnifiedExpenseModal] initializeDefaultShares called', { mode, amount, properties: properties.length });
    const currentShareMode = mode || shareMode;
    const currentAmount = amount || formData.amount;
    
    if (properties.length > 1) {
      // Default to 100% for current/active property, 0% for others
      const defaultShares = properties.map(property => {
        const isActiveProperty = property.id === currentProperty?.id;
        return {
          propertyId: property.id,
          propertyName: property.name,
          sharePercent: currentShareMode === 'percentage' ? (isActiveProperty ? 100 : 0) : undefined,
          shareAmount: currentShareMode === 'amount' ? (isActiveProperty ? currentAmount : 0) : undefined
        };
      });
      console.log('[UnifiedExpenseModal] Setting default shares (100% to active property):', defaultShares);
      setShares(defaultShares);
      setInitialShares(defaultShares);
    } else if (properties.length === 1) {
      // Single property - 100% allocation
      const singleShare = properties.map(property => ({
        propertyId: property.id,
        propertyName: property.name,
        sharePercent: 100,
        shareAmount: currentAmount
      }));
      console.log('[UnifiedExpenseModal] Setting single share:', singleShare);
      setShares(singleShare);
      setInitialShares(singleShare);
    }
  }, [properties, currentProperty?.id]);

  // Check for changes whenever relevant state changes
  useEffect(() => {
    if (currentMode !== 'view' && isInitialized) {
      setHasUnsavedChanges(hasDataChanges());
    }
  }, [currentMode, isInitialized, hasDataChanges]);

  // Run comprehensive validation whenever form data, line items, or shares change
  useEffect(() => {
    if (isInitialized) {
      runValidation();
    }
  }, [formData, lineItems, shares, shareMode, isInitialized]);

  const runValidation = useCallback(() => {
    // Validate form data
    const formDataValidation = ExpenseValidator.validateFormData(formData);
    
    // Validate line items
    const lineItemsValidation = ExpenseValidator.validateLineItems(lineItems, formData.amount);
    
    // Validate shares
    const sharesValidation = ExpenseValidator.validateExpenseShares(shares, formData.amount, shareMode);
    
    // Validate receipt
    const receiptValidation = ExpenseValidator.validateReceiptFile(formData.receiptFile || null);
    
    // Overall validation
    const overallValidation = ExpenseValidator.validateCompleteExpense(
      formData,
      lineItems,
      shares,
      shareMode
    );

    setValidationResults({
      overall: overallValidation,
      formData: formDataValidation,
      lineItems: lineItemsValidation,
      shares: sharesValidation,
      receipt: receiptValidation
    });
  }, [formData, lineItems, shares, shareMode]);

  // Action handlers for modal header buttons
  const handleEdit = useCallback(() => {
    if (expense && currentMode === 'view') {
      setCurrentMode('edit');
      setActiveTab('details'); // Switch to details tab for editing
      toast('Switched to edit mode', { icon: '✏️' });
    }
  }, [expense, currentMode]);

  const handleDelete = useCallback(async () => {
    if (!expense) return;
    
    if (window.confirm(`Are you sure you want to delete the expense of ₹${expense.amount.toFixed(2)} on ${expense.expenseDate}?`)) {
      try {
        const { default: ExpenseService } = await import('../../services/expenseService');
        await ExpenseService.deleteExpense(expense.id);
        toast.success('Expense deleted successfully');
        onExpenseChange?.();
        handleForceClose();
      } catch (error) {
        console.error('Failed to delete expense:', error);
        toast.error('Failed to delete expense');
      }
    }
  }, [expense, onExpenseChange, handleForceClose]);

  const handleApprove = useCallback(() => {
    if (!localExpense) return;
    setApprovalPopup({ isOpen: true, mode: 'approve' });
  }, [localExpense]);

  const handleReject = useCallback(() => {
    if (!localExpense) return;
    setApprovalPopup({ isOpen: true, mode: 'reject' });
  }, [localExpense]);

  const handleApprovalAction = useCallback(async (notes: string) => {
    if (!localExpense) return;
    
    try {
      const { default: ExpenseService } = await import('../../services/expenseService');
      const token = localStorage.getItem('admin_device_token') || localStorage.getItem('auth_token') || '';
      const updated = await ExpenseService.setApproval(
        localExpense.id,
        approvalPopup.mode === 'approve' ? 'approved' : 'rejected',
        token,
        notes
      );
      setLocalExpense(updated);
      toast.success(`Expense ${approvalPopup.mode === 'approve' ? 'approved' : 'rejected'} successfully`);
      onExpenseChange?.();
      // Stay in modal to see updated status
    } catch (error) {
      console.error(`Failed to ${approvalPopup.mode} expense:`, error);
      toast.error(`Failed to ${approvalPopup.mode} expense`);
      throw error; // Re-throw to let the popup handle the error state
    }
  }, [localExpense, onExpenseChange, approvalPopup.mode]);

  const handleRejectionAction = useCallback(async (notes: string) => {
    if (!localExpense) return;
    
    try {
      const { default: ExpenseService } = await import('../../services/expenseService');
      const token = localStorage.getItem('admin_device_token') || localStorage.getItem('auth_token') || '';
      const updated = await ExpenseService.setApproval(localExpense.id, 'rejected', token, notes);
      setLocalExpense(updated);
      toast.success('Expense rejected successfully');
      onExpenseChange?.();
      // Stay in modal to see updated status
    } catch (error) {
      console.error('Failed to reject expense:', error);
      toast.error('Failed to reject expense');
      throw error; // Re-throw to let the popup handle the error state
    }
  }, [localExpense, onExpenseChange]);

  const handleUnifiedSave = useCallback(async () => {
    if (!currentProperty?.id) return;

    // Validate form data first
    const formValidation = ExpenseValidator.validateFormData(formData);
    const lineItemsValidation = ExpenseValidator.validateLineItems(lineItems, formData.amount);
    
    if (!formValidation.isValid || !lineItemsValidation.isValid) {
      toast.error('Please fix validation errors before saving');
      return;
    }

    setSavingAll(true);
    try {
      const { default: ExpenseService } = await import('../../services/expenseService');
      
      // Handle receipt upload
      let receiptPath: string | null = null;
      if (formData.receiptFile) {
        try {
          const uploadResult = await ExpenseService.uploadReceipt(currentProperty.id, formData.receiptFile);
          receiptPath = uploadResult.path;
        } catch (error) {
          console.error('Failed to upload receipt:', error);
          toast.error('Failed to upload receipt');
          return;
        }
      }
      
      let savedExpense;
      if (currentMode === 'edit' && expense) {
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

      // Save shares if there are multiple properties
      if (properties.length > 1 && shares.length > 0) {
        const expenseShares = shares.map(share => ({
          propertyId: share.propertyId,
          sharePercent: shareMode === 'percentage' ? share.sharePercent : undefined,
          shareAmount: shareMode === 'amount' ? share.shareAmount : undefined
        }));
        console.log('[UnifiedExpenseModal] Saving shares:', {
          shareMode,
          shares,
          expenseShares,
          propertiesLength: properties.length
        });
        await ExpenseService.saveExpenseShares(savedExpense.id, expenseShares);
        console.log('[UnifiedExpenseModal] Shares saved successfully');
      } else {
        console.log('[UnifiedExpenseModal] Skipping shares save:', {
          propertiesLength: properties.length,
          sharesLength: shares.length,
          shares
        });
      }

      toast.success(currentMode === 'edit' ? 'Expense updated successfully' : 'Expense created successfully');
      onExpenseChange?.();
      handleForceClose(); // Use force close to bypass unsaved changes warning
    } catch (error) {
      console.error('Failed to save expense:', error);
      toast.error('Failed to save expense');
    } finally {
      setSavingAll(false);
    }
  }, [currentProperty, formData, lineItems, currentMode, expense, onExpenseChange, handleForceClose, shares, shareMode, properties]);

  // Handle cancel action (reset to original values)
  const handleCancel = useCallback(() => {
    // Discard without confirmation or toast
    if (initialFormData) {
      setFormData(initialFormData);
    }
    if (initialLineItems) {
      setLineItems(initialLineItems);
    }
    if (initialShares) {
      setShares(initialShares);
    }
    setHasUnsavedChanges(false);
    // Switch back to view mode
    setCurrentMode('view');
  }, [initialFormData, initialLineItems, initialShares]);

  // Get modal title based on current mode
  const getModalTitle = () => {
    switch (currentMode) {
      case 'create':
        return 'Add New Expense';
      case 'edit':
        return 'Edit Expense';
      case 'view':
        return 'Expense Details';
      default:
        return 'Expense';
    }
  };

  // Get modal subtitle
  const getModalSubtitle = () => {
    if (localExpense) {
      return `${localExpense.expenseDate} • ₹${localExpense.amount.toFixed(2)} ${localExpense.currency}`;
    }
    return currentProperty?.name || 'New Expense';
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleClose(); }}>
      <DialogContent 
        className={`${
          isMobile 
            ? 'inset-0 w-full h-full max-w-none max-h-none rounded-none translate-x-0 translate-y-0 left-0 top-0' 
            : 'max-w-4xl w-full h-[85vh] max-h-[85vh]'
        } p-0 flex flex-col`}
        showCloseButton={false}
      >
        {/* Header - Fixed */}
        <DialogHeader className="px-6 py-4 border-b bg-gray-50 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <DialogTitle className="text-lg font-semibold text-gray-900 truncate">
                    {getModalTitle()}
                  </DialogTitle>
                  <DialogDescription className="hidden md:block text-sm text-gray-600 mt-1 truncate">
                    {getModalSubtitle()}
                  </DialogDescription>
                </div>
                {currentMode !== 'view' && isInitialized && (
                  <div className="flex items-center gap-2 shrink-0">
                    <ValidationIndicator 
                      validation={validationResults.overall} 
                      inline={true} 
                      className="text-xs"
                    />
                    {!validationResults.overall.isValid && (
                      <span className="hidden md:inline text-xs text-red-600 font-medium whitespace-nowrap">
                        {validationResults.overall.errors.length} error{validationResults.overall.errors.length > 1 ? 's' : ''}
                      </span>
                    )}
                    {validationResults.overall.isValid && validationResults.overall.warnings.length > 0 && (
                      <span className="hidden md:inline text-xs text-yellow-600 font-medium whitespace-nowrap">
                        {validationResults.overall.warnings.length} warning{validationResults.overall.warnings.length > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
            
            {/* Action Buttons */}
          <div className="flex items-center gap-1 md:gap-2 ml-2 md:ml-4 shrink-0 flex-wrap md:flex-nowrap">
              {/* Cancel and Save buttons for edit/create modes */}
              {currentMode !== 'view' && (
                <div className="flex items-center gap-2">
                  {/* Cancel button - only show in edit mode and when there are unsaved changes */}
                  {currentMode === 'edit' && (
                    <Button 
                      size="sm" 
                      variant={isMobile ? 'ghost' : 'outline'}
                      onClick={handleCancel}
                      disabled={savingAll}
                      className={isMobile ? 'px-2' : ''}
                    >
                      {isMobile ? 'Cancel' : 'Cancel'}
                    </Button>
                  )}
                  
                  {/* Save button */}
                  <Button 
                    size="sm" 
                    onClick={handleUnifiedSave} 
                    disabled={savingAll || !hasUnsavedChanges || (validationResults.overall && !validationResults.overall.isValid)}
                    className={isMobile ? 'px-3' : ''}
                  >
                    {savingAll ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                    ) : (
                      <Save className="h-4 w-4 mr-1" />
                    )}
                    {currentMode === 'create' ? (isMobile ? 'Create' : 'Create Expense') : (isMobile ? 'Save' : 'Save Changes')}
                  </Button>
                </div>
              )}
              
              {localExpense && currentMode === 'view' && (
                <>
                  {!isMobile ? (
                    // Desktop: Show individual action buttons
                    <>
                      <Button size="sm" variant="outline" onClick={handleEdit}>
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      {localExpense.approvalStatus === 'pending' && (
                        <>
                          <Button size="sm" variant="outline" onClick={handleApprove}>
                            <Check className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                          <Button size="sm" variant="outline" onClick={handleReject}>
                            <XCircle className="h-4 w-4 mr-1" />
                            Reject
                          </Button>
                        </>
                      )}
                      <Button size="sm" variant="destructive" onClick={handleDelete}>
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
                      </Button>
                    </>
                  ) : (
                    // Mobile: Use dropdown menu
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="sm" variant="outline">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={handleEdit}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        {localExpense.approvalStatus === 'pending' && (
                          <>
                            <DropdownMenuItem onClick={handleApprove}>
                              <Check className="h-4 w-4 mr-2" />
                              Approve
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={handleReject}>
                              <XCircle className="h-4 w-4 mr-2" />
                              Reject
                            </DropdownMenuItem>
                          </>
                        )}
                        <DropdownMenuItem onClick={handleDelete} className="text-red-600">
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </>
              )}
              
              {/* Close button - always visible (including mobile create/edit) */}
              <Button
                variant="ghost"
                size="icon"
                onClick={handleClose}
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Tabs - Flexible with proper scroll */}
        <Tabs 
          value={activeTab} 
          onValueChange={(value) => setActiveTab(value as typeof activeTab)}
          className="flex flex-col flex-1 min-h-0"
        >
          {/* Tab Navigation - Fixed */}
          <div className={`px-6 pt-4 border-b shrink-0 ${isMobile ? '-mx-6 px-6 overflow-x-auto' : ''}`}>
            <TabsList className={`w-max ${isMobile ? 'inline-flex gap-2 h-auto bg-transparent p-0' : ''}`}>
              <TabsTrigger value="details" className={`flex items-center gap-2 ${isMobile ? 'shrink-0 justify-center min-w-[140px] border border-gray-200 bg-white shadow-sm' : ''}`}>
                <span>Details</span>
                {currentMode !== 'view' && isInitialized && (
                  <TabValidationIndicator 
                    tabName="Details" 
                    validation={validationResults.formData} 
                  />
                )}
              </TabsTrigger>
              <TabsTrigger value="receipt" className={`flex items-center gap-2 ${isMobile ? 'shrink-0 justify-center min-w-[140px] border border-gray-200 bg-white shadow-sm' : ''}`}>
                <span>Receipt</span>
                {currentMode !== 'view' && isInitialized && (
                  <TabValidationIndicator 
                    tabName="Receipt" 
                    validation={validationResults.receipt} 
                  />
                )}
              </TabsTrigger>
              {showSharesTab && (
                <TabsTrigger value="shares" className={`flex items-center gap-2 ${isMobile ? 'shrink-0 justify-center min-w-[140px] border border-gray-200 bg-white shadow-sm' : ''}`}>
                  <span>Shares</span>
                  {currentMode !== 'view' && isInitialized && (
                    <TabValidationIndicator 
                      tabName="Shares" 
                      validation={validationResults.shares} 
                    />
                  )}
                </TabsTrigger>
              )}
              {showApprovalTab && (
                <TabsTrigger value="approval" className={`flex items-center gap-2 ${isMobile ? 'shrink-0 justify-center min-w-[140px] border border-gray-200 bg-white shadow-sm' : ''}`}>
                  <span>Approval</span>
                  {/* Approval tab doesn't have validation indicators */}
                </TabsTrigger>
              )}
            </TabsList>
          </div>

          {/* Tab Content - Scrollable */}
          <div className="flex-1 min-h-0 overflow-hidden">
            <TabsContent value="details" className="h-full m-0 p-0">
              <div className="h-full overflow-y-auto">
                <ExpenseDetailsTab
                  formData={formData}
                  onFormDataChange={handleFormDataChange}
                  categories={categories}
                  mode={currentMode}
                  loading={loading}
                  expense={localExpense}
                  onClose={handleClose}
                  onForceClose={handleForceClose}
                  onExpenseChange={onExpenseChange}
                  hideActionButtons={true}
                  lineItems={lineItems}
                  setLineItems={handleLineItemsChange}
                  extraction={extraction}
                  setExtraction={handleExtractionChange}
                  validation={validationResults.formData}
                  lineItemsValidation={validationResults.lineItems}
                />
              </div>
            </TabsContent>
            
            <TabsContent value="receipt" className="h-full m-0 p-0">
              <div className="h-full overflow-y-auto">
                <ExpenseReceiptTab
                  formData={formData}
                  onFormDataChange={handleFormDataChange}
                  mode={currentMode}
                  loading={loading}
                  expense={localExpense}
                />
              </div>
            </TabsContent>

            {showSharesTab && (
              <TabsContent value="shares" className="h-full m-0 p-0">
                <div className="h-full overflow-y-auto">
                  <ExpenseSharesTab
                    formData={formData}
                    onFormDataChange={handleFormDataChange}
                    mode={currentMode}
                    loading={loading}
                    expense={localExpense}
                    properties={properties}
                    hideActionButtons={true}
                    shares={shares}
                    onSharesChange={handleSharesChange}
                    shareMode={shareMode}
                    onShareModeChange={handleShareModeChange}
                  />
                </div>
              </TabsContent>
            )}

            {showApprovalTab && (
              <TabsContent value="approval" className="h-full m-0 p-0">
                <div className="h-full overflow-y-auto">
                  <ExpenseApprovalTab
                    expense={localExpense}
                    mode={currentMode}
                    loading={loading}
                    onExpenseChange={onExpenseChange}
                  />
                </div>
              </TabsContent>
            )}
          </div>
        </Tabs>
      </DialogContent>
      
      {/* Approval Popup */}
      {localExpense && (
        <ExpenseApprovalPopup
          isOpen={approvalPopup.isOpen}
          onClose={() => setApprovalPopup({ isOpen: false, mode: 'approve' })}
          onApprove={handleApprovalAction}
          onReject={handleRejectionAction}
          mode={approvalPopup.mode}
          expenseAmount={localExpense.amount}
          expenseDate={localExpense.expenseDate}
          vendor={localExpense.vendor || ''}
        />
      )}
    </Dialog>
  );
};

export default UnifiedExpenseModal;
