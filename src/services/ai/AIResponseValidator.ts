import type { AIInsightsResult, AIInsight, AIForecast } from '../../types/ai';

const SEVERITIES = new Set(['low','medium','high','critical']);
const MAX_INSIGHTS = 10;
const MIN_INSIGHTS = 4;

function clamp(n: number, min: number, max: number) {
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}

function normalizeSeverity(v: any): 'low'|'medium'|'high'|'critical' {
  const s = String(v || '').toLowerCase();
  return (SEVERITIES.has(s) ? s : 'medium') as any;
}

function trimStr(s: any, max: number): string {
  const t = String(s ?? '').trim();
  return t.length > max ? t.slice(0, max - 1) + '…' : t;
}

function toId(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function sanitizeInsight(raw: any, seenIds: Set<string>): AIInsight | null {
  const title = trimStr(raw?.title ?? '', 120);
  const description = trimStr(raw?.description ?? '', 280);
  if (!title || !description) return null;
  let id = trimStr(raw?.id ?? '', 64) || toId(title);
  if (!id) id = `insight-${seenIds.size + 1}`;
  if (seenIds.has(id)) {
    let i = 2;
    while (seenIds.has(`${id}-${i}`)) i++;
    id = `${id}-${i}`;
  }
  seenIds.add(id);
  const severity = normalizeSeverity(raw?.severity);
  const tags = Array.isArray(raw?.tags) ? raw.tags.slice(0, 8).map((t: any) => trimStr(t, 24)).filter(Boolean) : [];
  const actions = Array.isArray(raw?.actions)
    ? raw.actions.slice(0, 3).map((a: any) => ({ label: trimStr(a?.label ?? '', 60), type: a?.type, payload: a?.payload }))
      .filter((a: any) => a.label)
    : undefined;
  const evidence = raw?.evidence ? trimStr(raw.evidence, 500) : undefined;
  return { id, title, description, severity, tags, actions, evidence } as AIInsight;
}

function sanitizeForecast(raw: any): AIForecast | null {
  const metric = trimStr(raw?.metric ?? '', 32);
  if (!metric) return null;
  const value = Number(raw?.value);
  if (!Number.isFinite(value)) return null;
  const changePct = raw?.changePct == null ? null : clamp(Number(raw?.changePct), -100, 100);
  const confidence = raw?.confidence == null ? null : clamp(Number(raw?.confidence), 0, 100);
  let unit = raw?.unit;
  if (!unit) {
    if (['revenue','expenses','adr','revpar'].includes(metric.toLowerCase())) unit = 'INR';
    else unit = 'pct';
  }
  const horizon = raw?.horizon ? trimStr(raw.horizon, 24) : undefined;
  return { metric, value, changePct, confidence, unit, horizon } as AIForecast;
}

function detectCategories(ins: AIInsight): Set<string> {
  const t = `${ins.title} ${ins.description} ${(ins.tags || []).join(' ')}`.toLowerCase();
  const cats = new Set<string>();
  if (/revenue|adr|revpar|price|pricing|rate|channel|promotion|sales|yield/.test(t)) cats.add('revenue');
  if (/expense|cost|spend|budget|vendor|invoice/.test(t)) cats.add('expenses');
  if (/guest|loyalty|repeat|stay|alos|review|upsell/.test(t)) cats.add('guests');
  if (/anomal|spike|drop|outlier|fraud|cancel|overbook|error|issue/.test(t)) cats.add('anomalies');
  (ins.tags || []).forEach((tag) => {
    const s = String(tag).toLowerCase();
    if (['revenue','pricing','channels'].includes(s)) cats.add('revenue');
    if (['expenses','cost-control','budget'].includes(s)) cats.add('expenses');
    if (['guests','loyalty','crm'].includes(s)) cats.add('guests');
    if (['anomaly','cancellations','fraud'].includes(s)) cats.add('anomalies');
  });
  return cats;
}

function addDefaultActions(ins: AIInsight): AIInsight {
  if (ins.actions && ins.actions.length > 0) return ins;
  const cats = detectCategories(ins);
  const actions: AIInsight['actions'] = [];
  if (cats.has('revenue')) actions.push({ label: 'Review pricing rules', type: 'adjust-pricing' });
  if (cats.has('expenses')) actions.push({ label: 'Review expense categories', type: 'review-expenses' });
  if (cats.has('guests')) actions.push({ label: 'Set up loyalty offer', type: 'other', payload: { to: 'loyalty' } });
  if (cats.has('anomalies')) actions.push({ label: 'Investigate anomaly', type: 'other' });
  return { ...ins, actions: actions.length ? actions.slice(0, 3) : ins.actions };
}

export function validateAndSanitizeAIResponse(parsed: any): AIInsightsResult | null {
  if (!parsed || typeof parsed !== 'object') return null;
  const insightsArr = Array.isArray(parsed.insights) ? parsed.insights : [];
  const forecastsArr = Array.isArray(parsed.forecasts) ? parsed.forecasts : [];

  const seenIds = new Set<string>();
  let insights: AIInsight[] = insightsArr
    .map((i: any) => sanitizeInsight(i, seenIds))
    .filter(Boolean) as AIInsight[];

  // Ensure reasonable count and coverage; if too many, trim
  insights = insights.slice(0, MAX_INSIGHTS).map(addDefaultActions);

  const forecasts: AIForecast[] = forecastsArr
    .map((f: any) => sanitizeForecast(f))
    .filter(Boolean) as AIForecast[];

  if (insights.length < MIN_INSIGHTS) return null;

  // Module coverage: require at least revenue, expenses, guests and preferably an anomaly
  const coverage = new Set<string>();
  insights.forEach((ins) => detectCategories(ins).forEach((c) => coverage.add(c)));
  const required = ['revenue','expenses','guests'];
  const hasRequired = required.every((c) => coverage.has(c));
  if (!hasRequired) return null;

  // Forecast requirements: include at least revenue and occupancy metrics; clamp values handled earlier
  const metricSet = new Set(forecasts.map((f) => String(f.metric || '').toLowerCase()));
  if (!(metricSet.has('revenue') && metricSet.has('occupancy'))) return null;

  const model = typeof parsed?.meta?.model === 'string' && parsed.meta.model.trim()
    ? parsed.meta.model.trim()
    : 'gemini-2.5-flash';

  return {
    insights,
    forecasts,
    meta: {
      model,
      generatedAt: new Date().toISOString(),
      fromCache: false,
    },
  };
}
