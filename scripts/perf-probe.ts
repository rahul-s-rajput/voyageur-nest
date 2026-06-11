/**
 * DB performance probe.
 *
 * Times the round-trip (network + server) of the queries the admin UI runs most,
 * so you can see exactly what's slow and what to optimize. Each query is warmed
 * up once, then run several times; the median/min/max are printed.
 *
 * Run:  npm run perf:probe
 * Needs VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY (loaded from .env.local).
 */
import { config } from 'dotenv';
config({ path: '.env.local' });
config(); // also pick up a plain .env if present

import { createClient } from '@supabase/supabase-js';
import { performance } from 'node:perf_hooks';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing Supabase credentials. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const RUNS = 6;

async function timeQuery(label: string, fn: () => Promise<unknown>): Promise<void> {
  try {
    await fn(); // warm-up (auth handshake, connection, plan cache)
    const samples: number[] = [];
    for (let i = 0; i < RUNS; i++) {
      const t0 = performance.now();
      await fn();
      samples.push(performance.now() - t0);
    }
    samples.sort((a, b) => a - b);
    const median = samples[Math.floor(samples.length / 2)];
    const fmt = (n: number) => `${n.toFixed(0)}ms`.padStart(7);
    console.log(`${label.padEnd(36)} median ${fmt(median)}   min ${fmt(samples[0])}   max ${fmt(samples[samples.length - 1])}`);
  } catch (e: any) {
    console.log(`${label.padEnd(36)} ERROR: ${e?.message || e}`);
  }
}

(async () => {
  console.log(`\nProbing ${SUPABASE_URL}  (${RUNS} runs each, after a warm-up)\n`);

  const { data: props } = await supabase.from('properties').select('id').limit(1);
  const propertyId = props?.[0]?.id as string | undefined;
  const { data: bks } = await supabase.from('bookings').select('id, property_id').limit(1);
  const bookingId = bks?.[0]?.id as string | undefined;
  const bookingProp = (bks?.[0] as any)?.property_id as string | undefined;

  await timeQuery('properties select *', () =>
    supabase.from('properties').select('*'));

  if (propertyId) {
    await timeQuery('rooms select (property)', () =>
      supabase.from('rooms').select('*').eq('property_id', propertyId));
    await timeQuery('availability: rooms', () =>
      supabase.from('rooms').select('room_number').eq('property_id', propertyId).eq('is_active', true).order('room_number'));
    await timeQuery('availability: overlapping bookings', () =>
      supabase.from('bookings').select('room_no').eq('property_id', propertyId).eq('cancelled', false).lt('check_in', '2026-12-31').gt('check_out', '2026-01-01'));
  }

  await timeQuery('bookings select * (all)', () =>
    supabase.from('bookings').select('*'));

  if (bookingId && bookingProp) {
    await timeQuery('booking_financials VIEW (1)', () =>
      supabase.from('booking_financials').select('*').eq('property_id', bookingProp).eq('booking_id', bookingId).single());
    await timeQuery('booking_charges list (1)', () =>
      supabase.from('booking_charges').select('*').eq('property_id', bookingProp).eq('booking_id', bookingId).eq('is_voided', false));
    await timeQuery('booking_payments list (1)', () =>
      supabase.from('booking_payments').select('*').eq('property_id', bookingProp).eq('booking_id', bookingId).eq('is_voided', false));
  } else {
    console.log('\n(no bookings found — skipping booking_financials / charges / payments timings)');
  }

  // NOTE: not timing next_invoice_number() — it mutates (reserves a folio), so
  // calling it repeatedly would burn invoice numbers.

  console.log('\nTip: compare "booking_financials VIEW" against "charges + payments list".');
  console.log('If the VIEW is much slower, the client-side compute (already added) is the win.\n');
  process.exit(0);
})();
