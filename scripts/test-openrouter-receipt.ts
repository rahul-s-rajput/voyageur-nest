/**
 * Manual validation harness for OpenRouter receipt extraction.
 *
 * Runs the EXACT request the extract-receipt edge function makes, so you can
 * check model quality on a real receipt BEFORE deploying. Uses the free vision
 * model fallback chain by default.
 *
 *   # Node 22 required (see CLAUDE.md). From the repo root:
 *   OPENROUTER_API_KEY=sk-or-... npx tsx scripts/test-openrouter-receipt.ts ./path/to/receipt.jpg
 *
 *   # optional: override the model chain
 *   OPENROUTER_MODELS="z-ai/glm-4.6v,moonshotai/kimi-k2.6:free" OPENROUTER_API_KEY=... npx tsx scripts/test-openrouter-receipt.ts ./receipt.jpg
 */
import { readFileSync } from 'fs';
import path from 'path';
import { config as loadEnv } from 'dotenv';

// Load the key from .env.local (preferred) then .env, without overriding any
// value already present in the environment.
loadEnv({ path: '.env.local' });
loadEnv();

const SYSTEM_PROMPT = [
  'You are a strict JSON extractor for receipts and invoices. Output only JSON without code fences.',
  'Extract a single expense summary and a list of line items.',
  'Dates must be ISO YYYY-MM-DD. Use null when unknown. Currency should be ISO code if present.',
  'Line items should include description and computed line_total when possible.',
  'If tax is present, extract a tax_amount per line if identifiable; otherwise null.',
  'Suggest a category (category_hint) from common expense categories like utilities, food costs, staff salary, maintenance, marketing, transport, office supplies, fuel, cleaning, groceries.',
].join('\n');

function mimeFor(file: string): string {
  const ext = path.extname(file).toLowerCase();
  if (ext === '.png') return 'image/png';
  if (ext === '.webp') return 'image/webp';
  if (ext === '.pdf') return 'application/pdf';
  return 'image/jpeg';
}

async function main() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.error('ERROR: set OPENROUTER_API_KEY in the environment.');
    process.exit(1);
  }
  const imgPath = process.argv[2];
  if (!imgPath) {
    console.error('Usage: npx tsx scripts/test-openrouter-receipt.ts <path-to-receipt-image>');
    process.exit(1);
  }

  const bytes = readFileSync(path.resolve(imgPath));
  const dataUrl = `data:${mimeFor(imgPath)};base64,${bytes.toString('base64')}`;
  const models = (process.env.OPENROUTER_MODELS
    || 'moonshotai/kimi-k2.6:free,nex-agi/nex-n2-pro:free,nvidia/nemotron-nano-12b-v2-vl:free')
    .split(',').map((s) => s.trim()).filter(Boolean).slice(0, 3); // OpenRouter caps at 3

  const userPrompt = `Return valid JSON only (no code fences). Extract: expense_date (YYYY-MM-DD|null), amount (number|null), currency (ISO|null), vendor (string|null), category_hint (string|null), line_items[] (description, quantity?, unit_amount?, tax_amount?, line_total?), confidence (0-1), reasoning (string|null).\nLocale: en-IN; Preferred currency: INR.`;

  console.log(`Sending ${(bytes.length / 1024).toFixed(0)} KB image to OpenRouter; model chain: ${models.join(' -> ')}`);
  const t0 = Date.now();
  const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://voyageur-nest.netlify.app',
      'X-Title': 'Voyageur Nest',
    },
    body: JSON.stringify({
      model: models[0],
      models,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: [
          { type: 'text', text: userPrompt },
          { type: 'image_url', image_url: { url: dataUrl } },
        ] },
      ],
      response_format: { type: 'json_object' },
      temperature: 0,
      max_tokens: 2000,
    }),
  });
  const ms = Date.now() - t0;

  if (!resp.ok) {
    console.error(`HTTP ${resp.status} ${resp.statusText}:`, await resp.text().catch(() => ''));
    process.exit(1);
  }
  const data: any = await resp.json();
  console.log(`\nModel actually used: ${data?.model}  (${ms} ms)`);
  const content = data?.choices?.[0]?.message?.content ?? '';
  console.log('\n--- raw model output ---\n' + content);
  try {
    console.log('\n--- parsed JSON ---\n' + JSON.stringify(JSON.parse(content), null, 2));
  } catch {
    console.log('\n(Not strict JSON — the edge function has a slice-fallback parser that would still recover this.)');
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
