// deno-lint-ignore-file no-explicit-any
// Receipt extractor for the Telegram bot — calls OpenRouter (OpenAI-compatible)
// with a free vision model + free fallback chain. No Google/Gemini dependency.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
declare const Deno: any;

export interface ReceiptExtractionLineItem {
  description: string;
  quantity?: number;
  unit_amount?: number;
  tax_amount?: number;
  line_total?: number;
}

export interface ReceiptExtractionResult {
  expense_date: string | null;
  amount: number | null;
  currency: string | null;
  vendor: string | null;
  category_hint: string | null;
  line_items: ReceiptExtractionLineItem[];
  confidence: number;
  reasoning?: string | null;
}

const DEFAULT_MODELS = [
  "moonshotai/kimi-k2.6:free",
  "google/gemma-4-31b-it:free",
  "nvidia/nemotron-nano-12b-v2-vl:free",
];

const SYSTEM_PROMPT = [
  "You are a strict JSON extractor for receipts and invoices. Output only JSON without code fences.",
  "Extract a single expense summary and a list of line items.",
  "Dates must be ISO YYYY-MM-DD. Use null when unknown. Currency should be ISO code if present.",
  "Line items should include description and computed line_total when possible.",
  "If tax is present, extract a tax_amount per line if identifiable; otherwise null.",
  "Suggest a category (category_hint) from common expense categories like utilities, food costs, staff salary, maintenance, marketing, transport, office supplies, fuel, cleaning, groceries.",
].join("\n");

const SCHEMA = {
  type: "object",
  properties: {
    expense_date: { type: ["string", "null"] },
    amount: { type: ["number", "null"] },
    currency: { type: ["string", "null"] },
    vendor: { type: ["string", "null"] },
    category_hint: { type: ["string", "null"] },
    line_items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          description: { type: "string" },
          quantity: { type: ["number", "null"] },
          unit_amount: { type: ["number", "null"] },
          tax_amount: { type: ["number", "null"] },
          line_total: { type: ["number", "null"] },
        },
        required: ["description"],
      },
    },
    confidence: { type: "number" },
    reasoning: { type: ["string", "null"] },
  },
  required: ["confidence", "line_items"],
};

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  const len = bytes.length;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function resolveModels(): string[] {
  const single = (Deno.env.get("OPENROUTER_MODEL") || "").trim();
  const list = (Deno.env.get("OPENROUTER_MODELS") || "").split(",").map((s: string) => s.trim()).filter(Boolean);
  return Array.from(new Set([single, ...list, ...DEFAULT_MODELS].filter(Boolean)));
}

function parseJsonLoose(raw: string): any {
  const text = String(raw || "").trim().replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  try {
    return JSON.parse(text);
  } catch {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start !== -1 && end !== -1 && end > start) {
      return JSON.parse(text.slice(start, end + 1));
    }
    throw new Error("Model returned non-JSON content");
  }
}

export async function extractFromReceipt(
  bytes: Uint8Array,
  hints?: { locale?: string; currency?: string; categories?: string[]; mimeType?: string },
): Promise<ReceiptExtractionResult> {
  const apiKey = Deno.env.get("OPENROUTER_API_KEY");
  if (!apiKey) throw new Error("Missing OPENROUTER_API_KEY");

  const models = resolveModels();
  const mime = hints?.mimeType || "image/jpeg";
  const dataUrl = `data:${mime};base64,${toBase64(bytes)}`;

  const categoryList = (hints?.categories && hints.categories.length)
    ? `\nExisting categories: ${JSON.stringify(hints.categories)}. When suggesting category_hint, prefer an exact or closest match from this list. If none applies, provide your best new category suggestion.`
    : "";
  const userPrompt = `Return valid JSON only (no code fences). Schema: ${JSON.stringify(SCHEMA)}.\nLocale: ${hints?.locale || "en-IN"}; Preferred currency: ${hints?.currency || "INR"}.${categoryList}`;

  console.log("[receipt-extractor] start", { bytes: bytes?.length ?? 0, models: models.slice(0, 3), mime });

  const payload = {
    model: models[0],
    models,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: [
          { text: userPrompt, type: "text" },
          { type: "image_url", image_url: { url: dataUrl } },
        ],
      },
    ],
    response_format: { type: "json_object" },
    temperature: 0,
    max_tokens: 2000,
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 60_000);
  let resp: Response;
  try {
    resp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://voyageur-nest.netlify.app",
        "X-Title": "Voyageur Nest",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }

  if (!resp.ok) {
    const t = await resp.text().catch(() => "");
    console.error("[receipt-extractor] http", resp.status, t?.slice(0, 300));
    throw new Error(`OpenRouter HTTP ${resp.status} ${resp.statusText}: ${t?.slice(0, 200)}`);
  }

  const data = await resp.json();
  const content = data?.choices?.[0]?.message?.content ?? "";
  const parsed = parseJsonLoose(String(content));

  const items: ReceiptExtractionLineItem[] = Array.isArray(parsed.line_items)
    ? parsed.line_items.map((li: any) => ({
        description: String(li?.description || "").slice(0, 300),
        quantity: typeof li?.quantity === "number" ? li.quantity : undefined,
        unit_amount: typeof li?.unit_amount === "number" ? li.unit_amount : undefined,
        tax_amount: typeof li?.tax_amount === "number" ? li.tax_amount : undefined,
        line_total: typeof li?.line_total === "number"
          ? li.line_total
          : (typeof li?.unit_amount === "number" && typeof li?.quantity === "number"
              ? li.unit_amount * li.quantity
              : undefined),
      }))
    : [];

  const result: ReceiptExtractionResult = {
    expense_date: parsed?.expense_date || null,
    amount: typeof parsed?.amount === "number" ? parsed.amount : null,
    currency: parsed?.currency || null,
    vendor: parsed?.vendor || null,
    category_hint: parsed?.category_hint || null,
    line_items: items,
    confidence: typeof parsed?.confidence === "number" ? parsed.confidence : 0.7,
    reasoning: parsed?.reasoning || null,
  };

  console.log("[receipt-extractor] done", {
    model: data?.model,
    amount: result.amount,
    currency: result.currency,
    items: result.line_items.length,
    confidence: result.confidence,
  });

  return result;
}
