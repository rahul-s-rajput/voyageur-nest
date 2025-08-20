import type { AIContext, AIInsightsResult } from '../../types/ai';
import { buildInsightsPrompt } from './PromptBuilder';
import { getGeminiModel } from './geminiClient';
import { buildKey, getFromCache, setInCache } from './AIResponseCache';
import { generateFallback } from './AIFallbackService';
import { RateLimiter, UsageTracker } from './RateLimiter';
import { getAIPricePer1KTokensUSD, getAIRateLimit, isAIDebug } from './AIConfig';
import { validateAndSanitizeAIResponse } from './AIResponseValidator';
 

function tryParseJSON(text: string): any | null {
  try {
    return JSON.parse(text);
  } catch {
    // Try to extract JSON within code fences
    const match = text.match(/\{[\s\S]*\}$/);
    if (match) {
      try { return JSON.parse(match[0]); } catch {}
    }
    return null;
  }
}

export class AIService {
  static async generateInsights(ctx: AIContext): Promise<AIInsightsResult> {
    if (isAIDebug()) console.log('AIService.generateInsights called', { filters: ctx.filters });
    const cacheKey = buildKey(['ai','insights', ctx.filters]);
    const cached = getFromCache<AIInsightsResult>(cacheKey);
    if (cached) {
      if (isAIDebug()) console.log('Returning AI insights from cache', { cacheKey });
      return { ...cached, meta: { ...cached.meta, fromCache: true } };
    }

    // Build prompt
    const prompt = buildInsightsPrompt(ctx);
    if (isAIDebug()) console.log('Built insights prompt', { length: prompt.length });

    // If API key missing or any error, use fallback
    let result: AIInsightsResult | null = null;
    let fallbackReason: string | null = null;
    const tracker = new UsageTracker();
    const pricePer1K = getAIPricePer1KTokensUSD();
    const estimateTokens = (s: string) => Math.ceil((s || '').length / 4);
    const promptTokens = estimateTokens(prompt);
    tracker.add(promptTokens, 0, pricePer1K);
    try {
      // Rate limit before attempting remote call
      const limiter = AIService._getLimiter();
      await limiter.acquireOrThrow();

      const model = getGeminiModel();
      if (isAIDebug()) console.log('Calling Gemini generateContent');
      const resp = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
      } as any);
      const text = resp?.response?.text?.() ?? (resp as any)?.response?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
      if (isAIDebug()) console.log('Gemini raw response text', { text });
      const responseTokens = estimateTokens(text);
      tracker.add(0, responseTokens, pricePer1K);
      const parsed = text ? tryParseJSON(text) : null;
      if (!text) {
        fallbackReason = 'empty_text';
        if (isAIDebug()) console.warn('Gemini returned empty text, will use fallback');
      }
      if (text && !parsed) {
        fallbackReason = 'json_parse_failed';
        if (isAIDebug()) console.warn('Failed to parse Gemini JSON, will use fallback', { sample: text.substring(0, 500) });
      }
      if (parsed) {
        const validated = validateAndSanitizeAIResponse(parsed);
        if (validated) {
          result = {
            ...validated,
            meta: {
              ...validated.meta,
              cost: Number(tracker.costUSD.toFixed(6)),
              promptTokens: tracker.promptTokens,
              responseTokens: tracker.responseTokens,
            },
          };
          if (isAIDebug()) console.log('Validated AI insights successfully', { insightsCount: result.insights.length, forecastsCount: result.forecasts?.length ?? 0 });
        } else {
          fallbackReason = 'validation_failed';
          if (isAIDebug()) console.warn('AI response failed validation, will use fallback');
        }
      }
    } catch (e: any) {
      fallbackReason = e?.message === 'rate_limited_rpm' || e?.message === 'rate_limited_daily_cap' ? 'rate_limited' : 'model_call_error';
      if (isAIDebug()) console.error('Gemini call failed or rate-limited, will use fallback', e);
    }

    if (!result) {
      if (isAIDebug()) console.warn('Using fallback AI insights', { reason: fallbackReason || 'unknown' });
      result = generateFallback(ctx);
      // attach usage meta to fallback as well
      result.meta = {
        ...result.meta,
        cost: Number(tracker.costUSD.toFixed(6)),
        promptTokens: tracker.promptTokens,
        responseTokens: tracker.responseTokens,
      } as any;
    }

    setInCache(cacheKey, result);
    if (isAIDebug()) console.log('Cached AI insights result', { cacheKey });
    return result;
  }

  // Keep a singleton limiter per session
  private static _limiter: RateLimiter | null = null;
  private static _getLimiter(): RateLimiter {
    if (!this._limiter) {
      this._limiter = new RateLimiter(getAIRateLimit());
    }
    return this._limiter;
  }
}

export default AIService;
