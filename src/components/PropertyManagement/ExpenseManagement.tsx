import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Calendar } from 'primereact/calendar';
import { FloatLabel } from 'primereact/floatlabel';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/Select';
import { Card, CardContent, CardHeader } from '../ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/Table';
import { Badge } from '../ui/Badge';

import { ExpenseTableSkeleton, ChartSkeleton } from '../ui/SkeletonLoader';
import { useProperty } from '../../contexts/PropertyContext';
import UnifiedExpenseModal from './UnifiedExpenseModal';
import ExpenseService from '../../services/expenseService';
import type { Expense, ExpenseApprovalStatus, ExpenseBudget, ExpenseCategory } from '../../types/expenses';
import { PlusIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { toast } from 'react-hot-toast';

import ConfirmDialog from '../ConfirmDialog';
import { useBreakpoint } from '../../hooks/useWindowSize';

// Budgets Panel (function declaration to allow use before definition)
function BudgetsPanel({ categories, budgets, onChanged }: { categories: ExpenseCategory[]; budgets: ExpenseBudget[]; onChanged: () => void }) {
  const { currentProperty } = useProperty();
  const [month, setMonth] = useState<string>('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [amount, setAmount] = useState<number>(0);
  const [currency, setCurrency] = useState<string>('INR');
  const [notes, setNotes] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [editingBudgetId, setEditingBudgetId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState<number>(0);
  const [editCurrency, setEditCurrency] = useState<string>('INR');
  const [editNotes, setEditNotes] = useState<string>('');

  const submit = async () => {
    if (!currentProperty?.id || !month || !categoryId || !amount) return;
    try {
      setSaving(true);
      const m = `${month}-01`;
      await ExpenseService.upsertBudget({ propertyId: currentProperty.id, categoryId, month: m, budgetAmount: amount, currency, notes } as any);
      setMonth(''); setCategoryId(''); setAmount(0); setNotes('');
      onChanged();
    } catch (e) {
      console.error(e);
      toast.error('Failed to save budget');
    } finally {
      setSaving(false);
    }
  };

  const deleteBudget = async (bid: string) => {
    if (!confirm('Delete this budget?')) return;
    try {
      await ExpenseService.deleteBudget(bid);
      onChanged();
    } catch (e) {
      console.error(e);
      toast.error('Failed to delete budget');
    }
  };

  const startEdit = (b: ExpenseBudget) => {
    setEditingBudgetId(b.id);
    setEditAmount(b.budgetAmount);
    setEditCurrency(b.currency || 'INR');
    setEditNotes(b.notes || '');
  };

  const saveEdit = async (b: ExpenseBudget) => {
    if (!currentProperty?.id) return;
    try {
      setSaving(true);
      await ExpenseService.upsertBudget({
        propertyId: currentProperty.id,
        categoryId: b.categoryId,
        month: b.month,
        budgetAmount: editAmount,
        currency: editCurrency,
        notes: editNotes
      } as any);
      setEditingBudgetId(null);
      onChanged();
    } catch (e) {
      console.error(e);
      toast.error('Failed to update budget');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-4">
          <Input type="month" value={month} onChange={e=>setMonth(e.target.value)} />
          <Select value={categoryId} onValueChange={setCategoryId}>
            <SelectTrigger>
              <SelectValue placeholder="Select Category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map(c=> (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input type="number" placeholder="Budget Amount" value={amount} onChange={e=>setAmount(parseFloat(e.target.value||'0'))} />
          <Input type="text" value={currency} onChange={e=>setCurrency(e.target.value)} />
          <Input placeholder="Notes (optional)" value={notes} onChange={e=>setNotes(e.target.value)} />
        </div>
        <div className="flex justify-end">
          <Button disabled={saving} onClick={submit} size="sm">Save Budget</Button>
        </div>
        <div className="mt-6">
          <h5 className="font-semibold mb-2">Existing Budgets</h5>
          <div className="divide-y">
            {budgets.length===0 && <div className="text-gray-500 text-sm">No budgets</div>}
            {budgets.map(b => (
              <BudgetRow key={`${b.categoryId}-${b.month}-${b.id}`} b={b} categories={categories} onSave={saveEdit} onDelete={deleteBudget} onStartEdit={startEdit} editingId={editingBudgetId} editAmount={editAmount} setEditAmount={setEditAmount} editCurrency={editCurrency} setEditCurrency={setEditCurrency} editNotes={editNotes} setEditNotes={setEditNotes} />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Categories Panel (function declaration)
function CategoriesPanel({ propertyId, categories, onChanged }: { propertyId: string; categories: ExpenseCategory[]; onChanged: () => void }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState<string>('');
  const [editDesc, setEditDesc] = useState<string>('');

  const create = async () => {
    if (!name.trim()) return;
    try {
      setSaving(true);
      await ExpenseService.createPropertyCategory(propertyId, name.trim(), description.trim() || undefined);
      setName(''); setDescription('');
      onChanged();
    } catch (e) {
      console.error(e);
      toast.error('Failed to create category');
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (c: ExpenseCategory) => {
    setEditingId(c.id);
    setEditName(c.name);
    setEditDesc(c.description || '');
  };

  const saveEdit = async () => {
    if (!editingId || !editName.trim()) return;
    try {
      setSaving(true);
      await ExpenseService.updateCategory(editingId, { name: editName.trim(), description: editDesc });
      setEditingId(null);
      onChanged();
    } catch (e) {
      console.error(e);
      toast.error('Failed to update category');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (c: ExpenseCategory) => {
    try {
      if (!c.propertyId) {
        toast.error('Edit/deactivate global templates in the Templates tab');
        return;
      }
      await ExpenseService.updateCategory(c.id, { ...(c as any), isActive: !c.isActive } as any);
      onChanged();
    } catch (e) {
      console.error(e);
      toast.error('Failed to update');
    }
  };

  const deleteCategory = async (c: ExpenseCategory) => {
    try {
      if (!c.propertyId) {
        toast.error('Cannot delete global templates here');
        return;
      }
      const usage = await ExpenseService.countExpensesForCategory(c.id);
      if (usage > 0) {
        toast.error(`Category is in use by ${usage} expense(s). Deactivate instead.`);
        return;
      }
      if (!confirm(`Delete category "${c.name}"? This cannot be undone.`)) return;
      await ExpenseService.deleteCategory(c.id);
      onChanged();
    } catch (e) {
      console.error(e);
      toast.error('Failed to delete category');
    }
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex gap-2 mb-4">
          <Input placeholder="Category name" value={name} onChange={e=>setName(e.target.value)} />
          <Input placeholder="Description (optional)" className="flex-1" value={description} onChange={e=>setDescription(e.target.value)} />
          <Button disabled={saving} onClick={create} size="sm" variant="default">Add</Button>
        </div>
      <div className="divide-y">
        {categories.map(c => (
          <div key={c.id} className="py-2 text-sm grid grid-cols-12 items-center gap-2">
            <div className="col-span-7">
              {editingId === c.id ? (
                <div className="flex items-center gap-2">
                  <input className="px-2 py-1 border rounded w-40" value={editName} onChange={e=>setEditName(e.target.value)} />
                  <input className="px-2 py-1 border rounded flex-1" value={editDesc} onChange={e=>setEditDesc(e.target.value)} />
                </div>
              ) : (
                <div>
                  {c.propertyId ? '' : <span className="mr-2 inline-block text-xs px-2 py-0.5 rounded bg-purple-100 text-purple-700">Global</span>}
                  <span className="font-medium">{c.name}</span>{c.description ? ` — ${c.description}`:''}
                </div>
              )}
            </div>
            <div className="col-span-3">
              <span className={`px-2 py-1 rounded ${c.isActive? 'bg-green-100 text-green-700':'bg-gray-100 text-gray-600'}`}>{c.isActive? 'Active':'Inactive'}</span>
            </div>
            <div className="col-span-2 text-right space-x-2">
              {editingId === c.id ? (
                <>
                  <Button onClick={saveEdit} size="sm" variant="outline">Save</Button>
                  <Button onClick={()=>setEditingId(null)} size="sm" variant="ghost">Cancel</Button>
                </>
              ) : (
                <>
                  <Button disabled={!c.propertyId} title={!c.propertyId ? 'Edit global in Templates tab' : 'Edit'} onClick={()=>c.propertyId && startEdit(c)} size="sm" variant="outline">Edit</Button>
                  <Button disabled={!c.propertyId} title={!c.propertyId ? 'Toggle global in Templates tab' : (c.isActive? 'Deactivate':'Activate')} onClick={()=>c.propertyId && toggleActive(c)} size="sm" variant="outline">{c.isActive? 'Deactivate':'Activate'}</Button>
                  <Button disabled={!c.propertyId} title={!c.propertyId ? 'Delete in Templates tab' : 'Delete'} onClick={()=>c.propertyId && deleteCategory(c)} size="sm" variant="destructive">Delete</Button>
                </>
              )}
            </div>
          </div>
        ))}
        </div>
      </CardContent>
    </Card>
  );
}

type ViewMode = 'list' | 'reports' | 'budgets' | 'categories' | 'templates';

const ExpenseManagement: React.FC = () => {
  const { currentProperty, properties } = useProperty();
  const { isMobile } = useBreakpoint();
  const [actionsMenuOpen, setActionsMenuOpen] = useState(false);
  const actionsMenuRef = useRef<HTMLDivElement | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [templates, setTemplates] = useState<ExpenseCategory[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [budgets, setBudgets] = useState<ExpenseBudget[]>([]);
  const [loading, setLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(true);
  // Date helpers for ISO <-> Date
  const isoToDate = (s?: string | null): Date | null => {
    if (!s) return null;
    const [y, m, d] = s.split('-').map(n => parseInt(n, 10));
    if (!y || !m || !d) return null;
    return new Date(y, m - 1, d);
  };
  const dateToISO = (dt?: Date | null): string => {
    if (!dt) return '';
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, '0');
    const d = String(dt.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };
  const getRangeControlValue = (from?: string, to?: string): (Date | null)[] | null => {
    const startDate = isoToDate(from || '');
    const endDate = isoToDate(to || '');
    if (!startDate && !endDate) return null;
    return [startDate ?? null, endDate ?? null];
  };

  // Keep the left panel month stable to avoid unintended shifts when clicking in the right month
  const startOfMonth = (d: Date): Date => new Date(d.getFullYear(), d.getMonth(), 1);
  const todayStartOfMonth = startOfMonth(new Date());
  const [filterViewDate, setFilterViewDate] = useState<Date>(todayStartOfMonth);
  const [compareViewDate, setCompareViewDate] = useState<Date>(todayStartOfMonth);


  // viewDate is updated on selection and when navigating via calendar controls

  // Action-specific loaders (moved to UnifiedExpenseModal)
  
  // Unified Modal State
  const [unifiedModalOpen, setUnifiedModalOpen] = useState(false);
  const [unifiedModalExpense, setUnifiedModalExpense] = useState<Expense | null>(null);
  const [unifiedModalMode, setUnifiedModalMode] = useState<'create' | 'edit' | 'view'>('create');
  const [unifiedModalInitialTab, setUnifiedModalInitialTab] = useState<'details' | 'receipt' | 'shares' | 'approval'>('details');
  const MODAL_PERSIST_KEY = 'unified_expense_modal_persist';

  // computeItemsSum function moved to UnifiedExpenseModal

  const [filters, setFilters] = useState<{
    from?: string;
    to?: string;
    categoryId?: string;
    approval?: ExpenseApprovalStatus | '';
    vendor?: string;
  }>({});

  const loadAll = async () => {
    if (!currentProperty?.id) return;
    try {
      setLoading(true);
      const [cats, exps, buds] = await Promise.all([
        ExpenseService.listAvailableCategories(currentProperty.id),
        ExpenseService.listExpenses({ propertyId: currentProperty.id, ...filters, approval: (filters.approval || undefined) as any }),
        ExpenseService.getBudgets(currentProperty.id)
      ]);
      setCategories(cats);
      setTemplates(cats.filter(c => !c.propertyId));
      setExpenses(exps);
      setBudgets(buds);
    } catch (e) {
      console.error(e);
      toast.error('Failed to load expenses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
    validateAdmin();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentProperty?.id]);

  const handleFilterChange = (partial: Partial<typeof filters>) => {
    setFilters(prev => ({ ...prev, ...partial }));
  };

  const applyFilters = async () => {
    if (!currentProperty?.id) return;
    try {
      setLoading(true);
      // eslint-disable-next-line no-console
      console.log('[ExpenseManagement] applyFilters()', { propertyId: currentProperty.id, filters });
      const exps = await ExpenseService.listExpenses({ propertyId: currentProperty.id, ...filters, approval: (filters.approval || undefined) as any });
      setExpenses(exps);
      try {
        const counts = exps.reduce((acc: any, e) => { acc[e.approvalStatus] = (acc[e.approvalStatus]||0)+1; return acc; }, {});
        // eslint-disable-next-line no-console
        console.log('[ExpenseManagement] applyFilters:loaded', { total: exps.length, counts, ids: exps.map(e=>({id:e.id,status:e.approvalStatus})) });
      } catch {}
    } catch (e) {
      console.error(e);
      toast.error('Failed to filter expenses');
    } finally {
      setLoading(false);
    }
  };

  const totals = useMemo(() => {
    const total = expenses.reduce((s, e) => s + (e.amount || 0), 0);
    return { total };
  }, [expenses]);

  // Category suggestions based on vendor, line items, and AI hint (unused - moved to UnifiedExpenseModal)
  // This function is kept for potential future use but is no longer actively called

  // Admin validation via device token (matches AdminAuth)
  const validateAdmin = async () => { setIsAdmin(true); };

  // New Expense Modal State - MIGRATED TO UNIFIED MODAL
  // const [showNewExpense, setShowNewExpense] = useState(false); // REMOVED - using UnifiedExpenseModal
  // Old newExpense state variables - REMOVED, functionality moved to UnifiedExpenseModal
  // const [newExpense, setNewExpense] = useState(...); // REMOVED
  // const [extraction, setExtraction] = useState(...); // REMOVED  
  // const [lineItems, setLineItems] = useState(...); // REMOVED
  // const [categorySuggestions, setCategorySuggestions] = useState(...); // REMOVED
  // const [newCategoryName, setNewCategoryName] = useState(...); // REMOVED
  const [reportMonth, setReportMonth] = useState<string>(() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    return `${yyyy}-${mm}`;
  });
  const [reportData, setReportData] = useState<{
    items: Array<{ categoryId: string | null; categoryName: string; actual: number; budget: number }>
    totalActual: number;
    totalBudget: number;
  }>({ items: [], totalActual: 0, totalBudget: 0 });
  const [trendData, setTrendData] = useState<Array<{ name: string; Actual: number; Budget: number }>>([]);
  const [aggregateOthers, setAggregateOthers] = useState<boolean>(true);
  const [chartTopN, setChartTopN] = useState<number>(8);
  const budgetChartRef = useRef<HTMLDivElement | null>(null);
  const categoryChartRef = useRef<HTMLDivElement | null>(null);
  const trendChartRef = useRef<HTMLDivElement | null>(null);
  const compareChartRef = useRef<HTMLDivElement | null>(null);
  const [comparePropertyIds, setComparePropertyIds] = useState<string[]>([]);
  const [compareFrom, setCompareFrom] = useState<string>('');
  const [compareTo, setCompareTo] = useState<string>('');
  const [compareData, setCompareData] = useState<Array<{ name: string; Actual: number; Budget: number }>>([]);
  const [seasonFilter, setSeasonFilter] = useState<'all' | 'Peak' | 'Moderate' | 'Low'>('all');
  const seasonOfMonth = (m: number): 'Peak' | 'Moderate' | 'Low' => {
    // Manali seasons per story: Peak (May-Jun, Oct-Nov), Moderate (Mar-Apr, Sep, Dec), Low (Jan-Feb, Jul-Aug)
    if ([5,6,10,11].includes(m)) return 'Peak';
    if ([3,4,9,12].includes(m)) return 'Moderate';
    return 'Low';
  };

  // Expense details drawer/modal state - MIGRATED TO UNIFIED MODAL
  // const [detailsOpen, setDetailsOpen] = useState(false); // REMOVED - using UnifiedExpenseModal
  // const [detailsExpense, setDetailsExpense] = useState<Expense | null>(null); // REMOVED
  // const [detailsItems, setDetailsItems] = useState<ReceiptExtractionLineItem[]>([]); // REMOVED
  // const [detailsReceiptUrl, setDetailsReceiptUrl] = useState<string | null>(null); // REMOVED
  // Old expense details and shares state moved to UnifiedExpenseModal
  // Approval dialog state
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [approveDialogStatus] = useState<'approved' | 'rejected'>('approved');
  const [approveDialogNotes, setApproveDialogNotes] = useState('');
  const [approveTargetId, setApproveTargetId] = useState<string | null>(null);

  // recalcAutoShare function moved to ExpenseSharesTab component

  const openDetails = async (exp: Expense) => {
    // Use unified modal instead of details drawer
    openUnifiedModal(exp, 'view');
  };

  // onNewExpenseChange function moved to UnifiedExpenseModal

  // uploadReceiptIfAny function moved to UnifiedExpenseModal

  // submitNewExpense function moved to UnifiedExpenseModal

  const approveExpense = async (id: string, status: 'approved'|'rejected', notesOverride?: string) => {
    if (!isAdmin) {
      toast.error('Admin required for approvals');
      return;
    }
    try {
      // eslint-disable-next-line no-console
      console.log('[ExpenseManagement] approveExpense:click', { id, status });
      // Processing approval state removed - functionality moved to UnifiedExpenseModal
      const notes = notesOverride || '';
      const token = (localStorage.getItem('admin_device_token') || localStorage.getItem('auth_token') || '') as string;
      // eslint-disable-next-line no-console
      console.log('[ExpenseManagement] approveExpense:calling service', { id, status, notes });
      const updated = await ExpenseService.setApproval(id, status, token, notes);
      // eslint-disable-next-line no-console
      console.log('[ExpenseManagement] approveExpense:service returned', { id: updated?.id, status: updated?.approvalStatus });
      // Optimistic local update to prevent stale UI until refetch completes
      setExpenses(prev => {
        const next = prev.map(e => e.id === id ? { ...e, approvalStatus: status, approvedAt: new Date().toISOString(), approvedBy: (localStorage.getItem('admin_device_token')||'') as string, approvalNotes: notes } : e);
        // eslint-disable-next-line no-console
        console.log('[ExpenseManagement] approveExpense:optimistic merge', {
          before: prev.find(x=>x.id===id)?.approvalStatus,
          after: next.find(x=>x.id===id)?.approvalStatus
        });
        return next;
      });
      // Details drawer functionality moved to UnifiedExpenseModal
      toast.success(`Marked as ${status}`);
      // Background refresh to ensure filters/derived state are consistent
      // eslint-disable-next-line no-console
      console.log('[ExpenseManagement] approveExpense:applyFilters start');
      // Slight delay to allow replication/state settle if needed
      setTimeout(async () => {
        await applyFilters();
        // eslint-disable-next-line no-console
        console.log('[ExpenseManagement] approveExpense:applyFilters done');
      }, 50);
    } catch (e) {
      console.error(e);
      toast.error('Failed to update approval');
    } finally {
      // Processing approval state removed - functionality moved to UnifiedExpenseModal
    }
  };

  // Receipt preview modal state
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [receiptSignedUrl, setReceiptSignedUrl] = useState<string | null>(null);
  // Confirm dialog state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTitle] = useState('Confirm');
  const [confirmMsg] = useState<string>('');
  const confirmActionRef = useRef<null | (() => Promise<void> | void)>(null);
  // Old expense modal functions moved to UnifiedExpenseModal

  const openNewExpenseModal = () => {
    // Use unified modal instead of old modal
    openUnifiedModal(null, 'create');
  };

  // closeNewExpenseModal function moved to UnifiedExpenseModal

  // Unified Modal Helpers
  const openUnifiedModal = (expense: Expense | null, mode: 'create' | 'edit' | 'view', initialTab: 'details' | 'receipt' | 'shares' | 'approval' = 'details') => {
    setUnifiedModalExpense(expense);
    setUnifiedModalMode(mode);
    setUnifiedModalInitialTab(initialTab);
    setUnifiedModalOpen(true);
  };

  const closeUnifiedModal = () => {
    setUnifiedModalOpen(false);
    setUnifiedModalExpense(null);
    setUnifiedModalMode('create');
    setUnifiedModalInitialTab('details');
    try { localStorage.removeItem(MODAL_PERSIST_KEY); } catch {}
  };

  // Restore unified modal state on mount (short TTL) - create mode only
  useEffect(() => {
    try {
      const raw = localStorage.getItem(MODAL_PERSIST_KEY);
      if (!raw) return;
      const data = JSON.parse(raw) as { isOpen?: boolean; mode?: string; activeTab?: string; ts?: number };
      const TTL_MS = 10 * 60 * 1000; // 10 minutes
      if (!data || !data.isOpen) return;
      if (typeof data.ts === 'number' && Date.now() - data.ts > TTL_MS) {
        localStorage.removeItem(MODAL_PERSIST_KEY);
        return;
      }
      if (data.mode === 'create') {
        const allowedTabs = new Set(['details','receipt','shares','approval']);
        const tab = (allowedTabs.has(String(data.activeTab)) ? (data.activeTab as 'details'|'receipt'|'shares'|'approval') : 'details');
        openUnifiedModal(null, 'create', tab);
      }
    } catch {}
    // run only once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // addCategory function moved to UnifiedExpenseModal


  // viewReceipt function moved to UnifiedExpenseModal

  // Export CSV of current list
  const exportCSV = () => {
    const headers = ['Property','Date','Amount','Currency','Category','Vendor','Payment Method','Notes','Approval','Approved At','Approved By','Approval Notes'];
    const rows = expenses.map(e => [
      (properties?.find(p=>p.id===e.propertyId)?.name) || e.propertyId?.slice(0,6) || '',
      e.expenseDate,
      e.amount,
      e.currency,
      categories.find(c=>c.id===e.categoryId)?.name || '',
      e.vendor || '',
      e.paymentMethod || '',
      (e.notes || '').replace(/\n/g,' ').replace(/\r/g,' '),
      e.approvalStatus,
      e.approvedAt || '',
      e.approvedBy || '',
      (e.approvalNotes || '').replace(/\n/g,' ').replace(/\r/g,' ')
    ]);
    const csv = [headers, ...rows]
      .map(r => r.map(v => {
        const s = String(v ?? '');
        return /[",\n]/.test(s) ? '"' + s.replace(/"/g,'""') + '"' : s;
      }).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `expenses_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Export approvals log
  const exportApprovalsCSV = () => {
    const headers = ['Property','Date','Amount','Currency','Category','Vendor','Approved At','Approved By','Approval Notes','Status'];
    const approved = expenses.filter(e => e.approvalStatus !== 'pending');
    const rows = approved.map(e => [
      (properties?.find(p=>p.id===e.propertyId)?.name) || e.propertyId?.slice(0,6) || '',
      e.expenseDate,
      e.amount,
      e.currency,
      categories.find(c=>c.id===e.categoryId)?.name || '',
      e.vendor || '',
      e.approvedAt || '',
      e.approvedBy || '',
      (e.approvalNotes || '').replace(/\n/g,' ').replace(/\r/g,' '),
      e.approvalStatus
    ]);
    const csv = [headers, ...rows]
      .map(r => r.map(v => {
        const s = String(v ?? '');
        return /[",\n]/.test(s) ? '"' + s.replace(/"/g,'""') + '"' : s;
      }).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `expense_approvals_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Helpers for charts data/exports
  const computeCategoryChartData = () => {
    const sorted = [...reportData.items].sort((a,b) => b.actual - a.actual);
    const top = sorted.slice(0, chartTopN);
    if (!aggregateOthers || sorted.length <= chartTopN) {
      return top.map(r => ({ name: r.categoryName, Actual: r.actual, Budget: r.budget }));
    }
    const others = sorted.slice(chartTopN);
    const otherActual = others.reduce((s, r) => s + r.actual, 0);
    const otherBudget = others.reduce((s, r) => s + r.budget, 0);
    return [...top.map(r => ({ name: r.categoryName, Actual: r.actual, Budget: r.budget })), { name: 'Others', Actual: otherActual, Budget: otherBudget }];
  };

  const downloadChartPNG = (ref: React.RefObject<HTMLDivElement>, filename: string) => {
    try {
      const el = ref.current;
      if (!el) return;
      const svg = el.querySelector('svg');
      if (!svg) return;
      const xml = new XMLSerializer().serializeToString(svg);
      const svgBlob = new Blob([xml], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = (svg as any).clientWidth || 800;
        canvas.height = (svg as any).clientHeight || 300;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0,0,canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        canvas.toBlob((blob) => {
          if (!blob) return;
          const a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = filename;
          a.click();
        });
        URL.revokeObjectURL(url);
      };
      img.src = url;
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Failed to export chart', e);
    }
  };

  const exportCategoriesCSV = () => {
    const rows = computeCategoryChartData();
    const headers = ['Category','Actual','Budget'];
    const csv = [headers, ...rows.map(r => [r.name, r.Actual, r.Budget])].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `categories_${reportMonth}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportTrendCSV = () => {
    const headers = ['Month','Actual','Budget'];
    const csv = [headers, ...trendData.map(r => [r.name, r.Actual, r.Budget])].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trend_${reportMonth}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Load report data for selected month
  const loadReportData = async () => {
    if (!currentProperty?.id || !reportMonth) return;
    const pad = (n: number) => String(n).padStart(2, '0');
    const start = `${reportMonth}-01`;
    const [yr, mo] = reportMonth.split('-').map(v => parseInt(v, 10));
    const nextMonthStr = mo === 12 ? `${yr + 1}-01` : `${yr}-${pad(mo + 1)}`;
    try {
      setLoading(true);
      // Always compute month client-side for robustness
      const ym = reportMonth; // 'YYYY-MM'
      const debug = (import.meta.env.VITE_EXPENSES_DEBUG || '').toString().toLowerCase() === 'true';
      if (debug) {
        // eslint-disable-next-line no-console
        console.log('[ExpenseReports] loadReportData month', reportMonth, { start, nextMonthStr, ym });
      }
      const all = await ExpenseService.listExpenses({ propertyId: currentProperty.id });
      if (debug) {
        // eslint-disable-next-line no-console
        console.log('[ExpenseReports] all count', all.length, 'sample', all.slice(0, 5).map(e => ({ d: e.expenseDate, amt: e.amount, cat: e.categoryId, status: e.approvalStatus })));
      }
      let exps = all.filter(e => (e.expenseDate || '').startsWith(ym));
      if (seasonFilter !== 'all') {
        exps = exps.filter(e => seasonOfMonth(new Date(e.expenseDate).getMonth() + 1) === seasonFilter);
      }
      if (debug) {
        // eslint-disable-next-line no-console
        console.log('[ExpenseReports] filtered count', exps.length, exps.map(e => ({ d: e.expenseDate, amt: e.amount, cat: e.categoryId, status: e.approvalStatus })));
      }
      // Group by categoryId (only approved and pending? clarify). We'll include approved and pending, exclude rejected by default.
      const map = new Map<string | null, number>();
      exps
        .filter(e => e.approvalStatus !== 'rejected')
        .forEach(e => {
          const key = e.categoryId || null;
          const amt = typeof e.amount === 'number' ? e.amount : parseFloat(String(e.amount || 0));
          map.set(key, (map.get(key) || 0) + (isFinite(amt) ? amt : 0));
        });
      if (debug) {
        const grouped = Array.from(map.entries()).map(([k, v]) => ({ categoryId: k, actual: v }));
        // eslint-disable-next-line no-console
        console.log('[ExpenseReports] grouped', grouped);
      }
      // Budgets for this month
      const monthKey = `${reportMonth}-01`;
      const budgetMap = new Map<string, number>();
      budgets.filter(b => b.month === monthKey).forEach(b => budgetMap.set(b.categoryId, b.budgetAmount));
      let totalActual = 0; let totalBudget = 0;
      const items: Array<{ categoryId: string | null; categoryName: string; actual: number; budget: number }> = [];
      const getName = (id: string | null) => (id ? (categories.find(c => c.id === id)?.name || 'Unknown') : 'Uncategorized');
      map.forEach((actual, key) => {
        totalActual += actual;
        const budget = key ? (budgetMap.get(key) || 0) : 0;
        totalBudget += budget;
        items.push({ categoryId: key, categoryName: getName(key), actual, budget });
      });
      // Include budget-only categories not present in actuals
      budgets.filter(b => b.month === monthKey).forEach(b => {
        if (!items.some(i => i.categoryId === b.categoryId)) {
          totalBudget += b.budgetAmount;
          items.push({ categoryId: b.categoryId, categoryName: getName(b.categoryId), actual: 0, budget: b.budgetAmount });
        }
      });
      items.sort((a,b) => b.actual - a.actual);
      setReportData({ items, totalActual, totalBudget });
      // Build 6-month trend using all expenses and all budgets
      const months: string[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const ym2 = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        months.push(ym2);
      }
      const trend: Array<{ name: string; Actual: number; Budget: number }> = months.map(mo2 => {
        let monthExps = all.filter(e => (e.expenseDate || '').startsWith(mo2)).filter(e => e.approvalStatus !== 'rejected');
        if (seasonFilter !== 'all') monthExps = monthExps.filter(e => seasonOfMonth(new Date(e.expenseDate).getMonth() + 1) === seasonFilter);
        const a = monthExps.reduce((s, e) => s + (typeof e.amount === 'number' ? e.amount : parseFloat(String(e.amount || 0))), 0);
        const bsum = budgets.filter(b => b.month === `${mo2}-01`).reduce((s, b) => s + (b.budgetAmount || 0), 0);
        return { name: mo2, Actual: a, Budget: bsum };
      });
      setTrendData(trend);

      // Cross-property comparison for selected properties (default to both, excluding current if none selected yet)
      let ids = comparePropertyIds;
      if (!ids.length && properties && properties.length > 1) {
        ids = properties.map(p => p.id);
        setComparePropertyIds(ids);
      }
      if (ids.length) {
        const comp = await Promise.all(ids.map(async (pid) => {
          const allP = await ExpenseService.listExpenses({ propertyId: pid });
          // Determine filter range
          const start = compareFrom && compareFrom.length ? compareFrom : `${ym}-01`;
          const endExclusive = (() => {
            if (compareTo && compareTo.length) {
              // add one day for exclusive end compare
              const d = new Date(compareTo);
              d.setDate(d.getDate() + 1);
              return d.toISOString().slice(0,10);
            }
            // next month first day
            const [y, m] = ym.split('-').map(n=>parseInt(n,10));
            const nm = m === 12 ? `${y+1}-01` : `${y}-${String(m+1).padStart(2,'0')}`;
            return `${nm}-01`;
          })();
          const inRange = (dateStr: string) => dateStr >= start && dateStr < endExclusive;
          const actual = allP
            .filter(e => !!e.expenseDate && inRange(e.expenseDate))
            .filter(e => e.approvalStatus !== 'rejected')
            .reduce((s, e) => s + (typeof e.amount === 'number' ? e.amount : parseFloat(String(e.amount || 0))), 0);

          // Budgets across range
          const buds = await ExpenseService.getBudgets(pid);
          const monthsBetween = (() => {
            const months: string[] = [];
            const startD = new Date(start);
            const endD = new Date(endExclusive);
            // iterate first day of month until endExclusive (exclusive)
            const cur = new Date(Date.UTC(startD.getUTCFullYear(), startD.getUTCMonth(), 1));
            while (cur < endD) {
              months.push(`${cur.getUTCFullYear()}-${String(cur.getUTCMonth()+1).padStart(2,'0')}-01`);
              cur.setUTCMonth(cur.getUTCMonth() + 1);
            }
            return months;
          })();
          const monthSet = new Set(monthsBetween);
          const budget = buds
            .filter(b => monthSet.has(b.month))
            .reduce((s, b) => s + (b.budgetAmount || 0), 0);

          const name = (properties?.find(p => p.id === pid)?.name) || pid.slice(0,6);
          return { name, Actual: actual, Budget: budget };
        }));
        setCompareData(comp);
      } else {
        setCompareData([]);
      }
      if (debug) {
        // eslint-disable-next-line no-console
        console.log('[ExpenseReports] totals', { totalActual, totalBudget, items });
      }
    } catch (e) {
      console.error(e);
      toast.error('Failed to load report');
    } finally {
      setLoading(false);
    }
  };

  // Auto-load when entering Reports tab or month changes
  useEffect(() => {
    if (viewMode === 'reports') {
      loadReportData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode, reportMonth, currentProperty?.id]);

  return (
    <div className="space-y-6 touch-manipulation">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold text-gray-900">Expense Management</h3>
          <p className="text-gray-600 text-sm">Track expenses, approvals, budgets and reports</p>
        </div>
        <div className="flex items-center gap-2 relative" ref={actionsMenuRef}>
          {!isMobile && (
            <>
              <Button onClick={loadAll} size="sm">
                <ArrowPathIcon className="h-4 w-4 mr-2" /> Refresh
              </Button>
              <Button onClick={() => exportCSV()} size="sm" variant="secondary">Export CSV</Button>
              <Button onClick={() => exportApprovalsCSV()} size="sm" variant="secondary">Export Approvals Log</Button>
              <Button onClick={openNewExpenseModal} size="sm">
                <PlusIcon className="h-4 w-4 mr-2" /> New Expense
              </Button>
            </>
          )}
          {isMobile && (
            <>
              <Button onClick={loadAll} size="sm" aria-label="Refresh">
                <ArrowPathIcon className="h-4 w-4" />
              </Button>
              <Button onClick={() => setActionsMenuOpen(v=>!v)} size="sm" variant="outline">
                Actions
              </Button>
              {actionsMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-48 rounded-md border bg-white shadow-lg z-10" role="menu">
                  <button onClick={() => { setActionsMenuOpen(false); exportCSV(); }} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50">Export CSV</button>
                  <button onClick={() => { setActionsMenuOpen(false); exportApprovalsCSV(); }} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50">Export Approvals Log</button>
                  <button onClick={() => { setActionsMenuOpen(false); openNewExpenseModal(); }} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50">New Expense</button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Mode Tabs */}
      <div className="flex gap-2 overflow-x-auto whitespace-nowrap">
        {(['list','reports','budgets','categories','templates'] as ViewMode[]).map(m => (
          <Button 
            key={m} 
            onClick={() => setViewMode(m)}
            size="sm"
            variant={viewMode === m ? "default" : "ghost"}
            className="shrink-0"
          >
            {m.charAt(0).toUpperCase() + m.slice(1)}
          </Button>
        ))}
      </div>

      {/* Filters */}
      {viewMode==='list' && (
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-3 md:flex-nowrap">
            <div className="w-full md:w-auto">
              <FloatLabel className="block">
                <Calendar
                  inputId="filter-range"
                  value={getRangeControlValue(filters.from, filters.to) as any}
                  onChange={(e: any) => {
                    const v = e.value;
                    if (Array.isArray(v)) {
                      const [start, end] = v as [Date | null, Date | null];
                      handleFilterChange({ from: start ? dateToISO(start) : undefined, to: end ? dateToISO(end) : undefined });
                      if (start) setFilterViewDate(startOfMonth(start));
                    } else if (v instanceof Date) {
                      // In range mode, PrimeReact should provide an array; if a single Date is received, treat it as start only
                      handleFilterChange({ from: dateToISO(v), to: undefined });
                      setFilterViewDate(startOfMonth(v));
                    } else {
                      handleFilterChange({ from: undefined, to: undefined });
                      setFilterViewDate(todayStartOfMonth);
                    }
                  }}
                  selectionMode="range"
                  numberOfMonths={isMobile ? 1 : 2}
                  viewDate={filterViewDate}
                  onViewDateChange={(e:any)=> setFilterViewDate(startOfMonth(e.value))}
                  readOnlyInput
                  touchUI={isMobile}
                  dateFormat="yy-mm-dd"
                  className=""
                  inputClassName="h-10"
                  style={{ width: isMobile ? '100%' : '280px' }}
                  inputStyle={{ width: isMobile ? '100%' : '280px' }}
                />
                <label htmlFor="filter-range">Date Range</label>
              </FloatLabel>
            </div>
            <Select value={filters.categoryId || 'all'} onValueChange={(value) => handleFilterChange({ categoryId: value === 'all' ? undefined : value })}>
              <SelectTrigger className="h-10 md:w-56 w-full">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.propertyId ? '' : '[Global] '}{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filters.approval || 'any'} onValueChange={(value) => handleFilterChange({ approval: value === 'any' ? '' : (value as ExpenseApprovalStatus) })}>
              <SelectTrigger className="h-10 md:w-56 w-full">
                <SelectValue placeholder="Any Approval" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any Approval</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
            <Input placeholder="Vendor" className="h-10 w-full md:w-56" value={filters.vendor || ''} onChange={e=>handleFilterChange({ vendor: e.target.value })} />
            <Button onClick={applyFilters} className="h-10 w-full md:w-auto">Apply</Button>
          </div>
        </div>
      )}

      {/* Old Expense Details Drawer - REMOVED: Now using UnifiedExpenseModal */}
      {/* Content */}
      {viewMode==='list' && (
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">{expenses.length} expenses</div>
              <div className="text-sm font-medium">Total: ₹{totals.total.toFixed(2)}</div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {loading && <ExpenseTableSkeleton rows={6} />}
            {!loading && expenses.length === 0 && (
              <div className="p-6 text-center text-gray-500">No expenses found</div>
            )}
            {!loading && expenses.length > 0 && (
              <div className="overflow-x-auto -mx-2 px-2 md:mx-0 md:px-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Expense Details</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                  {expenses.map(e => (
                    <TableRow key={e.id} className="cursor-pointer hover:bg-gray-50" onClick={() => openDetails(e)}>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium">₹{e.amount.toFixed(2)} <span className="text-gray-500 text-sm">{e.currency}</span></div>
                          <div className="text-sm text-gray-600">{e.expenseDate} • {categories.find(c=>c.id===e.categoryId)?.name || 'Uncategorized'} {e.vendor? `• ${e.vendor}`:''}</div>
                          {e.approvalStatus !== 'pending' && (
                            <div className="text-xs text-gray-500">
                              {e.approvedAt ? `Approved on ${e.approvedAt.slice(0,10)}` : 'Approval updated'}{e.approvedBy ? ` • by ${String(e.approvedBy).slice(0,8)}…` : ''}
                              {e.approvalNotes ? <span className="ml-2 italic text-gray-600 truncate inline-block max-w-[320px]">"{e.approvalNotes}"</span> : null}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={
                            e.approvalStatus === 'approved' ? 'success' : 
                            e.approvalStatus === 'rejected' ? 'destructive' : 
                            'pending'
                          }
                        >
                          {e.approvalStatus}
                        </Badge>
                      </TableCell>
                      {/* Actions column removed - click row to open expense modal */}
                    </TableRow>
                  ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {viewMode==='reports' && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-700">Month</label>
                <Input type="month" value={reportMonth} onChange={e=>setReportMonth(e.target.value)} className="w-auto" />
                <Button onClick={loadReportData} disabled={loading} size="sm">
                  {loading && <span className="inline-block animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></span>}
                  Load
                </Button>
              <Select value={seasonFilter} onValueChange={(value) => setSeasonFilter(value as any)}>
                <SelectTrigger className="ml-2 w-auto text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Seasons</SelectItem>
                  <SelectItem value="Peak">Peak</SelectItem>
                  <SelectItem value="Moderate">Moderate</SelectItem>
                  <SelectItem value="Low">Low</SelectItem>
                </SelectContent>
              </Select>
              <label className="ml-2 text-sm text-gray-700 flex items-center gap-2">
                <input type="checkbox" className="h-4 w-4" onChange={e=>{
                  const includeRejected = e.target.checked;
                  // Recompute locally without another fetch
                  const ym = reportMonth;
                  let filtered = expenses.filter(x => (x.expenseDate || '').startsWith(ym));
                  if (seasonFilter !== 'all') {
                    filtered = filtered.filter(x => seasonOfMonth(new Date(x.expenseDate).getMonth() + 1) === seasonFilter);
                  }
                  const map = new Map<string | null, number>();
                  filtered
                    .filter(x => includeRejected ? true : x.approvalStatus !== 'rejected')
                    .forEach(x => {
                      const key = x.categoryId || null;
                      const amt = typeof x.amount === 'number' ? x.amount : parseFloat(String(x.amount || 0));
                      map.set(key, (map.get(key) || 0) + (isFinite(amt) ? amt : 0));
                    });
                  const monthKey = `${reportMonth}-01`;
                  const budgetMap = new Map<string, number>();
                  budgets.filter(b => b.month === monthKey).forEach(b => budgetMap.set(b.categoryId, b.budgetAmount));
                  let totalActual = 0; let totalBudget = 0;
                  const items: Array<{ categoryId: string | null; categoryName: string; actual: number; budget: number }> = [];
                  const getName = (id: string | null) => (id ? (categories.find(c => c.id === id)?.name || 'Unknown') : 'Uncategorized');
                  map.forEach((actual, key) => {
                    totalActual += actual;
                    const budget = key ? (budgetMap.get(key) || 0) : 0;
                    totalBudget += budget;
                    items.push({ categoryId: key, categoryName: getName(key), actual, budget });
                  });
                  budgets.filter(b => b.month === monthKey).forEach(b => {
                    if (!items.some(i => i.categoryId === b.categoryId)) {
                      totalBudget += b.budgetAmount;
                      items.push({ categoryId: b.categoryId, categoryName: getName(b.categoryId), actual: 0, budget: b.budgetAmount });
                    }
                  });
                  items.sort((a,b) => b.actual - a.actual);
                  setReportData({ items, totalActual, totalBudget });
                }} />
                Include rejected
              </label>
              <label className="ml-4 text-sm text-gray-700 flex items-center gap-2">
                <input type="checkbox" className="h-4 w-4" checked={aggregateOthers} onChange={e=>setAggregateOthers(e.target.checked)} />
                Aggregate others
              </label>
              <label className="ml-2 text-sm text-gray-700 flex items-center gap-2">
                Top N
                <input type="number" className="w-16 px-2 py-1 border rounded" min={3} max={20} value={chartTopN} onChange={e=>setChartTopN(Math.max(3, Math.min(20, parseInt(e.target.value||'8',10))))} />
              </label>
            </div>
            <div className="text-sm text-gray-600">Total Actual: ₹{reportData.totalActual.toFixed(2)} • Total Budget: ₹{reportData.totalBudget.toFixed(2)}</div>
          </div>
          {/* KPI Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            {(() => {
              const actual = reportData.totalActual;
              const budget = reportData.totalBudget;
              const remaining = budget - actual; // positive = remaining, negative = over
              const utilization = budget > 0 ? actual / budget : 0;
              return (
                <>
                  <div className="rounded-lg border bg-white p-4">
                    <div className="text-xs text-gray-600">Actual Spend</div>
                    <div className="text-2xl font-semibold">₹{actual.toFixed(2)}</div>
                  </div>
                  <div className="rounded-lg border bg-white p-4">
                    <div className="text-xs text-gray-600">Budget</div>
                    <div className="text-2xl font-semibold">₹{budget.toFixed(2)}</div>
                  </div>
                  <div className="rounded-lg border bg-white p-4">
                    <div className="text-xs text-gray-600">{remaining >= 0 ? 'Remaining Budget' : 'Over Budget'}</div>
                    <div className={`text-2xl font-semibold ${remaining<0?'text-red-600':remaining>0?'text-green-700':'text-gray-900'}`}>₹{Math.abs(remaining).toFixed(2)}</div>
                  </div>
                  <div className="rounded-lg border bg-white p-4">
                    <div className="text-xs text-gray-600">Utilization</div>
                    <div className={`text-2xl font-semibold ${utilization>1?'text-red-600':utilization>0.8?'text-yellow-700':'text-green-700'}`}>{(utilization*100).toFixed(0)}%</div>
                  </div>
                </>
              );
            })()}
          </div>

          {/* Table */}
          <div className="rounded-lg border overflow-x-auto max-h-[420px] overflow-y-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr className="text-left text-gray-600 border-b">
                  <th className="py-2 pr-4 sticky top-0 bg-gray-50 z-10">Category</th>
                  <th className="py-2 pr-4 text-right sticky top-0 bg-gray-50 z-10">Actual</th>
                  <th className="py-2 pr-4 text-right sticky top-0 bg-gray-50 z-10">Budget</th>
                  <th className="py-2 pr-4 text-right sticky top-0 bg-gray-50 z-10">Variance</th>
                  <th className="py-2 pr-4 text-right sticky top-0 bg-gray-50 z-10">Utilization</th>
                </tr>
              </thead>
              <tbody>
                {reportData.items.map((row, i) => {
                  const utilization = row.budget > 0 ? (row.actual / row.budget) : 0;
                  const color = utilization > 1 ? 'text-red-600' : utilization > 0.8 ? 'text-yellow-700' : 'text-green-700';
                  const variance = row.actual - row.budget;
                  const vColor = variance > 0 ? 'text-red-600' : variance < 0 ? 'text-green-700' : 'text-gray-700';
                  return (
                    <tr key={i} className="border-b last:border-b-0 odd:bg-gray-50">
                      <td className="py-2 pr-4">{row.categoryName}</td>
                      <td className="py-2 pr-4 text-right">₹{row.actual.toFixed(2)}</td>
                      <td className="py-2 pr-4 text-right">₹{row.budget.toFixed(2)}</td>
                      <td className={`py-2 pr-4 text-right ${vColor}`}>₹{variance.toFixed(2)}</td>
                      <td className={`py-2 pr-4 text-right ${color}`}>{(utilization*100).toFixed(0)}%</td>
                    </tr>
                  );
                })}
                {reportData.items.length === 0 && (
                  <tr>
                    <td className="py-4 text-gray-500" colSpan={5}>No data for this month.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Charts */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            {loading ? (
              <>
                <div className="border rounded-lg p-4 bg-white">
                  <ChartSkeleton height="300px" />
                </div>
                <div className="border rounded-lg p-4 bg-white">
                  <ChartSkeleton height="300px" />
                </div>
              </>
            ) : (
              <>
                {/* Budget vs Actual (Recharts) */}
                <div className="border rounded-lg p-4 bg-white" ref={budgetChartRef}>
                  <div className="text-sm font-semibold mb-3 flex items-center justify-between">
                    <span>Total Budget vs Actual</span>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center text-xs text-gray-600"><span className="inline-block w-3 h-3 rounded-sm mr-1" style={{background:'#22c55e'}}></span>Actual</span>
                      <span className="inline-flex items-center text-xs text-gray-600"><span className="inline-block w-3 h-3 rounded-sm mr-1" style={{background:'#3b82f6'}}></span>Budget</span>
                      <button className="px-2 py-1 text-xs rounded border hover:bg-gray-50" onClick={()=>downloadChartPNG(budgetChartRef, 'total.png')}>PNG</button>
                    </div>
                  </div>
                  <div className="h-64 md:h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={[{ name: 'This Month', Budget: reportData.totalBudget, Actual: reportData.totalActual }]} margin={{ top: 8, right: 16, left: 8, bottom: 24 }}> 
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="Actual" fill="#22c55e" />
                        <Bar dataKey="Budget" fill="#3b82f6" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Category Breakdown (Recharts) */}
                <div className="border rounded-lg p-4 bg-white" ref={categoryChartRef}>
                  <div className="text-sm font-semibold mb-3 flex items-center justify-between">
                    <span>Category Breakdown (Actual vs Budget)</span>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center text-xs text-gray-600"><span className="inline-block w-3 h-3 rounded-sm mr-1" style={{background:'#6366f1'}}></span>Actual</span>
                      <span className="inline-flex items-center text-xs text-gray-600"><span className="inline-block w-3 h-3 rounded-sm mr-1" style={{background:'#3b82f6'}}></span>Budget</span>
                      <button className="px-2 py-1 text-xs rounded border hover:bg-gray-50" onClick={()=>exportCategoriesCSV()}>CSV</button>
                      <button className="px-2 py-1 text-xs rounded border hover:bg-gray-50" onClick={()=>downloadChartPNG(categoryChartRef, 'categories.png')}>PNG</button>
                    </div>
                  </div>
                  <div className="h-64 md:h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={computeCategoryChartData()} margin={{ top: 8, right: 16, left: 8, bottom: 24 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" hide={false} tick={{ fontSize: 10 }} interval={0} angle={-15} textAnchor="end" height={50} tickMargin={12} />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="Actual" fill="#6366f1" />
                        <Bar dataKey="Budget" fill="#3b82f6" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Trend last 6 months */}
          <div className="mt-6 border rounded-lg p-4 bg-white" ref={trendChartRef}>
            <div className="text-sm font-semibold mb-3 flex items-center justify-between">
              <span>6‑Month Trend</span>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center text-xs text-gray-600"><span className="inline-block w-3 h-3 rounded-sm mr-1" style={{background:'#22c55e'}}></span>Actual</span>
                <span className="inline-flex items-center text-xs text-gray-600"><span className="inline-block w-3 h-3 rounded-sm mr-1" style={{background:'#3b82f6'}}></span>Budget</span>
                <button className="px-2 py-1 text-xs rounded border hover:bg-gray-50" onClick={()=>exportTrendCSV()}>CSV</button>
                <button className="px-2 py-1 text-xs rounded border hover:bg-gray-50" onClick={()=>downloadChartPNG(trendChartRef, 'trend.png')}>PNG</button>
              </div>
            </div>
            <div className="h-64 md:h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData} margin={{ top: 8, right: 16, left: 8, bottom: 24 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="Actual" stroke="#22c55e" strokeWidth={2} />
                  <Line type="monotone" dataKey="Budget" stroke="#3b82f6" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Cross-Property Comparison */}
          {properties && properties.length > 1 && (
            <div className="mt-6 border rounded-lg p-4 bg-white" ref={compareChartRef}>
              <div className="text-sm font-semibold mb-3 flex items-center justify-between">
                <span>Cross‑Property Comparison</span>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center text-xs text-gray-600"><span className="inline-block w-3 h-3 rounded-sm mr-1" style={{background:'#22c55e'}}></span>Actual</span>
                  <span className="inline-flex items-center text-xs text-gray-600"><span className="inline-block w-3 h-3 rounded-sm mr-1" style={{background:'#3b82f6'}}></span>Budget</span>
                  <button className="px-2 py-1 text-xs rounded border hover:bg-gray-50" onClick={()=>downloadChartPNG(compareChartRef, 'compare.png')}>PNG</button>
                </div>
              </div>
              <div className="mb-3 flex flex-wrap gap-2 items-center">
                <span className="text-xs text-gray-500 mr-2">Select properties:</span>
                <button className="px-2 py-1 text-xs rounded border hover:bg-gray-50" onClick={()=>{ const ids = (properties||[]).map(p=>p.id); setComparePropertyIds(ids); loadReportData(); }}>All</button>
                <button className="px-2 py-1 text-xs rounded border hover:bg-gray-50" onClick={()=>{ setComparePropertyIds([]); setCompareData([]); }}>None</button>
                {properties.map(p => (
                  <label key={p.id} className="text-xs text-gray-700 flex items-center gap-1">
                    <input type="checkbox" className="h-3 w-3" checked={comparePropertyIds.includes(p.id)} onChange={e=>{
                      const next = e.target.checked ? [...comparePropertyIds, p.id] : comparePropertyIds.filter(id => id !== p.id);
                      setComparePropertyIds(next);
                      // trigger reload
                      loadReportData();
                    }} />
                    {p.name}
                  </label>
                ))}
                <span className="ml-3 text-xs text-gray-500">Range</span>
                <div className="flex items-center gap-2">
                  <FloatLabel className="w-full">
                    <Calendar
                      inputId="compare-range"
                      value={getRangeControlValue(compareFrom, compareTo) as any}
                      onChange={(e: any) => {
                        const v = e.value;
                        if (Array.isArray(v)) {
                          const [start, end] = v as [Date | null, Date | null];
                          setCompareFrom(start ? dateToISO(start) : '');
                          setCompareTo(end ? dateToISO(end) : '');
                          if (start) setCompareViewDate(startOfMonth(start));
                        } else if (v instanceof Date) {
                          setCompareFrom(dateToISO(v));
                          setCompareTo('');
                          setCompareViewDate(startOfMonth(v));
                        } else {
                          setCompareFrom('');
                          setCompareTo('');
                          setCompareViewDate(todayStartOfMonth);
                        }
                      }}
                      selectionMode="range"
                      numberOfMonths={2}
                      viewDate={compareViewDate}
                      onViewDateChange={(e:any)=> setCompareViewDate(startOfMonth(e.value))}
                      readOnlyInput
                      dateFormat="yy-mm-dd"
                      className="w-full"
                      inputClassName="h-10"
                      style={{ width: '100%' }}
                      inputStyle={{ width: '100%' }}
                    />
                    <label htmlFor="compare-range">Comparison Range</label>
                  </FloatLabel>
                  <button className="px-2 py-1 text-xs rounded border hover:bg-gray-50" onClick={()=>loadReportData()}>Apply</button>
                </div>
              </div>
              <div className="h-64 md:h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={compareData} margin={{ top: 8, right: 16, left: 8, bottom: 24 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="Actual" fill="#22c55e" />
                    <Bar dataKey="Budget" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
          </CardContent>
        </Card>
      )}

      {viewMode==='budgets' && (
        <BudgetsPanel categories={categories} budgets={budgets} onChanged={loadAll} />
      )}

      {viewMode==='categories' && (
        <CategoriesPanel propertyId={currentProperty?.id || ''} categories={categories} onChanged={loadAll} />
      )}

      {viewMode==='templates' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h4 className="text-lg font-semibold mb-4">Global Category Templates</h4>
          <div className="text-sm text-gray-600 mb-2">Templates are shared across properties. Edit and activation is managed here.</div>
          <TemplatesPanel templates={templates} onChanged={loadAll} />
        </div>
      )}

      {/* Old New Expense Modal - REMOVED: Now using UnifiedExpenseModal */}

      {/* Receipt Preview Modal */}
      {receiptModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-3xl h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h4 className="text-lg font-semibold">Receipt Preview</h4>
              <div className="flex items-center gap-2">
                {receiptSignedUrl && (
                  <a href={receiptSignedUrl} target="_blank" rel="noreferrer" className="text-sm px-2 py-1 rounded bg-gray-800 text-white hover:bg-gray-900">Open in new tab</a>
                )}
                <button onClick={()=>{ setReceiptModalOpen(false); setReceiptSignedUrl(null); }} className="px-2 py-1 rounded border">Close</button>
              </div>
            </div>
            <div className="flex-1 overflow-hidden">
              {!receiptSignedUrl ? (
                <div className="h-full flex items-center justify-center text-gray-500">Loading...</div>
              ) : receiptSignedUrl.toLowerCase().includes('.pdf') ? (
                <iframe title="Receipt PDF" src={receiptSignedUrl} className="w-full h-full" />
              ) : (
                <div className="w-full h-full overflow-auto p-4 bg-gray-50">
                  <img alt="Receipt" src={receiptSignedUrl} className="max-w-full h-auto mx-auto" />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmOpen}
        title={confirmTitle}
        message={confirmMsg}
        confirmText="Delete"
        cancelText="Cancel"
        onCancel={() => setConfirmOpen(false)}
        onConfirm={async () => {
          setConfirmOpen(false);
          const fn = confirmActionRef.current;
          confirmActionRef.current = null;
          if (fn) await fn();
        }}
      />

      {/* Approval Notes Dialog */}
      <ConfirmDialog
        isOpen={approveDialogOpen}
        title={approveDialogStatus === 'approved' ? 'Approve Expense' : 'Reject Expense'}
        message={approveDialogStatus === 'approved' ? 'Add an optional approval note' : 'Add an optional rejection note'}
        confirmText={approveDialogStatus === 'approved' ? 'Approve' : 'Reject'}
        cancelText="Cancel"
        onCancel={() => setApproveDialogOpen(false)}
        onConfirm={async () => {
          setApproveDialogOpen(false);
          if (approveTargetId) {
            await approveExpense(approveTargetId, approveDialogStatus, approveDialogNotes);
            setApproveTargetId(null);
            setApproveDialogNotes('');
          }
        }}
      >
        <textarea
          className="w-full px-3 py-2 border rounded-md text-sm"
          placeholder="Notes (optional)"
          value={approveDialogNotes}
          onChange={e=>setApproveDialogNotes(e.target.value)}
          rows={4}
        />
      </ConfirmDialog>

      {/* Unified Expense Modal */}
      <UnifiedExpenseModal
        isOpen={unifiedModalOpen}
        onClose={closeUnifiedModal}
        expense={unifiedModalExpense}
        mode={unifiedModalMode}
        initialTab={unifiedModalInitialTab}
        categories={categories}
        onExpenseChange={loadAll}
      />
    </div>
  );
};

export default ExpenseManagement;

// Inline budget row component  
function BudgetRow({ b, categories, onSave, onDelete, onStartEdit, editingId, editAmount, setEditAmount, editCurrency, setEditCurrency, editNotes, setEditNotes }:
  { b: ExpenseBudget;
    categories: ExpenseCategory[];
    onSave: (b: ExpenseBudget) => Promise<void> | void;
    onDelete: (id: string) => void;
    onStartEdit: (b: ExpenseBudget) => void;
    editingId: string | null;
    editAmount: number; setEditAmount: (n: number) => void;
    editCurrency: string; setEditCurrency: (s: string) => void;
    editNotes: string; setEditNotes: (s: string) => void;
  }) {
  const isEditing = editingId === b.id;
  return (
    <div className="py-2 text-sm grid grid-cols-5 items-center gap-2">
      <div className="truncate col-span-2">{b.month} • {categories.find(c=>c.id===b.categoryId)?.name || 'Unknown'}</div>
      <div className="col-span-2">
        {isEditing ? (
          <div className="flex items-center gap-2">
            <input type="number" className="px-2 py-1 border rounded w-28" value={editAmount} onChange={e=>setEditAmount(parseFloat(e.target.value||'0'))} />
            <input className="px-2 py-1 border rounded w-20" value={editCurrency} onChange={e=>setEditCurrency(e.target.value)} />
            <input className="px-2 py-1 border rounded flex-1" placeholder="Notes" value={editNotes} onChange={e=>setEditNotes(e.target.value)} />
          </div>
        ) : (
          <>₹{b.budgetAmount.toFixed(2)} {b.currency}</>
        )}
      </div>
      <div className="text-right">
        {isEditing ? (
          <>
            <button onClick={()=>onSave(b)} className="px-2 py-1 text-xs rounded border hover:bg-gray-50 mr-2">Save</button>
            <button onClick={()=>onStartEdit({ ...b, id: '' } as any)} className="px-2 py-1 text-xs rounded border hover:bg-gray-50">Cancel</button>
          </>
        ) : (
          <>
            <button onClick={()=>onStartEdit(b)} className="px-2 py-1 text-xs rounded border hover:bg-gray-50 mr-2">Edit</button>
            <button onClick={()=>onDelete(`${b.id}`)} className="px-2 py-1 text-xs rounded border border-red-300 text-red-700 hover:bg-red-50">Delete</button>
          </>
        )}
      </div>
    </div>
  );
}

// Global templates manager (read/write for global categories)
function TemplatesPanel({ templates, onChanged }: { templates: ExpenseCategory[]; onChanged: () => void }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState<string>('');
  const [editDesc, setEditDesc] = useState<string>('');

  const create = async () => {
    if (!name.trim()) return;
    try {
      setSaving(true);
      await ExpenseService.createCategoryTemplate(name.trim(), description.trim() || undefined);
      setName(''); setDescription('');
      onChanged();
    } catch (e) {
      console.error(e);
      toast.error('Failed to create template');
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (t: ExpenseCategory) => {
    setEditingId(t.id);
    setEditName(t.name);
    setEditDesc(t.description || '');
  };

  const saveEdit = async () => {
    if (!editingId || !editName.trim()) return;
    try {
      setSaving(true);
      await ExpenseService.updateCategory(editingId, { name: editName.trim(), description: editDesc });
      setEditingId(null);
      onChanged();
    } catch (e) {
      console.error(e);
      toast.error('Failed to update template');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (t: ExpenseCategory) => {
    try {
      await ExpenseService.updateCategory(t.id, { ...(t as any), isActive: !t.isActive } as any);
      onChanged();
    } catch (e) {
      console.error(e);
      toast.error('Failed to update');
    }
  };

  const deleteTemplate = async (t: ExpenseCategory) => {
    try {
      if (!confirm(`Delete global template "${t.name}"?`)) return;
      await ExpenseService.deleteCategory(t.id);
      onChanged();
    } catch (e) {
      console.error(e);
      toast.error('Failed to delete template');
    }
  };

  return (
    <div>
      <div className="flex gap-2 mb-4">
        <input placeholder="New template name" className="px-3 py-2 border rounded-md" value={name} onChange={e=>setName(e.target.value)} />
        <input placeholder="Description (optional)" className="px-3 py-2 border rounded-md flex-1" value={description} onChange={e=>setDescription(e.target.value)} />
        <button disabled={saving} onClick={create} className="px-3 py-2 text-sm rounded-md bg-green-600 text-white hover:bg-green-700 disabled:opacity-50">Add Template</button>
      </div>
      <div className="divide-y">
        {templates.map(t => (
          <div key={t.id} className="py-2 text-sm grid grid-cols-12 items-center gap-2">
            <div className="col-span-7">
              {editingId === t.id ? (
                <div className="flex items-center gap-2">
                  <input className="px-2 py-1 border rounded w-40" value={editName} onChange={e=>setEditName(e.target.value)} />
                  <input className="px-2 py-1 border rounded flex-1" value={editDesc} onChange={e=>setEditDesc(e.target.value)} />
                </div>
              ) : (
                <div><span className="mr-2 inline-block text-xs px-2 py-0.5 rounded bg-purple-100 text-purple-700">Global</span><span className="font-medium">{t.name}</span>{t.description ? ` — ${t.description}`:''}</div>
              )}
            </div>
            <div className="col-span-3">
              <span className={`px-2 py-1 rounded ${t.isActive? 'bg-green-100 text-green-700':'bg-gray-100 text-gray-600'}`}>{t.isActive? 'Active':'Inactive'}</span>
            </div>
            <div className="col-span-2 text-right space-x-2">
              {editingId === t.id ? (
                <>
                  <button onClick={saveEdit} className="px-2 py-1 text-xs rounded border hover:bg-gray-50">Save</button>
                  <button onClick={()=>setEditingId(null)} className="px-2 py-1 text-xs rounded border hover:bg-gray-50">Cancel</button>
                </>
              ) : (
                <>
                  <button onClick={()=>startEdit(t)} className="px-2 py-1 text-xs rounded border hover:bg-gray-50">Edit</button>
                  <button onClick={()=>toggleActive(t)} className="px-2 py-1 text-xs rounded border hover:bg-gray-50">{t.isActive? 'Deactivate':'Activate'}</button>
                <button onClick={()=>deleteTemplate(t)} className="px-2 py-1 text-xs rounded border border-red-300 text-red-700 hover:bg-red-50">Delete</button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}



