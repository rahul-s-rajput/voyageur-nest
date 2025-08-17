// Translation Worker: Processes pending translation_jobs in batches and upserts translations
// Runtime: Supabase Edge Functions (Deno)
import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')!;
const GEMINI_MODEL = Deno.env.get('GEMINI_MODEL') || 'gemini-1.5-flash';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

type Job = {
  id: string;
  entity_type: 'item' | 'category';
  entity_id: string;
  base_locale: string;
  target_locale: string;
  payload: { name?: string; description?: string } | null;
  source_hash: string | null;
};

async function translateBatch(
  items: { id: string; type: 'item' | 'category'; name: string; description?: string }[],
  targetLocale: string
): Promise<Record<string, { name: string; description?: string | null }>> {
  console.log(`Translating batch of ${items.length} items to ${targetLocale}`);
  
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(GEMINI_MODEL)}:generateContent?key=${GEMINI_API_KEY}`;

  const schemaExample = {
    translations: items.map((it) => ({ 
      id: it.id, 
      name: '...', 
      description: it.type === 'item' && it.description ? '...' : undefined 
    })),
  };

  const instruction = `You are translating menu categories and items to locale ${targetLocale}.
Return ONLY valid JSON with this shape:
{"translations":[{"id":"<job id>","name":"translated name","description":"translated description or null/omitted"}, ...]}
Rules:
- Keep proper dish names transliterated sensibly; no quotes or commentary.
- If there is no description, set it to null or omit it.
- Do not include any fields except id, name, description.
- Output must be strict JSON.`;

  const payload = {
    contents: [
      {
        parts: [
          { text: instruction },
          { text: `Input items JSON: ${JSON.stringify({ items })}` },
          { text: `Respond in JSON like: ${JSON.stringify(schemaExample)}` },
        ],
      },
    ],
    generationConfig: { response_mime_type: 'application/json' },
  } as any;

  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  
  if (!resp.ok) {
    const errText = await resp.text();
    console.error(`Gemini API error: ${resp.status} - ${errText}`);
    throw new Error(`Gemini request failed: ${resp.status} ${errText}`);
  }
  
  const data = await resp.json();
  const textOut: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  
  if (!textOut) {
    console.error('Gemini returned empty response');
    throw new Error('Gemini returned empty response');
  }
  
  let parsed: any;
  try {
    parsed = JSON.parse(textOut);
  } catch (e) {
    console.error('Failed to parse Gemini response as JSON:', textOut);
    throw new Error('Gemini response was not valid JSON');
  }
  
  const out: Record<string, { name: string; description?: string | null }> = {};
  for (const tr of parsed?.translations || []) {
    if (tr?.id && typeof tr.name === 'string') {
      out[tr.id] = { name: tr.name, description: tr.description ?? null };
    }
  }
  
  console.log(`Successfully translated ${Object.keys(out).length} items`);
  return out;
}

async function processBatch(maxJobsToFetch = 300, maxPerRequest = 100) {
  console.log(`Starting batch processing - max jobs: ${maxJobsToFetch}, batch size: ${maxPerRequest}`);
  
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !GEMINI_API_KEY) {
    console.error('Missing required environment variables');
    throw new Error('Missing required environment variables');
  }

  const { data: jobs, error } = await supabase
    .from('translation_jobs')
    .select('id, entity_type, entity_id, base_locale, target_locale, payload, source_hash, attempts, next_attempt_at, status')
    .or('status.eq.pending,status.eq.failed')
    .or('next_attempt_at.is.null,next_attempt_at.lte.' + new Date().toISOString())
    .lt('attempts', 3)
    .limit(maxJobsToFetch);

  if (error) {
    console.error('Error fetching jobs:', error);
    throw error;
  }
  
  if (!jobs || jobs.length === 0) {
    console.log('No pending jobs found');
    return 0;
  }

  console.log(`Found ${jobs.length} pending jobs`);

  // Group by target locale
  const byLocale = new Map<string, Job[]>();
  for (const j of jobs as Job[]) {
    const list = byLocale.get(j.target_locale) || [];
    list.push(j);
    byLocale.set(j.target_locale, list);
  }

  let processed = 0;

  for (const [locale, list] of byLocale) {
    console.log(`Processing ${list.length} jobs for locale ${locale}`);
    
    for (let i = 0; i < list.length; i += maxPerRequest) {
      const chunk = list.slice(i, i + maxPerRequest);
      console.log(`Processing chunk of ${chunk.length} jobs`);
      
      await supabase.from('translation_jobs').update({ status: 'processing' }).in('id', chunk.map(c => c.id));

      try {
        const itemIds = chunk.filter(c => c.entity_type === 'item').map(c => c.entity_id);
        const catIds = chunk.filter(c => c.entity_type === 'category').map(c => c.entity_id);

        const [{ data: items }, { data: cats }] = await Promise.all([
          itemIds.length ? supabase.from('menu_items').select('id, name, description').in('id', itemIds) : Promise.resolve({ data: [] }),
          catIds.length ? supabase.from('menu_categories').select('id, name').in('id', catIds) : Promise.resolve({ data: [] }),
        ] as any);

        const itemMap = new Map<string, any>((items || []).map((r: any) => [r.id, r]));
        const catMap = new Map<string, any>((cats || []).map((r: any) => [r.id, r]));

        const modelInput = chunk.map((j) => {
          if (j.entity_type === 'item') {
            const it = itemMap.get(j.entity_id) || { name: '', description: '' };
            return { id: j.id, type: 'item' as const, name: it.name || '', description: it.description || '' };
          } else {
            const ct = catMap.get(j.entity_id) || { name: '' };
            return { id: j.id, type: 'category' as const, name: ct.name || '' };
          }
        });

        const translated = await translateBatch(modelInput, locale);

        for (const j of chunk) {
          try {
            const res = translated[j.id];
            if (!res) {
              console.log(`No translation found for job ${j.id}`);
              continue;
            }

            if (j.entity_type === 'item') {
              const { data: existing } = await supabase
                .from('menu_item_translations')
                .select('id, is_auto')
                .eq('item_id', j.entity_id)
                .eq('locale', locale)
                .maybeSingle();

              if (!existing) {
                console.log(`Inserting new translation for item ${j.entity_id}`);
                await supabase.from('menu_item_translations').insert({
                  item_id: j.entity_id,
                  locale,
                  name: res.name || '',
                  description: res.description ?? null,
                  is_auto: true,
                });
              } else if (existing.is_auto) {
                console.log(`Updating existing translation for item ${j.entity_id}`);
                await supabase
                  .from('menu_item_translations')
                  .update({ name: res.name || '', description: res.description ?? null, is_auto: true })
                  .eq('id', existing.id);
              }
            } else {
              const { data: existing } = await supabase
                .from('menu_category_translations')
                .select('id, is_auto')
                .eq('category_id', j.entity_id)
                .eq('locale', locale)
                .maybeSingle();

              if (!existing) {
                console.log(`Inserting new translation for category ${j.entity_id}`);
                await supabase.from('menu_category_translations').insert({
                  category_id: j.entity_id,
                  locale,
                  name: res.name || '',
                  is_auto: true,
                });
              } else if (existing.is_auto) {
                console.log(`Updating existing translation for category ${j.entity_id}`);
                await supabase
                  .from('menu_category_translations')
                  .update({ name: res.name || '', is_auto: true })
                  .eq('id', existing.id);
              }
            }

            await supabase.from('translation_jobs').update({ status: 'done', error: null, attempts: 0, next_attempt_at: null }).eq('id', j.id);
            processed++;
          } catch (inner) {
            console.error(`Error processing job ${j.id}:`, inner);
            const attempts = (j as any).attempts ?? 0;
            const next = new Date(Date.now() + Math.pow(2, Math.min(attempts + 1, 6)) * 60 * 1000);
            await supabase.from('translation_jobs').update({ status: 'failed', error: String(inner), attempts: attempts + 1, next_attempt_at: next.toISOString() }).eq('id', j.id);
          }
        }
      } catch (batchErr) {
        console.error(`Batch error:`, batchErr);
        for (const j of chunk) {
          const attempts = (j as any).attempts ?? 0;
          const next = new Date(Date.now() + Math.pow(2, Math.min(attempts + 1, 6)) * 60 * 1000);
          await supabase.from('translation_jobs').update({ status: 'failed', error: `batch: ${String(batchErr)}`, attempts: attempts + 1, next_attempt_at: next.toISOString() }).eq('id', j.id);
        }
      }
    }
  }

  console.log(`Batch processing complete. Processed ${processed} jobs`);
  return processed;
}

// Main handler using Deno.serve
Deno.serve(async (req: Request): Promise<Response> => {
  console.log('Translation worker invoked');
  console.log('Method:', req.method);
  console.log('URL:', req.url);
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }
  
  try {
    const processed = await processBatch(500, 100);
    const response = { 
      success: true, 
      processed,
      timestamp: new Date().toISOString()
    };
    console.log('Response:', response);
    
    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json', 
        'Access-Control-Allow-Origin': '*' 
      },
    });
  } catch (e) {
    console.error('Worker error:', e);
    const errorResponse = { 
      success: false, 
      error: String(e),
      timestamp: new Date().toISOString()
    };
    
    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json', 
        'Access-Control-Allow-Origin': '*' 
      },
    });
  }
});
