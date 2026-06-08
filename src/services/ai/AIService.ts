import type { AIContext, AIInsightsResult } from '../../types/ai';
import { buildKey, getFromCache, setInCache } from './AIResponseCache';
import { generateFallback } from './AIFallbackService';

/**
 * Insights are generated entirely from deterministic rules (see
 * AIFallbackService). No LLM is called — the dashboard's KPIs already
 * contain everything the rules need, so this is faster, free, and
 * non-hallucinating. This class remains as a thin caching wrapper so the
 * consuming hook/component and tests stay unchanged.
 */
export class AIService {
  static async generateInsights(ctx: AIContext): Promise<AIInsightsResult> {
    const cacheKey = buildKey(['ai', 'insights', ctx.filters]);
    const cached = getFromCache<AIInsightsResult>(cacheKey);
    if (cached) {
      return { ...cached, meta: { ...cached.meta, fromCache: true } };
    }

    const result = generateFallback(ctx);
    // Rule-based insights have no API cost; keep the meta shape stable
    // for the UI and tests that read these fields.
    result.meta = {
      ...result.meta,
      cost: 0,
      promptTokens: 0,
      responseTokens: 0,
    };

    setInCache(cacheKey, result);
    return result;
  }
}

export default AIService;
