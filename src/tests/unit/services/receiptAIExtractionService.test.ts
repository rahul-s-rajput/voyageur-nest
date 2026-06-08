import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the Supabase barrel so the service only sees a stub functions.invoke.
const { invokeMock } = vi.hoisted(() => ({ invokeMock: vi.fn() }));
vi.mock('../../../lib/supabase', () => ({
  supabase: { functions: { invoke: invokeMock } },
}));

import {
  ReceiptAIExtractionService,
  type ReceiptExtractionResult,
} from '../../../services/receiptAIExtractionService';

function jpegFile(content = 'hello'): File {
  return new File([content], 'receipt.jpg', { type: 'image/jpeg' });
}

const sampleResult: ReceiptExtractionResult = {
  expense_date: '2026-06-01',
  amount: 1234.5,
  currency: 'INR',
  vendor: 'Test Store',
  category_hint: 'groceries',
  line_items: [{ description: 'Milk', quantity: 2, unit_amount: 25, line_total: 50 }],
  confidence: 0.92,
  reasoning: null,
};

describe('ReceiptAIExtractionService.extractFromReceipt', () => {
  beforeEach(() => invokeMock.mockReset());

  it('invokes the extract-receipt edge function with base64 image, mime type, and hints', async () => {
    invokeMock.mockResolvedValue({ data: sampleResult, error: null });
    const hints = { locale: 'en-IN', currency: 'INR', categories: ['groceries'] };

    const out = await ReceiptAIExtractionService.extractFromReceipt(jpegFile('hello'), hints);

    expect(invokeMock).toHaveBeenCalledTimes(1);
    const [fnName, opts] = invokeMock.mock.calls[0] as [string, any];
    expect(fnName).toBe('extract-receipt');
    expect(opts.body.mimeType).toBe('image/jpeg');
    expect(opts.body.hints).toEqual(hints);
    // FileReader.readAsDataURL → base64 of the file content
    expect(opts.body.imageBase64).toBe(btoa('hello'));
    expect(out).toEqual(sampleResult);
  });

  it('passes the result through unchanged (no client-side reshaping)', async () => {
    invokeMock.mockResolvedValue({ data: sampleResult, error: null });
    const out = await ReceiptAIExtractionService.extractFromReceipt(jpegFile());
    expect(out).toBe(sampleResult);
  });

  it('throws when the edge function returns a transport error', async () => {
    invokeMock.mockResolvedValue({ data: null, error: { message: 'network down' } });
    await expect(ReceiptAIExtractionService.extractFromReceipt(jpegFile())).rejects.toBeTruthy();
  });

  it('throws when the response payload itself carries an error (e.g. missing key)', async () => {
    invokeMock.mockResolvedValue({ data: { error: 'Missing OPENROUTER_API_KEY' }, error: null });
    await expect(ReceiptAIExtractionService.extractFromReceipt(jpegFile())).rejects.toThrow(/OPENROUTER/);
  });
});
