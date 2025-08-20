import type { AIInsightsResult } from '../../types/ai';

interface CacheEntry {
  value: AIInsightsResult;
  expires: number;
}

const store = new Map<string, CacheEntry>();

export function buildKey(parts: any): string {
  return JSON.stringify(parts);
}

// Build a stable prefix for keys constructed from an array of parts.
// Pass the same parts you would pass to buildKey, but this returns the string
// without the closing bracket so it can be used as a prefix in invalidate().
export function buildKeyPrefix(parts: any[]): string {
  const full = JSON.stringify(parts);
  // Remove the trailing ']' to create a prefix that will match longer arrays
  return full.endsWith(']') ? full.slice(0, -1) : full;
}

export function getFromCache<T = AIInsightsResult>(key: string): T | null {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expires) {
    store.delete(key);
    return null;
  }
  return entry.value as unknown as T;
}

export function setInCache(key: string, value: AIInsightsResult, ttlMs = 10 * 60 * 1000) {
  store.set(key, { value, expires: Date.now() + ttlMs });
}

export function invalidate(keyPrefix?: string) {
  if (!keyPrefix) {
    store.clear();
    return;
  }
  for (const key of store.keys()) {
    if (key.startsWith(keyPrefix)) store.delete(key);
  }
}
