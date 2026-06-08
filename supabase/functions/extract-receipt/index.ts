// deno-lint-ignore-file no-explicit-any
// Edge Function: extract structured expense data from a receipt image via Gemini.
// Moved server-side so the Gemini API key never ships in the browser bundle.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
declare const Deno: any;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
  "Vary": "Origin",
};

interface ReceiptExtractionLineItem {
  description: string;
  quantity?: number;
  unit_amount?: number;
  tax_amount?: number;
  line_total?: number;
}

interface ReceiptExtractionResult {
  expense_date: string | null;
  amount: number | null;
  currency: string | null;
  vendor: string | null;
  category_hint: string | null;
  line_items: ReceiptExtractionLineItem[];
  confidence: number;
  reasoning?: string | null;
}

export default async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS });
  }
  try {
    const { imageBase64, mimeType, hints } = await req.json();
    if (!imageBase64) throw new Error("Missing imageBase64");

    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) throw new Error("Missing GEMINI_API_KEY");
    const model = Deno.env.get("GEMINI_MODEL") || "gemini-2.5-flash";
    const mime = mimeType || "image/jpeg";

    const system = [
      "You are a strict JSON extractor for receipts and invoices. Output only JSON without code fences.",
      "Extract a single expense summary and a list of line items.",
      "Dates must be ISO YYYY-MM-DD. Use null when unknown. Currency should be ISO code if present.",
      "Line items should include description and computed line_total when possible.",
      "If tax is present, extract a tax_amount per line if identifiable; otherwise null.",
      "Suggest a category (category_hint) from common expense categories like utilities, food costs, staff salary, maintenance, marketing, transport, office supplies, fuel, cleaning, groceries.",
    ].join("\n");

    const schema = {
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
            additionalProperties: true,
          },
        },
        confidence: { type: "number" },
        reasoning: { type: ["string", "null"] },
      },
      required: ["confidence", "line_items"],
      additionalProperties: true,
    };

    const categoryList = (hints?.categories && hints.categories.length)
      ? `\nExisting categories: ${JSON.stringify(hints.categories)}. When suggesting category_hint, prefer an exact or closest match from this list. If none applies, provide your best new category suggestion.`
      : "";
    const userPrompt = `Return valid JSON only (no code fences). Schema: ${JSON.stringify(schema)}.\nLocale: ${hints?.locale || "en-IN"}; Preferred currency: ${hints?.currency || "INR"}.${categoryList}`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
    const body = {
      systemInstruction: { role: "system", parts: [{ text: system }] },
      contents: [
        {
          role: "user",
          parts: [
            { text: userPrompt },
            { inlineData: { data: imageBase64, mimeType: mime } },
          ],
        },
      ],
      generationConfig: { responseMimeType: "application/json" },
    } as any;

    const resp = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!resp.ok) {
      const t = await resp.text().catch(() => "");
      throw new Error(`Gemini HTTP ${resp.status} ${resp.statusText}: ${t?.slice(0, 200)}`);
    }
    const data = await resp.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const raw = String(text || "").trim();

    let parsed: any;
    try {
      parsed = JSON.parse(raw);
    } catch {
      const start = raw.indexOf("{");
      const end = raw.lastIndexOf("}");
      if (start !== -1 && end !== -1 && end > start) {
        parsed = JSON.parse(raw.slice(start, end + 1));
      } else {
        throw new Error("Gemini returned non-JSON");
      }
    }

    const items: ReceiptExtractionLineItem[] = Array.isArray(parsed.line_items)
      ? parsed.line_items.map((li: any) => ({
          description: String(li.description || "").slice(0, 300),
          quantity: typeof li.quantity === "number" ? li.quantity : undefined,
          unit_amount: typeof li.unit_amount === "number" ? li.unit_amount : undefined,
          tax_amount: typeof li.tax_amount === "number" ? li.tax_amount : undefined,
          line_total: typeof li.line_total === "number"
            ? li.line_total
            : (typeof li.unit_amount === "number" && typeof li.quantity === "number"
                ? li.unit_amount * li.quantity
                : undefined),
        }))
      : [];

    const result: ReceiptExtractionResult = {
      expense_date: parsed.expense_date || null,
      amount: typeof parsed.amount === "number" ? parsed.amount : null,
      currency: parsed.currency || null,
      vendor: parsed.vendor || null,
      category_hint: parsed.category_hint || null,
      line_items: items,
      confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0.7,
      reasoning: parsed.reasoning || null,
    };

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json", ...CORS },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...CORS },
    });
  }
};
