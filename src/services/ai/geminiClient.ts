import { GoogleGenerativeAI } from '@google/generative-ai';

let singleton: ReturnType<GoogleGenerativeAI['getGenerativeModel']> | null = null;

export function getGeminiModel(modelName: string = 'gemini-2.5-flash') {
  if (singleton) return singleton;
  const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY || (globalThis as any).VITE_GEMINI_API_KEY;
  if (!apiKey || typeof apiKey !== 'string') {
    throw new Error('Missing VITE_GEMINI_API_KEY. Set it in your environment to enable AI insights.');
  }
  const genAI = new GoogleGenerativeAI(apiKey);
  singleton = genAI.getGenerativeModel({ model: modelName });
  return singleton;
}
