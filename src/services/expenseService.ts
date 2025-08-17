import { supabase } from '../lib/supabase';
import type { Expense, ExpenseApprovalStatus, ExpenseBudget, ExpenseCategory, ExpenseReport, ExpenseReportCategoryTotal } from '../types/expenses';
import { notificationService } from './notificationService';

export class ExpenseService {
  // Storage helper for receipts (UI may also upload directly)
  static async uploadReceipt(propertyId: string, file: File): Promise<{ path: string }> {
    const { supabase } = await import('../lib/supabase');
    const allowed = ['image/jpeg','image/png','image/webp','application/pdf'];
    if (!allowed.includes(file.type)) throw new Error('Only images (jpeg/png/webp) or PDF allowed');
    if (file.size > 10 * 1024 * 1024) throw new Error('File too large (max 10MB)');
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const ext = file.name.split('.').pop() || 'bin';
    const id = (globalThis.crypto && 'randomUUID' in globalThis.crypto) ? (globalThis.crypto as any).randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const path = `receipts/${propertyId}/${y}-${m}/${id}.${ext}`;
    const { error } = await supabase.storage.from('receipts').upload(path.replace('receipts/',''), file, { cacheControl: '3600', upsert: false });
    if (error) throw error;
    return { path: path.replace('receipts/','') };
  }
  // Categories
  static async listAvailableCategories(propertyId: string): Promise<ExpenseCategory[]> {
    const { data, error } = await supabase
      .from('expense_categories')
      .select('*')
      .or(`property_id.is.null,property_id.eq.${propertyId}`)
      .order('name');
    if (error) throw error;
    return (data || []).map(ExpenseService.transformCategoryFromDB);
  }

  static async createCategoryTemplate(name: string, description?: string): Promise<ExpenseCategory> {
    const { data, error } = await supabase
      .from('expense_categories')
      .insert({ property_id: null, name, description: description || null })
      .select('*')
      .single();
    if (error) throw error;
    return ExpenseService.transformCategoryFromDB(data);
  }

  static async deleteCategory(id: string): Promise<void> {
    const { error } = await supabase
      .from('expense_categories')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }

  static async countExpensesForCategory(categoryId: string): Promise<number> {
    const { count, error } = await supabase
      .from('expenses')
      .select('id', { count: 'exact', head: true })
      .eq('category_id', categoryId);
    if (error) throw error;
    return count || 0;
  }

  static async createPropertyCategory(propertyId: string, name: string, description?: string): Promise<ExpenseCategory> {
    const { data, error } = await supabase
      .from('expense_categories')
      .insert({ property_id: propertyId, name, description: description || null })
      .select('*')
      .single();
    if (error) throw error;
    return ExpenseService.transformCategoryFromDB(data);
  }

  static async updateCategory(id: string, updates: Partial<ExpenseCategory>): Promise<ExpenseCategory> {
    const payload: any = {};
    if (updates.name !== undefined) payload.name = updates.name;
    if (updates.description !== undefined) payload.description = updates.description;
    if ((updates as any).isActive !== undefined) payload.is_active = (updates as any).isActive;
    const { data, error } = await supabase
      .from('expense_categories')
      .update(payload)
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;
    return ExpenseService.transformCategoryFromDB(data);
  }

  // Expenses
  static async listExpenses(params: {
    propertyId: string;
    from?: string;
    to?: string;
    toExclusive?: string;
    categoryId?: string;
    approval?: ExpenseApprovalStatus;
    vendor?: string;
  }): Promise<Expense[]> {
    let query = supabase
      .from('expenses')
      .select('*')
      .eq('property_id', params.propertyId);

    if (params.from) query = query.gte('expense_date', params.from);
    if (params.toExclusive) query = query.lt('expense_date', params.toExclusive);
    else if (params.to) query = query.lte('expense_date', params.to);
    if (params.categoryId) query = query.eq('category_id', params.categoryId);
    if (params.approval) query = query.eq('approval_status', params.approval);
    if (params.vendor) query = query.ilike('vendor', `%${params.vendor}%`);

    const { data, error } = await query.order('expense_date', { ascending: false });
    if (error) throw error;
    return (data || []).map(ExpenseService.transformExpenseFromDB);
  }

  static async createExpense(input: Omit<Expense, 'id' | 'createdAt' | 'updatedAt' | 'receiptUrl' | 'approvalStatus'> & { approvalStatus?: ExpenseApprovalStatus }): Promise<Expense> {
    const payload: any = {
      property_id: input.propertyId,
      category_id: input.categoryId || null,
      expense_date: input.expenseDate,
      amount: input.amount,
      currency: input.currency || 'INR',
      payment_method: input.paymentMethod || null,
      vendor: input.vendor || null,
      notes: input.notes || null,
      receipt_path: input.receiptPath || null,
      approval_status: input.approvalStatus || 'pending',
      approved_by: input.approvedBy || null,
      created_by: input.createdBy || null,
    };
    const { data, error } = await supabase
      .from('expenses')
      .insert(payload)
      .select('*')
      .single();
    if (error) throw error;
    return ExpenseService.transformExpenseFromDB(data);
  }

  static async updateExpense(id: string, updates: Partial<Expense>): Promise<Expense> {
    // Load current row to determine if approval should be reset
    const { data: currentRow, error: loadErr } = await supabase
      .from('expenses')
      .select('*')
      .eq('id', id)
      .single();
    if (loadErr) throw loadErr;

    const payload: any = {};
    if (updates.categoryId !== undefined) payload.category_id = updates.categoryId;
    if (updates.expenseDate !== undefined) payload.expense_date = updates.expenseDate;
    if (updates.amount !== undefined) payload.amount = updates.amount;
    if (updates.currency !== undefined) payload.currency = updates.currency;
    if (updates.paymentMethod !== undefined) payload.payment_method = updates.paymentMethod;
    if (updates.vendor !== undefined) payload.vendor = updates.vendor;
    if (updates.notes !== undefined) payload.notes = updates.notes;
    if (updates.receiptPath !== undefined) payload.receipt_path = updates.receiptPath;
    if ((updates as any).approvalStatus !== undefined) payload.approval_status = (updates as any).approvalStatus;
    if ((updates as any).approvedBy !== undefined) payload.approved_by = (updates as any).approvedBy;
    if ((updates as any).approvalNotes !== undefined) payload.approval_notes = (updates as any).approvalNotes;
    if ((updates as any).approvedAt !== undefined) payload.approved_at = (updates as any).approvedAt;

    // If the current expense is approved and a substantive field is being changed, require re-approval
    const approvedNow = (currentRow?.approval_status === 'approved');
    const substantiveChange = (
      updates.categoryId !== undefined ||
      updates.expenseDate !== undefined ||
      updates.amount !== undefined ||
      updates.currency !== undefined ||
      updates.paymentMethod !== undefined ||
      updates.vendor !== undefined ||
      updates.notes !== undefined ||
      updates.receiptPath !== undefined
    );
    const isExplicitApprovalChange = (updates as any).approvalStatus !== undefined;
    if (approvedNow && substantiveChange && !isExplicitApprovalChange) {
      payload.approval_status = 'pending';
      payload.approved_by = null;
      payload.approval_notes = null;
      payload.approved_at = null;
    }
    const { data, error } = await supabase
      .from('expenses')
      .update(payload)
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;
    return ExpenseService.transformExpenseFromDB(data);
  }

  static async deleteExpense(id: string): Promise<void> {
    const { error } = await supabase
      .from('expenses')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }

  // Line items (optional persistence)
  static async saveLineItems(expenseId: string, items: Array<{ description: string; quantity?: number; unit_amount?: number; tax_amount?: number; line_total?: number }>): Promise<void> {
    // First, delete existing line items for this expense
    const { error: deleteError } = await supabase
      .from('expense_line_items')
      .delete()
      .eq('expense_id', expenseId);
    
    if (deleteError) throw deleteError;
    
    // Then insert new line items (if any)
    if (Array.isArray(items) && items.length > 0) {
      const payload = items.map(i => ({
        expense_id: expenseId,
        description: i.description,
        quantity: i.quantity ?? 1,
        unit_amount: i.unit_amount ?? 0,
        tax_amount: i.tax_amount ?? null,
        line_total: typeof i.line_total === 'number' ? i.line_total : ((i.quantity ?? 1) * (i.unit_amount ?? 0)),
      }));
      
      const { error: insertError } = await supabase
        .from('expense_line_items')
        .insert(payload);
        
      if (insertError) throw insertError;
    }
  }

  static async getLineItems(expenseId: string): Promise<Array<{ description: string; quantity?: number; unit_amount?: number; tax_amount?: number; line_total?: number }>> {
    const { data, error } = await supabase
      .from('expense_line_items')
      .select('*')
      .eq('expense_id', expenseId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return (data || []).map((row: any) => ({
      description: row.description,
      quantity: row.quantity ?? undefined,
      unit_amount: row.unit_amount ?? undefined,
      tax_amount: row.tax_amount ?? undefined,
      line_total: row.line_total ?? undefined,
    }));
  }

  static async replaceLineItems(expenseId: string, items: Array<{ description: string; quantity?: number; unit_amount?: number; tax_amount?: number; line_total?: number }>): Promise<void> {
    await supabase.from('expense_line_items').delete().eq('expense_id', expenseId);
    if (items.length) await this.saveLineItems(expenseId, items);
  }

  static async setApproval(id: string, status: Extract<ExpenseApprovalStatus, 'approved' | 'rejected'>, approvedBy: string, notes?: string): Promise<Expense> {
    const { data, error } = await supabase
      .from('expenses')
      .update({ approval_status: status, approved_by: approvedBy, approval_notes: notes || null, approved_at: new Date().toISOString() })
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;
    // Fire a notification via service (do not await; avoid blocking the response)
    try {
      const row = data as any;
      void notificationService.sendEvent({
        propertyId: row.property_id,
        type: 'update' as any,
        title: status === 'approved' ? 'Expense approved' : 'Expense rejected',
        message: `${row.expense_date} • ₹${Number(row.amount).toFixed(2)} ${row.currency || 'INR'}${row.vendor ? ' • ' + row.vendor : ''}`,
        priority: status === 'approved' ? 'low' : 'medium',
        data: { expenseId: row.id, status }
      }).catch(()=>{});
    } catch {}
    return ExpenseService.transformExpenseFromDB(data);
  }

  // Budgets
  static async getBudgets(propertyId: string, fromMonth?: string, toMonth?: string): Promise<ExpenseBudget[]> {
    let query = supabase
      .from('expense_budgets')
      .select('*')
      .eq('property_id', propertyId);
    if (fromMonth) query = query.gte('month', fromMonth);
    if (toMonth) query = query.lte('month', toMonth);
    const { data, error } = await query.order('month', { ascending: true });
    if (error) throw error;
    return (data || []).map(ExpenseService.transformBudgetFromDB);
  }

  static async upsertBudget(input: Omit<ExpenseBudget, 'id' | 'createdAt' | 'updatedAt'>): Promise<ExpenseBudget> {
    const payload = {
      property_id: input.propertyId,
      category_id: input.categoryId,
      month: input.month,
      budget_amount: input.budgetAmount,
      currency: input.currency || 'INR',
      notes: input.notes || null,
    };
    const { data, error } = await supabase
      .from('expense_budgets')
      .upsert(payload, { onConflict: 'property_id,category_id,month' })
      .select('*')
      .single();
    if (error) throw error;
    return ExpenseService.transformBudgetFromDB(data);
  }

  static async deleteBudget(budgetId: string): Promise<void> {
    const { error } = await supabase
      .from('expense_budgets')
      .delete()
      .eq('id', budgetId);
    if (error) throw error;
  }

  // Reporting
  static async getMonthlyReport(propertyId: string, month: string): Promise<ExpenseReport> {
    // Expect month as YYYY-MM
    const start = `${month}-01`;
    const end = new Date(new Date(start).getFullYear(), new Date(start).getMonth() + 1, 0)
      .toISOString()
      .slice(0, 10);

    const expenses = await ExpenseService.listExpenses({ propertyId, from: start, to: end });
    const totalsMap = new Map<string | null, number>();
    // Adjust for shared expenses using expense_shares table
    for (const e of expenses) {
      let weight = 1;
      let amountOverride: number | null = null;
      try {
        const { data: shares } = await supabase
          .from('expense_shares')
          .select('property_id, share_percent, share_amount')
          .eq('expense_id', e.id);
        if (shares && shares.length > 0) {
          const matching = shares.find((s: any) => s.property_id === propertyId);
          if (matching) {
            if (matching.share_amount != null) {
              amountOverride = Number(matching.share_amount || 0);
            } else {
              weight = Math.max(0, Math.min(1, Number(matching.share_percent || 0) / 100));
            }
          }
          else weight = 0; // if shares exist but none for this property, treat as 0
        }
      } catch {}
      const key = e.categoryId || null;
      const contribution = amountOverride != null ? amountOverride : (e.amount || 0) * weight;
      totalsMap.set(key, (totalsMap.get(key) || 0) + contribution);
    }

    const budgets = await ExpenseService.getBudgets(propertyId, start, start);
    const budgetMap = new Map<string, number>();
    budgets.forEach(b => budgetMap.set(b.categoryId, b.budgetAmount));

    const totalsByCategory: ExpenseReportCategoryTotal[] = [];
    let totalExpenses = 0;
    let totalBudget = 0;
    for (const [categoryId, total] of totalsMap.entries()) {
      totalExpenses += total;
      const budgetAmount = categoryId ? budgetMap.get(categoryId) : undefined;
      if (budgetAmount) totalBudget += budgetAmount;
      totalsByCategory.push({ categoryId, categoryName: '', total, budgetAmount });
    }

    return { month, totalsByCategory, totalExpenses, totalBudget };
  }

  // Transforms
  private static transformCategoryFromDB(row: any): ExpenseCategory {
    return {
      id: row.id,
      propertyId: row.property_id ?? null,
      name: row.name,
      description: row.description ?? null,
      isActive: !!row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private static transformExpenseFromDB(row: any): Expense {
    return {
      id: row.id,
      propertyId: row.property_id,
      categoryId: row.category_id ?? null,
      expenseDate: row.expense_date,
      amount: Number(row.amount),
      currency: row.currency || 'INR',
      paymentMethod: row.payment_method ?? null,
      vendor: row.vendor ?? null,
      notes: row.notes ?? null,
      receiptUrl: row.receipt_url ?? null,
      receiptPath: row.receipt_path ?? null,
      approvalStatus: row.approval_status,
      approvedBy: row.approved_by ?? null,
      approvalNotes: row.approval_notes ?? null,
      approvedAt: row.approved_at ?? null,
      createdBy: row.created_by ?? null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private static transformBudgetFromDB(row: any): ExpenseBudget {
    return {
      id: row.id,
      propertyId: row.property_id,
      categoryId: row.category_id,
      month: row.month,
      budgetAmount: Number(row.budget_amount),
      currency: row.currency || 'INR',
      notes: row.notes ?? null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  // Expense shares management
  static async getExpenseShares(expenseId: string): Promise<Array<{ propertyId: string; sharePercent?: number; shareAmount?: number }>> {
    console.log('[ExpenseService.getExpenseShares] Called with expenseId:', expenseId);
    
    const { data, error } = await supabase
      .from('expense_shares')
      .select('property_id, share_percent, share_amount')
      .eq('expense_id', expenseId);
    
    if (error) {
      console.error('[ExpenseService.getExpenseShares] Query error:', error);
      throw error;
    }
    
    console.log('[ExpenseService.getExpenseShares] Raw DB data:', data);
    
    const result = (data || []).map((row: any) => ({
      propertyId: row.property_id,
      sharePercent: row.share_percent != null ? Number(row.share_percent) : undefined,
      shareAmount: row.share_amount != null ? Number(row.share_amount) : undefined
    }));
    
    console.log('[ExpenseService.getExpenseShares] Mapped result:', result);
    return result;
  }

  static async saveExpenseShares(expenseId: string, shares: Array<{ propertyId: string; sharePercent?: number; shareAmount?: number }>): Promise<void> {
    console.log('[ExpenseService.saveExpenseShares] Called with:', { expenseId, shares });
    
    // Delete existing shares
    const { error: deleteError } = await supabase
      .from('expense_shares')
      .delete()
      .eq('expense_id', expenseId);
    
    if (deleteError) {
      console.error('[ExpenseService.saveExpenseShares] Delete error:', deleteError);
      throw deleteError;
    }
    console.log('[ExpenseService.saveExpenseShares] Deleted existing shares');

    // Insert new shares (including 0% shares for tracking purposes)
    const validShares = shares.filter(share => 
      (share.sharePercent != null && share.sharePercent >= 0) || 
      (share.shareAmount != null && share.shareAmount >= 0)
    );
    
    console.log('[ExpenseService.saveExpenseShares] Filtered validShares:', validShares);

    if (validShares.length > 0) {
      const payload = validShares.map(share => ({
        expense_id: expenseId,
        property_id: share.propertyId,
        share_percent: share.sharePercent ?? null,
        share_amount: share.shareAmount ?? null
      }));
      
      console.log('[ExpenseService.saveExpenseShares] Insert payload:', payload);

      const { error: insertError } = await supabase
        .from('expense_shares')
        .insert(payload);
      
      if (insertError) {
        console.error('[ExpenseService.saveExpenseShares] Insert error:', insertError);
        throw insertError;
      }
      console.log('[ExpenseService.saveExpenseShares] Successfully inserted shares');
    } else {
      console.log('[ExpenseService.saveExpenseShares] No valid shares to insert');
    }
  }
}

export default ExpenseService;



