// deno-lint-ignore-file no-explicit-any
// Edge Function: extract structured expense data from a receipt image.
//
// Runs server-side (key never ships to the browser) and calls OpenRouter's
// OpenAI-compatible Chat Completions API with a free vision model plus a
// free-to-free fallback chain. Same request/response contract as before, so
// the client service + expense tabs are unchanged.
// No runtime imports on purpose: the Deno edge runtime already provides Deno,
// fetch, Response, etc. globally. Avoiding the jsr type-only import keeps
// raw/API (non-bundled) deploys booting instantly.
declare const Deno: any;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With, apikey",
  "Vary": "Origin",
};

// Free vision models, tried in order (OpenRouter routes to the next on failure).
// Cross-provider on purpose so one provider being rate-limited doesn't sink the
// request. OpenRouter caps the `models` array at 3 — keep this <= 3.
// Override with the OPENROUTER_MODEL / OPENROUTER_MODELS env vars if needed.
const DEFAULT_MODELS = [
  "moonshotai/kimi-k2.6:free",      // Moonshot
  "nex-agi/nex-n2-pro:free",        // nex-agi
  "nvidia/nemotron-nano-12b-v2-vl:free", // NVIDIA
];

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

export function buildUserPrompt(hints?: { locale?: string; currency?: string; categories?: string[] }): string {
  const categoryList = (hints?.categories && hints.categories.length)
    ? `\nExisting categories: ${JSON.stringify(hints.categories)}. When suggesting category_hint, prefer an exact or closest match from this list. If none applies, provide your best new category suggestion.`
    : "";
  return `Return valid JSON only (no code fences). Schema: ${JSON.stringify(SCHEMA)}.\nLocale: ${hints?.locale || "en-IN"}; Preferred currency: ${hints?.currency || "INR"}.${categoryList}`;
}

// Parse model output as JSON, tolerating stray prose / code fences around it.
export function parseJsonLoose(raw: string): any {
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

// Normalize the parsed object into the stable ReceiptExtractionResult shape.
export function normalizeResult(parsed: any): ReceiptExtractionResult {
  const line_items: ReceiptExtractionLineItem[] = Array.isArray(parsed?.line_items)
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

  return {
    expense_date: parsed?.expense_date || null,
    amount: typeof parsed?.amount === "number" ? parsed.amount : null,
    currency: parsed?.currency || null,
    vendor: parsed?.vendor || null,
    category_hint: parsed?.category_hint || null,
    line_items,
    confidence: typeof parsed?.confidence === "number" ? parsed.confidence : 0.7,
    reasoning: parsed?.reasoning || null,
  };
}

function resolveModels(): string[] {
  const single = (Deno.env.get("OPENROUTER_MODEL") || "").trim();
  const list = (Deno.env.get("OPENROUTER_MODELS") || "").split(",").map((s: string) => s.trim()).filter(Boolean);
  const models = [single, ...list, ...DEFAULT_MODELS].filter(Boolean);
  return Array.from(new Set(models)).slice(0, 3); // de-dupe, keep order; OpenRouter caps at 3
}

export default async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS });
  }
  try {
    const { imageBase64, mimeType, hints } = await req.json();
    if (!imageBase64) throw new Error("Missing imageBase64");

    const apiKey = Deno.env.get("OPENROUTER_API_KEY");
    if (!apiKey) throw new Error("Missing OPENROUTER_API_KEY");

    const models = resolveModels();
    const mime = mimeType || "image/jpeg";
    const dataUrl = `data:${mime};base64,${imageBase64}`;

    const payload = {
      model: models[0],
      models, // OpenRouter routes to the next model on failure/unavailability
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            { type: "text", text: buildUserPrompt(hints) },
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
          // Optional attribution headers OpenRouter uses for ranking.
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
      throw new Error(`OpenRouter HTTP ${resp.status} ${resp.statusText}: ${t?.slice(0, 300)}`);
    }

    const data = await resp.json();
    const usedModel = data?.model || payload.model;
    const content = data?.choices?.[0]?.message?.content ?? "";
    console.log("[extract-receipt] model used:", usedModel, "content length:", String(content).length);

    const result = normalizeResult(parseJsonLoose(String(content)));

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json", ...CORS },
    });
  } catch (e) {
    console.error("[extract-receipt] error:", String(e));
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...CORS },
    });
  }
};
