import { supabase } from '../lib/supabase';

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

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(((reader.result as string) || '').split(',')[1] || '');
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export class ReceiptAIExtractionService {
  /**
   * Extract structured expense data from a receipt image.
   *
   * The Gemini call runs server-side in the `extract-receipt` edge function so
   * the API key is never exposed in the browser bundle. Signature and return
   * shape are unchanged, so callers don't need to change.
   */
  static async extractFromReceipt(
    file: File,
    hints?: { locale?: string; currency?: string; categories?: string[] }
  ): Promise<ReceiptExtractionResult> {
    const imageBase64 = await fileToBase64(file);

    const { data, error } = await (supabase as any).functions.invoke('extract-receipt', {
      body: { imageBase64, mimeType: file.type, hints },
    });

    if (error) throw error;
    if (!data || (data as any).error) {
      throw new Error((data as any)?.error || 'Receipt extraction failed');
    }
    return data as ReceiptExtractionResult;
  }
}

export default ReceiptAIExtractionService;
