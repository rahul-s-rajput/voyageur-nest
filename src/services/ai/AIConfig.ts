export function isAIDebug(): boolean {
  const v = (import.meta as any).env?.VITE_AI_DEBUG ?? (globalThis as any).VITE_AI_DEBUG;
  return String(v).toLowerCase() === 'true';
}
