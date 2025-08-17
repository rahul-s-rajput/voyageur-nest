import type { ExpenseFormData } from '../components/PropertyManagement/UnifiedExpenseModal';

export interface ValidationError {
  field: string;
  message: string;
  type: 'error' | 'warning';
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

interface LineItem {
  description: string;
  quantity?: number;
  unit_amount?: number;
  tax_amount?: number;
  line_total?: number;
}

interface ExpenseShare {
  propertyId: string;
  sharePercent?: number;
  shareAmount?: number;
}

export class ExpenseValidator {
  
  /**
   * Validate basic form data fields
   */
  static validateFormData(formData: ExpenseFormData): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    // Required field validation
    if (!formData.expenseDate || formData.expenseDate.trim() === '') {
      errors.push({
        field: 'expenseDate',
        message: 'Expense date is required',
        type: 'error'
      });
    }

    if (!formData.amount || formData.amount <= 0) {
      errors.push({
        field: 'amount',
        message: 'Amount must be greater than ₹0',
        type: 'error'
      });
    }

    // Amount validation
    if (formData.amount && formData.amount > 1000000) {
      warnings.push({
        field: 'amount',
        message: 'Large expense amount - please verify',
        type: 'warning'
      });
    }

    // Date validation
    if (formData.expenseDate) {
      const expenseDate = new Date(formData.expenseDate);
      const today = new Date();
      const futureLimit = new Date();
      futureLimit.setDate(today.getDate() + 30);
      
      if (expenseDate > futureLimit) {
        errors.push({
          field: 'expenseDate',
          message: 'Expense date cannot be more than 30 days in the future',
          type: 'error'
        });
      }
      
      const pastLimit = new Date();
      pastLimit.setFullYear(today.getFullYear() - 2);
      
      if (expenseDate < pastLimit) {
        warnings.push({
          field: 'expenseDate',
          message: 'Expense date is more than 2 years old',
          type: 'warning'
        });
      }
    }

    // Category validation
    if (!formData.categoryId) {
      warnings.push({
        field: 'categoryId',
        message: 'Consider selecting a category for better reporting',
        type: 'warning'
      });
    }

    // Vendor validation
    if (!formData.vendor || formData.vendor.trim() === '') {
      warnings.push({
        field: 'vendor',
        message: 'Vendor information helps with expense tracking',
        type: 'warning'
      });
    }

    // Payment method validation
    if (!formData.paymentMethod || formData.paymentMethod.trim() === '') {
      warnings.push({
        field: 'paymentMethod',
        message: 'Payment method helps with financial reconciliation',
        type: 'warning'
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate line items against total amount
   */
  static validateLineItems(lineItems: LineItem[], totalAmount: number): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    if (lineItems.length === 0) {
      return { isValid: true, errors, warnings };
    }

    // Calculate total from line items
    const lineItemsTotal = lineItems.reduce((sum, item) => {
      return sum + (typeof item.line_total === 'number' ? item.line_total : 0);
    }, 0);

    // Check if totals match
    const difference = Math.abs(lineItemsTotal - totalAmount);
    if (difference > 0.01) {
      errors.push({
        field: 'lineItems',
        message: `Item breakdown total (₹${lineItemsTotal.toFixed(2)}) must equal expense amount (₹${totalAmount.toFixed(2)})`,
        type: 'error'
      });
    }

    // Validate individual line items
    lineItems.forEach((item, index) => {
      if (!item.description || item.description.trim() === '') {
        errors.push({
          field: `lineItem_${index}_description`,
          message: `Item ${index + 1}: Description is required`,
          type: 'error'
        });
      }

      if (item.quantity !== undefined && item.quantity <= 0) {
        errors.push({
          field: `lineItem_${index}_quantity`,
          message: `Item ${index + 1}: Quantity must be greater than 0`,
          type: 'error'
        });
      }

      if (item.unit_amount !== undefined && item.unit_amount < 0) {
        errors.push({
          field: `lineItem_${index}_unit_amount`,
          message: `Item ${index + 1}: Unit amount cannot be negative`,
          type: 'error'
        });
      }

      if (item.tax_amount !== undefined && item.tax_amount < 0) {
        errors.push({
          field: `lineItem_${index}_tax_amount`,
          message: `Item ${index + 1}: Tax amount cannot be negative`,
          type: 'error'
        });
      }

      if (item.line_total !== undefined && item.line_total <= 0) {
        errors.push({
          field: `lineItem_${index}_line_total`,
          message: `Item ${index + 1}: Total cost must be greater than 0`,
          type: 'error'
        });
      }

      // Validate calculation consistency
      if (item.quantity && item.unit_amount && item.line_total) {
        const calculatedTotal = item.quantity * item.unit_amount + (item.tax_amount || 0);
        if (Math.abs(calculatedTotal - item.line_total) > 0.01) {
          warnings.push({
            field: `lineItem_${index}_calculation`,
            message: `Item ${index + 1}: Calculated total (₹${calculatedTotal.toFixed(2)}) doesn't match the entered total`,
            type: 'warning'
          });
        }
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate expense shares allocation
   */
  static validateExpenseShares(
    shares: ExpenseShare[], 
    totalAmount: number, 
    mode: 'percentage' | 'amount'
  ): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    if (shares.length === 0) {
      return { isValid: true, errors, warnings };
    }

    if (mode === 'percentage') {
      const totalPercent = shares.reduce((sum, share) => sum + (share.sharePercent || 0), 0);
      
      if (Math.abs(totalPercent - 100) > 0.01) {
        errors.push({
          field: 'shares_percentage',
          message: `Total percentage (${totalPercent.toFixed(1)}%) must equal 100%`,
          type: 'error'
        });
      }

      // Validate individual percentages
      shares.forEach((share, index) => {
        // Allow 0% shares - only validate if sharePercent is defined and negative
        if (share.sharePercent !== undefined && share.sharePercent < 0) {
          errors.push({
            field: `share_${index}_percent`,
            message: `Property ${index + 1}: Share percentage cannot be negative`,
            type: 'error'
          });
        }

        if (share.sharePercent && share.sharePercent > 100) {
          errors.push({
            field: `share_${index}_percent`,
            message: `Property ${index + 1}: Share percentage cannot exceed 100%`,
            type: 'error'
          });
        }
      });
    } else {
      const totalAmount_shares = shares.reduce((sum, share) => sum + (share.shareAmount || 0), 0);
      
      if (Math.abs(totalAmount_shares - totalAmount) > 0.01) {
        errors.push({
          field: 'shares_amount',
          message: `Total share amount (₹${totalAmount_shares.toFixed(2)}) must equal expense amount (₹${totalAmount.toFixed(2)})`,
          type: 'error'
        });
      }

      // Validate individual amounts
      shares.forEach((share, index) => {
        // Allow ₹0 shares - only validate if shareAmount is defined and negative
        if (share.shareAmount !== undefined && share.shareAmount < 0) {
          errors.push({
            field: `share_${index}_amount`,
            message: `Property ${index + 1}: Share amount cannot be negative`,
            type: 'error'
          });
        }

        if (share.shareAmount && share.shareAmount > totalAmount) {
          errors.push({
            field: `share_${index}_amount`,
            message: `Property ${index + 1}: Share amount cannot exceed total expense amount`,
            type: 'error'
          });
        }
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate receipt file
   */
  static validateReceiptFile(file: File | null): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    if (!file) {
      warnings.push({
        field: 'receiptFile',
        message: 'Adding a receipt helps with expense verification',
        type: 'warning'
      });
      return { isValid: true, errors, warnings };
    }

    // File size validation (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      errors.push({
        field: 'receiptFile',
        message: 'Receipt file size must be less than 10MB',
        type: 'error'
      });
    }

    // File type validation
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      errors.push({
        field: 'receiptFile',
        message: 'Receipt must be a JPG, PNG, or PDF file',
        type: 'error'
      });
    }

    // Large file warning
    const warningSize = 5 * 1024 * 1024; // 5MB
    if (file.size > warningSize) {
      warnings.push({
        field: 'receiptFile',
        message: 'Large file size may slow down upload and processing',
        type: 'warning'
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Comprehensive validation for the entire expense
   */
  static validateCompleteExpense(
    formData: ExpenseFormData,
    lineItems: LineItem[],
    shares: ExpenseShare[] = [],
    shareMode: 'percentage' | 'amount' = 'percentage'
  ): ValidationResult {
    const formValidation = this.validateFormData(formData);
    const lineItemsValidation = this.validateLineItems(lineItems, formData.amount);
    const sharesValidation = this.validateExpenseShares(shares, formData.amount, shareMode);
    const receiptValidation = this.validateReceiptFile(formData.receiptFile || null);

    const allErrors = [
      ...formValidation.errors,
      ...lineItemsValidation.errors,
      ...sharesValidation.errors,
      ...receiptValidation.errors
    ];

    const allWarnings = [
      ...formValidation.warnings,
      ...lineItemsValidation.warnings,
      ...sharesValidation.warnings,
      ...receiptValidation.warnings
    ];

    return {
      isValid: allErrors.length === 0,
      errors: allErrors,
      warnings: allWarnings
    };
  }

  /**
   * Get validation summary for display
   */
  static getValidationSummary(result: ValidationResult): string {
    if (result.isValid && result.warnings.length === 0) {
      return 'All fields are valid';
    }

    if (!result.isValid) {
      const errorCount = result.errors.length;
      return `${errorCount} error${errorCount > 1 ? 's' : ''} found`;
    }

    if (result.warnings.length > 0) {
      const warningCount = result.warnings.length;
      return `${warningCount} warning${warningCount > 1 ? 's' : ''} found`;
    }

    return 'Validation complete';
  }
}

export default ExpenseValidator;
