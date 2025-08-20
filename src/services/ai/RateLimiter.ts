// Simple in-memory sliding window rate limiter and usage tracker
// Not persisted; suitable for client-side/dev usage. In prod, use a server-side limiter.

export interface RateLimitConfig {
  requestsPerMinute: number;
  dailyRequestCap?: number;
}

export class RateLimiter {
  private timestamps: number[] = [];
  private dayCount = 0;
  private dayStart = Date.now();

  constructor(private cfg: RateLimitConfig) {}

  private resetDayIfNeeded() {
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    if (now - this.dayStart >= oneDay) {
      this.dayStart = now;
      this.dayCount = 0;
    }
  }

  async acquireOrThrow(): Promise<void> {
    const now = Date.now();
    this.resetDayIfNeeded();

    // Daily cap
    if (this.cfg.dailyRequestCap && this.dayCount >= this.cfg.dailyRequestCap) {
      throw new Error('rate_limited_daily_cap');
    }

    // Clean timestamps older than 60s
    const oneMinuteAgo = now - 60_000;
    this.timestamps = this.timestamps.filter((t) => t >= oneMinuteAgo);

    if (this.timestamps.length >= this.cfg.requestsPerMinute) {
      throw new Error('rate_limited_rpm');
    }

    this.timestamps.push(now);
    this.dayCount += 1;
  }
}

export class UsageTracker {
  promptTokens = 0;
  responseTokens = 0;
  costUSD = 0;

  add(promptTok: number, respTok: number, pricePer1K: number) {
    this.promptTokens += promptTok;
    this.responseTokens += respTok;
    const totalTok = Math.max(0, promptTok + respTok);
    this.costUSD += (totalTok / 1000) * pricePer1K;
  }
}
