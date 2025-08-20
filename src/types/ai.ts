import type { AnalyticsFilters } from './analytics';
import type { KPIPeriodResult, KPIComparisonResult } from '../services/analytics/kpiCalculator';

export type AISeverity = 'low' | 'medium' | 'high' | 'critical';

export interface AIAction {
  label: string;
  type?: 'navigate' | 'adjust-pricing' | 'review-expenses' | 'other';
  payload?: Record<string, unknown>;
}

export interface AIInsight {
  id: string;
  title: string;
  description: string;
  severity: AISeverity;
  tags?: string[];
  actions?: AIAction[];
  evidence?: string;
}

export interface AIForecast {
  metric: string;
  value: number;
  changePct?: number | null;
  confidence?: number | null;
  unit?: string;
  horizon?: string; // e.g., 'next_30_days'
}

export interface AIInsightsResultMeta {
  model: string;
  generatedAt: string; // ISO string
  fromCache: boolean;
  cost?: number; // optional, in USD
  promptTokens?: number;
  responseTokens?: number;
}

export interface AIInsightsResult {
  insights: AIInsight[];
  forecasts?: AIForecast[];
  meta: AIInsightsResultMeta;
}

export interface AIContext {
  filters: AnalyticsFilters;
  kpi: KPIPeriodResult;
  comparison?: KPIComparisonResult;
}
