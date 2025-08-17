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

function fileToGenerativePart(file: File): Promise<any> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const b64 = (reader.result as string).split(',')[1];
      resolve({ inlineData: { data: b64, mimeType: file.type } });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export class ReceiptAIExtractionService {
  static async extractFromReceipt(
    file: File,
    hints?: { locale?: string; currency?: string; categories?: string[] }
  ): Promise<ReceiptExtractionResult> {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    const modelName = import.meta.env.VITE_GEMINI_MODEL || 'gemini-2.5-flash';
    if (!apiKey) throw new Error('Missing VITE_GEMINI_API_KEY');

    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(apiKey);

    const system = [
      'You are a strict JSON extractor for receipts and invoices. Output only JSON without code fences.',
      'Extract a single expense summary and a list of line items.',
      'Dates must be ISO YYYY-MM-DD. Use null when unknown. Currency should be ISO code if present.',
      'Line items should include description and computed line_total when possible.',
      'If tax is present, extract a tax_amount per line if identifiable; otherwise null.',
      'Suggest a category (category_hint) from common expense categories like utilities, food costs, staff salary, maintenance, marketing, transport, office supplies, fuel, cleaning, groceries.',
    ].join('\n');

    const model = genAI.getGenerativeModel({
      model: modelName,
      systemInstruction: { role: 'system', parts: [{ text: system }] },
      generationConfig: { responseMimeType: 'application/json' }
    });

    const imagePart = await fileToGenerativePart(file);
    const schema = {
      type: 'object',
      properties: {
        expense_date: { type: ['string','null'] },
        amount: { type: ['number','null'] },
        currency: { type: ['string','null'] },
        vendor: { type: ['string','null'] },
        category_hint: { type: ['string','null'] },
        line_items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              description: { type: 'string' },
              quantity: { type: ['number','null'] },
              unit_amount: { type: ['number','null'] },
              tax_amount: { type: ['number','null'] },
              line_total: { type: ['number','null'] },
            },
            required: ['description'],
            additionalProperties: true
          }
        },
        confidence: { type: 'number' },
        reasoning: { type: ['string','null'] }
      },
      required: ['confidence','line_items'],
      additionalProperties: true
    } as const;

    const categoryList = (hints?.categories && hints.categories.length)
      ? `\nExisting categories: ${JSON.stringify(hints.categories)}. When suggesting category_hint, prefer an exact or closest match from this list. If none applies, provide your best new category suggestion.`
      : '';
    const userPrompt = `Return valid JSON only (no code fences). Schema: ${JSON.stringify(schema)}.\nLocale: ${hints?.locale || 'en-IN'}; Preferred currency: ${hints?.currency || 'INR'}.${categoryList}`;
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: userPrompt }, imagePart] }]
    });
    const text = result.response.text().trim();
    let data: any;
    try {
      data = JSON.parse(text);
    } catch {
      // Try to slice JSON block
      const start = text.indexOf('{');
      const end = text.lastIndexOf('}');
      if (start !== -1 && end !== -1 && end > start) {
        data = JSON.parse(text.slice(start, end + 1));
      } else {
        throw new Error('Gemini returned non-JSON');
      }
    }

    // Normalize fields
    const line_items: ReceiptExtractionLineItem[] = Array.isArray(data.line_items) ? data.line_items.map((li: any) => ({
      description: String(li.description || '').slice(0, 300),
      quantity: typeof li.quantity === 'number' ? li.quantity : undefined,
      unit_amount: typeof li.unit_amount === 'number' ? li.unit_amount : undefined,
      tax_amount: typeof li.tax_amount === 'number' ? li.tax_amount : undefined,
      line_total: typeof li.line_total === 'number' ? li.line_total : (typeof li.unit_amount === 'number' && typeof li.quantity === 'number' ? li.unit_amount * li.quantity : undefined)
    })) : [];

    const resultObj: ReceiptExtractionResult = {
      expense_date: data.expense_date || null,
      amount: typeof data.amount === 'number' ? data.amount : null,
      currency: data.currency || null,
      vendor: data.vendor || null,
      category_hint: data.category_hint || null,
      line_items,
      confidence: typeof data.confidence === 'number' ? data.confidence : 0.7,
      reasoning: data.reasoning || null
    };

    return resultObj;
  }
}

export default ReceiptAIExtractionService;


