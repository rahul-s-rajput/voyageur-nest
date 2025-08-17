import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Missing Supabase credentials. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function md5(content: string): string {
  return crypto.createHash('md5').update(content).digest('hex');
}

async function enqueueIfMissing(entityType: 'item'|'category', entityId: string, targetLocale: string, sourceHash: string, payload: any) {
  const { data: exists, error: exErr } = await supabase
    .from('translation_jobs')
    .select('id')
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .eq('target_locale', targetLocale)
    .eq('source_hash', sourceHash)
    .in('status', ['pending','processing','done'])
    .maybeSingle();
  if (exErr) throw exErr;
  if (exists) return false;
  const { error: insErr } = await supabase.from('translation_jobs').insert({
    entity_type: entityType,
    entity_id: entityId,
    base_locale: 'en-IN',
    target_locale: targetLocale,
    payload,
    source_hash: sourceHash,
    status: 'pending'
  });
  if (insErr) throw insErr;
  return true;
}

async function main() {
  console.log('🔤 Backfilling translation jobs...');
  const { data: properties, error: propErr } = await supabase
    .from('properties')
    .select('id, supported_locales');
  if (propErr) throw propErr;
  let totalEnqueued = 0;

  for (const prop of properties || []) {
    const propertyId: string = prop.id;
    const locales: string[] = (prop.supported_locales || []).filter((l: string) => l && l !== 'en-IN');
    if (locales.length === 0) continue;

    console.log(`🏨 Property ${propertyId} locales: ${locales.join(', ')}`);

    // Categories
    const { data: categories, error: catErr } = await supabase
      .from('menu_categories')
      .select('id, name')
      .eq('property_id', propertyId);
    if (catErr) throw catErr;
    for (const c of categories || []) {
      const name = c.name || '';
      const hash = md5(name);
      for (const loc of locales) {
        const enq = await enqueueIfMissing('category', c.id, loc, hash, { name });
        if (enq) totalEnqueued++;
      }
    }

    // Items
    const { data: items, error: itemErr } = await supabase
      .from('menu_items')
      .select('id, name, description')
      .eq('property_id', propertyId);
    if (itemErr) throw itemErr;
    for (const it of items || []) {
      const name = it.name || '';
      const desc = it.description || '';
      const hash = md5(`${name}|${desc}`);
      for (const loc of locales) {
        const enq = await enqueueIfMissing('item', it.id, loc, hash, { name, description: desc });
        if (enq) totalEnqueued++;
      }
    }
  }

  console.log(`✅ Backfill complete. Jobs enqueued: ${totalEnqueued}`);
}

main().catch((e) => {
  console.error('❌ Backfill failed:', e);
  process.exit(1);
});


