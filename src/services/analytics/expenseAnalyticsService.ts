import { ExpenseService } from "../expenseService";
import { supabase } from "../../lib/supabase";
import type { AnalyticsFilters, ExpenseAnalytics } from "../../types/analytics";
import type { Expense, ExpenseReportCategoryTotal } from "../../types/expenses";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";

export interface ExpenseTrendData {
  month: string;
  totalExpenses: number;
  budget?: number;
}

export interface ExpenseKPIs {
  totalExpenses: number;
  monthlyAverage: number;
  budgetVariance: number; // positive = over budget
  budgetVariancePercent: number;
  topCategory: string;
  topCategoryAmount: number;
  expenseCount: number;
  averageExpenseAmount: number;
}

export interface ExpenseBudgetComparison {
  categoryName: string;
  budgeted: number;
  actual: number;
  variance: number;
  variancePercent: number;
}

export interface DetailedExpenseAnalytics {
  kpis: ExpenseKPIs;
  byCategory: ExpenseReportCategoryTotal[];
  trends: ExpenseTrendData[];
  budgetComparison: ExpenseBudgetComparison[];
  vendorAnalysis: Array<{ vendor: string; amount: number; count: number }>;
  paymentMethodBreakdown: Array<{ method: string; amount: number; percentage: number }>;
}

export async function getExpenseAnalytics(filters: AnalyticsFilters): Promise<ExpenseAnalytics> {
  // Defensive guard: avoid Supabase errors when required filters are missing
  if (!filters?.propertyId || !filters?.start || !filters?.end) {
    return {
      totalExpenses: 0,
      byCategory: [],
    };
  }

  const startStr = new Date(filters.start).toISOString().slice(0, 10);
  const endStr = new Date(filters.end).toISOString().slice(0, 10);

  // Use the comprehensive expense fetching approach that includes shared expenses
  const [allExpenses, categories] = await Promise.all([
    // Get all expenses that contribute to this property (including shared ones)
    ExpenseService.listExpensesForPropertyView({
      propertyId: filters.propertyId,
      from: startStr,
      to: endStr,
      approval: 'approved',
    }),
    ExpenseService.listAvailableCategories(filters.propertyId),
  ]);

  const categoryNameById = new Map<string, string>();
  categories.forEach((c: any) => categoryNameById.set(c.id, c.name));

  // Since listExpensesForPropertyView already applies share adjustments,
  // we can directly aggregate the amounts by category
  type TotalsMap = Map<string | null, number>;
  const totalsByCategory: TotalsMap = new Map();

  for (const e of allExpenses as Expense[]) {
    const key = e.categoryId || null;
    const amount = e.amount || 0;
    totalsByCategory.set(key, (totalsByCategory.get(key) || 0) + amount);
  }

  const resultByCategory = Array.from(totalsByCategory.entries()).map(([categoryId, total]) => {
    const name = categoryId ? categoryNameById.get(categoryId) || "Unknown" : "Uncategorized";
    return { categoryId, categoryName: name, total };
  });

  // Sort desc for nicer charts
  resultByCategory.sort((a, b) => b.total - a.total);

  const totalExpenses = resultByCategory.reduce((s, r) => s + r.total, 0);

  return {
    totalExpenses,
    byCategory: resultByCategory,
  };
}

export async function getDetailedExpenseAnalytics(filters: AnalyticsFilters): Promise<DetailedExpenseAnalytics> {
  // Defensive guard: avoid Supabase errors when required filters are missing
  if (!filters?.propertyId || !filters?.start || !filters?.end) {
    return {
      kpis: {
        totalExpenses: 0,
        monthlyAverage: 0,
        budgetVariance: 0,
        budgetVariancePercent: 0,
        topCategory: 'None',
        topCategoryAmount: 0,
        expenseCount: 0,
        averageExpenseAmount: 0,
      },
      byCategory: [],
      trends: [],
      budgetComparison: [],
      vendorAnalysis: [],
      paymentMethodBreakdown: [],
    };
  }

  const startStr = new Date(filters.start).toISOString().slice(0, 10);
  const endStr = new Date(filters.end).toISOString().slice(0, 10);

  // Get comprehensive expense data
  const [allExpenses, categories, budgets] = await Promise.all([
    ExpenseService.listExpensesForPropertyView({
      propertyId: filters.propertyId,
      from: startStr,
      to: endStr,
      approval: 'approved',
    }),
    ExpenseService.listAvailableCategories(filters.propertyId),
    getBudgetData(filters.propertyId, startStr, endStr),
  ]);

  const categoryNameById = new Map<string, string>();
  categories.forEach((c: any) => categoryNameById.set(c.id, c.name));

  // Process expenses
  const expenses = allExpenses as Expense[];
  const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  
  // Calculate KPIs
  const monthCount = Math.max(1, Math.ceil((new Date(endStr).getTime() - new Date(startStr).getTime()) / (1000 * 60 * 60 * 24 * 30)));
  const monthlyAverage = totalExpenses / monthCount;
  
  const topCategory = expenses.reduce((acc, e) => {
    const categoryName = e.categoryId ? categoryNameById.get(e.categoryId) || "Unknown" : "Uncategorized";
    acc[categoryName] = (acc[categoryName] || 0) + (e.amount || 0);
    return acc;
  }, {} as Record<string, number>);
  
  const topCategoryEntry = Object.entries(topCategory).sort(([, a], [, b]) => b - a)[0];
  const totalBudget = budgets.reduce((sum, b) => sum + b.budgetAmount, 0);
  const budgetVariance = totalExpenses - totalBudget;
  const budgetVariancePercent = totalBudget > 0 ? (budgetVariance / totalBudget) * 100 : 0;

  const kpis: ExpenseKPIs = {
    totalExpenses,
    monthlyAverage,
    budgetVariance,
    budgetVariancePercent,
    topCategory: topCategoryEntry?.[0] || "None",
    topCategoryAmount: topCategoryEntry?.[1] || 0,
    expenseCount: expenses.length,
    averageExpenseAmount: expenses.length > 0 ? totalExpenses / expenses.length : 0,
  };

  // Category breakdown
  const categoryTotals = new Map<string | null, number>();
  expenses.forEach(e => {
    const key = e.categoryId || null;
    categoryTotals.set(key, (categoryTotals.get(key) || 0) + (e.amount || 0));
  });

  const byCategory = Array.from(categoryTotals.entries()).map(([categoryId, total]) => {
    const name = categoryId ? categoryNameById.get(categoryId) || "Unknown" : "Uncategorized";
    return { categoryId, categoryName: name, total };
  }).sort((a, b) => b.total - a.total);

  // Expense trends (last 6 months)
  const trends = await getExpenseTrends(filters.propertyId, 6);

  // Budget comparison
  const budgetMap = new Map<string, number>();
  budgets.forEach(b => {
    const categoryName = categoryNameById.get(b.categoryId) || "Unknown";
    budgetMap.set(categoryName, (budgetMap.get(categoryName) || 0) + b.budgetAmount);
  });

  const budgetComparison: ExpenseBudgetComparison[] = Array.from(new Set([
    ...Array.from(categoryTotals.keys()).map(id => id ? categoryNameById.get(id) || "Unknown" : "Uncategorized"),
    ...Array.from(budgetMap.keys())
  ])).map(categoryName => {
    const actual = byCategory.find(c => c.categoryName === categoryName)?.total || 0;
    const budgeted = budgetMap.get(categoryName) || 0;
    const variance = actual - budgeted;
    const variancePercent = budgeted > 0 ? (variance / budgeted) * 100 : 0;
    
    return {
      categoryName,
      budgeted,
      actual,
      variance,
      variancePercent,
    };
  }).filter(item => item.actual > 0 || item.budgeted > 0)
    .sort((a, b) => Math.abs(b.variance) - Math.abs(a.variance));

  // Vendor analysis
  const vendorTotals = new Map<string, { amount: number; count: number }>();
  expenses.forEach(e => {
    const vendor = e.vendor || "Unknown";
    const existing = vendorTotals.get(vendor) || { amount: 0, count: 0 };
    vendorTotals.set(vendor, {
      amount: existing.amount + (e.amount || 0),
      count: existing.count + 1
    });
  });

  const vendorAnalysis = Array.from(vendorTotals.entries())
    .map(([vendor, data]) => ({ vendor, ...data }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 10); // Top 10 vendors

  // Payment method breakdown
  const paymentTotals = new Map<string, number>();
  expenses.forEach(e => {
    const method = e.paymentMethod || "Unknown";
    paymentTotals.set(method, (paymentTotals.get(method) || 0) + (e.amount || 0));
  });

  const paymentMethodBreakdown = Array.from(paymentTotals.entries())
    .map(([method, amount]) => ({
      method,
      amount,
      percentage: (amount / totalExpenses) * 100
    }))
    .sort((a, b) => b.amount - a.amount);

  return {
    kpis,
    byCategory,
    trends,
    budgetComparison,
    vendorAnalysis,
    paymentMethodBreakdown,
  };
}

async function getBudgetData(
  propertyId: string,
  startDate: string, // yyyy-MM-dd
  endDate: string // yyyy-MM-dd
) {
  // Construct full date bounds for the date-typed 'month' column
  const from = format(startOfMonth(new Date(startDate)), 'yyyy-MM-dd');
  const to = format(endOfMonth(new Date(endDate)), 'yyyy-MM-dd');

  const { data, error } = await supabase
    .from('expense_budgets')
    .select('category_id, budget_amount, month')
    .eq('property_id', propertyId)
    .gte('month', from)
    .lte('month', to);

  if (error) {
    console.error('Error fetching budget data:', error);
    return [] as Array<{ categoryId: string; budgetAmount: number; month: string }>; // keep downstream stable
  }

  // Map snake_case from Supabase to the camelCase used downstream
  return (data || []).map((row: any) => ({
    categoryId: row.category_id as string,
    budgetAmount: Number(row.budget_amount) || 0,
    month: row.month as string,
  })) as Array<{ categoryId: string; budgetAmount: number; month: string }>;
}

async function getExpenseTrends(propertyId: string, monthCount: number): Promise<ExpenseTrendData[]> {
  const trends: ExpenseTrendData[] = [];
  const endDate = new Date();
  
  for (let i = monthCount - 1; i >= 0; i--) {
    const monthDate = subMonths(endDate, i);
    const monthStart = format(startOfMonth(monthDate), 'yyyy-MM-dd');
    const monthEnd = format(endOfMonth(monthDate), 'yyyy-MM-dd');
    const monthKey = format(monthDate, 'MMM yyyy');

    const expenses = await ExpenseService.listExpensesForPropertyView({
      propertyId,
      from: monthStart,
      to: monthEnd,
      approval: 'approved',
    }) as Expense[];

    const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    
    // Get budget for this month
    const { data: budgets } = await supabase
      .from('expense_budgets')
      .select('budget_amount')
      .eq('property_id', propertyId)
      .eq('month', format(monthDate, 'yyyy-MM') + '-01');
    
    const budget = budgets?.reduce((sum, b) => sum + (b.budget_amount || 0), 0) || 0;

    trends.push({
      month: monthKey,
      totalExpenses,
      budget: budget > 0 ? budget : undefined,
    });
  }

  return trends;
}
