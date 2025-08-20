export function isAIDebug(): boolean {
  const v = (import.meta as any).env?.VITE_AI_DEBUG ?? (globalThis as any).VITE_AI_DEBUG;
  return String(v).toLowerCase() === 'true';
}

export function getAIRateLimit() {
  const rpmRaw = (import.meta as any).env?.VITE_AI_RPM ?? (globalThis as any).VITE_AI_RPM;
  const dailyRaw = (import.meta as any).env?.VITE_AI_DAILY_CAP ?? (globalThis as any).VITE_AI_DAILY_CAP;
  const rpm = Number(rpmRaw ?? 6);
  const daily = dailyRaw != null ? Number(dailyRaw) : undefined;
  return { requestsPerMinute: Number.isFinite(rpm) && rpm > 0 ? rpm : 6, dailyRequestCap: daily && daily > 0 ? daily : undefined };
}

export function getAIPricePer1KTokensUSD(): number {
  const raw = (import.meta as any).env?.VITE_AI_PRICE_PER_1K ?? (globalThis as any).VITE_AI_PRICE_PER_1K;
  const n = Number(raw ?? 0.15);
  return Number.isFinite(n) && n >= 0 ? n : 0.15;
}
