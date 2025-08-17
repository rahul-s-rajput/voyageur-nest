export interface ExpenseCategory {
  id: string;
  propertyId: string | null; // null means global template
  name: string;
  description?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type ExpenseApprovalStatus = 'pending' | 'approved' | 'rejected';

export interface Expense {
  id: string;
  propertyId: string;
  categoryId?: string | null;
  expenseDate: string; // ISO date YYYY-MM-DD
  amount: number;
  currency: string;
  paymentMethod?: string | null;
  vendor?: string | null;
  notes?: string | null;
  receiptUrl?: string | null;
  receiptPath?: string | null;
  approvalStatus: ExpenseApprovalStatus;
  approvedBy?: string | null;
  approvalNotes?: string | null;
  approvedAt?: string | null;
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ExpenseBudget {
  id: string;
  propertyId: string;
  categoryId: string;
  month: string; // YYYY-MM-01
  budgetAmount: number;
  currency: string;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ExpenseReportCategoryTotal {
  categoryId: string | null;
  categoryName: string;
  total: number;
  budgetAmount?: number;
}

export interface ExpenseReport {
  month: string; // YYYY-MM
  totalsByCategory: ExpenseReportCategoryTotal[];
  totalExpenses: number;
  totalBudget?: number;
}




